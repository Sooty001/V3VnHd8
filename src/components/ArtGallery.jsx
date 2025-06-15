import React from 'react';
import ArtCard from './ArtCard';

const ArtGallery = ({ artworks, onArtCardClick }) => {
  return (
    <section className="art-gallery">
      <div className="art-gallery__grid">
        {artworks.map((art) => (
          <ArtCard key={art.id} artwork={art} onClick={onArtCardClick} />
        ))}
      </div>
    </section>
  );
};

export default ArtGallery;
