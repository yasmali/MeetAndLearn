const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true
}));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        credentials: true
    }
});

app.get('/', (req, res) => {
    res.send("Meet and Learn uygulaması Socket.io üzerinden çalışıyor!");
});

io.on('connection', (socket) => {
    console.log("Yeni bir kullanıcı bağlandı:", socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`Kullanıcı ${socket.id} odaya katıldı: ${roomId}`);
        socket.to(roomId).emit('user-connected', socket.id);

        socket.on('offer', (data) => {
            console.log(`Offer sinyali alındı ve ${data.roomId} odasına iletildi.`);
            socket.to(data.roomId).emit('offer', data.signal);
        });

        socket.on('answer', (data) => {
            console.log(`Answer sinyali alındı ve ${data.roomId} odasına iletildi.`);
            socket.to(data.roomId).emit('answer', data.signal);
        });

        socket.on('ice-candidate', (data) => {
            console.log(`ICE candidate sinyali alındı ve ${data.roomId} odasına iletildi.`);
            socket.to(data.roomId).emit('ice-candidate', data.candidate);
        });

        socket.on('disconnect', () => {
            console.log(`Kullanıcı ${socket.id} odadan ayrıldı: ${roomId}`);
            socket.to(roomId).emit('user-disconnected');
        });
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor`);
});
