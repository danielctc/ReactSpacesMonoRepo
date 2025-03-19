import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAllWebsiteContent, getPageContent } from '../services/firebase';

// Create context
const WebsiteContentContext = createContext();

// Hook for easy context usage
export const useWebsiteContent = () => useContext(WebsiteContentContext);

export const WebsiteContentProvider = ({ children }) => {
  const [allContent, setAllContent] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load all website content on mount
  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        const content = await getAllWebsiteContent();
        setAllContent(content);
        setError(null);
      } catch (err) {
        console.error('Error loading website content:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, []);

  // Function to get content for a specific page
  const getContent = async (pageId) => {
    // If we already have the content, return it from state
    if (allContent[pageId]) {
      return allContent[pageId];
    }

    // Otherwise fetch from Firestore
    try {
      const pageContent = await getPageContent(pageId);
      
      // Update state with new content
      if (pageContent) {
        setAllContent(prev => ({
          ...prev,
          [pageId]: pageContent
        }));
      }
      
      return pageContent;
    } catch (err) {
      console.error(`Error fetching content for ${pageId}:`, err);
      setError(err.message);
      return null;
    }
  };

  // Context value
  const value = {
    content: allContent,
    loading,
    error,
    getContent
  };

  return (
    <WebsiteContentContext.Provider value={value}>
      {children}
    </WebsiteContentContext.Provider>
  );
};

export default WebsiteContentContext; 