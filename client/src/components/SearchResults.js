import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, Grid, Card, CardContent, CardActions, Button } from '@mui/material';
import { useLocation } from 'react-router-dom';

const SearchResults = () => {
    const location = useLocation();
    const query = new URLSearchParams(location.search).get('query');
    const [results, setResults] = useState([]);

    useEffect(() => {
        const storedCourses = JSON.parse(localStorage.getItem('courses') || '[]');
        if (query) {
            const filteredCourses = storedCourses.filter(
                (course) =>
                    course.title.toLowerCase().includes(query.toLowerCase()) ||
                    course.description.toLowerCase().includes(query.toLowerCase()) ||
                    course.instructor.toLowerCase().includes(query.toLowerCase())
            );
            setResults(filteredCourses);
        }
    }, [query]);

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Arama Sonuçları: "{query}"
                </Typography>
            </Box>
            {results.length > 0 ? (
                <Grid container spacing={3}>
                    {results.map((course) => (
                        <Grid item xs={12} sm={6} md={4} key={course.id}>
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        {course.title}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        {course.description}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                                        Eğitmen: {course.instructor}
                                    </Typography>
                                </CardContent>
                                <CardActions>
                                    <Button size="small" color="primary">
                                        Detaylar
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <Typography variant="body1" sx={{ textAlign: 'center' }}>
                    Aramanıza uygun sonuç bulunamadı.
                </Typography>
            )}
        </Container>
    );
};

export default SearchResults;
