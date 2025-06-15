import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';

import ProfileHeader from './ProfileHeader';
import ProfileStats from './ProfileStats';
import ArtGallery from '../../ArtGallery';
import ArtModal from '../../ArtModal';

import {
  getCurrentUserProfile,
  getUserProfile,
  getUserArtworks,
  getUserSocialNetworks,
  checkSubscriptionStatus,
  toggleSubscription,
  getCurrentUserMin
} from '../../../api/api';
import './ProfilePage.css';

const ProfilePage = () => {
  const { userId: profileIdFromUrl } = useParams(); 

  const [profileData, setProfileData] = useState(null);
  const [userArtworks, setUserArtworks] = useState([]);
  const [userSocials, setUserSocials] = useState([]);
  const [isSubscribedToUser, setIsSubscribedToUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedArt, setSelectedArt] = useState(null);

  const [currentLoggedInUserId, setCurrentLoggedInUserId] = useState(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(12);
  const [hasMoreArtworks, setHasMoreArtworks] = useState(true);
  const loadingArtworksRef = useRef(false);

  const fetchUserArtworksList = useCallback(async (userId, pageToLoad, append = false) => {
    if (!userId) {
      setLoading(false);
      loadingArtworksRef.current = false;
      setHasMoreArtworks(false);
      return;
    }

    if (loadingArtworksRef.current) {
      return;
    }
    loadingArtworksRef.current = true;

    try {
      const apiResult = await getUserArtworks(userId, pageToLoad + 1, pageSize);

      let responseContent = [];
      let totalElementsFromApi = 0;

      if (apiResult && typeof apiResult === 'object') {
        responseContent = apiResult.content || [];
        totalElementsFromApi = apiResult.totalElements || 0;
      } else {
        setHasMoreArtworks(false);
        loadingArtworksRef.current = false;
        return;
      }

      const transformedArtworks = (responseContent || []).map(art => {
        if (!art || !art.id || !art.imageUrl) {
          return null;
        }
        return {
          id: art.id,
          title: art.name,
          src: art.imageUrl,
          author: profileData?.name || 'Неизвестный автор',
          authorAvatar: profileData?.avatar || 'https://i.pravatar.cc/48?u=random',
          likes: art.countLikes,
          views: art.countViews,
          publicationTime: art.publicationTime,
        };
      }).filter(Boolean);

      setUserArtworks(prevArtworks => {
        const newArtworks = append ? [...prevArtworks, ...transformedArtworks] : transformedArtworks;
        
        const currentLoadedCount = newArtworks.length;
        const totalExpected = totalElementsFromApi;

        const moreAvailable = currentLoadedCount < totalExpected;
        setHasMoreArtworks(moreAvailable);

        return newArtworks;
      });

      setCurrentPage(pageToLoad);

    } catch (err) {
      setError(err);
      setUserArtworks(append ? userArtworks : []);
      setHasMoreArtworks(false);
    } finally {
      loadingArtworksRef.current = false;
    }
  }, [pageSize, profileData?.name, profileData?.avatar]);

  useEffect(() => {
    const fetchAllProfileData = async () => {
      setLoading(true);
      setError(null);
      setUserArtworks([]);
      setCurrentPage(0);
      setHasMoreArtworks(true);
      loadingArtworksRef.current = false;

      try {
        const currentUserMin = await getCurrentUserMin();
        const loggedInUserId = currentUserMin ? currentUserMin.id : null;
        setCurrentLoggedInUserId(loggedInUserId);

        const targetUserId = profileIdFromUrl || loggedInUserId;

        if (!targetUserId) {
            setError(new Error("User ID not found. Cannot load profile."));
            setLoading(false);
            return;
        }

        const isCurrentUserProfile = (loggedInUserId === targetUserId);

        let userData;
        if (isCurrentUserProfile) {
          userData = await getCurrentUserProfile();
        } else {
          userData = await getUserProfile(targetUserId);
        }

        let subscriptionStatus = false;
        if (!isCurrentUserProfile) {
          subscriptionStatus = await checkSubscriptionStatus(targetUserId);
        }

        const socialData = await getUserSocialNetworks(targetUserId);

        setProfileData({
          id: userData.id,
          name: userData.userName,
          nickname: `@${(userData.userName || '').toLowerCase().replace(/\s/g, '_')}`,
          description: userData.description,
          avatar: userData.photoUrl || '/default-avatar.png',
          countJobs: userData.countJobs,
          countSubscriptions: userData.countSubscriptions,
          countSubscribers: userData.countSubscribers
        });
        setUserSocials(socialData);
        setIsSubscribedToUser(subscriptionStatus);

        await fetchUserArtworksList(targetUserId, 0, false); 

      } catch (err) {
        setError(err);
        setProfileData(null);
        setUserArtworks([]);
        setUserSocials([]);
        setIsSubscribedToUser(false);
      } finally {
        setLoading(false);
      }
    };

    fetchAllProfileData();
  }, [profileIdFromUrl, fetchUserArtworksList]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollThreshold = 100;
      const isAtBottom = (window.innerHeight + document.documentElement.scrollTop + scrollThreshold) >= document.documentElement.offsetHeight;
      
      if (isAtBottom && !loadingArtworksRef.current && hasMoreArtworks && !error) {
        const targetUserId = profileIdFromUrl || currentLoggedInUserId;
        if (targetUserId) {
            fetchUserArtworksList(targetUserId, currentPage + 1, true);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [loadingArtworksRef, hasMoreArtworks, currentPage, error, fetchUserArtworksList, profileIdFromUrl, currentLoggedInUserId]);

  const openModal = useCallback((artwork) => {
    setSelectedArt(artwork);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedArt(null);
  }, []);

  const handleToggleSubscription = async () => {
    const targetUserId = profileIdFromUrl || currentLoggedInUserId; 

    if (!targetUserId) {
      return;
    }
    try {
      const response = await toggleSubscription(targetUserId);
      const newSubscriptionStatus = !response.deleted;
      setIsSubscribedToUser(newSubscriptionStatus);

      setProfileData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          countSubscribers: prev.countSubscribers + (newSubscriptionStatus ? 1 : -1)
        };
      });
    } catch (error) {
      alert("Ошибка при изменении статуса подписки.");
    }
  };

  if (loading) {
    return <div className="page-content profile-page"><div className="loading-indicator">Загрузка профиля...</div></div>;
  }

  if (error) {
    return <div className="page-content profile-page"><div className="error-message">Ошибка загрузки профиля: {error.message}. Попробуйте еще раз.</div></div>;
  }

  if (!profileData) {
    return <div className="page-content profile-page"><div className="empty-state">Профиль не найден.</div></div>;
  }

  const isCurrentUserProfile = (currentLoggedInUserId === profileData.id);

  return (
    <div className="page-content profile-page">
      <ProfileHeader
        userData={profileData}
        socialNetworks={userSocials}
        isSubscribed={isSubscribedToUser}
        onToggleSubscribe={handleToggleSubscription}
        isCurrentUserProfile={isCurrentUserProfile}
      />
      <ProfileStats stats={{
        artworksCount: profileData.countJobs,
        followersCount: profileData.countSubscribers,
        followingCount: profileData.countSubscriptions
      }} />

      {userArtworks.length > 0 ? (
          <ArtGallery artworks={userArtworks} onArtCardClick={openModal} />
      ) : (
          !loadingArtworksRef.current && !hasMoreArtworks && (
              <div className="empty-state artworks-empty">У этого пользователя еще нет опубликованных работ.</div>
          )
      )}

      {error && userArtworks.length > 0 && (
        <div className="error-message">Ошибка при загрузке дополнительных работ: {error.message}.</div>
      )}
      {isModalOpen && selectedArt && (
        <ArtModal 
          artwork={selectedArt}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

export default ProfilePage;