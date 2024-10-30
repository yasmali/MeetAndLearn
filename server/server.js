const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı:', socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`Kullanıcı ${socket.id} oda ${roomId} katıldı`);
    });

    socket.on('offer', (data) => {
        socket.to(data.roomId).emit('offer', data);
    });

    socket.on('answer', (data) => {
        socket.to(data.roomId).emit('answer', data);
    });

    socket.on('ice-candidate', (data) => {
        socket.to(data.roomId).emit('ice-candidate', data);
    });

    socket.on('disconnect', () => {
        console.log('Bir kullanıcı ayrıldı:', socket.id);
    });
});

server.listen(5000, () => {
    console.log('Sunucu 5000 portunda çalışıyor');
});
