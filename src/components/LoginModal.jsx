// src/pages/LoginPage.jsx (или LoginModal.jsx)
import React, { useState } from 'react';
import { loginKeycloak } from '../api/api'; // Импортируем функцию логина

function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); // Предотвращаем перезагрузку страницы
    setError(null);
    setLoading(true);

    try {
      // Вызываем функцию логина из api.js
      const response = await loginKeycloak(username, password);
      console.log('Login successful:', response);
      // После успешного логина можно перенаправить пользователя
      // или закрыть модальное окно
      if (onLoginSuccess) {
        onLoginSuccess(); // Например, перенаправить на главную страницу или обновить состояние приложения
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Неверное имя пользователя или пароль. Попробуйте еще раз.');
      // Дополнительная обработка ошибок, например, для разных кодов ответа Keycloak
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
      <h2>Вход</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">Имя пользователя:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', margin: '5px 0' }}
          />
        </div>
        <div>
          <label htmlFor="password">Пароль:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', margin: '5px 0' }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;