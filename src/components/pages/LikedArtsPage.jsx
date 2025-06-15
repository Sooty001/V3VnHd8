import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getLikedArtworks } from '../../api/api';
import ArtCard from '../ArtCard';
import ArtModal from '../ArtModal';

const LikedArtsPage = () => {
    const [artworks, setArtworks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedArt, setSelectedArt] = useState(null);

    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize] = useState(12);
    const [hasMore, setHasMore] = useState(true);

    const loadingRef = useRef(false);

    const fetchArtworks = useCallback(async (pageToLoad, append = false) => {
        if (loadingRef.current) {
            return;
        }
        loadingRef.current = true;
        setLoading(true);

        const apiResult = await getLikedArtworks(pageToLoad + 1, pageSize);

        let responseContent = [];
        let totalElementsFromApi = 0;

        if (apiResult && typeof apiResult === 'object') {
            responseContent = apiResult.content || [];
            totalElementsFromApi = apiResult.totalElements || 0;
        } else {
            setHasMore(false);
            setLoading(false);
            loadingRef.current = false;
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
                author: art.authorUserName || 'Неизвестный автор',
                authorAvatar: art.authorAvatarUrl || 'https://i.pravatar.cc/48?u=random',
                likes: art.countLikes,
                views: art.countViews,
                publicationTime: art.publicationTime,
            };
        }).filter(Boolean);

        setArtworks(prevArtworks => {
            const newArtworks = append ? [...prevArtworks, ...transformedArtworks] : transformedArtworks;
            
            const currentLoadedCount = newArtworks.length;
            const totalExpected = totalElementsFromApi;

            const moreAvailable = currentLoadedCount < totalExpected;
            setHasMore(moreAvailable);

            return newArtworks;
        });

        setCurrentPage(pageToLoad);

        setLoading(false);
        loadingRef.current = false;
    }, [pageSize]);

    useEffect(() => {
        setArtworks([]);
        setCurrentPage(0);
        setHasMore(true);
        loadingRef.current = false;
        fetchArtworks(0, false);
    }, [fetchArtworks]);

    useEffect(() => {
        const handleScroll = () => {
            const scrollThreshold = 100;
            const isAtBottom = (window.innerHeight + document.documentElement.scrollTop + scrollThreshold) >= document.documentElement.offsetHeight;
            
            if (isAtBottom && !loadingRef.current && hasMore) {
                fetchArtworks(currentPage + 1, true);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [loadingRef, hasMore, currentPage, fetchArtworks]);

    const openModal = useCallback((artwork) => {
        setSelectedArt(artwork);
        setIsModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setSelectedArt(null);
    }, []);

    const handleArtUnlike = useCallback((unlikedArtId) => {
        setArtworks(prevArtworks => prevArtworks.filter(art => art.id !== unlikedArtId));
        if (selectedArt && selectedArt.id === unlikedArtId) {
            closeModal();
        }
    }, [closeModal, selectedArt]);

    const renderContent = () => {
        if (loading && artworks.length === 0) {
            return <div className="loading-indicator">Загрузка понравившихся работ...</div>;
        }

        if (artworks.length === 0 && !loading) {
            return <div className="empty-state">Вы еще не лайкнули ни одной работы.</div>;
        }

        return (
            <div className="art-gallery" style={{ width: '100%' }}>
                <div className="art-gallery__grid">
                    {artworks.map(artwork => (
                        <ArtCard key={artwork.id} artwork={artwork} onClick={() => openModal(artwork)} />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="page-content">
            <h1 className="page-title">Понравившиеся работы</h1>
            {renderContent()}

            {isModalOpen && selectedArt && (
                <ArtModal
                    artwork={selectedArt}
                    onClose={closeModal}
                    onUnlike={handleArtUnlike}
                />
            )}
        </div>
    );
};

export default LikedArtsPage;