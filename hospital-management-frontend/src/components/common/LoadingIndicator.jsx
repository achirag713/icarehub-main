import React from 'react';
import './LoadingIndicator.css';

const LoadingIndicator = () => (
  <div className="loading-indicator-overlay">
    <div className="loading-indicator-spinner">
      <div className="spinner"></div>
      <span>Loading...</span>
    </div>
  </div>
);

export default LoadingIndicator;
