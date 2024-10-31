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

    socket.on('join-room', ({ roomId }) => {
        const room = io.sockets.adapter.rooms.get(roomId) || new Set();

        if (room.size >= 2) {
            socket.emit('room-full');
            return;
        }

        socket.join(roomId);
        console.log(`Kullanıcı ${socket.id} odaya katıldı: ${roomId}`);

        socket.to(roomId).emit('user-joined', { callerId: socket.id });

        const otherUsers = [...room].filter(id => id !== socket.id);
        socket.emit('all-users', otherUsers);

        socket.on('sending-signal', ({ userToSignal, callerId, signal }) => {
            io.to(userToSignal).emit('receiving-signal', { callerId, signal });
        });

        socket.on('returning-signal', ({ callerId, signal }) => {
            io.to(callerId).emit('receiving-returned-signal', { id: socket.id, signal });
        });

        socket.on("toggle-camera", ({ cameraEnabled, callerId }) => {
            socket.to(roomId).emit("toggle-camera", { cameraEnabled, callerId });
        });

        socket.on('disconnect', () => {
            console.log(`Kullanıcı ${socket.id} bağlantıyı kesti`);
            socket.to(roomId).emit('user-disconnected', { socketId: socket.id });
        });
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor`);
});
