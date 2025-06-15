// src/components/common/Sidebar.jsx
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

// Убираем VISIBLE_AUTHORS_COUNT, так как авторов не будет
// const VISIBLE_AUTHORS_COUNT = 3;

const Sidebar = ({ sidebarMenuItems, isAuthenticated, onLogout }) => { // Убрал 'authors' из пропсов
    // Убрал isExpanded, так как авторов не будет
    // const [isExpanded, setIsExpanded] = useState(false);

    // Фильтруем пункты меню в зависимости от isAuthenticated
    const filteredMenuItems = sidebarMenuItems.filter(item => {
        // 'profile' и 'subscriptions' и 'liked' доступны только авторизованным
        if (['profile', 'subscriptions', 'liked'].includes(item.id)) {
            return isAuthenticated;
        }
        // 'settings' и 'feedback' будут удалены на уровне Layout
        return true;
    });

    const mainMenuItems = filteredMenuItems.filter(item => !item.isBottom);
    const bottomMenuItems = filteredMenuItems.filter(item => item.isBottom); // Этот массив теперь будет пуст, если нет bottomMenuItems

    // Логика авторов полностью удалена
    // const visibleAuthors = isExpanded ? authors : authors.slice(0, VISIBLE_AUTHORS_COUNT);
    // const handleToggleExpand = (e) => { e.preventDefault(); setIsExpanded(prev => !prev); };

    return (
        <div className="sidebar-panel">
            <aside className="sidebar">
                <nav className="sidebar__menu">
                    {mainMenuItems.map(item => (
                        <NavLink key={item.id} to={`/${item.id}`} className="sidebar__menu-item">
                            <i className={`fa-solid fa-${item.icon}`}></i>
                            <span>{item.text}</span>
                        </NavLink>
                    ))}
                    {/* Раздел авторов/подписок полностью удален */}

                    {/* Дополнительный контент: кнопки Sign In/Sign Out */}
                    <div className="sidebar__divider"></div>
                    {isAuthenticated ? (
                        <a href="#" onClick={onLogout} className="sidebar__menu-item">
                            <i className="fa-solid fa-sign-out-alt"></i>
                            <span>Выйти</span>
                        </a>
                    ) : (
                        <NavLink to="/auth" className="sidebar__menu-item">
                            <i className="fa-solid fa-sign-in-alt"></i>
                            <span>Войти</span>
                        </NavLink>
                        // Кнопка Register удалена
                    )}
                    {/* bottomMenuItems теперь могут быть не нужны, но оставим логику на всякий случай */}
                    {bottomMenuItems.map(item => (
                        <NavLink key={item.id} to={`/${item.id}`} className="sidebar__menu-item">
                            <i className={`fa-solid fa-${item.icon}`}></i>
                            <span>{item.text}</span>
                        </NavLink>
                    ))}
                </nav>
            </aside>
        </div>
    );
};

export default Sidebar;