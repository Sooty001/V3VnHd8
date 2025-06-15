// ArtModal.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  getArtAndAuthorDetails,
  getArtTags,
  getArtComments,
  checkSubscriptionStatus,
  checkLikeStatus,
  toggleSubscription,
  toggleLikeArt,
  postComment,
  getCurrentUserMinInfo,
  deleteArt
} from '../api/api';

const CommentItem = ({ comment }) => {
  let displayTimestamp = 'Invalid Date';

  if (Array.isArray(comment.timestamp) && comment.timestamp.length >= 6) {
    const year = comment.timestamp[0];
    const month = comment.timestamp[1] - 1; // Месяц 0-11
    const day = comment.timestamp[2];
    const hour = comment.timestamp[3];
    const minute = comment.timestamp[4];
    const second = comment.timestamp[5];

    try {
      const date = new Date(year, month, day, hour, minute, second);
      if (!isNaN(date.getTime())) {
        displayTimestamp = date.toLocaleString();
      }
    } catch (e) {
      // Ошибка при создании даты из массива игнорируется, displayTimestamp останется 'Invalid Date'
    }
  } else if (typeof comment.timestamp === 'string') {
    try {
      const date = new Date(comment.timestamp);
      if (!isNaN(date.getTime())) {
        displayTimestamp = date.toLocaleString();
      }
    } catch (e) {
      // Ошибка при парсинге строки даты игнорируется, displayTimestamp останется 'Invalid Date'
    }
  }

  return (
    <li className="comment-item">
      <div className="comment-avatar" style={{ backgroundImage: `url(${comment.authorPhotoUrl || '/default-avatar.png'})` }}></div>
      <div className="comment-content">
        <div className="comment-header">
          <div className="comment-header-left">
            <strong>{comment.user}</strong>
            <span className="comment-timestamp">{displayTimestamp}</span>
          </div>
        </div>
        <p>{comment.text}</p>
      </div>
    </li>
  );
};

const ArtModal = ({ artwork, onClose, onUnlike, onArtDeleted }) => {
  const navigate = useNavigate();
  const [fullArtDetails, setFullArtDetails] = useState(null);
  const [artTags, setArtTags] = useState([]);
  const [artComments, setArtComments] = useState([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [errorDetails, setErrorDetails] = useState(null);
  const [currentUserInfo, setCurrentUserInfo] = useState(null);

  const dominantColor = 'rgba(180, 180, 180, 0.8)';

  const textareaRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (!artwork?.id) {
      setLoadingDetails(false);
      setErrorDetails(new Error("Artwork ID is missing."));
      return;
    }

    const fetchAllArtData = async () => {
      setLoadingDetails(true);
      setErrorDetails(null);
      setFullArtDetails(null);
      setArtTags([]);
      setArtComments([]);
      setIsSubscribed(false);
      setIsLiked(false);

      try {
        const [details, tags, comments, likeStatus, userInfo] = await Promise.all([
          getArtAndAuthorDetails(artwork.id),
          getArtTags(artwork.id),
          getArtComments(artwork.id),
          checkLikeStatus(artwork.id),
          getCurrentUserMinInfo()
        ]);

        setFullArtDetails(details);
        setArtTags(tags.map(tag => tag.name));
        setArtComments(comments.map(comment => ({
          id: comment.id,
          user: comment.authorUserName || 'Аноним',
          authorPhotoUrl: comment.authorPhotoUrl || '/default-avatar.png',
          text: comment.text,
          timestamp: comment.publicationTime
        })));
        setIsLiked(likeStatus);
        setCurrentUserInfo(userInfo);

        if (details.author?.id && userInfo && details.author.id !== userInfo.id) {
          const subStatus = await checkSubscriptionStatus(details.author.id);
          setIsSubscribed(subStatus);
        } else {
          setIsSubscribed(false);
        }

      } catch (err) {
        setErrorDetails(new Error(err.message || "Не удалось загрузить данные."));
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchAllArtData();
  }, [artwork?.id]);

  const handleCommentChange = (e) => {
    setCommentInput(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (commentInput.trim() && artwork?.id) {
      try {
        const newCommentDto = await postComment({
          artId: artwork.id,
          text: commentInput.trim()
        });

        setArtComments(prevComments => [
          {
            id: newCommentDto.id,
            user: currentUserInfo?.userName || 'Current User',
            authorPhotoUrl: currentUserInfo?.photoUrl || '/default-avatar.png',
            text: newCommentDto.text,
            timestamp: newCommentDto.publicationTime || new Date().toISOString()
          },
          ...prevComments
        ]);
        setCommentInput('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      } catch (error) {
        alert("Ошибка при публикации комментария. Попробуйте еще раз.");
      }
    }
  };

  const handleToggleSubscription = async () => {
    if (!fullArtDetails?.author?.id) {
      return;
    }
    if (currentUserInfo && fullArtDetails.author.id === currentUserInfo.id) {
      return;
    }
    try {
      const response = await toggleSubscription(fullArtDetails.author.id);
      const newSubscriptionStatus = !response.deleted;
      setIsSubscribed(newSubscriptionStatus);

      setFullArtDetails(prev => ({
        ...prev,
        author: {
          ...prev.author,
          countSubscribers: (prev.author.countSubscribers || 0) + (newSubscriptionStatus ? 1 : -1)
        }
      }));

    } catch (error) {
      alert("Ошибка при изменении статуса подписки.");
    }
  };

  const handleToggleLike = async () => {
    if (!artwork?.id) {
      return;
    }
    try {
      const newLikeStatus = await toggleLikeArt(artwork.id);
      setIsLiked(newLikeStatus);

      setFullArtDetails(prev => ({
        ...prev,
        countLikes: (prev.countLikes || 0) + (newLikeStatus ? 1 : -1)
      }));

      if (!newLikeStatus && onUnlike && artwork?.id) {
        onUnlike(artwork.id);
      }
    } catch (error) {
      alert("Ошибка при изменении статуса лайка.");
    }
  };

  const handleAuthorClick = useCallback(() => {
    if (fullArtDetails?.author?.id) {
      onClose();
      navigate(`/profile/${fullArtDetails.author.id}`);
    } else {
      // Игнорируем навигацию, если ID автора отсутствует
    }
  }, [fullArtDetails, navigate, onClose]);

  const handleEditArt = useCallback(() => {
    onClose();
    navigate(`/edit-art/${artwork.id}`);
  }, [artwork?.id, navigate, onClose]);

  const handleDeleteArt = useCallback(async () => {
    if (!artwork?.id) {
      return;
    }

    try {
      await deleteArt(artwork.id);
      onClose();
      if (onArtDeleted) {
        onArtDeleted(artwork.id);
      }
    } catch (error) {
      // Ошибка удаления игнорируется
    }
  }, [artwork?.id, onClose, onArtDeleted]);

  const displayedTags = isTagsExpanded ? artTags : artTags.slice(0, 5);
  const isAuthorOfArtwork = currentUserInfo && fullArtDetails?.author?.id === currentUserInfo.id;

  if (loadingDetails) {
    return (
      <div className="art-modal-backdrop" onClick={onClose}>
        <div className="art-modal-loading">
          Загрузка деталей произведения...
        </div>
      </div>
    );
  }

  if (errorDetails) {
    return (
      <div className="art-modal-backdrop" onClick={onClose}>
        <div className="art-modal-error">
          Ошибка загрузки: {errorDetails.message || "Не удалось загрузить данные."}
          <button onClick={onClose}>Закрыть</button>
        </div>
      </div>
    );
  }

  if (!fullArtDetails) {
    return (
      <div className="art-modal-backdrop" onClick={onClose}>
        <div className="art-modal-error">
          Детали произведения не найдены.
          <button onClick={onClose}>Закрыть</button>
        </div>
      </div>
    );
  }

  return (
    <div className="art-modal-backdrop" onClick={onClose}>
      <button className="art-modal__close" onClick={onClose} aria-label="Close artwork view">
        <i className="fa-solid fa-times"></i>
      </button>

      <div ref={modalRef} className="art-modal" onClick={(e) => e.stopPropagation()}>
        <div className="art-modal__body">
          <div className="art-modal__image-container" style={{ '--modal-bg-color': dominantColor }}>
            <img src={fullArtDetails.imageUrl} alt={fullArtDetails.name} className="art-modal__image" />
          </div>

          <div className="art-modal__info">
            <div className="art-modal__author">
              <div
                className="author-avatar"
                style={{ backgroundImage: `url(${fullArtDetails.author?.photoUrl || '/default-avatar.png'})`, cursor: 'pointer' }}
                onClick={handleAuthorClick}
              ></div>
              <span
                className="author-name"
                onClick={handleAuthorClick}
                style={{ cursor: 'pointer' }}
              >
                {fullArtDetails.author?.userName || 'Неизвестный'}
              </span>
              {isAuthorOfArtwork ? (
                <div className="art-modal__owner-actions">
                  <button className="art-modal__edit-btn" onClick={handleEditArt}>
                    Редактировать
                  </button>
                  <button className="art-modal__delete-btn" onClick={handleDeleteArt}>
                    Удалить
                  </button>
                </div>
              ) : (
                fullArtDetails.author?.id && (
                  <button
                    className={` ${isSubscribed ? 'art-modal__following' : 'art-modal__subscribe'}`}
                    onClick={handleToggleSubscription}
                  >
                    {isSubscribed ? 'Отписаться' : 'Подписаться'}
                  </button>
                )
              )}
            </div>
            <div className="divider"></div>
            <h2 className="art-modal__title">{fullArtDetails.name}</h2>
            <p className="art-modal__description">{fullArtDetails.description}</p>

            {artTags.length > 0 && (
              <div className="art-modal__tags">
                {displayedTags.map((tag, index) => <span key={index} className="tag">#{tag}</span>)}
                {artTags.length > 5 && (
                  <button className="tag-toggle" onClick={() => setIsTagsExpanded(!isTagsExpanded)}>
                    {isTagsExpanded ? 'Свернуть' : `+${artTags.length - 5} ещё`}
                  </button>
                )}
              </div>
            )}

            <div className="art-modal__actions">
              <button
                className={`art-modal__like-button ${isLiked ? 'liked' : ''}`}
                onClick={handleToggleLike}
                aria-label={isLiked ? "Unlike artwork" : "Like artwork"}
              >
                <i className={isLiked ? "fa-solid fa-heart" : "fa-regular fa-heart"}></i> {fullArtDetails.countLikes || 0}
              </button>
              <span className="art-modal__views">
                <i className="fa-solid fa-eye"></i> {fullArtDetails.countViews || 0}
              </span>
            </div>

            <div className="art-modal__comments">
              <h4>Комментарии ({artComments?.length || 0})</h4>
              <ul className="comment-list">
                {artComments.length === 0 ? (
                  <li className="no-comments">Пока нет комментариев.</li>
                ) : (
                  (artComments || []).map((comment, index) => (
                    <CommentItem key={comment.id || index} comment={comment} />
                  ))
                )}
              </ul>

              <div className="divider"></div>
              <form className="comment-form" onSubmit={handlePostComment}>
                <textarea
                  ref={textareaRef}
                  placeholder="Добавить комментарий..."
                  value={commentInput}
                  onChange={handleCommentChange}
                  rows="1"
                ></textarea>
                <button
                  type="submit"
                  className={`comment-post ${commentInput.trim() ? 'active' : ''}`}
                  disabled={!commentInput.trim()}
                >
                  Опубликовать
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtModal;