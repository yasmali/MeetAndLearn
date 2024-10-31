import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { useParams } from 'react-router-dom';
import { IconButton, Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import NoCameraIcon from '@mui/icons-material/VideocamOff';

const socket = io.connect('https://meetandlearn.onrender.com', {
    transports: ['websocket', 'polling'],
});

const VideoChat = () => {
    const { roomId } = useParams();
    const [stream, setStream] = useState(null);
    const [receivingCall, setReceivingCall] = useState(false);
    const [callerSignal, setCallerSignal] = useState(null);
    const [callAccepted, setCallAccepted] = useState(false);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
    const [roomFull, setRoomFull] = useState(false);
    const [isInitiator, setIsInitiator] = useState(false);
    const [callStarted, setCallStarted] = useState(false);

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    useEffect(() => {
        socket.emit('join-room', roomId);

        socket.on('connect', () => {
            console.log('Socket.IO bağlantısı kuruldu:', socket.id);
        });

        socket.on('room-full', () => {
            setRoomFull(true);
            console.log("Oda dolu uyarısı alındı.");
        });

        // Sunucudan gelen room-users event'ini işleyin
        socket.on('room-users', (users) => {
            console.log("room-users event'i alındı, kullanıcı sayısı:", users.length);
            if (users.length === 1) {
                console.log("İlk kullanıcı odaya katıldı, isInitiator olarak ayarlanıyor");
                setIsInitiator(true); // İlk kullanıcıya "Başlat" tuşunu gösterir
                setReceivingCall(false); // İlk kullanıcı olduğunda receivingCall yanlış olmalı
            } else if (users.length === 2) {
                console.log("İkinci kullanıcı katıldı, receivingCall ayarlanıyor");
                setIsInitiator(false);
                setReceivingCall(true); // İkinci kullanıcıya "Katıl" tuşunu gösterir
            }
        });

        // Yerel video akışını başlatma
        navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 },
            audio: true
        }).then((stream) => {
            setStream(stream);
            if (myVideo.current) {
                myVideo.current.srcObject = stream;
                console.log("Yerel video akışı başarıyla ayarlandı:", myVideo.current.srcObject);
            }
        }).catch((error) => {
            console.error("Video akışı başlatılamadı:", error);
        });

        socket.on('offer', (data) => {
            setReceivingCall(true);
            setCallerSignal(data.signal);
        });

        socket.on('answer', (signal) => {
            setCallAccepted(true);
            connectionRef.current.signal(signal);
        });

        socket.on('ice-candidate', (candidate) => {
            if (connectionRef.current) connectionRef.current.signal(candidate);
        });

        socket.on('user-disconnected', () => {
            if (userVideo.current) {
                userVideo.current.srcObject = null;
            }
        });

        return () => socket.disconnect();
    }, [roomId]);

    const initiateCall = () => {
        setCallStarted(true);
        const peer = new Peer({ initiator: true, trickle: true, stream });

        peer.on('signal', (data) => {
            socket.emit('offer', { signal: data, roomId });
        });

        peer.on('stream', (userStream) => {
            if (userVideo.current) {
                userVideo.current.srcObject = userStream;
            }
        });

        peer.on('iceCandidate', (candidate) => {
            if (candidate) socket.emit('ice-candidate', { candidate, roomId });
        });

        connectionRef.current = peer;
    };

    const answerCall = () => {
        setCallAccepted(true);
        setCallStarted(true);
        const peer = new Peer({ initiator: false, trickle: true, stream });

        peer.on('signal', (data) => {
            socket.emit('answer', { signal: data, roomId });
        });

        peer.on('stream', (userStream) => {
            if (userVideo.current) {
                userVideo.current.srcObject = userStream;
            }
        });

        peer.on('iceCandidate', (candidate) => {
            if (candidate) socket.emit('ice-candidate', { candidate, roomId });
        });

        peer.signal(callerSignal);
        connectionRef.current = peer;
    };

    const toggleCamera = () => {
        if (stream) {
            stream.getVideoTracks()[0].enabled = !cameraEnabled;
            setCameraEnabled(!cameraEnabled);
        }
    };

    const toggleMicrophone = () => {
        if (stream) {
            stream.getAudioTracks()[0].enabled = !microphoneEnabled;
            setMicrophoneEnabled(!microphoneEnabled);
        }
    };

    if (roomFull) {
        return <h1>Oda dolu. Başka bir kullanıcı bağlanamaz.</h1>;
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100vw', height: '100vh', position: 'relative' }}>
            <div style={{ display: 'flex', width: '90%', height: '90%', maxWidth: '800px', maxHeight: '600px', position: 'relative', justifyContent: 'space-between', borderRadius: '10px', backgroundColor: '#222', padding: '10px' }}>
                <div style={{ width: '48%', height: '100%', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '2px solid #333', borderRadius: '10px' }}>
                    {callStarted && cameraEnabled ? (
                        <video ref={myVideo} playsInline muted autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                    ) : (
                        <NoCameraIcon style={{ fontSize: 80, color: '#fff' }} />
                    )}
                </div>

                <div style={{ width: '48%', height: '100%', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '2px solid #333', borderRadius: '10px' }}>
                    {callAccepted ? (
                        <video ref={userVideo} playsInline autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                    ) : (
                        <NoCameraIcon style={{ fontSize: 80, color: '#fff' }} />
                    )}
                </div>
            </div>

            <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '15px', backgroundColor: 'rgba(0, 0, 0, 0.6)', borderRadius: '8px', padding: '10px' }}>
                <IconButton onClick={toggleCamera} style={{ color: 'white' }}>
                    {cameraEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
                </IconButton>
                <IconButton onClick={toggleMicrophone} style={{ color: 'white' }}>
                    {microphoneEnabled ? <MicIcon /> : <MicOffIcon />}
                </IconButton>
            </div>

            <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
                {/* Butonları gösteren koşullu render */}
                {!callStarted && !callAccepted && (
                    isInitiator ? (
                        <Button variant="contained" color="primary" onClick={initiateCall}>
                            Başlat
                        </Button>
                    ) : (
                        receivingCall && (
                            <Button variant="contained" color="secondary" onClick={answerCall}>
                                Katıl
                            </Button>
                        )
                    )
                )}
            </div>
        </div>
    );
};

export default VideoChat;
