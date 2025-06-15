// src/data/mock_data.js (Оставь только то, что используешь как заглушки)

const user = {
    name: 'Sonya', // Эти данные будут заменены реальными из AuthContext
    nickname: '@sonya_art',
    avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
};

const authors = [
    { id: 1, name: 'Anna K.', avatarUrl: 'https://i.pravatar.cc/48?u=1' },
    { id: 2, name: 'Mike S.', avatarUrl: 'https://i.pravatar.cc/48?u=2' },
    { id: 3, name: 'Julia R.', avatarUrl: 'https://i.pravatar.cc/48?u=3' },
    { id: 4, name: 'Tom H.', avatar: 'https://i.pravatar.cc/48?u=4' },
    { id: 5, name: 'Emma W.', avatar: 'https://i.pravatar.cc/48?u=5' },
    { id: 6, name: 'Lucas B.', avatar: 'https://i.pravatar.cc/48?u=6' },
];

// Эти будут генерироваться динамически в Layout,
// но ты можешь оставить их как дефолтные, если они используются где-то еще.
// Или полностью удалить и передавать только динамические.
const sidebarMenuItems = [
    { id: 'home', text: 'Home', icon: 'home', isBottom: false },
    { id: 'profile', text: 'Profile', icon: 'user', isBottom: false },
    { id: 'liked', text: 'Liked arts', icon: 'heart', isBottom: false },
    { id: 'subscriptions', text: 'Subscriptions', icon: 'users', isBottom: false }, // Добавил для полноты
    { id: 'settings', text: 'Settings', icon: 'cog', isBottom: true },
    // { id: 'help', text: 'Help', icon: 'question-circle', isBottom: true }, // Удаляем
    // { id: 'login', text: 'Login', icon: 'comment', isBottom: true }, // Удаляем
    { id: 'feedback', text: 'Feedback', icon: 'comment', isBottom: true },
];

const profileMenuItems = [
    { id: 'profile', text: 'Profile', icon: 'user' },
    { id: 'switch-account', text: 'Switch Account', icon: 'exchange-alt' },
    { id: 'logout', text: 'Sign Out', icon: 'sign-out-alt' }, // Переименовал в logout
    { isDivider: true },
    { id: 'language', text: 'Language', icon: 'globe' },
    { id: 'theme', text: 'Theme', icon: 'paint-brush' },
    { isDivider: true },
    { id: 'settings', text: 'Settings', icon: 'cog' },
    // { id: 'help', text: 'Help', icon: 'question-circle' }, // Удаляем
    { id: 'feedback', text: 'Feedback', icon: 'comment' },
];

export { user, authors, sidebarMenuItems, profileMenuItems };