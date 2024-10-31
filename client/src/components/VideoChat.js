import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { useParams } from 'react-router-dom';
import { IconButton } from '@mui/material';
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
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
    const [roomFull, setRoomFull] = useState(false);

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

        // Yerel video akışını başlatma
        navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 },
            audio: true
        }).then((stream) => {
            setStream(stream);
            if (myVideo.current) {
                myVideo.current.srcObject = stream;  // Yerel akışı myVideo'ya bağla
                console.log("Yerel video akışı başarıyla myVideo'ya bağlandı.");
            }

            socket.emit('ready', roomId);

            socket.on('ready', () => {
                // Peer bağlantısını başlat
                const peer = new Peer({
                    initiator: true,
                    trickle: false,
                    stream: stream
                });

                peer.on('signal', (data) => {
                    socket.emit('signal', { signal: data, roomId });
                });

                peer.on('stream', (userStream) => {
                    if (userVideo.current) {
                        userVideo.current.srcObject = userStream;
                        console.log("Karşı tarafın video akışı userVideo'ya bağlandı.");
                    }
                });

                socket.on('signal', (data) => {
                    peer.signal(data.signal);
                });

                connectionRef.current = peer;
            });
        }).catch((error) => {
            console.error("Yerel video akışı alınamadı:", error);
            alert("Kamera ve mikrofon erişimine izin verildiğinden emin olun.");
        });

        return () => {
            socket.disconnect();
            if (connectionRef.current) connectionRef.current.destroy();
        };
    }, [roomId]);

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
                    {stream && cameraEnabled ? (
                        <video ref={myVideo} playsInline muted autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                    ) : (
                        <NoCameraIcon style={{ fontSize: 80, color: '#fff' }} />
                    )}
                </div>

                <div style={{ width: '48%', height: '100%', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '2px solid #333', borderRadius: '10px' }}>
                    {userVideo.current && userVideo.current.srcObject ? (
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
        </div>
    );
};

export default VideoChat;
