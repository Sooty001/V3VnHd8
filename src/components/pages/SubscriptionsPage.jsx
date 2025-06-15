import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getSubscriptionsWithArts,
  toggleSubscription
} from '../../api/api';
import './SubscriptionsPage.css';

const SubscriptionsPage = () => {
  const [subscribedAuthorsData, setSubscribedAuthorsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedArt, setSelectedArt] = useState(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(12);
  const [hasMore, setHasMore] = useState(true);
  const loadingRef = useRef(false);

  const navigate = useNavigate();

  const fetchSubscriptions = useCallback(async (pageToLoad, append = false) => {
    if (loadingRef.current) {
      return;
    }
    loadingRef.current = true;
    setLoading(true);

    const response = await getSubscriptionsWithArts(0, pageToLoad + 1, pageSize);

    const responseContent = response.content || [];
    const totalElements = response.totalElements || 0;

    setSubscribedAuthorsData(prevData => {
      const newAuthors = append ? [...prevData, ...responseContent] : responseContent;
      
      const currentLoadedCount = newAuthors.length;
      const moreAvailable = currentLoadedCount < totalElements;
      setHasMore(moreAvailable);

      return newAuthors;
    });

    setCurrentPage(pageToLoad);

    setLoading(false);
    loadingRef.current = false;
  }, [pageSize]);

  useEffect(() => {
    setSubscribedAuthorsData([]);
    setCurrentPage(0);
    setHasMore(true);
    loadingRef.current = false;
    fetchSubscriptions(0, false);
  }, [fetchSubscriptions]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollThreshold = 100;
      const isAtBottom = (window.innerHeight + document.documentElement.scrollTop + scrollThreshold) >= document.documentElement.offsetHeight;
      
      if (isAtBottom && !loadingRef.current && hasMore) {
        fetchSubscriptions(currentPage + 1, true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [loadingRef, hasMore, currentPage, fetchSubscriptions]);

  const handleAuthorClick = useCallback((authorId) => {
    navigate(`/profile/${authorId}`);
  }, [navigate]);

  const handleToggleSubscription = async (authorId) => {
    const response = await toggleSubscription(authorId);
    const isDeleted = response.deleted;

    if (isDeleted) {
      setSubscribedAuthorsData(prevData => prevData.filter(sub => sub.id !== authorId));
    }
  };

  const renderContent = () => {
    if (loading && subscribedAuthorsData.length === 0) {
      return <div className="loading-indicator">Загрузка подписок...</div>;
    }

    if (subscribedAuthorsData.length === 0 && !loading) {
      return <div className="empty-state">Вы пока не подписаны ни на одного автора.</div>;
    }

    return (
      <div className="authors-list">
        {subscribedAuthorsData.map(sub => (
          <div key={sub.id} className="author-card">
            <div className="author-info" onClick={() => handleAuthorClick(sub.id)}>
              <img src={sub.photoUrl || '/default-avatar.png'} alt={sub.userName} className="author-avatarq" />
              <div className="author-detailsq">
                <p className="author-nameq">{sub.userName}</p>
              </div>
            </div>
            <button
              className="following-btn"
              onClick={() => handleToggleSubscription(sub.id)}
            >
              Отписаться
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="subscriptions-page page-content">
      <h1 className="subscriptions-header">Мои подписки</h1>
      {renderContent()}
    </div>
  );
};

export default SubscriptionsPage;