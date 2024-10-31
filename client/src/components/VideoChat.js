import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { useParams } from 'react-router-dom';
import { IconButton, Dialog, DialogTitle, DialogContent } from '@mui/material';
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
    const [mySocketId, setMySocketId] = useState(null);
    const [otherSocketId, setOtherSocketId] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    const startVideoStream = async () => {
        try {
            const currentStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: true,
            });
            setStream(currentStream);
            return currentStream;
        } catch (error) {
            console.error("Video akışı başlatılamadı:", error);
            alert("Kamera ve mikrofon erişimine izin verildiğinden emin olun.");
        }
    };

    useEffect(() => {
        if (stream && myVideo.current) {
            myVideo.current.srcObject = stream;
        }
    }, [stream]);

    const createPeerConnection = (currentStream, initiator) => {
        const peer = new Peer({
            initiator: initiator,
            trickle: false,
            stream: currentStream,
        });

        peer.on('signal', (data) => {
            socket.emit(initiator ? 'sending-signal' : 'returning-signal', { signal: data, roomId });
        });

        peer.on('stream', (userStream) => {
            if (userVideo.current) {
                userVideo.current.srcObject = userStream;
            }
        });

        return peer;
    };

    useEffect(() => {
        socket.on('connect', () => {
            setMySocketId(socket.id);
            console.log('Socket.IO bağlantısı kuruldu:', socket.id);
        });

        startVideoStream().then((currentStream) => {
            socket.emit('join-room', { roomId });

            socket.on('user-joined', (data) => {
                setOtherSocketId(data.socketId);
                setDialogOpen(true);

                // Gelen kullanıcıya sinyal gönder
                const peer = createPeerConnection(currentStream, true);
                connectionRef.current = peer;

                peer.on('signal', (signalData) => {
                    socket.emit('sending-signal', { signal: signalData, to: data.socketId });
                });
            });

            socket.on('receiving-signal', (data) => {
                const peer = createPeerConnection(currentStream, false);
                connectionRef.current = peer;
                peer.signal(data.signal);
            });

            socket.on('returning-signal', (data) => {
                connectionRef.current.signal(data.signal);
            });
        });

        socket.on('room-full', () => {
            setRoomFull(true);
            console.log("Oda dolu uyarısı alındı.");
        });

        socket.on('camera-toggled', ({ cameraEnabled }) => {
            setCameraEnabled(cameraEnabled);
            if (stream) {
                stream.getVideoTracks()[0].enabled = cameraEnabled;
            }
        });

        return () => {
            socket.off('connect');
            socket.disconnect();
            if (connectionRef.current) connectionRef.current.destroy();
        };
    }, [roomId]);

    const toggleCamera = async () => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (cameraEnabled) {
                videoTrack.stop();
                setCameraEnabled(false);
            } else {
                await startVideoStream();
                setCameraEnabled(true);
            }
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100vw', height: '100vh', backgroundColor: '#333' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '90%', maxWidth: '1100px', height: '80vh', maxHeight: '700px', position: 'relative', backgroundColor: '#222', borderRadius: '10px', padding: '10px', boxShadow: '0px 4px 10px rgba(0,0,0,0.5)' }}>
                
                <div style={{ width: '100%', height: '100%', position: 'relative', borderRadius: '10px', overflow: 'hidden' }}>
                    {userVideo.current && userVideo.current.srcObject ? (
                        <>
                            <video ref={userVideo} playsInline autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {otherSocketId && <div style={{ position: 'absolute', top: '10px', right: '10px', color: 'white', backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: '5px 10px', borderRadius: '5px' }}>{otherSocketId}</div>}
                        </>
                    ) : (
                        <NoCameraIcon style={{ fontSize: 80, color: '#fff', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                    )}
                </div>

                <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '250px', height: '175px', border: '2px solid #fff', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#000' }}>
                    {stream && cameraEnabled ? (
                        <>
                            <video ref={myVideo} playsInline muted autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{ fontSize: '14px', position: 'absolute', top: '5px', right: '5px', color: 'white', backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: '2px 5px', borderRadius: '5px' }}>{mySocketId}</div>
                        </>
                    ) : (
                        <NoCameraIcon style={{ fontSize: 40, color: '#fff', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                    )}
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

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
                <DialogTitle>Yeni Kullanıcı Katıldı</DialogTitle>
                <DialogContent>
                    <p>{otherSocketId} görüşmeye katıldı!</p>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default VideoChat;
