// src/components/common/Topbar.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { getCurrentUserMin } from '../../api/api';

const Topbar = ({ user: propUser, isAuthenticated, onLogout }) => {
    // --- Состояния ---
    const [isNotificationsPanelVisible, setIsNotificationsPanelVisible] = useState(false);
    const [isThemeSubmenuVisible, setIsThemeSubmenuVisible] = useState(false); // Все еще здесь, если не переносить в Sidebar
    const [searchQuery, setSearchQuery] = useState('');
    const [currentUserPhotoUrl, setCurrentUserPhotoUrl] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();
    const { changeTheme } = useTheme();

    // --- Эффекты ---
    useEffect(() => {
        const fetchUserPhoto = async () => {
            if (isAuthenticated) {
                try {
                    const userData = await getCurrentUserMin();
                    if (userData && userData.photoUrl) {
                        setCurrentUserPhotoUrl(userData.photoUrl);
                    } else {
                        setCurrentUserPhotoUrl(null);
                    }
                } catch (error) {
                    console.error("Failed to fetch current user photo:", error);
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

    // --- Обработчики событий ---

    const toggleThemeSubmenu = useCallback((e) => {
        e.stopPropagation();
        setIsThemeSubmenuVisible(prev => !prev);
    }, []);

    const handleThemeChange = useCallback((e, theme) => {
        e.preventDefault();
        e.stopPropagation();
        changeTheme(theme);
        setIsThemeSubmenuVisible(false);
    }, [changeTheme]);

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

    // Определяем URL фото пользователя
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

            <div
                className={`notifications__panel ${isNotificationsPanelVisible ? 'visible' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                <span>No new notifications</span>
            </div>
            {/* Аватар отображается без всякой логики панели */}
            <div className="topbar__profile"> 
                {isAuthenticated ? (
                    <div className="avatar" style={{ backgroundImage: `url('${finalUserPhotoUrl}')` }}></div>
                ) : (
                    // Если пользователь не авторизован, и мы хотим, чтобы Topbar ничего не отображал
                    // для неавторизованного пользователя кроме поиска, то оставляем пусто.
                    // Если нужна кнопка "Войти" здесь, то добавьте ее.
                    // Но по задаче, только аватар, и кнопки входа/выхода в сайдбаре.
                    null // Ничего не отображаем для неавторизованного пользователя в этой части Topbar
                )}
            </div>
        </div>
    );
};

export default Topbar;