// src/components/pages/HomePage/HomePage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import HeroSection from '../common/HeroSection';
import ArtFilters from '../ArtFilters';
import ArtGallery from '../ArtGallery';
import ArtModal from '../ArtModal';
import '../../styles/HomePage.css';

import { getFeedArtworks, searchArtsByName } from '../../api/api';

const HomePage = () => {
  const [activeTab, setActiveTab] = useState('trending');
  const [artworks, setArtworks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedArt, setSelectedArt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 10;

  const location = useLocation();
  const navigate = useNavigate();

  const searchQuery = new URLSearchParams(location.search).get('query');
  const isSearchMode = !!searchQuery;

  const loadingRef = useRef(false);

  // --- Функция для загрузки произведений искусства ---
  const fetchArtworks = useCallback(async (pageToLoad, append = false) => {
    console.log(`[fetchArtworks] Called with pageToLoad: ${pageToLoad}, append: ${append}`);
    console.log(`[fetchArtworks] Current loadingRef.current: ${loadingRef.current}`);

    if (loadingRef.current) {
      console.log('[fetchArtworks] Already loading, returning...');
      return;
    }
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      let apiResult; // Переменная для хранения полного результата от API (объекта)
      let responseContent = [];
      let totalElementsFromApi = 0;

      if (isSearchMode) {
        console.log(`[fetchArtworks] Mode: Search. Query: "${searchQuery}", Page: ${pageToLoad + 1}, Size: ${pageSize}`);
        apiResult = await searchArtsByName(searchQuery, pageToLoad + 1, pageSize);
        console.log('[fetchArtworks] Search API raw response:', apiResult);
      } else {
        console.log(`[fetchArtworks] Mode: Feed. Tab: "${activeTab}", Page: ${pageToLoad + 1}, Size: ${pageSize}`);
        apiResult = await getFeedArtworks(activeTab, pageToLoad + 1, pageSize);
        console.log('[fetchArtworks] Feed API raw response:', apiResult);
      }

      // --- Вот исправленный блок обработки ответа API ---
      if (apiResult && typeof apiResult === 'object') {
        responseContent = apiResult.content || [];
        totalElementsFromApi = apiResult.totalElements || 0;
        console.log(`[fetchArtworks] Extracted content length: ${responseContent.length}, totalElements: ${totalElementsFromApi}`);
      } else {
        console.error('[fetchArtworks] API returned an unexpected response format:', apiResult);
        setError(new Error('Неожиданный формат ответа от сервера.'));
        setHasMore(false);
        setLoading(false);
        loadingRef.current = false;
        return; // Прерываем выполнение функции, так как данные некорректны
      }
      // --- Конец исправленного блока ---

      if (!responseContent || responseContent.length === 0) {
        console.warn('[fetchArtworks] No content received or content is empty for current page.');
      }

      const transformedArtworks = (responseContent || []).map(art => {
        if (!art || !art.id || !art.imageUrl) {
          console.warn('[fetchArtworks] Skipping malformed art object:', art);
          return null;
        }
        return {
          id: art.id,
          title: art.name,
          src: art.imageUrl,
          author: art.authorUserName || 'Неизвестный автор',
          authorAvatar: art.authorAvatarUrl || 'https://i.pravatar.cc/48?u=random',
          likes: art.countLikes,
          views: art.countViews,
          publicationTime: art.publicationTime,
          comments: [],
          tags: []
        };
      }).filter(Boolean);

      console.log('[fetchArtworks] Transformed artworks for current page:', transformedArtworks);

      setArtworks(prevArtworks => {
        const newArtworks = append ? [...prevArtworks, ...transformedArtworks] : transformedArtworks;
        console.log('[fetchArtworks] New artworks state after merge/replace:', newArtworks);
        
        const currentLoadedCount = newArtworks.length;
        const totalExpected = totalElementsFromApi; // Теперь totalElementsFromApi должен быть корректным

        const moreAvailable = currentLoadedCount < totalExpected; // Простое сравнение
        setHasMore(moreAvailable);
        console.log(`[fetchArtworks] Current loaded count: ${currentLoadedCount}, Total expected: ${totalExpected}, Has more: ${moreAvailable}`);

        return newArtworks;
      });

      setCurrentPage(pageToLoad);

    } catch (err) {
      console.error("[fetchArtworks] Error loading artworks:", err);
      setError(err);
      setArtworks(append ? artworks : []); // Очищаем только если это первая загрузка, иначе оставляем то что есть
      setHasMore(false);
    } finally {
      setLoading(false);
      loadingRef.current = false;
      console.log('[fetchArtworks] Finished loading. loadingRef.current set to false.');
    }
  }, [activeTab, isSearchMode, searchQuery, pageSize]); // pageSize добавляем в зависимости, хотя она константа

  // --- useEffect для начальной загрузки и сброса состояния ---
  useEffect(() => {
    console.log('[useEffect - Init/Reset] Active tab or search query changed. Resetting state.');
    setArtworks([]); // Очищаем работы при смене критериев
    setCurrentPage(0); // Сбрасываем страницу
    setHasMore(true); // Сбрасываем флаг наличия данных
    loadingRef.current = false; // Важно сбросить реф при инициализации
    fetchArtworks(0, false); // Загружаем первую страницу, не добавляя
  }, [activeTab, isSearchMode, searchQuery, fetchArtworks]); // Добавляем fetchArtworks в зависимости, т.к. это useCallback

  // --- useEffect для бесконечной прокрутки ---
  useEffect(() => {
    const handleScroll = () => {
      // console.log('[handleScroll] Scroll event fired.');
      // console.log(`[handleScroll] window.innerHeight: ${window.innerHeight}`);
      // console.log(`[handleScroll] document.documentElement.scrollTop: ${document.documentElement.scrollTop}`);
      // console.log(`[handleScroll] document.documentElement.offsetHeight: ${document.documentElement.offsetHeight}`);

      const scrollThreshold = 100; // Отступ от низа страницы
      const isAtBottom = (window.innerHeight + document.documentElement.scrollTop + scrollThreshold) >= document.documentElement.offsetHeight;
      
      // console.log(`[handleScroll] isAtBottom: ${isAtBottom}`);
      // console.log(`[handleScroll] !loadingRef.current: ${!loadingRef.current}`);
      // console.log(`[handleScroll] hasMore: ${hasMore}`);
      // console.log(`[handleScroll] !error: ${!error}`);

      if (isAtBottom && !loadingRef.current && hasMore && !error) {
        console.log("[handleScroll] Conditions met: Loading more artworks...");
        fetchArtworks(currentPage + 1, true);
      } else if (isAtBottom) {
        // console.log("[handleScroll] Not loading more: Conditions not met.");
        // if (loadingRef.current) console.log(" - Already loading.");
        // if (!hasMore) console.log(" - No more data.");
        // if (error) console.log(" - Error occurred.");
      }
    };

    console.log('[useEffect - Scroll] Adding scroll event listener.');
    window.addEventListener('scroll', handleScroll);
    return () => {
      console.log('[useEffect - Scroll] Removing scroll event listener.');
      window.removeEventListener('scroll', handleScroll);
    };
  }, [loadingRef, hasMore, currentPage, error, fetchArtworks]);

  const handleTabChange = useCallback((tab) => {
    console.log(`[handleTabChange] Changing tab to: ${tab}`);
    navigate('/', { replace: true });
    setActiveTab(tab);
  }, [navigate]);

  const openModal = useCallback((artwork) => {
    console.log('[openModal] Opening modal for artwork:', artwork);
    setSelectedArt(artwork);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    console.log('[closeModal] Closing modal.');
    setIsModalOpen(false);
    setSelectedArt(null);
  }, []);

  const showFilters = !isSearchMode;
  const displayNoResultsMessage = isSearchMode && artworks.length === 0 && !loading && !error;

  console.log('[Render] Component rendering. Loading:', loading, 'Artworks count:', artworks.length, 'Has more:', hasMore, 'Error:', error);

  // Исправленные условия для отображения сообщений
  // Показываем "Загрузка..." только если loading true И нет никаких работ (первоначальная загрузка)
  if (loading && artworks.length === 0 && !error) {
    console.log('[Render] Displaying initial loading message.');
    return (
      <div className="page-content-home">
        <HeroSection />
        {showFilters && <ArtFilters activeTab={activeTab} onTabChange={handleTabChange} />}
        {isSearchMode && <div className="search-info">Searching for: "{searchQuery}"</div>}
        <div className="loading-message">Загрузка произведений искусства...</div>
      </div>
    );
  }

  // Показываем ошибку только если error true И нет никаких работ (первоначальная ошибка)
  if (error && artworks.length === 0) {
    console.log('[Render] Displaying initial error message.');
    return (
      <div className="page-content-home">
        <HeroSection />
        {showFilters && <ArtFilters activeTab={activeTab} onTabChange={handleTabChange} />}
        {isSearchMode && <div className="search-info">Searching for: "{searchQuery}"</div>}
        <div className="error-message">Ошибка загрузки данных: {error.message}. Пожалуйста, попробуйте обновить страницу.</div>
      </div>
    );
  }

  return (
    <div className="page-content-home">
      <HeroSection />
      {showFilters && <ArtFilters activeTab={activeTab} onTabChange={handleTabChange} />}
      {isSearchMode && (
          <div className="search-header">
              <h2>Результаты поиска для: "{searchQuery}"</h2>
              {displayNoResultsMessage && (
                  <p>По вашему запросу ничего не найдено.</p>
              )}
          </div>
      )}
      <ArtGallery artworks={artworks} onArtCardClick={openModal} />

      {/* Индикатор загрузки для бесконечной прокрутки */}
      {loading && artworks.length > 0 && !error && ( // Показываем загрузку, только если уже есть работы и нет ошибки
        <div className="loading-message">Загрузка новых произведений искусства...</div>
      )}
      {error && artworks.length > 0 && ( // Показываем ошибку, если произошла при дозагрузке
        <div className="error-message">Ошибка при загрузке дополнительных данных: {error.message}.</div>
      )}
      {artworks.length === 0 && !loading && !error && ( // Если вообще ничего не найдено после всех попыток
        <div className="empty-results-message">К сожалению, по вашему запросу ничего не найдено.</div>
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

export default HomePage;