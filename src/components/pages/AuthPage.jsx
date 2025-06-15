// src/components/pages/AuthPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // Импортируем useAuth
import './AuthPage.css';

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const navigate = useNavigate();

    const toggleForm = () => {
        setIsLogin(!isLogin);
        setError(null); // Очищаем ошибки при переключении формы
    };

    return (
        <div className="auth-page-container">
            <div className="auth-box">
                <div className="auth-header">
                    <h2>ArtVista</h2>
                    <p>{isLogin ? 'Добро пожаловать обратно! Пожалуйста, войдите в свой аккаунт.' : 'Создайте учетную запись.'}</p>
                </div>

                {isLogin ? <LoginForm navigate={navigate} /> : <RegisterForm navigate={navigate} />}

                <div className="switch-form">
                    {isLogin ? "У вас нет учетной записи? " : "У вас уже есть учетная запись? "}
                    <button onClick={toggleForm} className="switch-link">
                        {isLogin ? 'Зарегистрироваться' : 'Войти'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const LoginForm = ({ navigate }) => {
    const [username, setUsername] = useState(''); // Keycloak login uses username, not email by default
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { login } = useAuth(); // Получаем функцию login из контекста

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await login(username, password);
            navigate('/'); // Перенаправляем на главную страницу после успешного входа
        } catch (err) {
            console.error('Login failed:', err);
            setError(err.response?.data?.error_description || 'Неверные учетные данные. Пожалуйста, попробуйте еще раз.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
                <label htmlFor="login-username">Имя пользователя</label> {/* Изменено на "Имя пользователя" */}
                <input
                    id="login-username"
                    type="text" // Может быть email, если Keycloak настроен на логин по email
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Введите ваше имя пользователя"
                    required
                />
            </div>
            <div className="form-group">
                <label htmlFor="login-password">Пароль</label>
                <div className="password-wrapper">
                    <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Введите ваш пароль"
                        required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle">
                        {showPassword ? <i className="fa-regular fa-eye-slash"></i> : <i className="fa-regular fa-eye"></i>}
                    </button>
                </div>
            </div>
            {error && <p className="error-message">{error}</p>}
            <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Вход...' : 'Войти'}
            </button>
        </form>
    );
};

const RegisterForm = ({ navigate }) => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { register } = useAuth(); // Получаем функцию register из контекста

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await register(username, email, password);
            navigate('/'); // Перенаправляем на главную страницу после успешной регистрации и автоматического входа
        } catch (err) {
            console.error('Registration failed:', err);
            setError(err.response?.data?.message || 'Ошибка регистрации. Возможно, имя пользователя или email уже заняты.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="auth-form">
             <div className="form-group">
                <label htmlFor="register-username">Имя пользователя</label>
                <input
                    id="register-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Придумайте имя пользователя"
                    required
                />
            </div>
            <div className="form-group">
                <label htmlFor="register-email">Email</label>
                <input
                    id="register-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Введите ваш email"
                    required
                />
            </div>
            <div className="form-group">
                <label htmlFor="register-password">Пароль</label>
                <div className="password-wrapper">
                    <input
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Придумайте пароль"
                        required
                    />
                     <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle">
                        {showPassword ? <i className="fa-regular fa-eye-slash"></i> : <i className="fa-regular fa-eye"></i>}
                    </button>
                </div>
            </div>
            {error && <p className="error-message">{error}</p>}
            <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Регистрация...' : 'Создать аккаунт'}
            </button>
        </form>
    );
};

export default AuthPage;