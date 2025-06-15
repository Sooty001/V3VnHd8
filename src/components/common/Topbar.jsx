// src/components/common/Topbar.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUserMin } from '../../api/api';

const Topbar = ({ isAuthenticated, propUser }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentUserPhotoUrl, setCurrentUserPhotoUrl] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null); // Добавим состояние для ID пользователя

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const fetchUserPhoto = async () => {
            if (isAuthenticated) {
                const userData = await getCurrentUserMin();
                if (userData) {
                    if (userData.photoUrl) {
                        setCurrentUserPhotoUrl(userData.photoUrl);
                    } else {
                        setCurrentUserPhotoUrl(null);
                    }
                    setCurrentUserId(userData.id); // Сохраняем ID пользователя
                } else {
                    setCurrentUserPhotoUrl(null);
                    setCurrentUserId(null);
                }
            } else {
                setCurrentUserPhotoUrl(null);
                setCurrentUserId(null);
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

    // Обработчик для клика по аватару
    const handleAvatarClick = useCallback(() => {
        if (isAuthenticated && currentUserId) {
            navigate(`/profile/${currentUserId}`); // Переходим на страницу профиля пользователя по его ID
        } else if (isAuthenticated && !currentUserId) {
            // Если isAuthenticated, но currentUserId почему-то null, можно перейти на базовый профиль,
            // или показать ошибку, или дождаться загрузки ID.
            // В данном случае, если ID нет, то это не должно произойти при успешной аутентификации.
            // Если бы мы хотели на /profile без ID, то: navigate('/profile');
            navigate('/profile'); // Предположим, что /profile сам разберется, если ID не пришел
        }
    }, [isAuthenticated, currentUserId, navigate]);


    // Если propUser - это объект пользователя, то его photoUrl может быть использован как запасной,
    // но если getCurrentUserMin() уже предоставляет URL, то он приоритетнее.
    // Если propUser не гарантированно имеет ID, то лучше ориентироваться на currentUserId.
    const finalUserPhotoUrl = currentUserPhotoUrl || (propUser?.photoUrl || '/default-avatar.png'); // Используем заглушку по умолчанию

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
                    <div
                        className="avatar"
                        style={{ backgroundImage: `url('${finalUserPhotoUrl}')`, cursor: 'pointer' }}
                        onClick={handleAvatarClick} // Добавляем обработчик клика
                        title="Мой профиль" // Подсказка при наведении
                    ></div>
                ) : (
                    null
                )}
            </div>
        </div>
    );
};

export default Topbar;