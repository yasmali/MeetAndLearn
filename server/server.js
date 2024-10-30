const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors'); // Cors paketini içe aktar

const app = express();

// Express ile CORS yapılandırması
app.use(cors({
    origin: "https://meet-and-learn.vercel.app/", // İstemci URL'inizi buraya yazın (Vercel URL'si)
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true
}));

const server = http.createServer(app);

// Socket.io ile CORS yapılandırması
const io = new Server(server, {
    cors: {
        origin: "https://meet-and-learn.vercel.app/", // İstemci URL'inizi buraya yazın (Vercel URL'si)
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        credentials: true
    }
});

// Ana sayfa (/) için bir yanıt ekle
app.get('/', (req, res) => {
    res.send("Meet and Learn uygulaması Socket.io üzerinden çalışıyor!");
});

io.on('connection', (socket) => {
    console.log("Yeni bir kullanıcı bağlandı:", socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`Kullanıcı ${socket.id} odaya katıldı: ${roomId}`);
    });

    socket.on('disconnect', () => {
        console.log(`Kullanıcı ${socket.id} bağlantıyı kesti`);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor`);
});
