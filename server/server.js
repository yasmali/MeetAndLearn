const io = require('socket.io')(server);

io.on('connection', (socket) => {
    socket.on('join-room', (roomId) => {
        const room = io.sockets.adapter.rooms.get(roomId);
        const usersInRoom = room ? room.size : 0;

        socket.join(roomId);

        if (usersInRoom === 1) {
            // İlk kullanıcı için "Aramayı Başlat" sinyali gönder
            io.to(socket.id).emit('room-status', { status: 'start' });
        } else {
            // Sonradan gelen kullanıcılar için "Katıl" sinyali gönder
            io.to(socket.id).emit('room-status', { status: 'join' });
        }
    });

    socket.on('offer', (data) => {
        socket.to(data.roomId).emit('offer', data);
    });

    socket.on('answer', (data) => {
        socket.to(data.roomId).emit('answer', data.signal);
    });

    socket.on('ice-candidate', (candidate) => {
        socket.to(candidate.roomId).emit('ice-candidate', candidate);
    });
});
