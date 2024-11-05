import React, { useRef, useEffect, useState } from 'react';
import Peer from 'simple-peer';
import { useParams } from 'react-router-dom';
import { IconButton, TextField, Button, Box, Typography, List, ListItem, ListItemText, CircularProgress, Drawer } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import NoCameraIcon from '@mui/icons-material/VideocamOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import { FiSmile } from 'react-icons/fi';
import { motion } from 'framer-motion'; // Animasyon için
import socket from '../socket.js';
import '../assets/VideoChat.css';

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
    const [loading, setLoading] = useState(false);
    const [myLoading, setMyLoading] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [selectedEmoji, setSelectedEmoji] = useState(null);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [screenStream, setScreenStream] = useState(null); // Ekran paylaşımı için
    const [isChatOpen, setIsChatOpen] = useState(false); // Chat açma kapama durumu
    const [isRecording, setIsRecording] = useState(false); // Kayıt durumu
    const mediaRecorderRef = useRef(null); // MediaRecorder referansı
    const recordedChunks = useRef([]); // Kayıt parçaları

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

    const startScreenShare = async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            setScreenStream(screenStream);
            setIsScreenSharing(true);

            screenStream.getVideoTracks()[0].onended = () => {
                stopScreenShare();
            };

            Object.values(peersRef.current).forEach(peer => {
                peer.replaceTrack(
                    stream.getVideoTracks()[0],
                    screenStream.getVideoTracks()[0],
                    stream
                );
            });
        } catch (error) {
            console.error("Ekran paylaşımı başlatılamadı:", error);
        }
    };

    const stopScreenShare = () => {
        screenStream.getTracks().forEach(track => track.stop());
        setIsScreenSharing(false);

        Object.values(peersRef.current).forEach(peer => {
            peer.replaceTrack(
                screenStream.getVideoTracks()[0],
                stream.getVideoTracks()[0],
                stream
            );
        });
        setScreenStream(null);
    };

    const startRecording = async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            mediaRecorderRef.current = new MediaRecorder(screenStream, { mimeType: 'video/webm' });
            
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
                recordedChunks.current = []; // Kayıt parçalarını sıfırla
                downloadRecording(blob); // Kullanıcıya kaydetme seçeneği sun
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Ekran kaydı başlatılamadı:", error);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const downloadRecording = (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = "screen-recording.webm"; // Kaydedilecek dosya adı
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
    };

    useEffect(() => {
        if (stream && myVideo.current) {
            myVideo.current.srcObject = stream;
            setMyLoading(false);
        }
    }, [stream]);

    const toggleChat = () => {
        setIsChatOpen(prevState => !prevState);
    };

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
            setLoading(false);
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
            setMyLoading(true);
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
                if (peers.length > 0){
                    setLoading(true);
                }
            });

            socket.on('user-joined', payload => {
                console.log("New user joined:", payload.callerId);
                if (!userVideos.current[payload.callerId]) {
                    userVideos.current[payload.callerId] = React.createRef();
                }
                const peer = addPeer(null, payload.callerId, currentStream);
                peersRef.current[payload.callerId] = peer;
                setOtherUsers(users => [...users, payload.callerId]);
                setLoading(true);
            });

            socket.on("receiving-signal", payload => {
                const peer = addPeer(payload.signal, payload.callerId, currentStream);
                peersRef.current[payload.callerId] = peer;
            });

            socket.on("receiving-returned-signal", payload => {
                const peer = peersRef.current[payload.id];
                if (payload.signal) {
                    try {
                        peer.signal(payload.signal);
                        setLoading(false);
                    } catch (error) {
                        console.error("Peer signal error:", error);
                    }
                }
            });

            socket.on("toggle-camera", ({ cameraEnabled, callerId }) => {
                if (userVideos.current[callerId]) {
                    userVideos.current[callerId].current.style.display = cameraEnabled ? "block" : "none";
                }
            });

            socket.on('chat-message', ({ message, sender }) => {
                setMessages((prevMessages) => [...prevMessages, { sender, message }]);
            });
        });

        socket.on('room-full', () => {
            setRoomFull(true);
        });

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

            socket.off('all-users');
            socket.off('user-joined');
            socket.off("receiving-signal");
            socket.off("receiving-returned-signal");
            socket.off("toggle-camera");
            socket.off("room-full");
            socket.off("user-disconnected");
            socket.off("chat-message");

            Object.values(peersRef.current).forEach(peer => peer.destroy());
            peersRef.current = {};
            userVideos.current = {};

            socket.disconnect();
        };
    }, [roomId]);

    const toggleCamera = async () => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            
            if (cameraEnabled) {
                videoTrack.enabled = false;
                setCameraEnabled(false);
            } else {
                videoTrack.enabled = true;
                setCameraEnabled(true);
    
                if (myVideo.current) {
                    myVideo.current.srcObject = stream;
                }
            }
            
            socket.emit("toggle-camera", { cameraEnabled: !cameraEnabled, callerId: mySocketId });
        }
    };

    useEffect(() => {
        if (cameraEnabled && stream && myVideo.current) {
            myVideo.current.srcObject = stream;
        }
    }, [cameraEnabled, stream]);

    const toggleMicrophone = () => {
        if (stream) {
            stream.getAudioTracks()[0].enabled = !microphoneEnabled;
            setMicrophoneEnabled(!microphoneEnabled);
        }
    };

    const toggleEmojiPicker = () => {
        setShowEmojiPicker(!showEmojiPicker);
    };

    const sendEmoji = (emoji) => {
        setSelectedEmoji(emoji);
        setShowEmojiPicker(false);
        setTimeout(() => setSelectedEmoji(null), 2000);
    };

    const sendMessage = () => {
        if (message.trim()) {
            const sender = mySocketId;
            socket.emit('chat-message', { message, sender });
            setMessages((prevMessages) => [...prevMessages, { sender: 'You', message }]);
            setMessage('');
        }
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    };

    if (roomFull) {
        return <h1>Room is full. You cannot connect to this room!</h1>;
    }

    return (
        <Box display="flex" alignItems="center" justifyContent="center" width="100vw" height="100vh" bgcolor="#333" p={2} overflow="hidden">
            <Box display="flex" flexDirection="row" width="100%" maxWidth="1400px" maxHeight="90vh" p={2} gap={2}>
                <Box 
                    display="flex" 
                    flexDirection="column" 
                    width={isChatOpen ? '80%' : '100%'} 
                    height="90vh" 
                    bgcolor="#222" 
                    borderRadius="10px" 
                    p={2} 
                    boxShadow="0px 4px 10px rgba(0,0,0,0.5)" 
                    position="relative"
                    transition="width 0.3s ease-in-out"
                >
                    {loading && (
                        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" position="absolute" top="0" left="0" width="100%" height="100%" bgcolor="rgba(0, 0, 0, 0.6)" zIndex="10">
                            <CircularProgress color="secondary" size={80} />
                            <Typography variant="h6" color="white" mt={2}>Diğer Kullanıcı Bağlanıyor...</Typography>
                        </Box>
                    )}
                    <Box width="100%" height="100%" position="relative" borderRadius="10px" overflow="hidden">
                        {otherUsers.map(userId => (
                            <video key={userId} ref={userVideos.current[userId]} playsInline autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ))}
                    </Box>
                    <Box position="absolute" bottom="10px" right="10px" width="250px" height="175px" border="2px solid #fff" borderRadius="10px" overflow="hidden" bgcolor="#000">
                        {myLoading && (
                            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" position="absolute" top="0" left="0" width="100%" height="100%" bgcolor="rgba(0, 0, 0, 0.6)" zIndex="10">
                                <CircularProgress color="secondary" size={60} />
                                <Typography variant="h6" color="white" mt={2}>Bağlanıyor...</Typography>
                            </Box>
                        )}
                        {stream && cameraEnabled ? (
                            <>
                                <video ref={myVideo} playsInline muted autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <Typography variant="caption" style={{ position: 'absolute', top: '5px', right: '5px', color: 'white', backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: '2px 5px', borderRadius: '5px' }}>{mySocketId}</Typography>
                            </>
                        ) : (
                            <NoCameraIcon style={{ fontSize: 40, color: '#fff', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                        )}
                    </Box>
                    <Box position="absolute" bottom="10px" left="35%" transform="translateX(-50%)" display="flex" gap="10px" bgcolor="rgba(0, 0, 0, 0.6)" borderRadius="8px" p={2}>
                        <IconButton onClick={toggleCamera} style={{ color: 'white' }}>
                            {cameraEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        <IconButton onClick={toggleMicrophone} style={{ color: 'white' }}>
                            {microphoneEnabled ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>
                        <IconButton onClick={toggleEmojiPicker} style={{ color: 'white' }}>
                            <FiSmile />
                        </IconButton>
                        <IconButton onClick={isScreenSharing ? stopScreenShare : startScreenShare} style={{ color: 'white' }}>
                            {isScreenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                        </IconButton>
                        <IconButton onClick={toggleChat} style={{ color: 'white' }}>
                            <ChatIcon />
                        </IconButton>
                        <IconButton onClick={isRecording ? stopRecording : startRecording} style={{ color: 'white' }}>
                            {isRecording ? <StopScreenShareIcon /> : <VideocamIcon />}
                        </IconButton>
                    </Box>
                    {showEmojiPicker && (
                        <Box position="absolute" bottom="60px" left="40%" transform="translateX(-50%)" bgcolor="#444" borderRadius="8px" p={1} display="flex" gap="5px">
                            <span onClick={() => sendEmoji('😊')}>😊</span>
                            <span onClick={() => sendEmoji('😂')}>😂</span>
                            <span onClick={() => sendEmoji('😍')}>😍</span>
                            <span onClick={() => sendEmoji('👍')}>👍</span>
                        </Box>
                    )}
                    {selectedEmoji && (
                        <motion.div
                            className="emoji-animation"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ duration: 0.5 }}
                            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '48px', pointerEvents: 'none' }}
                        >
                            {selectedEmoji}
                        </motion.div>
                    )}
                </Box>
                <Drawer anchor="right" open={isChatOpen} onClose={toggleChat} BackdropProps={{ invisible: true }}>
                    <Box width="300px" bgcolor="#222" height="100vh" p={2}>
                        <Typography variant="h6" color="white" mb={2}>Live Chat</Typography>
                        <List style={{ height: '70%', overflowY: 'auto', color: 'white' }}>
                            {messages.map((msg, index) => (
                                <ListItem key={index}>
                                    <ListItemText primary={`${msg.sender}: ${msg.message}`} />
                                </ListItem>
                            ))}
                        </List>
                        <Box display="flex" mt={10}>
                            <TextField
                                variant="outlined"
                                placeholder="Type a message..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                fullWidth
                                inputProps={{ style: { color: 'white' } }}
                                sx={{ bgcolor: '#444', mr: 1 }}
                            />
                            <Button variant="contained" color="primary" onClick={sendMessage}>Send</Button>
                        </Box>
                    </Box>
                </Drawer>
            </Box>
        </Box>
    );
};

export default VideoChat;
