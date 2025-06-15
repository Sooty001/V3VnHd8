// src/components/pages/ProfilePage/ProfileStats.jsx
import React from 'react';

const ProfileStats = ({ stats }) => {
    if (!stats) return null;

    return (
        <div className="profile-stats">
            <div className="stat-item">
                <strong className="count">{stats.artworksCount}</strong>
                <span className="label">Работы</span>
            </div>
            <div className="stat-item">
                <strong className="count">{stats.followersCount}</strong>
                <span className="label">Подписчики</span>
            </div>
            <div className="stat-item">
                <strong className="count">{stats.followingCount}</strong>
                <span className="label">Подписки</span>
            </div>
        </div>
    );
};

export default ProfileStats;