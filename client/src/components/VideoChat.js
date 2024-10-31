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
    const [otherUsers, setOtherUsers] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);

    const myVideo = useRef();
    const userVideos = useRef({});
    const peersRef = useRef({});

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

    const createPeer = (userToSignal, callerId, stream) => {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream
        });

        peer.on("signal", signal => {
            socket.emit("sending-signal", { userToSignal, callerId, signal });
        });

        peer.on("stream", userStream => {
            if (!userVideos.current[userToSignal]) {
                userVideos.current[userToSignal] = React.createRef();
            }
            if (userVideos.current[userToSignal].current) {
                userVideos.current[userToSignal].current.srcObject = userStream;
            }
        });

        return peer;
    };

    const addPeer = (incomingSignal, callerId, stream) => {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream
        });

        peer.on("signal", signal => {
            socket.emit("returning-signal", { signal, callerId });
        });

        peer.on("stream", userStream => {
            if (!userVideos.current[callerId]) {
                userVideos.current[callerId] = React.createRef();
            }
            if (userVideos.current[callerId].current) {
                userVideos.current[callerId].current.srcObject = userStream;
            }
        });

        peer.signal(incomingSignal);

        return peer;
    };

    useEffect(() => {
        socket.on('connect', () => {
            setMySocketId(socket.id);
            console.log('Socket.IO bağlantısı kuruldu:', socket.id);
        });
    
        startVideoStream().then((currentStream) => {
            socket.emit('join-room', { roomId });
    
            // Odaya katılmış diğer kullanıcıların listesini al ve bağlantı başlat
            socket.on('all-users', users => {
                const peers = [];
                users.forEach(userId => {
                    const peer = createPeer(userId, socket.id, currentStream);
                    peersRef.current[userId] = peer;
                    peers.push(userId);
                });
                setOtherUsers(peers);
            });
    
            // Yeni bir kullanıcı katıldığında `user-joined` olayı tetiklenir
            socket.on('user-joined', payload => {
                console.log("Yeni bir kullanıcı katıldı:", payload.callerId);
                const peer = addPeer(payload.signal, payload.callerId, currentStream);
                peersRef.current[payload.callerId] = peer;
                setOtherUsers(users => [...users, payload.callerId]);
            });
    
            // Kullanıcıya sinyal gönderildiğinde `receiving-returned-signal` olayını dinle
            socket.on("receiving-returned-signal", payload => {
                const peer = peersRef.current[payload.id];
                peer.signal(payload.signal);
            });
        });
    
        socket.on('room-full', () => {
            setRoomFull(true);
            console.log("Oda dolu uyarısı alındı.");
        });
    
        return () => {
            socket.off('connect');
            socket.disconnect();
            Object.values(peersRef.current).forEach(peer => peer.destroy());
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
                    {otherUsers.map(userId => (
                        <video key={userId} ref={userVideos.current[userId]} playsInline autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ))}
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
        </div>
    );
};

export default VideoChat;
