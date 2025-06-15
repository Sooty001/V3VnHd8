// src/components/pages/EditProfilePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUserProfile, updateCurrentUserProfile, getUserSocialNetworks } from '../../../api/api';

const EditProfilePage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        id: null, // Добавили поле id для хранения UUID пользователя
        userName: '',
        description: '',
        avatarFile: null,
        photoUrl: '',
        socialNetworks: [],
    });
    const [newAvatarPreview, setNewAvatarPreview] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchUserProfileAndSocialNetworks = async () => {
            setLoading(true);
            try {
                const userDto = await getCurrentUserProfile();

                let socialNetworksData = [];
                if (userDto && userDto.id) {
                    try {
                        socialNetworksData = await getUserSocialNetworks(userDto.id);
                    } catch (socialNetError) {
                        console.warn("Could not fetch social networks for user ID:", userDto.id, socialNetError);
                        socialNetworksData = [];
                    }
                }

                setFormData({
                    id: userDto.id || null, // Сохраняем ID пользователя
                    userName: userDto.userName || '',
                    description: userDto.description || '',
                    photoUrl: userDto.photoUrl || '/default-avatar.png',
                    avatarFile: null,
                    socialNetworks: socialNetworksData || [],
                });
                setNewAvatarPreview(null);
            } catch (err) {
                console.error("Failed to fetch user profile for editing:", err);
                setError(new Error(err.message || "Не удалось загрузить данные профиля."));
            } finally {
                setLoading(false);
            }
        };
        fetchUserProfileAndSocialNetworks();
    }, []);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleFileChange = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, avatarFile: file }));
            setNewAvatarPreview(URL.createObjectURL(file));
        } else {
            setFormData(prev => ({ ...prev, avatarFile: null }));
            setNewAvatarPreview(null);
        }
    }, []);

    const handleSocialNetworkChange = useCallback((index, e) => {
        const { value } = e.target;
        setFormData(prev => {
            const newSocialNetworks = [...prev.socialNetworks];
            newSocialNetworks[index] = { link: value };
            return { ...prev, socialNetworks: newSocialNetworks };
        });
    }, []);

    const addSocialNetworkField = useCallback(() => {
        setFormData(prev => ({
            ...prev,
            socialNetworks: [...prev.socialNetworks, { link: '' }]
        }));
    }, []);

    const removeSocialNetworkField = useCallback((index) => {
        setFormData(prev => ({
            ...prev,
            socialNetworks: prev.socialNetworks.filter((_, i) => i !== index)
        }));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        const dataToSend = new FormData();
        // dataToSend.append('id', ); // тут надо бэку возвращать id пользователя которого редактируем
        
        // --- Добавляем ID пользователя в FormData ---
        if (formData.id) {
            dataToSend.append('id', formData.id); 
        }
        // ------------------------------------------

        dataToSend.append('userName', formData.userName);
        dataToSend.append('description', formData.description);

        if (formData.avatarFile) {
            dataToSend.append('avatarFile', formData.avatarFile);
        }

        formData.socialNetworks.forEach((network, index) => {
            if (network.link) {
                // Если ваш бэкенд ожидает JSON-строку для socialNetworks, то:
                // dataToSend.append(`socialNetworks[${index}]`, JSON.stringify(network));
                // ИЛИ, если он ожидает простые поля, как в вашем текущем коде:
                dataToSend.append(`socialNetwork[${index}].link`, network.link);
            }
        });

        try {
            await updateCurrentUserProfile(dataToSend);
            navigate('/profile');
        } catch (err) {
            console.error("Failed to update user profile:", err);
            setError(new Error(err.message || "Не удалось обновить профиль."));
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="edit-profile-page page-content">
                <div className="loading-indicator">Загрузка профиля...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="edit-profile-page page-content">
                <div className="error-message">Ошибка: {error.message}. <button onClick={() => navigate('/profile')}>Назад к профилю</button></div>
            </div>
        );
    }

    return (
        <div className="edit-profile-page page-content">
            <h1 className="edit-profile-header">Редактировать профиль</h1>
            <form onSubmit={handleSubmit} className="edit-profile-form">
                <div className="form-group avatar-upload-group">
                    <label htmlFor="avatar-upload">Аватар:</label>
                    <div className="avatar-preview-container">
                        <img
                            src={newAvatarPreview || formData.photoUrl}
                            alt="Аватар пользователя"
                            className="current-avatar-preview"
                        />
                    </div>
                    <input
                        type="file"
                        id="avatar-upload"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="file-input"
                    />
                    <label htmlFor="avatar-upload" className="upload-button">
                        Выбрать новый аватар
                    </label>
                </div>

                <div className="form-group">
                    <label htmlFor="userName">Имя пользователя:</label>
                    <input
                        type="text"
                        id="userName"
                        name="userName"
                        value={formData.userName}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="description">О себе:</label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows="5"
                    ></textarea>
                </div>

                <div className="form-group social-networks-group">
                    <label>Социальные сети:</label>
                    {formData.socialNetworks.map((network, index) => (
                        <div key={index} className="social-network-input-group">
                            <input
                                type="url"
                                value={network.link}
                                onChange={(e) => handleSocialNetworkChange(index, e)}
                                placeholder="Ссылка на соц. сеть (например, https://instagram.com/user)"
                            />
                            <button
                                type="button"
                                onClick={() => removeSocialNetworkField(index)}
                                className="remove-social-btn"
                            >
                                Удалить
                            </button>
                        </div>
                    ))}
                    <button type="button" onClick={addSocialNetworkField} className="add-social-btn">
                        Добавить социальную сеть
                    </button>
                </div>

                <div className="form-actions">
                    <button type="submit" disabled={isSaving} className="save-profile-btn">
                        {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>
                    <button type="button" onClick={() => navigate('/profile')} disabled={isSaving} className="cancel-edit-btn">
                        Отмена
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditProfilePage;