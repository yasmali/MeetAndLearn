import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { useParams } from 'react-router-dom';
import { IconButton, Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';

const socket = io.connect('https://meetandlearn.onrender.com', {
    transports: ['websocket', 'polling'],
    secure: true,
});

const VideoChat = () => {
    const { roomId } = useParams();
    const [stream, setStream] = useState(null);
    const [receivingCall, setReceivingCall] = useState(false);
    const [callerSignal, setCallerSignal] = useState(null);
    const [callAccepted, setCallAccepted] = useState(false);
    const [callInitiated, setCallInitiated] = useState(false);
    const [userConnected, setUserConnected] = useState(false);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [microphoneEnabled, setMicrophoneEnabled] = useState(true);

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    useEffect(() => {
        // Kullanıcıdan medya akışını al
        navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: true
        }).then((stream) => {
            setStream(stream);
            myVideo.current.srcObject = stream;
        });

        // Odaya katıl
        socket.emit('join-room', roomId);

        // Başka bir kullanıcı bağlandığında
        socket.on('user-connected', () => {
            setUserConnected(true);
        });

        // Teklif (offer) sinyali alındığında
        socket.on('offer', (signal) => {
            setReceivingCall(true);
            setCallerSignal(signal);
        });

        // Cevap (answer) sinyali alındığında
        socket.on('answer', (signal) => {
            setCallAccepted(true);
            connectionRef.current.signal(signal);
        });

        // ICE aday sinyali alındığında
        socket.on('ice-candidate', (candidate) => {
            if (connectionRef.current) {
                connectionRef.current.signal(candidate);
            }
        });
    }, [roomId]);

    const initiateCall = () => {
        const peer = new Peer({ initiator: true, trickle: false, stream });

        peer.on('signal', (data) => {
            socket.emit('offer', { signal: data, roomId });
        });

        peer.on('stream', (userStream) => {
            userVideo.current.srcObject = userStream;
        });

        peer.on('error', (err) => {
            console.error("Peer bağlantı hatası:", err);
        });

        peer.on('close', () => {
            console.log("Peer bağlantısı kapatıldı.");
            userVideo.current.srcObject = null;
        });

        connectionRef.current = peer;
        setCallInitiated(true);
    };

    const answerCall = () => {
        setCallAccepted(true);
        const peer = new Peer({ initiator: false, trickle: false, stream });

        peer.on('signal', (data) => {
            socket.emit('answer', { signal: data, roomId });
        });

        peer.on('stream', (userStream) => {
            userVideo.current.srcObject = userStream;
        });

        peer.on('error', (err) => {
            console.error("Peer bağlantı hatası:", err);
        });

        peer.on('close', () => {
            console.log("Peer bağlantısı kapatıldı.");
            userVideo.current.srcObject = null;
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

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100vw', height: '100vh', backgroundColor: '#000', position: 'relative' }}>
            <div style={{ display: 'flex', width: '90%', height: '90%', maxWidth: '800px', maxHeight: '600px', position: 'relative', justifyContent: 'space-between', borderRadius: '10px', backgroundColor: '#222', padding: '10px' }}>
                
                {/* Başlatan kullanıcının videosu (sol taraf) */}
                <div style={{ width: '48%', height: '100%', position: 'relative' }}>
                    <video ref={myVideo} playsInline muted autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                </div>

                {/* Katılan kullanıcının videosu (sağ taraf) */}
                <div style={{ width: '48%', height: '100%', position: 'relative' }}>
                    <video ref={userVideo} playsInline autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                </div>
            </div>

            {/* Kamera ve Mikrofon Butonları */}
            <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '15px', backgroundColor: 'rgba(0, 0, 0, 0.6)', borderRadius: '8px', padding: '10px' }}>
                <IconButton onClick={toggleCamera} style={{ color: 'white' }}>
                    {cameraEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
                </IconButton>
                <IconButton onClick={toggleMicrophone} style={{ color: 'white' }}>
                    {microphoneEnabled ? <MicIcon /> : <MicOffIcon />}
                </IconButton>
            </div>

            {/* Arama Başlatma ve Katılma Butonları */}
            <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
                {!userConnected && !callInitiated && (
                    <Button variant="contained" color="primary" onClick={initiateCall}>
                        Aramayı Başlat
                    </Button>
                )}
                {userConnected && receivingCall && !callAccepted && (
                    <Button variant="contained" color="secondary" onClick={answerCall}>
                        Katıl
                    </Button>
                )}
            </div>
        </div>
    );
};

export default VideoChat;
