import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate, Navigate } from 'react-router-dom';
import Home from './components/Home';
import Login from './components/Login';
import ScheduleMeeting from './components/ScheduleMeeting';
import MeetingList from './components/MeetingList';
import VideoChat from './components/VideoChat';
import Chat from './components/Chat';
import About from './components/About';
import SearchResults from './components/SearchResults';
import CourseDetails from './components/CourseDetails';

import {
    Container,
    AppBar,
    Toolbar,
    Typography,
    Box,
    IconButton,
    Button,
    InputBase,
} from '@mui/material';
import { Search as SearchIcon, Home as HomeIcon, Info, ListAlt } from '@mui/icons-material';

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

function AppContent() {
    const [username, setUsername] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        // Sayfa yenilendiğinde localStorage'dan oturum bilgisini kontrol et
        const storedUsername = localStorage.getItem('username');
        const storedIsLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

        if (storedIsLoggedIn && storedUsername) {
            setUsername(storedUsername);
            setIsLoggedIn(true);
        } else {
            navigate('/login');
        }
    }, [navigate]);

    const handleLogin = (name) => {
        setUsername(name);
        setIsLoggedIn(true);
        localStorage.setItem('username', name);
        localStorage.setItem('isLoggedIn', 'true');
        navigate('/');
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setUsername('');
        localStorage.removeItem('username');
        localStorage.removeItem('isLoggedIn');
        navigate('/login');
    };

    const handleSearch = () => {
        if (searchQuery.trim()) {
            navigate(`/search?query=${searchQuery}`);
        }
    };

    return (
        <Container maxWidth={false} disableGutters sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <AppBar position="static" sx={{ backgroundColor: '#2E3B55', px: 2 }}>
                <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/')}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white' }}>
                            Eğitim ve Toplantı Uygulaması
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Button color="inherit" startIcon={<HomeIcon />} onClick={() => navigate('/')}>
                            Eğitimler
                        </Button>
                        <Button color="inherit" startIcon={<Info />} onClick={() => navigate('/about')}>
                            Hakkında
                        </Button>
                        <Button color="inherit" startIcon={<ListAlt />} onClick={() => navigate('/meetings')}>
                            Toplantılarım
                        </Button>
                        <Box sx={{ position: 'relative', backgroundColor: '#ffffff20', borderRadius: 1, display: 'flex' }}>
                            <InputBase
                                placeholder="Arama..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') handleSearch();
                                }}
                                sx={{ px: 2, color: 'white', width: 200 }}
                            />
                            <IconButton onClick={handleSearch} sx={{ color: 'white' }}>
                                <SearchIcon />
                            </IconButton>
                        </Box>
                        {isLoggedIn ? (
                            <Button color="inherit" onClick={handleLogout}>
                                Çıkış Yap
                            </Button>
                        ) : (
                            <Button color="inherit" onClick={() => navigate('/login')}>
                                Giriş Yap
                            </Button>
                        )}
                    </Box>
                </Toolbar>
            </AppBar>
            <Box sx={{ flexGrow: 1, mt: 2, mb: 4 }}>
                <Routes>
                    {isLoggedIn ? (
                        <>
                            <Route path="/" element={<Home />} />
                            <Route path="/schedule" element={<ScheduleMeeting username={username} />} />
                            <Route path="/meetings" element={<MeetingList username={username} />} />
                            <Route path="/chat" element={<Chat username={username} />} />
                            <Route path="/videochat/:roomId" element={isLoggedIn ? <VideoChat /> : <Navigate to="/login" />} />
                            <Route path="/about" element={<About />} />
                            <Route path="/search" element={<SearchResults />} />
                            <Route path="/course/:id" element={<CourseDetails />} />
                        </>
                    ) : (
                        <Route path="/login" element={<Login onLogin={handleLogin} />} />
                    )}
                    <Route path="*" element={<Login onLogin={handleLogin} />} />
                </Routes>
            </Box>
            <Box component="footer" sx={{ py: 3, px: 2, mt: 'auto', backgroundColor: '#2E3B55', color: 'white' }}>
                <Container maxWidth="lg">
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                        "Geleceğin eğitim ve iletişim platformu"
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        Yavuz Asmalı
                    </Typography>
                    <Typography variant="body2" color="inherit">
                        © {new Date().getFullYear()} | Tüm hakları saklıdır. | Yenilikçi düşünceye adanmış bir platform.
                    </Typography>
                </Container>
            </Box>
        </Container>
    );
}

export default App;
