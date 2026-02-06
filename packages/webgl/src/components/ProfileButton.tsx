import React, { useState, useContext, useEffect, useCallback } from "react";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';
import AvatarModal from './AvatarModal';

interface ProfileData {
  avatarUrl: string | null;
  firstName: string;
  lastName: string;
  username?: string;
  isGuest: boolean;
}

// Helper to get avatar thumbnail URL with fallback (outside component to avoid dependency issues)
const getAvatarThumbnail = (profile: any) => {
  // Prefer avatarThumbnailUrl (new system)
  if (profile?.avatarThumbnailUrl) {
    return profile.avatarThumbnailUrl;
  }
  // Fallback to rpmURL conversion (legacy)
  if (profile?.rpmURL) {
    return profile.rpmURL.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75");
  }
  return null;
};

const getInitials = (firstName: string, lastName: string) => {
  if (!firstName || !lastName) return "?";
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

const getGuestInitials = (username: string) => {
  if (!username) return "G";
  // For "Visitor_1234" format, return "V1"
  if (username.startsWith("Visitor_")) {
    const number = username.split("_")[1];
    return `V${number ? number.charAt(0) : ""}`;
  }
  return username.charAt(0).toUpperCase();
};

function ProfileButton() {
  const { fullscreenRef } = useFullscreenContext();
  const [isPlayerInstantiated, setIsPlayerInstantiated] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const { user, currentUser, isGuestUser } = useContext(UserContext);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfileData = useCallback(async () => {
    setIsLoading(true);

    // Handle authenticated users
    if (user?.uid) {
      try {
        const userProfile = await getUserProfileData(user.uid);
        setProfileData({
          avatarUrl: getAvatarThumbnail(userProfile),
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          isGuest: false
        });
      } catch (error) {
        console.error('Error fetching profile data:', error);
      }
    }
    // Handle guest users
    else if (currentUser && isGuestUser(currentUser)) {
      setProfileData({
        avatarUrl: getAvatarThumbnail(currentUser),
        firstName: "Guest",
        lastName: "User",
        username: currentUser.username || currentUser.Nickname,
        isGuest: true
      });
    }

    setIsLoading(false);
  }, [user?.uid, currentUser, isGuestUser]);

  // Initial fetch and refetch when user changes
  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  useEffect(() => {
    const handlePlayerInstantiated = () => {
      setIsPlayerInstantiated(true);
    };

    window.addEventListener("PlayerInstantiated", handlePlayerInstantiated);

    return () => {
      window.removeEventListener("PlayerInstantiated", handlePlayerInstantiated);
    };
  }, []);

  const handleModalToggle = () => setOpenModal(!openModal);

  const handleModalClose = () => {
    setOpenModal(false);
    // Fetch new profile data when modal closes
    fetchProfileData();
  };

  if (!isPlayerInstantiated) return null;

  return (
    <>
      <div
        className={`relative ${profileData?.isGuest ? '' : 'cursor-pointer'} tooltip tooltip-top`}
        data-tip={profileData?.isGuest ? "Guest Avatar" : "Edit Avatar"}
        onMouseEnter={() => setIsAvatarHovered(true)}
        onMouseLeave={() => setIsAvatarHovered(false)}
        onClick={profileData?.isGuest ? undefined : handleModalToggle}
      >
        <div className="avatar">
          <div className="w-12 rounded-full bg-white border border-white/30">
            {!isLoading && profileData?.avatarUrl ? (
              <img src={profileData.avatarUrl} alt="avatar" />
            ) : (
              <div className="flex items-center justify-center h-full text-lg font-bold">
                {!isLoading && profileData ?
                  (profileData.isGuest ?
                    getGuestInitials(profileData.username || '') :
                    getInitials(profileData.firstName, profileData.lastName)
                  ) : ' '
                }
              </div>
            )}
          </div>
        </div>
        {isAvatarHovered && !profileData?.isGuest && (
          <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center bg-black/40 rounded-full">
            <p className="text-xs font-bold text-white">Edit</p>
          </div>
        )}
      </div>

      <AvatarModal isOpen={openModal} onClose={handleModalClose} />
    </>
  );
}

export default ProfileButton;
