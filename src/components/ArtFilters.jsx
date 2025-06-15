import React, { useRef, useEffect, useState } from 'react';

const ArtFilters = ({ activeTab, onTabChange }) => {
  const tabsRef = useRef([]);
  const highlightRef = useRef(null);
  const [initialRender, setInitialRender] = useState(true);

  const tabs = [
    { key: 'recommended', name: 'Рекомендации' },
    { key: 'trending', name: 'Популярное' },
    { key: 'subscriptions', name: 'Подписки' },
  ];

  useEffect(() => {
    const activeTabIndex = tabs.findIndex(tab => tab.key === activeTab);
    const activeTabEl = tabsRef.current[activeTabIndex];
    const highlightEl = highlightRef.current;

    if (activeTabEl && highlightEl) {
      if (initialRender) {
        highlightEl.style.transition = 'none';
      } else {
        highlightEl.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      }
      
      highlightEl.style.width = `${activeTabEl.offsetWidth}px`;
      highlightEl.style.transform = `translateX(${activeTabEl.offsetLeft}px)`;
      setInitialRender(false);
    }
  }, [activeTab, tabs]);

  return (
    <div className="art-filters">
      <div className="art-filters__tabs">
        <div ref={highlightRef} className="art-filters__tab-highlight"></div>
        {tabs.map((tab, index) => (
          <button
            key={tab.key}
            ref={(el) => (tabsRef.current[index] = el)}
            className={`art-filters__tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ArtFilters;
