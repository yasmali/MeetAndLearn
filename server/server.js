const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors'); // Cors paketini ekleyin

// Express uygulaması oluştur
const app = express();

// Express ile CORS yapılandırması
app.use(cors({
    origin: "*", // Geçici olarak tüm kaynaklara izin verin
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true
}));
// HTTP sunucusu oluştur
const server = http.createServer(app);

// Socket.io ile CORS yapılandırması
const io = new Server(server, {
    cors: {
        origin: "*", // Geçici olarak tüm kaynaklara izin verin
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
        
        const room = io.sockets.adapter.rooms.get(roomId);
        const usersInRoom = room ? room.size : 0;
        console.log(`Odadaki kullanıcı sayısı: ${usersInRoom}`);

        // Odaya zaten bir kullanıcı varsa yeni kullanıcıya 'user-connected' sinyali gönder
        if (usersInRoom > 1) {
            console.log(`Odaya yeni bir kullanıcı katıldı, 'user-connected' sinyali gönderildi.`);
            socket.emit('user-connected');
        }

        // Teklif (offer) sinyali gönderildiğinde
        socket.on('offer', (data) => {
            console.log(`Offer sinyali alındı ve ${data.roomId} odasına iletildi.`);
            socket.to(data.roomId).emit('offer', data.signal);
        });

        // Cevap (answer) sinyali gönderildiğinde
        socket.on('answer', (data) => {
            console.log(`Answer sinyali alındı ve ${data.roomId} odasına iletildi.`);
            socket.to(data.roomId).emit('answer', data.signal);
        });

        // ICE aday sinyali gönderildiğinde
        socket.on('ice-candidate', (data) => {
            console.log(`ICE candidate sinyali alındı ve ${data.roomId} odasına iletildi.`);
            socket.to(data.roomId).emit('ice-candidate', data.candidate);
        });

        // Kullanıcı ayrıldığında
        socket.on('disconnect', () => {
            console.log(`Kullanıcı ${socket.id} odadan ayrıldı: ${roomId}`);
            socket.to(roomId).emit('user-disconnected');
        });
    });
});

// Sunucuyu başlatmak için bir port seç
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor`);
});
