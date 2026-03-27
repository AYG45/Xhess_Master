import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    </div>
  );
};