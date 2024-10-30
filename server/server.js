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
        
        socket.to(roomId).emit('user-connected', socket.id); // Yeni kullanıcı geldiğinde mevcut kullanıcıya bilgi ver

        socket.on('offer', (data) => {
            socket.to(data.roomId).emit('offer', { signal: data.signal, from: socket.id });
        });

        socket.on('answer', (data) => {
            socket.to(data.roomId).emit('answer', { signal: data.signal, from: socket.id });
        });

        socket.on('ice-candidate', (data) => {
            socket.to(data.roomId).emit('ice-candidate', { candidate: data.candidate, from: socket.id });
        });

        socket.on('disconnect', () => {
            console.log(`Kullanıcı ${socket.id} odadan ayrıldı: ${roomId}`);
            socket.to(roomId).emit('user-disconnected', socket.id);
        });
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor`);
});
