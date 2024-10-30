import React, { useEffect, useState } from 'react';
import { Container, Box, Typography, Grid, Card, CardContent, CardActions, Button, CardMedia } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import InfoIcon from '@mui/icons-material/Info';

const dummyCourses = [
    { id: 1, title: 'React Eğitimi', description: 'React öğrenin ve modern web uygulamaları geliştirin.', instructor: 'Ahmet Yılmaz', image: 'https://via.placeholder.com/400x200?text=React+Eğitimi' },
    { id: 2, title: 'Node.js Geliştirme', description: 'Node.js ile backend geliştirme.', instructor: 'Elif Kaya', image: 'https://via.placeholder.com/400x200?text=Node.js+Geliştirme' },
    { id: 3, title: 'JavaScript İleri Seviye', description: 'JavaScript dilinde ileri seviye konular.', instructor: 'Zeynep Demir', image: 'https://via.placeholder.com/400x200?text=JavaScript+İleri+Seviye' },
    { id: 4, title: 'Python ile Veri Bilimi', description: 'Python kullanarak veri analizi ve makine öğrenimi.', instructor: 'Mehmet Çelik', image: 'https://via.placeholder.com/400x200?text=Python+ile+Veri+Bilimi' },
    { id: 5, title: 'HTML & CSS Temelleri', description: 'Web tasarımının temellerini öğrenin.', instructor: 'Ayşe Korkmaz', image: 'https://via.placeholder.com/400x200?text=HTML+%26+CSS+Temelleri' },
];

const Home = () => {
    const [courses, setCourses] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const storedCourses = localStorage.getItem('courses');
        if (!storedCourses) {
            localStorage.setItem('courses', JSON.stringify(dummyCourses));
            setCourses(dummyCourses);
        } else {
            setCourses(JSON.parse(storedCourses));
        }
    }, []);

    const handleDetails = (course) => {
        navigate(`/course/${course.id}`, { state: { course } });
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography variant="h3" sx={{ fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)' }}>
                    Keşfet ve Öğren
                </Typography>
            </Box>
            <Grid container spacing={4}>
                {courses.map((course) => (
                    <Grid item xs={12} sm={6} md={4} key={course.id}>
                        <Card 
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                borderRadius: 3,
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                                overflow: 'hidden',
                                height: '100%',
                            }}
                        >
                            <CardMedia
                                component="img"
                                height="180"
                                image={course.image}
                                alt={course.title}
                            />
                            <CardContent sx={{ flexGrow: 1 }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold' }} gutterBottom>
                                    {course.title}
                                </Typography>
                                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                    {course.description}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                    Eğitmen: {course.instructor}
                                </Typography>
                            </CardContent>
                            <CardActions sx={{ justifyContent: 'center', p: 2 }}>
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    startIcon={<InfoIcon />}
                                    onClick={() => handleDetails(course)}
                                    sx={{ borderRadius: 20 }}
                                >
                                    Detaylar
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
};

export default Home;
