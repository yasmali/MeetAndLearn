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
        const room = io.sockets.adapter.rooms.get(roomId) || new Set();

        if (room.size > 2) {
            socket.emit('room-full', "Oda dolu, başka bir kullanıcı bağlanamaz.");
            return;
        }

        socket.join(roomId);
        console.log(`Kullanıcı ${socket.id} odaya katıldı: ${roomId}`);

        // Diğer kullanıcılara katılan kullanıcı hakkında bilgi gönder
        socket.to(roomId).emit('user-joined', { socketId: socket.id });

        // Diğer kullanıcının gönderdiği sinyali yeni katılan kullanıcıya ilet
        socket.on('sending-signal', (data) => {
            socket.to(data.to).emit('receiving-signal', {
                signal: data.signal,
                socketId: socket.id
            });
        });

        // Yeni katılan kullanıcının yanıtını mevcut kullanıcıya ilet
        socket.on('returning-signal', (data) => {
            socket.to(data.to).emit('receiving-signal', {
                signal: data.signal,
                socketId: socket.id
            });
        });

        // ICE adaylarını diğer kullanıcıya ilet
        socket.on('ice-candidate', (data) => {
            socket.to(data.roomId).emit('ice-candidate', {
                candidate: data.candidate,
                from: socket.id
            });
        });

        socket.on('disconnect', () => {
            console.log(`Kullanıcı ${socket.id} odadan ayrıldı: ${roomId}`);
            socket.to(roomId).emit('user-disconnected', { socketId: socket.id });
        });
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor`);
});
