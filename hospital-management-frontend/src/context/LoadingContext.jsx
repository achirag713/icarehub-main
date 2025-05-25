import React, { createContext, useContext, useState, useCallback } from 'react';
import LoadingIndicator from '../components/common/LoadingIndicator';

const LoadingContext = createContext({
  showLoading: () => {},
  hideLoading: () => {},
});

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);

  const showLoading = useCallback(() => setLoading(true), []);
  const hideLoading = useCallback(() => setLoading(false), []);

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading }}>
      {loading && <LoadingIndicator />}
      {children}
    </LoadingContext.Provider>
  );
};
