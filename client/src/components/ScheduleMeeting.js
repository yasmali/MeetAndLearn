import React, { useState, useEffect } from 'react';
import {
    TextField,
    Button,
    Container,
    Box,
    Typography,
    Card,
    CardContent,
    CardActions,
    Grid,
    MenuItem,
    Alert,
} from '@mui/material';
import { DatePicker, TimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useLocation } from 'react-router-dom';

const availability = {
    'Ahmet Yılmaz': {
        unavailableDates: ['2024-10-25', '2024-10-26'],
        unavailableTimes: ['10:00', '14:00'],
    },
    'Elif Kaya': {
        unavailableDates: ['2024-10-27', '2024-10-28'],
        unavailableTimes: ['09:00', '13:00', '16:00'],
    },
    'Zeynep Demir': {
        unavailableDates: ['2024-10-29'],
        unavailableTimes: ['11:00', '15:00'],
    },
    'Mehmet Çelik': {
        unavailableDates: ['2024-10-30', '2024-11-01'],
        unavailableTimes: ['08:00', '12:00', '17:00'],
    },
    'Ayşe Korkmaz': {
        unavailableDates: ['2024-11-02', '2024-11-03'],
        unavailableTimes: ['10:00', '14:00', '18:00'],
    },
};

const ScheduleMeeting = ({ username }) => {
    const location = useLocation();
    const selectedInstructor = location.state?.instructor || '';
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [availableTimes, setAvailableTimes] = useState([]);
    const [meetingId, setMeetingId] = useState(() => {
        const lastId = localStorage.getItem('lastMeetingId');
        return lastId ? parseInt(lastId) + 1 : 1001;
    });

    useEffect(() => {
        if (selectedInstructor && selectedDate) {
            const instructorData = availability[selectedInstructor];
            const unavailableTimes = instructorData?.unavailableTimes || [];
            const allTimes = [
                '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
                '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
                '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
                '17:00', '17:30',
            ];
            const available = allTimes.filter((time) => !unavailableTimes.includes(time));
            setAvailableTimes(available);
        }
    }, [selectedInstructor, selectedDate]);

    const handleDateChange = (newDate) => {
        setSelectedDate(newDate);
    };

    const handleTimeChange = (newTime) => {
        setSelectedTime(newTime);
    };

    const isDateDisabled = (date) => {
        const formattedDate = dayjs(date).format('YYYY-MM-DD');
        return availability[selectedInstructor]?.unavailableDates.includes(formattedDate);
    };

    const scheduleMeeting = () => {
        if (selectedInstructor && selectedDate && selectedTime) {
            const meetingData = {
                id: meetingId,
                instructor: selectedInstructor,
                date: selectedDate.format('YYYY-MM-DD'),
                time: selectedTime,
                user: username,
            };
            const existingMeetings = JSON.parse(localStorage.getItem('meetings') || '[]');
            localStorage.setItem('meetings', JSON.stringify([...existingMeetings, meetingData]));
            localStorage.setItem('lastMeetingId', meetingId);
            setMeetingId(meetingId + 1);
            alert(`Toplantı başarıyla planlandı: ID ${meetingId} - ${selectedInstructor} ile ${selectedDate.format('YYYY-MM-DD')} ${selectedTime}`);
        } else {
            alert('Lütfen tüm alanları doldurunuz.');
        }
    };

    return (
        <Container maxWidth="md">
            <Box sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
                <Typography variant="h4" gutterBottom>
                    📅 Toplantı Planla
                </Typography>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    Eğitmen: <strong>{selectedInstructor}</strong>
                </Typography>
                <Card elevation={4} sx={{ borderRadius: 3 }}>
                    <CardContent>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <DatePicker
                                        label="Tarih Seçin"
                                        value={selectedDate}
                                        onChange={handleDateChange}
                                        shouldDisableDate={isDateDisabled}
                                        disablePast
                                        fullWidth
                                        renderInput={(params) => <TextField {...params} fullWidth />}
                                    />
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    select
                                    label="Saat Seçin"
                                    value={selectedTime}
                                    onChange={(e) => handleTimeChange(e.target.value)}
                                    disabled={!selectedDate}
                                    fullWidth
                                    variant="outlined"
                                >
                                    {availableTimes.map((time) => (
                                        <MenuItem key={time} value={time}>
                                            {time}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                        </Grid>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'center', mb: 2 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={scheduleMeeting}
                            disabled={!selectedDate || !selectedTime}
                        >
                            Planla
                        </Button>
                    </CardActions>
                    <CardContent>
                        {selectedDate && selectedTime ? (
                            <Alert severity="info">
                                {`${selectedDate.format('YYYY-MM-DD')} - ${selectedTime} saatinde toplantı planlanacak.`}
                            </Alert>
                        ) : (
                            <Alert severity="warning">Lütfen bir tarih ve saat seçin.</Alert>
                        )}
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
};

export default ScheduleMeeting;
