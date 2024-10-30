const meetings = [];

io.on('connection', (socket) => {
    socket.on('schedule-meeting', ({ meetingId, date, user }) => {
        const meeting = { id: meetingId, date, user };
        meetings.push(meeting);
        socket.emit('meetings', meetings);
    });

    socket.on('get-meetings', ({ user }) => {
        const userMeetings = meetings.filter(m => m.user === user);
        socket.emit('meetings', userMeetings);
    });
    
    socket.on('join-room', ({ meetingId, username }) => {
        socket.join(meetingId);
        console.log(`${username} odaya katıldı: ${meetingId}`);
    });
});
