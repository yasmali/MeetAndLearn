const io = require('socket.io')(server);

io.on('connection', (socket) => {
    socket.on('join-room', (roomId) => {
        socket.join(roomId);

        // Oda bilgilerini alın
        const room = io.sockets.adapter.rooms.get(roomId);
        const usersInRoom = room ? room.size : 0;

        // Eğer odada başka kullanıcı varsa katıl sinyali gönder
        if (usersInRoom > 1) {
            socket.to(roomId).emit('user-connected'); // Diğer kullanıcılara bildir
        }

        socket.on('offer', (data) => {
            socket.to(data.roomId).emit('offer', data.signal);
        });

        socket.on('answer', (data) => {
            socket.to(data.roomId).emit('answer', data.signal);
        });

        socket.on('ice-candidate', (data) => {
            socket.to(data.roomId).emit('ice-candidate', data.candidate);
        });

        // Kullanıcı bağlantıyı kapattığında odadan çıkar
        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected');
        });
    });
});
