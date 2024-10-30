const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
    date: String,
    time: String,
    user1: String,
    user2: String,
    status: { type: String, default: 'pending' },
});

module.exports = mongoose.model('Meeting', MeetingSchema);
