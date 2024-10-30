import React from 'react';
import { Container, Typography, Card, CardContent, CardMedia, Grid, Button, List, ListItem, ListItemText, Box } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

const mockSchedule = [
    { day: 'Pazartesi', slots: ['09:00 - 10:00', '14:00 - 15:00'] },
    { day: 'Salı', slots: ['10:00 - 11:00', '15:00 - 16:00'] },
    { day: 'Çarşamba', slots: ['09:00 - 11:00'] },
    { day: 'Perşembe', slots: ['13:00 - 14:00', '16:00 - 17:00'] },
    { day: 'Cuma', slots: ['10:00 - 12:00', '14:00 - 15:00'] },
];

const CourseDetails = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { course } = location.state || {};

    if (!course) {
        return (
            <Container maxWidth="md" sx={{ mt: 4 }}>
                <Typography variant="h6">Bu eğitim bulunamadı.</Typography>
            </Container>
        );
    }

    const handleSchedule = () => {
        navigate('/schedule', { state: { instructor: course.instructor } });
    };

    return (
        <Container maxWidth={false} sx={{ mt: 4 }}>
            <Grid container spacing={1} sx={{ justifyContent: 'center', px: 2 }}>
                {/* Eğitmenin Kişisel Bilgileri */}
                <Grid item xs={12} md={2.5}>
                    <Card elevation={4} sx={{ p: 2, borderRadius: 4, backgroundColor: '#f9f9f9' }}>
                        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', color: '#1976d2' }}>
                            Eğitmen Bilgileri
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                            Ad: {course.instructor}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                            Tecrübe: 10 yıl
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                            Uzmanlık: React, Node.js, JavaScript, Python
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                            İletişim: egitmen@example.com
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                            Lokasyon: İstanbul, Türkiye
                        </Typography>
                    </Card>
                </Grid>

                {/* Eğitim Bilgileri */}
                <Grid item xs={12} md={7}>
                    <Box
                        sx={{
                            borderRadius: 4,
                            backgroundColor: '#ffffff',
                            boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.1)',
                            overflow: 'hidden',
                            p: 4,
                            textAlign: 'center'
                        }}
                    >
                        <CardMedia
                            component="img"
                            height="300"
                            image={course.image}
                            alt={course.title}
                            sx={{ filter: 'brightness(0.75)', objectFit: 'cover', borderRadius: '4px' }}
                        />
                        <Box sx={{ mt: 4 }}>
                            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
                                {course.title}
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 2, textAlign: 'justify' }}>
                                {course.description}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                Bu eğitim ile modern teknolojileri keşfedin ve alanında uzman eğitmenimiz ile birebir görüşme fırsatını yakalayın.
                            </Typography>
                        </Box>
                    </Box>
                </Grid>

                {/* Eğitmen Takvimi ve Toplantı Planlama */}
                <Grid item xs={12} md={2.5}>
                    <Card elevation={4} sx={{ p: 2, borderRadius: 4, backgroundColor: '#f9f9f9', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', color: '#1976d2' }}>
                                Eğitmen Takvimi
                            </Typography>
                            <List>
                                {mockSchedule.map((daySchedule, index) => (
                                    <ListItem key={index}>
                                        <ListItemText
                                            primary={daySchedule.day}
                                            secondary={daySchedule.slots.join(', ')}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSchedule}
                            sx={{ mt: 2, borderRadius: 20, alignSelf: 'center', px: 4 }}
                        >
                            Toplantı Planla
                        </Button>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
};

export default CourseDetails;
