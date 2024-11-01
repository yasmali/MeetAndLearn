import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { useParams } from 'react-router-dom';
import { IconButton, TextField, Button, Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import NoCameraIcon from '@mui/icons-material/VideocamOff';
import socket from '../socket.js';

const VideoChat = () => {
    const { roomId } = useParams();
    const [stream, setStream] = useState(null);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
    const [roomFull, setRoomFull] = useState(false);
    const [mySocketId, setMySocketId] = useState(null);
    const [otherUsers, setOtherUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');

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

        if (incomingSignal) {
            try {
                peer.signal(incomingSignal);
            } catch (error) {
                console.error("Peer signal error:", error);
            }
        }

        return peer;
    };

    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
            setMySocketId(socket.id);
            console.log('Socket.IO connection established:', socket.id);
        }

        startVideoStream().then((currentStream) => {
            socket.emit('join-room', { roomId });

            socket.on('all-users', users => {
                const peers = [];
                users.forEach(userId => {
                    if (!userVideos.current[userId]) {
                        userVideos.current[userId] = React.createRef();
                    }
                    const peer = createPeer(userId, socket.id, currentStream);
                    peersRef.current[userId] = peer;
                    peers.push(userId);
                });
                setOtherUsers(peers);
            });

            // Yeni bir kullanıcı katıldığında peer başlat
            socket.on('user-joined', payload => {
                console.log("New user joined:", payload.callerId);
                if (!userVideos.current[payload.callerId]) {
                    userVideos.current[payload.callerId] = React.createRef();
                }
                const peer = addPeer(null, payload.callerId, currentStream);
                peersRef.current[payload.callerId] = peer;
                setOtherUsers(users => [...users, payload.callerId]);
            });

            // İlk sinyali al ve bağlantıyı tamamla
            socket.on("receiving-signal", payload => {
                const peer = addPeer(payload.signal, payload.callerId, currentStream);
                peersRef.current[payload.callerId] = peer;
            });

            // Karşı taraftan gelen sinyali al ve bağlantıyı tamamla
            socket.on("receiving-returned-signal", payload => {
                const peer = peersRef.current[payload.id];
                if (payload.signal) {
                    try {
                        peer.signal(payload.signal);
                    } catch (error) {
                        console.error("Peer signal error:", error);
                    }
                }
            });

            // Diğer kullanıcının kamera durumunu dinle
            socket.on("toggle-camera", ({ cameraEnabled, callerId }) => {
                if (userVideos.current[callerId]) {
                    userVideos.current[callerId].current.style.display = cameraEnabled ? "block" : "none";
                }
            });

            // socket.on('chat-message', ({ message, sender }) => {
            //     setMessages((prevMessages) => [...prevMessages, { sender, message }]);
            // });
        });

        socket.on('room-full', () => {
            setRoomFull(true);
        });

        // Sayfa yenilenirken veya kapanırken bağlantıyı kapat
        const handleBeforeUnload = () => {
            socket.emit("user-disconnected", { socketId: mySocketId });
            socket.disconnect();
        };

        socket.on("user-disconnected", ({ socketId }) => {
            if (userVideos.current[socketId]) {
                delete userVideos.current[socketId];
                setOtherUsers(users => users.filter(user => user !== socketId));
            }
        });

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);

            // Tüm socket olaylarını kapat ve peer bağlantılarını temizle
            socket.off('all-users');
            socket.off('user-joined');
            socket.off("receiving-signal");
            socket.off("receiving-returned-signal");
            socket.off("toggle-camera");
            socket.off("room-full");
            socket.off("user-disconnected");
            //socket.off("chat-message");

            // Peer bağlantılarını kapat
            Object.values(peersRef.current).forEach(peer => peer.destroy());
            peersRef.current = {};
            userVideos.current = {};

            // Socket bağlantısını tamamen kapat
            socket.disconnect();
        };
    }, [roomId]);

    // Kamera açma/kapama işlevi
    const toggleCamera = async () => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            
            if (cameraEnabled) {
                videoTrack.enabled = false; // Kamerayı kapat
                setCameraEnabled(false);
            } else {
                videoTrack.enabled = true; // Kamerayı aç
                setCameraEnabled(true);
    
                // Kamera açıldığında myVideo referansını güncelle
                if (myVideo.current) {
                    myVideo.current.srcObject = stream;
                }
            }
            
            // Kamera durumunu diğer kullanıcıya bildir
            socket.emit("toggle-camera", { cameraEnabled: !cameraEnabled, callerId: mySocketId });
        }
    };

    // Kamera durumu değiştiğinde myVideo referansını güncellemek için useEffect
    useEffect(() => {
        if (cameraEnabled && stream && myVideo.current) {
            myVideo.current.srcObject = stream;
        }
    }, [cameraEnabled, stream]);

 // Mikrofon açma/kapama işlevi
    const toggleMicrophone = () => {
        if (stream) {
            stream.getAudioTracks()[0].enabled = !microphoneEnabled;
            setMicrophoneEnabled(!microphoneEnabled);
        }
    };

    const sendMessage = () => {
        if (message.trim()) {
            const sender = mySocketId;
            //socket.emit('chat-message', { message, sender });
            setMessages((prevMessages) => [...prevMessages, { sender: 'You', message }]);
            setMessage('');
        }
    };

    // Enter tuşu ile mesaj gönderme işlevi
    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    };

    if (roomFull) {
        return <h1>Room is full. You cannot connect to this room!</h1>;
    }

    return (
        // Ana kapsayıcı Box - Ekranın ortasında ortalanmış düzen
        <Box display="flex" alignItems="center" justifyContent="center" width="100vw" height="100vh" bgcolor="#333" p={2} overflow="hidden">
            <Box display="flex" flexDirection="row" width="100%" maxWidth="1400px" maxHeight="90vh" p={2} gap={2}>
                {/* Büyük video çerçevesi */}
                <Box display="flex" flexDirection="column" width="70%" maxWidth="1100px" height="80vh" bgcolor="#222" borderRadius="10px" p={2} boxShadow="0px 4px 10px rgba(0,0,0,0.5)" position="relative">
                    <Box width="100%" height="100%" position="relative" borderRadius="10px" overflow="hidden">
                        {otherUsers.map(userId => (
                            <video key={userId} ref={userVideos.current[userId]} playsInline autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ))}
                    </Box>
                    <Box position="absolute" bottom="10px" right="10px" width="250px" height="175px" border="2px solid #fff" borderRadius="10px" overflow="hidden" bgcolor="#000">
                        {stream && cameraEnabled ? (
                            <>
                                <video ref={myVideo} playsInline muted autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <Typography variant="caption" style={{ position: 'absolute', top: '5px', right: '5px', color: 'white', backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: '2px 5px', borderRadius: '5px' }}>{mySocketId}</Typography>
                            </>
                        ) : (
                            <NoCameraIcon style={{ fontSize: 40, color: '#fff', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                        )}
                    </Box>
                    <Box position="absolute" bottom="10px" left="50%" transform="translateX(-50%)" display="flex" gap="15px" bgcolor="rgba(0, 0, 0, 0.6)" borderRadius="8px" p={2}>
                        <IconButton onClick={toggleCamera} style={{ color: 'white' }}>
                            {cameraEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        <IconButton onClick={toggleMicrophone} style={{ color: 'white' }}>
                            {microphoneEnabled ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>
                    </Box>
                </Box>

                {/* Sohbet Bölümü */}
                <Box width="30%" bgcolor="#222" borderRadius="10px" p={2} boxShadow="0px 4px 10px rgba(0,0,0,0.5)">
                    <Typography variant="h6" color="white" mb={2}>Live Chat</Typography>
                    <List style={{ height: '70%', overflowY: 'auto', color: 'white' }}>
                        {messages.map((msg, index) => (
                            <ListItem key={index}>
                                <ListItemText primary={`${msg.sender}: ${msg.message}`} />
                            </ListItem>
                        ))}
                    </List>
                    <Box display="flex" mt={2}>
                        <TextField
                            variant="outlined"
                            placeholder="Type a message..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={handleKeyPress} // Enter tuşu için olay ekleyin
                            fullWidth
                            inputProps={{ style: { color: 'white' } }}
                            sx={{ bgcolor: '#444', mr: 1 }}
                        />
                        <Button variant="contained" color="primary" onClick={sendMessage}>Send</Button>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default VideoChat;
