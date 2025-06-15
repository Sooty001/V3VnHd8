// src/App.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/common/Layout';
import HomePage from './components/pages/HomePage';
import ProfilePage from './components/pages/Profile/ProfilePage';
import EditProfilePage from './components/pages/Profile/EditProfilePage';
import AuthPage from './components/pages/AuthPage'; // Это теперь твоя объединенная страница логина/регистрации
import SubscriptionsPage from './components/pages/SubscriptionsPage';
import LikedArtsPage from './components/pages/LikedArtsPage';
import ArtEditor from './components/ArtEditor';
import { AuthProvider, useAuth } from './context/AuthContext'; // Импортируем AuthProvider и useAuth
import { getAccessToken, getRefreshToken, isAccessTokenExpired, isRefreshTokenExpired } from './api/api';

// Приватный маршрут, который требует аутентификации
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth(); // Используем хук из контекста
  // Проверяем наличие токенов и их срок действия
  const hasValidTokens = (getAccessToken() && !isAccessTokenExpired()) || (getRefreshToken() && !isRefreshTokenExpired());

  if (!isAuthenticated && !hasValidTokens) {
    // Если пользователь не аутентифицирован и нет действующих токенов, перенаправляем на /auth
    return <Navigate to="/auth" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider> {/* Оборачиваем все приложение в AuthProvider */}
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="home" element={<HomePage />} />
          {/* Защищенные маршруты */}
          <Route path="profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/profile/:userId" element={<ProfilePage />} /> 
          <Route path="/edit-profile" element={<EditProfilePage />} />

          <Route path="/upload-art" element={<ArtEditor />} />
          {/* Маршрут для редактирования существующего арта */}
          <Route path="/edit-art/:artId" element={<ArtEditor />} />



          <Route path="liked" element={<PrivateRoute><LikedArtsPage /></PrivateRoute>} />
          <Route path="subscriptions" element={<PrivateRoute><SubscriptionsPage /></PrivateRoute>} />
          <Route path="auth" element={<AuthPage />} />
          {/* /login ведет на /auth, если ты хочешь иметь ссылку /login, которая показывает AuthPage */}
          <Route path="login" element={<Navigate to="/auth" replace />} /> 
        </Route>
        {/* Если есть маршруты, которые не используют Layout, они остаются здесь */}
        {/* <Route path="/standalone-page" element={<SomeStandalonePage />} /> */}
      </Routes>
    </AuthProvider>
  );
}

export default App;