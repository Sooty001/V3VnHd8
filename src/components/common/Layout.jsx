// src/components/common/Layout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext'; 

const Layout = () => {
    const { isAuthenticated, userProfile, logout } = useAuth(); 

    // Динамическое формирование меню для боковой панели
    const getSidebarMenuItems = () => {
        let items = [
            { id: 'home', text: 'Главная', icon: 'home', isBottom: false },
        ];

        // 'Liked arts' только для авторизованных
        if (isAuthenticated) {
            items.push({ id: 'liked', text: 'Понравившиеся', icon: 'heart', isBottom: false });
            items.push({ id: 'profile', text: 'Профиль', icon: 'user', isBottom: false });
            items.push({ id: 'subscriptions', text: 'Подписки', icon: 'users', isBottom: false });
        }

        return items;
    };

    return (
        <div className="site">
            <header>
                <Topbar 
                    user={userProfile} 
                    isAuthenticated={isAuthenticated}
                    onLogout={logout} 
                />
            </header>
            <div className="content">
                {/* Авторы в сайдбаре полностью удалены */}
                <Sidebar 
                    // authors={[]} // Больше не передаем authors
                    sidebarMenuItems={getSidebarMenuItems()} 
                    isAuthenticated={isAuthenticated} 
                    onLogout={logout} 
                />
                <main className="page-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;