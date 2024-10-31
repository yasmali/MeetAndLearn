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
    const [mySocketId, setMySocketId] = useState(null);
    const [otherUsers, setOtherUsers] = useState([]);
    const [otherCameraEnabled, setOtherCameraEnabled] = useState(true); // Diğer kullanıcının kamera durumu

    const myVideo = useRef();
    const userVideos = useRef({});
    const peersRef = useRef({});

    // Kamera akışını başlat
    const startVideoStream = async () => {
        try {
            const currentStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: true,
            });
            setStream(currentStream);
            if (myVideo.current) myVideo.current.srcObject = currentStream;
            return currentStream;
        } catch (error) {
            console.error("Video akışı başlatılamadı:", error);
            alert("Kamera ve mikrofon erişimine izin verildiğinden emin olun.");
        }
    };

    // İlk video akışını ayarla
    useEffect(() => {
        if (stream && myVideo.current) {
            myVideo.current.srcObject = stream;
        }
    }, [stream]);

    // Yeni bir peer bağlantısı oluştur
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

    // Gelen bir peer bağlantısı oluştur
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
                console.error("Peer sinyal hatası:", error);
            }
        }

        return peer;
    };

    // Bağlantıyı başlat
    useEffect(() => {
        socket.on('connect', () => {
            setMySocketId(socket.id);
            console.log('Socket.IO bağlantısı kuruldu:', socket.id);
        });

        startVideoStream().then((currentStream) => {
            socket.emit('join-room', { roomId });

            // Odaya katılmış kullanıcıları al ve bağlantıyı başlat
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

            // Yeni kullanıcı katıldığında peer oluştur
            socket.on('user-joined', payload => {
                if (!userVideos.current[payload.callerId]) {
                    userVideos.current[payload.callerId] = React.createRef();
                }
                const peer = addPeer(null, payload.callerId, currentStream);
                peersRef.current[payload.callerId] = peer;
                setOtherUsers(users => [...users, payload.callerId]);
            });

            // Gelen sinyali işleyerek bağlantıyı tamamla
            socket.on("receiving-signal", payload => {
                const peer = addPeer(payload.signal, payload.callerId, currentStream);
                peersRef.current[payload.callerId] = peer;
            });

            // Gelen sinyali işleyerek bağlantıyı tamamla
            socket.on("receiving-returned-signal", payload => {
                const peer = peersRef.current[payload.id];
                if (payload.signal) {
                    try {
                        peer.signal(payload.signal);
                    } catch (error) {
                        console.error("Peer sinyal hatası:", error);
                    }
                }
            });

            // Diğer kullanıcının kamera durumunu dinle
            socket.on("toggle-camera", ({ cameraEnabled, callerId }) => {
                setOtherCameraEnabled(cameraEnabled); // Durumu kaydedin
                if (userVideos.current[callerId]) {
                    userVideos.current[callerId].current.style.display = cameraEnabled ? "block" : "none";
                }
            });
        });

        // Bağlantıyı kapat
        const handleBeforeUnload = () => {
            socket.emit("user-disconnected", { socketId: mySocketId });
            socket.disconnect();
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            socket.off('connect');
            socket.disconnect();
            Object.values(peersRef.current).forEach(peer => peer.destroy());
        };
    }, [roomId]);

    // Kamera açma/kapama işlevi
    const toggleCamera = async () => {
        if (cameraEnabled) {
            stream.getVideoTracks()[0].stop();
            setCameraEnabled(false);
        } else {
            const newStream = await startVideoStream();
            setStream(newStream);
            setCameraEnabled(true);
        }
        socket.emit("toggle-camera", { cameraEnabled: !cameraEnabled, callerId: mySocketId });
    };

    // Mikrofon açma/kapama işlevi
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
                        <div key={userId} style={{ position: 'relative' }}>
                            <video ref={userVideos.current[userId]} playsInline autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', display: otherCameraEnabled ? "block" : "none" }} />
                            {!otherCameraEnabled && (
                                <NoCameraIcon style={{ fontSize: 80, color: '#fff', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                            )}
                        </div>
                    ))}
                </div>

                <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '250px', height: '175px', border: '2px solid #fff', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#000' }}>
                    {cameraEnabled && stream ? (
                        <video ref={myVideo} playsInline muted autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
