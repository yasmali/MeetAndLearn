import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, List, ListItem, ListItemText, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const MeetingList = () => {
    const [meetings, setMeetings] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const savedMeetings = JSON.parse(localStorage.getItem('meetings') || '[]');
        setMeetings(savedMeetings);
    }, []);

    const handleStartMeeting = (meetingId) => {
        navigate(`/meeting/${meetingId}`);
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Typography variant="h5">Toplantılarım</Typography>
                {meetings.length > 0 ? (
                    <List>
                        {meetings.map((meeting) => (
                            <ListItem key={meeting.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <ListItemText
                                    primary={`ID: ${meeting.id} - ${meeting.date} ${meeting.time}`}
                                    secondary={`Eğitmen: ${meeting.instructor}`}
                                />
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => handleStartMeeting(meeting.id)}
                                >
                                    Görüşmeyi Başlat
                                </Button>
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Typography variant="body1">Henüz planlanmış bir toplantınız yok.</Typography>
                )}
            </Box>
        </Container>
    );
};

export default MeetingList;
