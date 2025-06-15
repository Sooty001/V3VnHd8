// src/api/api.js
import axios from 'axios';

const KEYCLOAK_TOKEN_URL = 'http://localhost:8080/realms/arts-realm/protocol/openid-connect/token';
const BACKEND_BASE_URL = 'http://localhost:8081'; // Ваш бэкенд

// Создаем отдельный экземпляр Axios для запросов к бэкенду,
// который будет обрабатывать токены Keycloak
const authApiClient = axios.create({
  baseURL: BACKEND_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Функции для работы с токенами ---

// Сохранение токенов
const saveTokens = (accessToken, refreshToken, expiresIn, refreshExpiresIn) => {
  const now = Date.now();
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
  // Сохраняем время истечения срока действия токена в миллисекундах
  localStorage.setItem('access_token_expires_at', now + (expiresIn * 1000));
  localStorage.setItem('refresh_token_expires_at', now + (refreshExpiresIn * 1000));
};

// Получение токенов
const getAccessToken = () => localStorage.getItem('access_token');
const getRefreshToken = () => localStorage.getItem('refresh_token');
const getAccessTokenExpiresAt = () => parseInt(localStorage.getItem('access_token_expires_at') || '0', 10);
const getRefreshTokenExpiresAt = () => parseInt(localStorage.getItem('refresh_token_expires_at') || '0', 10);

// Удаление токенов (при выходе)
const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('access_token_expires_at');
  localStorage.removeItem('refresh_token_expires_at');
};

// Проверка, истек ли access token
const isAccessTokenExpired = () => {
  const expiresAt = getAccessTokenExpiresAt();
  return expiresAt > 0 && Date.now() >= expiresAt;
};

// Проверка, истек ли refresh token
const isRefreshTokenExpired = () => {
  const expiresAt = getRefreshTokenExpiresAt();
  return expiresAt > 0 && Date.now() >= expiresAt;
};

// --- Переменная для предотвращения множественных запросов на обновление токена ---
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// --- Интерсептор для запросов (Request Interceptor) ---
// Добавляет access token в заголовок Authorization
authApiClient.interceptors.request.use(
  async (config) => {
    let accessToken = getAccessToken();

    // Если токен есть и он истёк, пытаемся его обновить
    if (accessToken && isAccessTokenExpired()) {
      console.log('Access token expired, attempting to refresh...');
      const refreshToken = getRefreshToken();

      if (refreshToken && !isRefreshTokenExpired()) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const newTokens = await refreshKeycloakToken(refreshToken);
            accessToken = newTokens.access_token;
            // После успешного обновления, разрешаем все запросы из очереди
            processQueue(null, accessToken);
          } catch (refreshError) {
            console.error('Failed to refresh token during request interceptor:', refreshError);
            clearTokens();
            processQueue(refreshError, null); // Отклоняем очередь, если обновление не удалось
            // Можно перенаправить пользователя на страницу логина
            window.location.href = '/login'; 
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        } else {
          // Если обновление уже идет, ставим текущий запрос в очередь
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            config.headers.Authorization = `Bearer ${token}`;
            return config;
          }).catch(err => {
            return Promise.reject(err);
          });
        }
      } else {
        console.warn('Refresh token expired or missing. User needs to re-authenticate.');
        clearTokens();
        window.location.href = '/login'; 
        return Promise.reject(new Error("Refresh token expired. Please log in again."));
      }
    }

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Интерсептор для ответов (Response Interceptor) ---
// Обрабатывает 401 Unauthorized и пытается обновить токен
authApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Если получили 401 (Unauthorized) и это не запрос на обновление токена,
    // и этот запрос еще не был повторен
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Помечаем, что запрос был отправлен повторно

      const refreshToken = getRefreshToken();

      if (refreshToken && !isRefreshTokenExpired()) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const newTokens = await refreshKeycloakToken(refreshToken);
            const accessToken = newTokens.access_token;

            isRefreshing = false;
            processQueue(null, accessToken); // Разрешаем все отложенные запросы с новым токеном

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return authApiClient(originalRequest); // Повторяем оригинальный запрос с новым токеном

          } catch (refreshError) {
            isRefreshing = false;
            processQueue(refreshError, null); // Отклоняем все отложенные запросы из-за ошибки обновления

            console.error('Failed to refresh token on 401 response:', refreshError);
            clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        } else {
          // Если обновление уже идет, ставим текущий запрос в очередь
          return new Promise(function(resolve, reject) {
            failedQueue.push({ resolve, reject });
          })
          .then(token => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return authApiClient(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
        }
      } else {
        console.warn('Refresh token expired or missing. User needs to re-authenticate.');
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// --- Основные функции аутентификации Keycloak ---

// Функция логина
export const loginKeycloak = async (username, password) => {
  const params = new URLSearchParams();
  params.append('client_id', 'arts-app');
  params.append('grant_type', 'password');
  params.append('username', username);
  params.append('password', password);
  params.append('scope', 'openid');

  try {
    const response = await axios.post(KEYCLOAK_TOKEN_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    const { access_token, refresh_token, expires_in, refresh_expires_in } = response.data;
    saveTokens(access_token, refresh_token, expires_in, refresh_expires_in);
    return response.data;
  } catch (error) {
    console.error('Keycloak login failed:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Функция обновления токена
export const refreshKeycloakToken = async (refreshToken) => {
  const params = new URLSearchParams();
  params.append('client_id', 'arts-app');
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken);
  params.append('scope', 'openid');

  try {
    const response = await axios.post(KEYCLOAK_TOKEN_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    const { access_token, refresh_token, expires_in, refresh_expires_in } = response.data;
    saveTokens(access_token, refresh_token, expires_in, refresh_expires_in);
    console.log('Token refreshed successfully!');
    return response.data;
  } catch (error) {
    console.error('Keycloak token refresh failed:', error.response ? error.response.data : error.message);
    clearTokens(); // Очищаем токены, если не удалось обновить
    throw error;
  }
};

// Функция логаута
export const logoutKeycloak = () => {
  clearTokens();
  // Опционально: можно отправить запрос на эндпоинт Keycloak для логаута,
  // если вы хотите аннулировать сессию на сервере Keycloak.
};

// --- НОВЫЕ ФУНКЦИИ ДЛЯ РЕГИСТРАЦИИ ---

/**
 * Шаг 1: Регистрация пользователя в Keycloak.
 * @param {string} username
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} Объект с id, username, email из Keycloak.
 */
export const registerUserInKeycloak = async (username, email, password) => {
  try {
    const response = await authApiClient.post('/keycloak/register', {
      username,
      email,
      password,
    });
    console.log('Registered in Keycloak:', response.data);
    return response.data; // KeycloakUserDto {id, username, email}
  } catch (error) {
    console.error('Keycloak registration failed:', error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * Шаг 2: Регистрация пользователя в вашей БД (создание профиля).
 * Требует ID, полученного из Keycloak, и желаемого никнейма.
 * @param {string} keycloakId ID пользователя из Keycloak.
 * @param {string} username Желаемый никнейм пользователя.
 * @returns {Promise<Object>} Объект UserDto {userName, description, photoUrl, ...}
 */
export const registerUserProfile = async (keycloakId, username) => {
  try {
    // Важно: для этого запроса может потребоваться аутентификация,
    // если ваш /users/register эндпоинт защищен.
    // Если он разрешен для неаутентифицированных пользователей,
    // то можно использовать обычный axios.post, но authApiClient уже добавляет токен,
    // если он есть (например, если пользователь уже залогинен, но регистрирует новый аккаунт - маловероятно).
    // Если этот эндпоинт не требует токена, то текущий authApiClient подойдет,
    // так как он просто не добавит заголовок Authorization, если токена нет.
    const response = await authApiClient.post('/users/register', {
      id: keycloakId, // Это UUID из KeycloakUserDto
      userName: username,
    });
    console.log('User profile registered in backend:', response.data);
    return response.data; // UserDto
  } catch (error) {
    console.error('User profile registration failed:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// --- API для главной страницы ---

// GET /arts/feed
// type: trending, recommended, following (по умолчанию trending)
// page: номер страницы (начинается с 0 на бэкенде)
// size: количество элементов на странице
export const getFeedArtworks = async (type = 'trending', page = 0, size = 12) => {
  try {
    const response = await authApiClient.get('/arts/feed', {
      params: {
        type: type,
        page: page,
        size: size
      }
    });
    // --- ИСПРАВЛЕНИЕ ЗДЕСЬ: Возвращаем весь response.data ---
    console.log(`API: getFeedArtworks for type ${type} success:`, response.data);
    return response.data; // Теперь возвращаем полный объект ответа бэкенда
  } catch (error) {
    console.error(`Error fetching artworks feed for type ${type}:`, error);
    // Возвращаем пустую структуру, чтобы не сломать клиент
    return { content: [], totalElements: 0, totalPages: 0, number: page };
  }
};

// --- API для модального окна (деталей произведения) ---

// 1. GET /arts/with-author (детали арта и автора) - Путь уже был правильный
export const getArtAndAuthorDetails = async (id) => {
  try {
    const response = await authApiClient.get('/arts/with-author', {
      params: { id: id }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching art and author details for ${id}:`, error);
    throw error;
  }
};

// 2. GET /tags/art (теги для арта) - ИСПРАВЛЕНО: с /arts/tags на /tags/art
export const getArtTags = async (id) => {
  try {
    const response = await authApiClient.get('/tags/art', { // <-- ИСПРАВЛЕНО ЗДЕСЬ
      params: { id: id }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching tags for art ${id}:`, error);
    throw error;
  }
};

// 3. GET /comments/art (комментарии для арта) - ИСПРАВЛЕНО: с /arts/comments на /comments/art
export const getArtComments = async (id, page = 1, size = 12) => {
  try {
    const response = await authApiClient.get('/comments/art', { // <-- ИСПРАВЛЕНО ЗДЕСЬ
      params: {
        id: id,
        page: page,
        size: size
      }
    });
    return response.data.content;
  } catch (error) {
    console.error(`Error fetching comments for art ${id}:`, error);
    throw error;
  }
};

// 4. GET /users/subscribe (проверка подписки на автора) - ИСПРАВЛЕНО: с /arts/subscribe на /users/subscribe
export const checkSubscriptionStatus = async (targetId) => { // Переименовал authorId в targetId для ясности
  try {
    const response = await authApiClient.get(`/users/subscribe?id=${targetId}`); // GET запрос
    return response.data; // Это будет true (подписан) или false (не подписан)
  } catch (error) {
    console.error("Failed to check subscription status:", error.response ? error.response.data : error.message);
    return false; // В случае ошибки считаем, что не подписан
  }
};

// 5. GET /arts/like (проверка лайка) - Путь уже был правильный
export const checkLikeStatus = async (artId) => {
  try {
    const response = await authApiClient.get('/arts/like', {
      params: { id: artId }
    });
    return response.data;
  } catch (error) {
    console.error(`Error checking like status for ${artId}:`, error);
    return false;
  }
};

export const getCurrentUserMinInfo = async () => {
  try {
    const response = await authApiClient.get('/users/me/min');
    return response.data; // Возвращаем UserMinDto
  } catch (error) {
    console.error("Error fetching current user info:", error);
    // В случае ошибки, возможно, стоит вернуть null или дефолтный объект,
    // чтобы не блокировать UI
    return null; 
  }
};

// --- API для действий пользователя в модальном окне (POST запросы) ---

// 1. POST /users/subscribe (подписаться/отписаться) - ИСПРАВЛЕНО: с /arts/subscribe на /users/subscribe
export const toggleSubscription = async (targetId) => {
  try {
    const response = await authApiClient.post(`/users/subscribe?id=${targetId}`); // POST запрос
    // Возвращает объект { ..., deleted: true/false }
    console.log(`API: toggleSubscription for ${targetId} returned:`, response.data);
    return response.data; // Возвращаем весь объект
  } catch (error) {
    console.error("Failed to toggle subscription:", error.response ? error.response.data : error.message);
    throw error;
  }
};

// 2. POST /arts/like (поставить/убрать лайк) - Путь уже был правильный
export const toggleLikeArt = async (artId) => {
  try {
    const response = await authApiClient.post('/arts/like', null, {
      params: { id: artId }
    });
    return response.data;
  } catch (error) {
    console.error(`Error toggling like for art ${artId}:`, error);
    throw error;
  }
};

// 3. POST /comments/art (добавить комментарий) - ИСПРАВЛЕНО: с /arts/comment на /comments/art
export const postComment = async (commentData) => {
  try {
    const response = await authApiClient.post('/comments/art', commentData); // <-- ИСПРАВЛЕНО ЗДЕСЬ
    return response.data;
  } catch (error) {
    console.error('Error posting comment:', error);
    throw error;
  }
};

// GET /arts/likes
// page: номер страницы (начинается с 0 на бэкенде, но в коде React будем использовать 1-based, чтобы не путаться)
// size: количество элементов на странице
export const getLikedArtworks = async (page = 1, size = 12) => {
  try {
    const response = await authApiClient.get('/arts/likes', { // Использование authApiClient
      params: {
        page: page, // Отправляем как есть, если ваш бэкенд ожидает 1-based индексацию
        size: size
      }
    });
    // --- ИСПРАВЛЕНИЕ ЗДЕСЬ: Возвращаем весь response.data ---
    console.log(`API: getLikedArtworks success for page ${page}, size ${size}:`, response.data);
    return response.data; // Теперь возвращаем полный объект ответа бэкенда
  } catch (error) {
    console.error("Error fetching liked artworks:", error);
    // Важно вернуть объект с ожидаемой структурой в случае ошибки
    return { content: [], totalElements: 0, totalPages: 0, number: page };
  }
};

// --- НОВЫЕ API ДЛЯ ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ ---

// GET /users
export const getUserProfile = async (userId) => {
  try {
    const response = await authApiClient.get('/users', { // Использование authApiClient
      params: { id: userId }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching user profile for ID ${userId}:`, error);
    throw error;
  }
};

// GET /users/arts
// userId: ID пользователя
// page: номер страницы (начинается с 0 на бэкенде, но в коде React будем использовать 1-based для согласованности)
// size: количество элементов на странице
export const getUserArtworks = async (userId, page = 1, size = 12) => {
  try {
    const response = await authApiClient.get('/users/arts', { // Использование authApiClient
      params: { 
        id: userId,
        page: page, // Отправляем как есть, если ваш бэкенд ожидает 1-based индексацию
        size: size
      }
    });
    // --- ИСПРАВЛЕНИЕ ЗДЕСЬ: Возвращаем весь response.data ---
    console.log(`API: getUserArtworks success for user ${userId}, page ${page}, size ${size}:`, response.data);
    return response.data; // Теперь возвращаем полный объект ответа бэкенда
  } catch (error) {
    console.error(`Error fetching artworks for user ID ${userId}:`, error);
    // Важно вернуть объект с ожидаемой структурой в случае ошибки
    return { content: [], totalElements: 0, totalPages: 0, number: page };
  }
};

// GET /users/social-networks
export const getUserSocialNetworks = async (userId) => {
  try {
    const response = await authApiClient.get('/users/social-networks', { // Использование authApiClient
      params: { id: userId }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching social networks for user ID ${userId}:`, error);
    throw error;
  }
};

/**
 * Получает минимальную информацию о текущем авторизованном пользователе.
 * Используется для отображения иконки пользователя в хедере.
 * GET http://localhost:8081/users/me/min
 * Возвращает: { id: UUID, userName: String, photoUrl: String }
 */
export const getCurrentUserMin = async () => {
    try {
        const response = await authApiClient.get('/users/me/min');
        console.log("API: getCurrentUserMin success:", response.data);
        return response.data; // { id, userName, photoUrl }
    } catch (error) {
        console.error("API: Error fetching current user min data:", error.response?.data || error.message);
        return null; // В случае ошибки возвращаем null или дефолтное значение
    }
};

/**
 * Осуществляет поиск артов по названию.
 * GET http://localhost:8081/arts/search?query={query}&page={page}&size={size}
 * Возвращает: Page<ArtCardDto>
 */
export const searchArtsByName = async (query = '', page = 1, size = 12) => {
    try {
        const response = await authApiClient.get('/arts/search', {
            params: { query, page, size }
        });
        console.log(`API: searchArtsByName for "${query}" success:`, response.data);
        return response.data; // Page<ArtCardDto> - Это уже правильно возвращает весь объект
    } catch (error) {
        console.error(`API: Error searching arts for query "${query}":`, error.response?.data || error.message);
        // Возвращаем пустую страницу в случае ошибки
        return { content: [], totalPages: 0, totalElements: 0, number: page -1 };
    }
};

/**
 * Получает полную информацию о текущем авторизованном пользователе.
 * GET http://localhost:8081/users/me
 * @returns {Promise<UserDto>}
 */
export const getCurrentUserProfile = async () => {
    try {
        const response = await authApiClient.get('/users/me');
        console.log("API: getCurrentUserProfile success:", response.data);
        return response.data; // Возвращаем UserDto
    } catch (error) {
        console.error("API: Error fetching current user profile:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Обновляет информацию о текущем пользователе.
 * PUT http://localhost:8081/users/me
 * @param {FormData} userData - FormData объект, содержащий userName, description, avatarFile, socialNetwork.
 * Важно: avatarFile должен быть типа File. SocialNetwork должен быть JSON-строкой,
 * если отправляется через FormData.
 * @returns {Promise<UserDto>}
 */
export const updateCurrentUserProfile = async (userData) => {
    try {
        // Убедитесь, что 'Content-Type' установлен как 'multipart/form-data'
        // Axios обычно сам устанавливает это, если вы отправляете FormData,
        // но иногда полезно явно указать, если возникают проблемы.
        const response = await authApiClient.put('/users/me', userData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        console.log("API: updateCurrentUserProfile success:", response.data);
        return response.data;
    } catch (error) {
        console.error("API: Error updating current user profile:", error.response?.data || error.message);
        throw error;
    }
};

// --- НОВЫЕ API ДЛЯ ПОДПИСОК ---

/**
 * Получает список авторов, на которых подписан текущий пользователь,
 * вместе с несколькими последними работами каждого автора.
 * GET http://localhost:8081/users/subs-with-arts
 * @param {number} artsPerAuthor Количество артов на автора (по умолчанию 3)
 * @param {number} page Номер страницы (по умолчанию 1)
 * @param {number} size Количество элементов на странице (по умолчанию 12)
 * @returns {Promise<Page<SubWithArtsDto>>}
 */
export const getSubscriptionsWithArts = async (artsPerAuthor = 3, page = 1, size = 12) => { // <--- ИЗМЕНИТЕ ЗДЕСЬ
    try {
        const response = await authApiClient.get('/users/subs-with-arts', {
            params: {
                artsPerAuthor, // Теперь передаем artsPerAuthor
                page,
                size
            }
        });
        console.log("API: getSubscriptionsWithArts success:", response.data);
        return response.data;
    } catch (error) {
        console.error("API: Error fetching subscriptions with arts:", error.response?.data || error.message);
        throw error;
    }
};

// --- НОВАЯ ФУНКЦИЯ ДЛЯ ЗАГРУЗКИ АРТА ---

/**
 * Отправляет запрос на создание нового арта.
 * POST http://localhost:8081/arts
 * @param {FormData} artData - Объект FormData, содержащий 'name', 'description', 'imageFile', 'tags'
 * @returns {Promise<Object>} Созданный ArtCreateDto
 */
export const createArt = async (artData) => {
    try {
        const response = await authApiClient.post('/arts', artData, {
            headers: {
                'Content-Type': 'multipart/form-data', // Обязательно для отправки файлов и других полей как @ModelAttribute
            },
        });
        console.log("API: createArt success:", response.data);
        return response.data;
    } catch (error) {
        console.error("API: Error creating art:", error.response?.data || error.message);
        throw error;
    }
};

// --- НОВЫЕ ФУНКЦИИ ДЛЯ РЕДАКТИРОВАНИЯ И УДАЛЕНИЯ АРТА ---

/**
 * Отправляет запрос на обновление работы (арта).
 * PUT http://localhost:8081/arts
 * @param {FormData} artData - Объект FormData, содержащий 'id', 'name', 'description', 'imageFile' (опционально), 'nsfw', 'tags'
 * @returns {Promise<Object>} Обновленный ArtDto
 */
export const updateArt = async (artData) => {
    try {
        const response = await authApiClient.put('/arts', artData, {
            headers: {
                'Content-Type': 'multipart/form-data', // Важно для FormData
            },
        });
        console.log("API: updateArt success:", response.data);
        return response.data;
    } catch (error) {
        console.error("API: Error updating art:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Отправляет запрос на удаление работы (арта).
 * DELETE http://localhost:8081/arts?id={artId}
 * @param {string} artId - ID арта для удаления
 * @returns {Promise<void>}
 */
export const deleteArt = async (artId) => {
    try {
        await authApiClient.delete(`/arts?id=${artId}`);
        console.log("API: deleteArt success for ID:", artId);
    } catch (error) {
        console.error("API: Error deleting art:", error.response?.data || error.message);
        throw error;
    }
};

// Экспортируем настроенный экземпляр Axios, чтобы использовать его напрямую, если нужно
export default authApiClient;

// Также экспортируем вспомогательные функции для работы с токенами
export { getAccessToken, getRefreshToken, isAccessTokenExpired, isRefreshTokenExpired, clearTokens};