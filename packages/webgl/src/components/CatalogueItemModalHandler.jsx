import React, { useEffect, useState } from 'react';
import { useUnityOnCatalogueItemClick } from '../hooks/unityEvents/useUnityOnCatalogueItemClick';
import CatalogueItemEditor from './CatalogueItemEditor';

// A lightweight handler that listens for catalogue item clicks from Unity and
// shows the CatalogueItemEditor modal when an item is selected.
function CatalogueItemModalHandler() {
  const { clickedItem, clearClickedItem } = useUnityOnCatalogueItemClick();
  // Track whether global Edit Mode is enabled
  const [editModeEnabled, setEditModeEnabled] = useState(false);

  // Listen for global edit mode changes dispatched from other components
  useEffect(() => {
    const handleEditModeChanged = (e) => {
      if (e?.detail && typeof e.detail.enabled === 'boolean') {
        setEditModeEnabled(e.detail.enabled);
        // If edit mode turns OFF, make sure to close any open modal
        if (!e.detail.enabled) {
          clearClickedItem();
        }
      }
    };

    window.addEventListener('editModeChanged', handleEditModeChanged);

    // Cleanup
    return () => window.removeEventListener('editModeChanged', handleEditModeChanged);
  }, [clearClickedItem]);

  // Close handler for the modal – simply clears the selected item state.
  const handleCloseModal = () => {
    clearClickedItem();
  };

  // Derive the space ID from the hotspotId so it can be passed to the editor.
  let spaceId = '';
  if (clickedItem?.hotspotId) {
    const parts = clickedItem.hotspotId.split('_');
    if (parts.length >= 3) {
      // Example hotspotId format: item_SomeSpaceId_123456
      // This joins everything between the first and last parts back into the space ID.
      spaceId = parts.slice(1, -1).join('_');
    }
  }

  return (
    <>
      {clickedItem && editModeEnabled && (
        <CatalogueItemEditor
          isOpen={!!clickedItem && editModeEnabled}
          onClose={handleCloseModal}
          item={clickedItem}
          spaceId={spaceId}
        />
      )}
    </>
  );
}

export default CatalogueItemModalHandler; 