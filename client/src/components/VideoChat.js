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
import socket from '../socket.js';

const VideoChat = () => {
    const { roomId } = useParams();
    const [stream, setStream] = useState(null);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
    const [roomFull, setRoomFull] = useState(false);
    const [mySocketId, setMySocketId] = useState(null);
    const [otherUsers, setOtherUsers] = useState([]);

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
            return currentStream;
        } catch (error) {
            console.error("Video akışı başlatılamadı:", error);
            alert("Kamera ve mikrofon erişimine izin verildiğinden emin olun.");
        }
    };

    // Kamera akışını videoya bağla
    useEffect(() => {
        if (stream && myVideo.current) {
            myVideo.current.srcObject = stream;
        }
    }, [stream]);

    // Yeni bir peer bağlantısı oluştur (mevcut kullanıcı için)
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

    // Gelen bir peer bağlantısı oluştur (katılan kullanıcı için)
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

    // Kullanıcıların bağlantılarını ve sinyalleşmelerini başlat
    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
            setMySocketId(socket.id);
            console.log('Socket.IO bağlantısı kuruldu:', socket.id);
        }

        startVideoStream().then((currentStream) => {
            socket.emit('join-room', { roomId });

            // Odaya katılmış diğer kullanıcıların listesini al ve bağlantı başlat
            socket.on('all-users', users => {
                const peers = [];
                users.forEach(userId => {
                    // userVideos referansı ayarlanıyor
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
                console.log("Yeni bir kullanıcı katıldı:", payload.callerId);
                // userVideos referansı ayarlanıyor
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
                        console.error("Peer sinyal hatası:", error);
                    }
                }
            });

            // Diğer kullanıcının kamera durumunu dinle
            socket.on("toggle-camera", ({ cameraEnabled, callerId }) => {
                if (userVideos.current[callerId]) {
                    userVideos.current[callerId].current.style.display = cameraEnabled ? "block" : "none";
                }
            });
        });

        socket.on('room-full', () => {
            setRoomFull(true);
            console.log("Oda dolu uyarısı alındı.");
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
