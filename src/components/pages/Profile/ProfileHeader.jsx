// src/components/pages/ProfilePage/ProfileHeader.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom'; // Импортируем useNavigate

// Добавляем пропс isCurrentUserProfile
const ProfileHeader = ({ userData, socialNetworks, isSubscribed, onToggleSubscribe, isCurrentUserProfile }) => {
    const navigate = useNavigate(); // Инициализируем useNavigate

    if (!userData) return null;

    const getSocialNetworkName = (link) => {
        if (link.includes('instagram.com')) return 'Instagram';
        if (link.includes('facebook.com')) return 'Facebook';
        if (link.includes('twitter.com') || link.includes('x.com')) return 'X (Twitter)';
        if (link.includes('vk.com')) return 'VK';
        if (link.includes('youtube.com')) return 'YouTube'; // Убрал googleusercontent.com, так как это может быть специфично
        if (link.includes('linkedin.com')) return 'LinkedIn';
        return 'Website';
    };

    const getSocialNetworkIcon = (link) => {
        if (link.includes('instagram.com')) return 'fab fa-instagram';
        if (link.includes('facebook.com')) return 'fab fa-facebook-f';
        if (link.includes('twitter.com') || link.includes('x.com')) return 'fab fa-x-twitter';
        if (link.includes('vk.com')) return 'fab fa-vk';
        if (link.includes('youtube.com')) return 'fab fa-youtube';
        if (link.includes('linkedin.com')) return 'fab fa-linkedin-in';
        return 'fas fa-link';
    };

    // Обработчик для кнопки "Edit Profile"
    const handleEditProfileClick = () => {
        navigate('/edit-profile'); // Перенаправляем на новую страницу редактирования
    };

    const handleUploadArtClick = () => {
        navigate('/upload-art');
    };

    return (
        <div className="profile-header">
            <div className="profile-avatar">
                <img
                    src={userData.avatar}
                    alt={`${userData.name}'s avatar`}
                    onError={(e) => { e.target.onerror = null; e.target.src="/default-avatar.png"; }}
                />
            </div>
            <div className="profile-details">
                <h1>{userData.name}</h1>
                <p className="nickname">{userData.nickname}</p>
                <p className="description">{userData.description}</p>

                {socialNetworks && socialNetworks.length > 0 && (
                    <div className="profile-social-networks">
                        {socialNetworks.map((network, index) => (
                            <a
                                key={index}
                                href={network.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={getSocialNetworkName(network.link)}
                            >
                                <i className={getSocialNetworkIcon(network.link)}></i>
                            </a>
                        ))}
                    </div>
                )}

                <div className="profile-actions">
                    {!isCurrentUserProfile && (
                        <button
                            className={`${isSubscribed ? 'art-modal__following' : 'art-modal__subscribe'}`}
                            onClick={onToggleSubscribe}
                        >
                            {isSubscribed ? 'Отписаться' : 'Подписаться'}
                        </button>
                    )}

                    {isCurrentUserProfile && (
                        <>
                            {/* Добавляем onClick для кнопки "Edit Profile" */}
                            <button className="hero-section__cta" onClick={handleEditProfileClick}>
                                Редактировать профиль
                            </button>
                            <button className="hero-section__cta" onClick={handleUploadArtClick}>
                                Добавить работу
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileHeader;