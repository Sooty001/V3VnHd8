import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom'; // Импортируем useNavigate

const HeroSection = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();

    const handleUploadArtClick = () => {
        navigate('/upload-art');
    };


    return (
        <section className="hero-section">
            <div className="hero-section__bg-shapes">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
            </div>
            <div className="hero-section__content">
                <div className="hero-section__text">
                    <h1 >Сделай свой вклад в картину мира</h1>
                    <p>Вдохновляйтесь, делитесь искусством и присоединяйтесь к глобальному сообществу создателей.</p>
                    <button className="hero-section__cta" onClick={handleUploadArtClick}>Добавьте свои работы</button>
                </div>
                <div className="hero-section__images">
                    <div className="hero-image-container img-1">
                        <img src="https://images.unsplash.com/photo-1547891654-e66ed7ebb968?q=80&w=400" alt="Artistic hand painting" />
                    </div>
                     <div className="hero-image-container img-2">
                        <img src="https://images.unsplash.com/photo-1515405295579-ba7b45403062?q=80&w=400" alt="Colorful abstract painting" />
                    </div>
                     <div className="hero-image-container img-3">
                        <img src="https://images.unsplash.com/photo-1501472312651-726afe119ff1?q=80&w=400" alt="Sculpture in a gallery" />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;
