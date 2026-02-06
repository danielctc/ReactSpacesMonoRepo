import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';
import { savePortal } from '@disruptive-spaces/shared/firebase/portalsFirestore';
import { getSpaceItem } from '@disruptive-spaces/shared/firebase/spacesFirestore';
import { usePlacePortal } from '../hooks/unityEvents';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

interface PortalAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSpaceId: string;
}

interface Space {
  id: string;
  name: string;
}

const PortalAdminModal: React.FC<PortalAdminModalProps> = ({ isOpen, onClose, currentSpaceId }) => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isFetchingSpaces, setIsFetchingSpaces] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isPlacingPortal, setIsPlacingPortal] = useState(false);

  const { placePortal, directPlacePortal, isUnityLoaded } = usePlacePortal();

  const showToast = (title: string, description: string, status: 'success' | 'error' | 'info') => {
    console.log(`[${status.toUpperCase()}] ${title}: ${description}`);
  };

  useEffect(() => {
    if (isOpen) {
      const fetchSpaces = async () => {
        setIsFetchingSpaces(true);
        setFetchError(null);
        setSpaces([]);
        try {
          const spacesCollectionRef = collection(db, 'spaces');
          const querySnapshot = await getDocs(spacesCollectionRef);
          const spacesList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || `Space ID: ${doc.id}`
          }));
          setSpaces(spacesList);
        } catch (err) {
          Logger.error("PortalAdminModal: Error fetching spaces:", err);
          setFetchError("Failed to load spaces. Please check your connection and try again.");
        }
        setIsFetchingSpaces(false);
      };
      fetchSpaces();
    }
  }, [isOpen]);

  const handlePlacePortal = async (targetSpaceId: string, targetSpaceName: string) => {
    if (!currentSpaceId) {
      Logger.error("PortalAdminModal: currentSpaceId is not defined. Cannot save portal.");
      showToast("Error", "Cannot place portal: Current space ID is missing.", "error");
      return;
    }

    setIsPlacingPortal(true);
    Logger.log(`PortalAdminModal: Attempting to place portal to ${targetSpaceName} (${targetSpaceId}) in space ${currentSpaceId}`);

    try {
      const targetSpaceData = await getSpaceItem(targetSpaceId);
      if (!targetSpaceData) {
        throw new Error(`Failed to fetch target space data for ${targetSpaceId}`);
      }

      const backgroundImageUrl = targetSpaceData.backgroundUrl || targetSpaceData.backgroundGsUrl;
      if (!backgroundImageUrl) {
        Logger.warn(`PortalAdminModal: No background image URL found for target space: ${targetSpaceId}`);
      }

      const portalPrefabIdentifier = "PortalObjectPrefab";
      const defaultPosition = { x: 0, y: 1.5, z: 0 };
      const defaultRotation = { x: 0, y: 0, z: 0 };
      const defaultScale = { x: 1, y: 1, z: 1 };

      const uniquePortalId = `portal_${currentSpaceId}_${targetSpaceId}_${Date.now()}`;

      const portalDataForFirebase = {
        type: 'portal',
        targetSpaceId: targetSpaceId,
        targetSpaceName: targetSpaceName,
        portalId: uniquePortalId,
        position: defaultPosition,
        rotation: defaultRotation,
        scale: defaultScale,
        prefabName: portalPrefabIdentifier,
        initialImageUrl: backgroundImageUrl
      };

      const savedSuccessfully = await savePortal(
        currentSpaceId,
        uniquePortalId,
        portalDataForFirebase
      );

      if (!savedSuccessfully) {
        Logger.error(`PortalAdminModal: Failed to save portal data to Firebase for space ${currentSpaceId}.`);
        showToast("Save Error", "Failed to save portal data to database.", "error");
        setIsPlacingPortal(false);
        return;
      }

      Logger.log(`PortalAdminModal: Portal data saved to Firebase for space ${currentSpaceId}.`);

      let unityPlacementSuccess = false;
      try {
        const portalDataForUnity = {
          portalId: uniquePortalId,
          prefabName: portalPrefabIdentifier,
          position: defaultPosition,
          rotation: defaultRotation,
          scale: defaultScale,
          initialImageUrl: backgroundImageUrl
        };

        unityPlacementSuccess = placePortal(
          uniquePortalId,
          portalPrefabIdentifier,
          defaultPosition,
          defaultRotation,
          defaultScale,
          backgroundImageUrl
        );

        if (!unityPlacementSuccess) {
          unityPlacementSuccess = directPlacePortal(
            uniquePortalId,
            portalPrefabIdentifier,
            defaultPosition,
            defaultRotation,
            defaultScale,
            backgroundImageUrl
          );
        }

        Logger.log("PortalAdminModal: Portal placement in Unity:", unityPlacementSuccess);

      } catch (unityError) {
        Logger.error("PortalAdminModal: Error placing portal in Unity:", unityError);
      }

      if (unityPlacementSuccess) {
        showToast("Portal Placed", `Portal to ${targetSpaceName} created successfully.`, "success");
        onClose();
      } else {
        showToast("Portal Saved", "Portal data saved. It will appear when Unity is ready.", "info");
        onClose();
      }

    } catch (error: any) {
      Logger.error("PortalAdminModal: Error creating portal:", error);
      showToast("Error", "Failed to create portal. Please try again.", "error");
    } finally {
      setIsPlacingPortal(false);
    }
  };

  const isLoading = isFetchingSpaces || isPlacingPortal;

  if (!isOpen) return null;

  return (
    <dialog open className="modal modal-open">
      <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm" />
      <div className="modal-box max-w-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg max-h-[80vh] shadow-2xl">
        <div className="border-b border-gray-200 dark:border-white/30 pb-3">
          <h3 className="text-lg font-semibold">Select a Space to Create Portal To</h3>
        </div>
        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={onClose}>✕</button>
        <div className="p-6">
          {isLoading && (
            <div className="flex flex-col justify-center items-center h-[200px]">
              <span className="loading loading-spinner loading-xl text-blue-500"></span>
              <p className="mt-3">Loading Spaces...</p>
            </div>
          )}
          {fetchError && (
            <div className="alert alert-error rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{fetchError}</span>
            </div>
          )}
          {!isFetchingSpaces && !fetchError && spaces.length === 0 && (
            <p className="text-center py-10">No spaces found or you may not have permission to view them.</p>
          )}
          {!isFetchingSpaces && !fetchError && spaces.length > 0 && (
            <ul className="space-y-3">
              {spaces.map(space => (
                <li
                  key={space.id}
                  className={`p-3 rounded-md border border-transparent hover:bg-gray-200 dark:hover:bg-white/20 transition-all ${
                    isLoading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:scale-105'
                  }`}
                  onClick={() => !isLoading && handlePlacePortal(space.id, space.name)}
                >
                  {space.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </dialog>
  );
};

export default PortalAdminModal;
