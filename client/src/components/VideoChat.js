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
    const [userId, setUserId] = useState(null);
    const [otherUserId, setOtherUserId] = useState(null);

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: true
        }).then((stream) => {
            setStream(stream);
            myVideo.current.srcObject = stream;
            console.log("Yerel video akışı başlatıldı");
        });

        socket.emit('join-room', roomId);
        socket.on('connect', () => {
            setUserId(socket.id);
            console.log("Kendi ID:", socket.id);
        });

        socket.on('user-connected', (id) => {
            setUserConnected(true);
            setOtherUserId(id);
            console.log("Diğer kullanıcı bağlandı, ID:", id);

            if (!callInitiated) {
                initiateCall();
            }
        });

        socket.on('offer', (signal) => {
            setReceivingCall(true);
            setCallerSignal(signal);
            console.log("Teklif (offer) sinyali alındı");
        });

        socket.on('answer', (signal) => {
            setCallAccepted(true);
            connectionRef.current.signal(signal);
            console.log("Cevap (answer) sinyali alındı");
        });

        socket.on('ice-candidate', (candidate) => {
            if (connectionRef.current) {
                connectionRef.current.signal(candidate);
                console.log("ICE adayı alındı");
            }
        });
    }, [roomId]);

    const initiateCall = () => {
        const peer = new Peer({ initiator: true, trickle: false, stream });

        peer.on('signal', (data) => {
            socket.emit('offer', { signal: data, roomId });
            console.log("Teklif (offer) sinyali gönderildi");
        });

        peer.on('stream', (userStream) => {
            userVideo.current.srcObject = userStream;
            console.log("Diğer kullanıcının video akışı alındı");
        });

        peer.on('ice-candidate', (candidate) => {
            socket.emit('ice-candidate', { candidate, roomId });
            console.log("ICE adayı gönderildi");
        });

        connectionRef.current = peer;
        setCallInitiated(true);
    };

    const answerCall = () => {
        setCallAccepted(true);
        const peer = new Peer({ initiator: false, trickle: false, stream });

        peer.on('signal', (data) => {
            socket.emit('answer', { signal: data, roomId });
            console.log("Cevap (answer) sinyali gönderildi");
        });

        peer.on('stream', (userStream) => {
            userVideo.current.srcObject = userStream;
            console.log("Diğer kullanıcının video akışı alındı");
        });

        peer.on('ice-candidate', (candidate) => {
            socket.emit('ice-candidate', { candidate, roomId });
            console.log("ICE adayı gönderildi");
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
                <div style={{ position: 'absolute', top: '10px', left: '10px', color: 'white' }}>
                    <p>Oda ID: {roomId}</p>
                    <p>Kendi ID: {userId}</p>
                    {otherUserId && <p>Diğer Kullanıcı ID: {otherUserId}</p>}
                </div>

                <div style={{ width: '48%', height: '100%', position: 'relative' }}>
                    <video ref={myVideo} playsInline muted autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                </div>

                <div style={{ width: '48%', height: '100%', position: 'relative' }}>
                    <video ref={userVideo} playsInline autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
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
