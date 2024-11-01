// socket.js
import io from 'socket.io-client';

const socket = io.connect('https://meetandlearn.onrender.com', {
    transports: ['websocket', 'polling'],
});

export default socket;
