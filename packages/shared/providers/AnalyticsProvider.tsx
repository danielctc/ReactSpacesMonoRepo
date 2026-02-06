import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { ANALYTICS_EVENT_TYPES, ANALYTICS_CATEGORIES } from '../firebase/analyticsFirestore';
import { Logger } from '../logging/react-log';

// Create the Analytics Context
const AnalyticsContext = createContext();

/**
 * Analytics Provider Component
 * Provides analytics functionality throughout the application
 */
export const AnalyticsProvider = ({ 
  children, 
  spaceId, 
  options = {} 
}) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [debugMode, setDebugMode] = useState(options.enableDebugLogs || false);
  
  // Initialize analytics hook
  const analytics = useAnalytics(spaceId, {
    enableDebugLogs: debugMode,
    ...options
  });

  // Enhanced tracking functions with provider-level features
  const trackWithContext = useCallback(async (eventType, eventData = {}) => {
    if (!isEnabled) {
      if (debugMode) {
        Logger.log('📊 Analytics: Tracking disabled, skipping event:', eventType);
      }
      return null;
    }

    try {
      const result = await analytics.track(eventType, eventData);
      if (debugMode) {
        Logger.log('📊 Analytics Provider: Event tracked:', eventType, eventData);
      }
      return result;
    } catch (error) {
      Logger.error('📊 Analytics Provider: Failed to track event:', error);
      return null;
    }
  }, [analytics.track, isEnabled, debugMode]);

  const trackReactEventWithContext = useCallback(async (eventType, eventData = {}) => {
    if (!isEnabled) return null;

    try {
      const result = await analytics.trackReactEvent(eventType, eventData);
      if (debugMode) {
        Logger.log('📊 Analytics Provider: React event tracked:', eventType, eventData);
      }
      return result;
    } catch (error) {
      Logger.error('📊 Analytics Provider: Failed to track React event:', error);
      return null;
    }
  }, [analytics.trackReactEvent, isEnabled, debugMode]);

  const trackUnityEventWithContext = useCallback(async (eventType, eventData = {}) => {
    if (!isEnabled) return null;

    try {
      const result = await analytics.trackUnityEvent(eventType, eventData);
      if (debugMode) {
        Logger.log('📊 Analytics Provider: Unity event tracked:', eventType, eventData);
      }
      return result;
    } catch (error) {
      Logger.error('📊 Analytics Provider: Failed to track Unity event:', error);
      return null;
    }
  }, [analytics.trackUnityEvent, isEnabled, debugMode]);

  // Convenience functions for common events
  const trackPageView = useCallback(async (pageName, additionalData = {}) => {
    return trackReactEventWithContext(ANALYTICS_EVENT_TYPES.REACT.SPACE_ENTER, {
      category: ANALYTICS_CATEGORIES.NAVIGATION,
      pageName,
      url: window.location.href,
      ...additionalData
    });
  }, [trackReactEventWithContext]);

  const trackModalInteraction = useCallback(async (action, modalName, additionalData = {}) => {
    const eventType = action === 'open' 
      ? ANALYTICS_EVENT_TYPES.REACT.MODAL_OPEN 
      : ANALYTICS_EVENT_TYPES.REACT.MODAL_CLOSE;
    
    return trackReactEventWithContext(eventType, {
      category: ANALYTICS_CATEGORIES.UI_INTERACTION,
      modalName,
      action,
      ...additionalData
    });
  }, [trackReactEventWithContext]);

  const trackUserAction = useCallback(async (actionType, actionData = {}) => {
    return trackReactEventWithContext(ANALYTICS_EVENT_TYPES.REACT.UI_CLICK, {
      category: ANALYTICS_CATEGORIES.UI_INTERACTION,
      actionType,
      ...actionData
    });
  }, [trackReactEventWithContext]);

  const trackError = useCallback(async (errorType, errorData = {}) => {
    return trackReactEventWithContext('react_error', {
      category: ANALYTICS_CATEGORIES.SYSTEM_EVENT,
      errorType,
      errorMessage: errorData.message || 'Unknown error',
      errorStack: errorData.stack || null,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      ...errorData
    });
  }, [trackReactEventWithContext]);

  const trackPerformance = useCallback(async (metricName, value, additionalData = {}) => {
    return trackReactEventWithContext('react_performance', {
      category: ANALYTICS_CATEGORIES.PERFORMANCE,
      metricName,
      value,
      timestamp: new Date().toISOString(),
      ...additionalData
    });
  }, [trackReactEventWithContext]);

  // Provider configuration functions
  const enableAnalytics = useCallback(() => {
    setIsEnabled(true);
    Logger.log('📊 Analytics Provider: Analytics enabled');
  }, []);

  const disableAnalytics = useCallback(() => {
    setIsEnabled(false);
    Logger.log('📊 Analytics Provider: Analytics disabled');
  }, []);

  const enableDebugMode = useCallback(() => {
    setDebugMode(true);
    Logger.log('📊 Analytics Provider: Debug mode enabled');
  }, []);

  const disableDebugMode = useCallback(() => {
    setDebugMode(false);
    Logger.log('📊 Analytics Provider: Debug mode disabled');
  }, []);

  // Context value
  const contextValue = {
    // Core analytics functions
    ...analytics,
    
    // Enhanced tracking functions with provider context
    track: trackWithContext,
    trackReactEvent: trackReactEventWithContext,
    trackUnityEvent: trackUnityEventWithContext,
    
    // Convenience functions
    trackPageView,
    trackModalInteraction,
    trackUserAction,
    trackError,
    trackPerformance,
    
    // Provider state
    isEnabled,
    debugMode,
    spaceId,
    
    // Provider configuration
    enableAnalytics,
    disableAnalytics,
    enableDebugMode,
    disableDebugMode,
    
    // Constants for easy access
    eventTypes: ANALYTICS_EVENT_TYPES,
    categories: ANALYTICS_CATEGORIES
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
};

/**
 * Hook to use Analytics Context
 * @returns {Object} Analytics context value
 */
export const useAnalyticsContext = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalyticsContext must be used within an AnalyticsProvider');
  }
  return context;
};

/**
 * HOC to wrap components with analytics tracking
 * @param {React.Component} WrappedComponent - Component to wrap
 * @param {Object} options - Analytics options
 * @returns {React.Component} - Wrapped component with analytics
 */
export const withAnalytics = (WrappedComponent, options = {}) => {
  return function AnalyticsWrappedComponent(props) {
    const analytics = useAnalyticsContext();
    
    return (
      <WrappedComponent
        {...props}
        analytics={analytics}
        trackEvent={analytics.track}
        trackReactEvent={analytics.trackReactEvent}
        trackUnityEvent={analytics.trackUnityEvent}
      />
    );
  };
};

/**
 * Hook for tracking component lifecycle events
 * @param {string} componentName - Name of the component
 * @param {Object} options - Tracking options
 */
export const useComponentAnalytics = (componentName, options = {}) => {
  const { track, isReady } = useAnalyticsContext();
  
  useEffect(() => {
    if (isReady && options.trackMount) {
      track('react_component_mount', {
        category: ANALYTICS_CATEGORIES.SYSTEM_EVENT,
        componentName,
        timestamp: new Date().toISOString()
      });
    }
    
    return () => {
      if (isReady && options.trackUnmount) {
        track('react_component_unmount', {
          category: ANALYTICS_CATEGORIES.SYSTEM_EVENT,
          componentName,
          timestamp: new Date().toISOString()
        });
      }
    };
  }, [track, isReady, componentName, options.trackMount, options.trackUnmount]);
  
  return { track, isReady };
}; 