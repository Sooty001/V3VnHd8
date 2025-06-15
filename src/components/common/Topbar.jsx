// src/components/common/Topbar.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUserMin } from '../../api/api';

const Topbar = ({ isAuthenticated, propUser }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentUserPhotoUrl, setCurrentUserPhotoUrl] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const fetchUserPhoto = async () => {
            if (isAuthenticated) {
                const userData = await getCurrentUserMin();
                if (userData && userData.photoUrl) {
                    setCurrentUserPhotoUrl(userData.photoUrl);
                } else {
                    setCurrentUserPhotoUrl(null);
                }
            } else {
                setCurrentUserPhotoUrl(null);
            }
        };

        fetchUserPhoto();
    }, [isAuthenticated]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const queryFromUrl = params.get('query');
        if (queryFromUrl) {
            setSearchQuery(queryFromUrl);
        } else {
            setSearchQuery('');
        }
    }, [location.search]);

    const handleSearchInputChange = useCallback((e) => {
        setSearchQuery(e.target.value);
    }, []);

    const handleSearchSubmit = useCallback((e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/?query=${encodeURIComponent(searchQuery.trim())}`);
        } else {
            navigate('/');
        }
    }, [searchQuery, navigate]);

    const finalUserPhotoUrl = currentUserPhotoUrl || (propUser?.photoUrl || 'https://via.placeholder.com/150');

    return (
        <div className="topbar">
            <div className="topbar__logo">
                <div className="topbar__logo-container">
                    <h1 className="topbar__logo-text">ArtVista</h1>
                </div>
            </div>
            
            <form className="topbar__search" onSubmit={handleSearchSubmit}>
                <i className="fa-solid fa-search"></i>
                <input
                    type="text"
                    placeholder="Поиск"
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                />
            </form>

            <div className="topbar__profile"> 
                {isAuthenticated ? (
                    <div className="avatar" style={{ backgroundImage: `url('${finalUserPhotoUrl}')` }}></div>
                ) : (
                    null
                )}
            </div>
        </div>
    );
};

export default Topbar;