import { useState, useEffect, useCallback } from 'react';

/**
 * useEditMode - Manages edit mode state and content admin modal.
 */
export const useEditMode = (canEditSpace, setIsModalOpen) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isContentAdminOpen, setIsContentAdminOpen] = useState(false);

  // Listen for Edit Mode changes from other components
  useEffect(() => {
    const handleEditModeChange = (event) => {
      setIsEditMode(event.detail.enabled);
    };

    window.addEventListener('editModeChanged', handleEditModeChange);
    return () => window.removeEventListener('editModeChanged', handleEditModeChange);
  }, []);

  // Handle edit mode toggle from events
  const handleEditModeToggle = useCallback((editMode) => {
    setIsEditMode(editMode);
  }, []);

  // Handle edit mode button click - toggles Content Admin modal and edit mode
  const handleEditModeButtonClick = useCallback(() => {
    // Check if user has permission to edit
    if (!canEditSpace) {
      console.warn('Permission Denied: You don\'t have permission to edit this space.');
      return;
    }

    // If modal is currently open, just close it (keep edit mode on)
    if (isContentAdminOpen) {
      setIsContentAdminOpen(false);
      setIsModalOpen(false);
      return;
    }

    // If edit mode is off, turn it on and open modal
    if (!isEditMode) {
      setIsEditMode(true);
      setIsContentAdminOpen(true);
      setIsModalOpen(true);

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('editModeChanged', { detail: { enabled: true } }));
    }
    // If edit mode is on and modal is closed, turn off edit mode
    else {
      setIsEditMode(false);
      window.dispatchEvent(new CustomEvent('editModeChanged', { detail: { enabled: false } }));
    }
  }, [canEditSpace, isContentAdminOpen, isEditMode, setIsModalOpen]);

  // Handle closing the Content Admin modal
  const handleCloseContentAdmin = useCallback(() => {
    setIsContentAdminOpen(false);
    setIsModalOpen(false);
  }, [setIsModalOpen]);

  return {
    isEditMode,
    setIsEditMode,
    isContentAdminOpen,
    setIsContentAdminOpen,
    handleEditModeToggle,
    handleEditModeButtonClick,
    handleCloseContentAdmin,
  };
};

export default useEditMode;
