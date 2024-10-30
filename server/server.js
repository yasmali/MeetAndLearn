const io = require('socket.io')(server);

io.on('connection', (socket) => {
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        const room = io.sockets.adapter.rooms.get(roomId);
        const usersInRoom = room ? room.size : 0;

        // Odaya zaten kullanıcı varsa yeni kullanıcıya 'user-connected' sinyali gönder
        if (usersInRoom > 1) {
            socket.emit('user-connected');
        }

        // Teklif ve cevap sinyallerini karşılıklı ilet
        socket.on('offer', (data) => {
            socket.to(data.roomId).emit('offer', data.signal);
        });

        socket.on('answer', (data) => {
            socket.to(data.roomId).emit('answer', data.signal);
        });

        socket.on('ice-candidate', (data) => {
            socket.to(data.roomId).emit('ice-candidate', data.candidate);
        });

        // Kullanıcı ayrıldığında odaya bildirim gönder
        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected');
        });
    });
});
