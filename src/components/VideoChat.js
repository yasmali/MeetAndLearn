import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Box, Card, CardContent, Typography } from '@mui/material';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const VideoChat = ({ username }) => {
    const { meetingId } = useParams();
    const userVideo = useRef();

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
            },
            audio: true,
        }).then((stream) => {
            userVideo.current.srcObject = stream;
            socket.emit('join-room', { meetingId, username });
        });
    }, [meetingId, username]);

    return (
        <Container maxWidth="md">
            <Box sx={{ mt: 4 }}>
                <Card>
                    <CardContent>
                        <Typography variant="h5" align="center">
                            Görüşme ID: {meetingId}
                        </Typography>
                        <video ref={userVideo} autoPlay playsInline muted style={{ width: '100%' }} />
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
};

export default VideoChat;
