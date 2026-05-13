import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import weddingBg from './assets/wedding-bg.png';
import { getGrillPageConfig, getObiadPageConfig, getSlubPageConfig } from './config/weddingEnv';
import WeddingRoutePage from './pages/WeddingRoutePage';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/slub" replace />} />
      <Route
        path="/slub"
        element={<WeddingRoutePage config={getSlubPageConfig()} heroImageSrc={weddingBg} />}
      />
      <Route
        path="/obiad"
        element={<WeddingRoutePage config={getObiadPageConfig()} heroImageSrc={weddingBg} />}
      />
      <Route
        path="/grill"
        element={<WeddingRoutePage config={getGrillPageConfig()} heroImageSrc={weddingBg} />}
      />
      <Route path="*" element={<Navigate to="/slub" replace />} />
    </Routes>
  );
};

export default App;
