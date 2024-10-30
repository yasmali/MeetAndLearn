import React from 'react';
import { Container, Box, Typography } from '@mui/material';

const About = () => {
    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h4" gutterBottom>
                    Hakkında
                </Typography>
                <Typography variant="body1" paragraph>
                    Bu uygulama, kullanıcıların eğitimler hakkında bilgi edinmesi, eğitmenlerle toplantı planlaması ve birebir görüşmeler yapması için tasarlanmıştır.
                </Typography>
                <Typography variant="body1" paragraph>
                    Proje, modern bir arayüz ve kullanıcı dostu deneyim sunarak geleceğin eğitim ve iletişim ihtiyaçlarına yanıt vermeyi amaçlar.
                </Typography>
                <Typography variant="body2" color="textSecondary">
                    Geliştirici: Yavuz Asmalı
                </Typography>
            </Box>
        </Container>
    );
};

export default About;
