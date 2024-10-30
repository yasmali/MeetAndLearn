import React, { useState, useEffect } from 'react';
import { TextField, Button, Container, Box, Typography } from '@mui/material';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const Chat = ({ username }) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        socket.on('receive-message', (data) => {
            setMessages((prev) => [...prev, data]);
        });

        return () => {
            socket.off('receive-message');
        };
    }, []);

    const sendMessage = () => {
        if (message.trim()) {
            socket.emit('send-message', { message, username });
            setMessages((prev) => [...prev, { message, from: 'Ben' }]);
            setMessage('');
        }
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 4 }}>
                <Typography variant="h6">Mesajlaşma</Typography>
                <Box sx={{ height: 300, overflowY: 'auto', mt: 2 }}>
                    {messages.map((msg, index) => (
                        <Typography key={index} variant="body1">
                            <strong>{msg.from}: </strong>{msg.message}
                        </Typography>
                    ))}
                </Box>
                <TextField
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Mesajınızı yazın"
                />
                <Button variant="contained" color="primary" fullWidth onClick={sendMessage}>
                    Gönder
                </Button>
            </Box>
        </Container>
    );
};

export default Chat;
