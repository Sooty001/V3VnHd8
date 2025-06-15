import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createArt, updateArt, getArtAndAuthorDetails, getArtTags } from '../api/api';

const ArtEditor = () => {
    const navigate = useNavigate();
    const { artId } = useParams();
    const isNewArt = !artId;

    const [loading, setLoading] = useState(isNewArt ? false : true);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        id: artId,
        name: '',
        description: '',
        imageFile: null,
        // Инициализируем теги с пустым name и undefined id для новых артов.
        // При редактировании они не будут использоваться для отображения/изменения.
        tags: [{ id: undefined, name: '' }],
    });
    const [imagePreview, setImagePreview] = useState(null);
    const [currentImageUrl, setCurrentImageUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isNewArt) {
            if (!artId) {
                setError(new Error("Ошибка: ID работы не найден в URL для редактирования."));
                setLoading(false);
                return;
            }

            const fetchArtDetails = async () => {
                setLoading(true);
                try {
                    const artDetails = await getArtAndAuthorDetails(artId);
                    // Теги все равно загружаются, но не используются для formData.tags,
                    // так как они не будут отображаться или отправляться обратно.
                    // const artTags = await getArtTags(artId); // Можно даже не фетчить их, если они не нужны для других целей

                    setFormData({
                        id: artDetails.id,
                        name: artDetails.name || '',
                        description: artDetails.description || '',
                        imageFile: null, // Файл изображения не загружается при редактировании
                        tags: [{ id: undefined, name: '' }], // Для редактирования теги не используются, поэтому сбрасываем или оставляем дефолт
                    });
                    setCurrentImageUrl(artDetails.imageUrl || '');
                    setImagePreview(artDetails.imageUrl || null);
                } catch (err) {
                    setError(new Error(err.message || "Не удалось загрузить данные работы."));
                } finally {
                    setLoading(false);
                }
            };
            fetchArtDetails();
        }
    }, [artId, isNewArt]);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleFileChange = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, imageFile: file }));
            setImagePreview(URL.createObjectURL(file));
        } else {
            setFormData(prev => ({ ...prev, imageFile: null }));
            // При отсутствии нового файла, возвращаемся к текущему URL изображения или null
            setImagePreview(isNewArt ? null : currentImageUrl);
        }
    }, [isNewArt, currentImageUrl]);

    // Эти функции будут использоваться только при создании нового арта
    const handleTagChange = useCallback((index, e) => {
        const { value } = e.target;
        setFormData(prev => {
            const newTags = [...prev.tags];
            newTags[index] = { ...newTags[index], name: value };
            return { ...prev, tags: newTags };
        });
    }, []);

    const addTagField = useCallback(() => {
        setFormData(prev => ({
            ...prev,
            tags: [...prev.tags, { id: undefined, name: '' }] // Новые теги без id
        }));
    }, []);

    const removeTagField = useCallback((index) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter((_, i) => i !== index)
        }));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const dataToSend = new FormData();
        dataToSend.append('name', formData.name);
        dataToSend.append('description', formData.description);

        if (!isNewArt) {
            if (formData.id) {
                dataToSend.append('id', formData.id);
            } else {
                setError(new Error("Не удалось обновить работу: ID отсутствует. Пожалуйста, попробуйте перезагрузить страницу."));
                setIsSubmitting(false);
                return;
            }
        }

        if (formData.imageFile) {
            dataToSend.append('imageFile', formData.imageFile);
        } else if (isNewArt) {
            setError(new Error("Пожалуйста, выберите изображение для работы."));
            setIsSubmitting(false);
            return;
        }

        // Теги добавляются в FormData только при создании нового арта
        if (isNewArt) {
            formData.tags.forEach((tag, index) => {
                if (tag.name.trim()) {
                    // При создании у тегов не будет id, поэтому отправляем только name
                    dataToSend.append(`tags[${index}].name`, tag.name.trim());
                }
            });
        }
        // При редактировании теги не отправляются.

        try {
            if (isNewArt) {
                await createArt(dataToSend);
                navigate('/profile');
            } else {
                await updateArt(dataToSend);
                navigate('/profile');
            }
        } catch (err) {
            setError(new Error(err.response?.data?.message || err.message || "Не удалось сохранить работу."));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="edit-profile-page page-content">
                <div className="loading-indicator">Загрузка данных...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="edit-profile-page page-content">
                <div className="error-message">Ошибка: {error.message}.
                    <button onClick={() => navigate('/profile')}>Назад</button>
                </div>
            </div>
        );
    }

    return (
        <div className="edit-profile-page page-content">
            <h1 className="edit-profile-header">
                {isNewArt ? 'Загрузить новую работу' : 'Редактировать работу'}
            </h1>
            <form onSubmit={handleSubmit} className="edit-profile-form">
                <div className="form-group avatar-upload-group">
                    <label htmlFor="image-upload">Изображение:</label>
                    <div className="preview-container">
                        {(imagePreview || currentImageUrl) && (
                            <img
                                src={imagePreview || currentImageUrl}
                                alt="Предпросмотр изображения"
                                className="current-preview"
                            />
                        )}
                    </div>
                    <input
                        type="file"
                        id="image-upload"
                        accept="image/*"
                        onChange={handleFileChange}
                        // required только при создании нового арта, если еще нет файла
                        required={isNewArt && !formData.imageFile}
                        className="file-input"
                    />
                    <label htmlFor="image-upload" className="upload-button">
                        {formData.imageFile ? 'Изменить изображение' : 'Выбрать изображение'}
                    </label>
                </div>

                <div className="form-group">
                    <label htmlFor="name">Название работы:</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="description">Описание:</label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows="5"
                    ></textarea>
                </div>

                {isNewArt && ( // Секция тегов отображается только при создании нового арта
                    <div className="form-group social-networks-group">
                        <label>Теги:</label>
                        {formData.tags.map((tag, index) => (
                            <div key={index} className="social-network-input-group">
                                <input
                                    type="text"
                                    value={tag.name}
                                    onChange={(e) => handleTagChange(index, e)}
                                    placeholder="Название тега"
                                />
                                {formData.tags.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeTagField(index)}
                                        className="remove-social-btn"
                                    >
                                        Удалить
                                    </button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={addTagField} className="add-social-btn">
                            Добавить тег
                        </button>
                    </div>
                )}

                {error && <div className="error-message">{error.message}</div>}

                <div className="form-actions">
                    <button type="submit" disabled={isSubmitting} className="save-profile-btn">
                        {isSubmitting ? (isNewArt ? 'Загрузка...' : 'Сохранение...') : (isNewArt ? 'Загрузить работу' : 'Сохранить изменения')}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/profile')}
                        disabled={isSubmitting}
                        className="cancel-edit-btn"
                    >
                        Отмена
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ArtEditor;