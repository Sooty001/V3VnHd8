// src/components/ArtCard.jsx
import React from 'react';

const ArtCard = ({ artwork, onClick }) => {
  const handleLoad = (e) => {
    e.target.parentElement.classList.add('loaded');
  };

  return (
    <div className="art-card" onClick={() => onClick({ id: artwork.id, title: artwork.title, src: artwork.src })}>
      <img src={artwork.src} alt={artwork.title} loading="lazy" onLoad={handleLoad} />
    </div>
  );
};

export default ArtCard;