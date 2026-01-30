import { useState, useEffect, useContext } from 'react';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';
import { getSpaceItem } from '@disruptive-spaces/shared/firebase/spacesFirestore';
import { userBelongsToGroup } from '@disruptive-spaces/shared/firebase/userPermissions';

/**
 * useAuthCheck - Manages user authentication, profile, and permissions.
 */
export const useAuthCheck = (spaceID, error, setIsModalOpen) => {
  const { user } = useContext(UserContext);
  const [userProfile, setUserProfile] = useState(null);
  const [canEditSpace, setCanEditSpace] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);

  // Fetch user profile data
  useEffect(() => {
    if (user?.uid) {
      getUserProfileData(user.uid)
        .then((profile) => setUserProfile(profile))
        .catch((err) => console.error('Error fetching user profile:', err));
    }
  }, [user?.uid]);

  // Check if user can edit space (owner or disruptiveAdmin)
  useEffect(() => {
    const checkEditPermissions = async () => {
      if (user?.uid && spaceID) {
        try {
          const profile = await getUserProfileData(user.uid);

          // Check if user is an owner based on their groups
          let isOwner = false;
          if (profile.groups) {
            const ownerGroupId = `space_${spaceID}_owners`;
            isOwner = profile.groups.includes(ownerGroupId);
          }

          // Check if user is a disruptiveAdmin
          const isAdmin = await userBelongsToGroup(user.uid, 'disruptiveAdmin');

          setCanEditSpace(isOwner || isAdmin);
        } catch (err) {
          console.error('Error checking edit permissions:', err);
          setCanEditSpace(false);
        }
      } else {
        setCanEditSpace(false);
      }
    };

    checkEditPermissions();
  }, [user?.uid, spaceID]);

  // Check authentication requirement and show sign-in modal if needed
  useEffect(() => {
    const checkAuthenticationRequirement = async () => {
      // If there's a Unity error, always show sign-in modal
      if (error) {
        setShowSignInModal(true);
        setIsModalOpen(true);
        return;
      }

      // If user is logged in, hide sign-in modal
      if (user) {
        setShowSignInModal(false);
        return;
      }

      // User is not logged in - check if guest access is allowed

      // LOCAL DEV: Bypass Firestore for local dev builds
      const localDevSpaces = ['dantest'];
      const isLocalDev = import.meta.env.DEV || window.location.hostname === 'localhost';

      if (isLocalDev && localDevSpaces.includes(spaceID)) {
        console.log('[useAuthCheck] Local dev build - allowing guest access');
        setShowSignInModal(false);
        return;
      }

      try {
        const spaceData = await getSpaceItem(spaceID);
        if (spaceData && spaceData.allowGuestUsers === true) {
          setShowSignInModal(false);
        } else {
          setShowSignInModal(true);
          setIsModalOpen(true);
        }
      } catch (err) {
        // Default to showing sign-in modal if we can't verify space settings
        console.error('[useAuthCheck] Error checking space settings:', err);
        setShowSignInModal(true);
        setIsModalOpen(true);
      }
    };

    const timer = setTimeout(checkAuthenticationRequirement, 1000);
    return () => clearTimeout(timer);
  }, [error, user, spaceID, setIsModalOpen]);

  return {
    user,
    userProfile,
    canEditSpace,
    showSignInModal,
    setShowSignInModal,
  };
};

export default useAuthCheck;
