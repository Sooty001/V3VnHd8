// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getAccessToken,
  getRefreshToken,
  isAccessTokenExpired,
  isRefreshTokenExpired,
  clearTokens,
  logoutKeycloak, // Импортируем функцию логаута
  loginKeycloak, // Импортируем функцию логина
  registerUserInKeycloak, // Для регистрации
  registerUserProfile // Для регистрации
} from '../api/api'; // Предполагаем, что ваш api.js в ../api/api

// Создаем контекст
const AuthContext = createContext(null);

// Кастомный хук для удобного использования контекста
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState(null); // Здесь будет храниться объект UserDto

  // Функция для проверки текущего статуса аутентификации
  const checkAuthStatus = useCallback(() => {
    const token = getAccessToken();
    const refreshToken = getRefreshToken();
    const accessExpired = isAccessTokenExpired();
    const refreshExpired = isRefreshTokenExpired();

    // Если есть access token и он не просрочен, или если есть refresh token (для обновления)
    const authenticated = (token && !accessExpired) || (refreshToken && !refreshExpired);
    setIsAuthenticated(authenticated);
    // TODO: Загрузка профиля пользователя здесь, если пользователь авторизован
    // Например: if (authenticated && !userProfile) { fetchUserProfile(); }
    // Для этого нужно будет получить user ID из JWT (расшифровать его)
    // или сохранить его в localStorage при логине.
    // Пока оставим `userProfile` как заглушку из `mock_data`.
    // В реальном приложении: const decodedToken = decodeJwt(token); setUserProfile({ id: decodedToken.sub, name: decodedToken.preferred_username });
  }, []);

  useEffect(() => {
    checkAuthStatus();
    // Можно добавить слушатель для localStorage, если токены меняются в другой вкладке
    const handleStorageChange = () => checkAuthStatus();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [checkAuthStatus]);

  // Функции для логина/регистрации/логаута, использующие API
  const login = async (username, password) => {
    try {
      const tokens = await loginKeycloak(username, password);
      setIsAuthenticated(true);
      // После успешного логина, возможно, нужно получить профиль пользователя
      // и сохранить его в userProfile. Пока заглушка.
      // fetchUserProfileFromBackend(tokens.access_token); // Реальная логика
      // setUserProfile({ name: username, nickname: `@${username}` }); // Заглушка
      return tokens;
    } catch (error) {
      setIsAuthenticated(false);
      setUserProfile(null);
      throw error;
    }
  };

  const register = async (username, email, password) => {
    try {
      const keycloakUser = await registerUserInKeycloak(username, email, password);
      // Предполагаем, что userName в RegisterUserDto == username
      const profile = await registerUserProfile(keycloakUser.id, username); 
      // После успешной регистрации, можно сразу попробовать войти
      await login(username, password);
      // setUserProfile({ name: username, nickname: `@${username}` }); // Заглушка
      return profile;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    logoutKeycloak(); // Очистка токенов из localStorage
    setIsAuthenticated(false);
    setUserProfile(null);
    window.location.href = '/login'; // Перенаправляем на страницу логина
  };

  // Временная заглушка для userProfile, пока не реализована его загрузка с бэкенда
  // В реальном приложении здесь будет логика получения UserDto с бэкенда
  useEffect(() => {
    if (isAuthenticated && !userProfile) {
      // Здесь ты можешь загрузить реальные данные профиля пользователя
      // например, по его ID из JWT или с помощью отдельного запроса к /users/profile
      // Пока используем моковые данные
      // TODO: Получить реальный профиль пользователя с бэкенда после логина
      setUserProfile({
        name: 'Текущий Пользователь',
        nickname: '@current_user',
        avatarUrl: 'https://i.pravatar.cc/150?u=current_user_avatar',
        // Добавь реальные поля из UserDto:
        // description: '...',
        // photoUrl: '...',
        // countJobs: 0,
        // countSubscriptions: 0,
        // countSubscribers: 0,
      });
    } else if (!isAuthenticated && userProfile) {
        setUserProfile(null);
    }
  }, [isAuthenticated, userProfile]);


  const authContextValue = {
    isAuthenticated,
    userProfile, // Предоставляем профиль пользователя
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};