import React, { useState, useContext, useEffect, useCallback } from "react";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';

interface ProfileData {
  avatarUrl: string | null;
  firstName: string;
  lastName: string;
  username?: string;
  isGuest: boolean;
}

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
          avatarUrl: userProfile?.rpmURL
            ? userProfile.rpmURL.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75")
            : null,
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
        avatarUrl: currentUser?.rpmURL
          ? currentUser.rpmURL.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75")
          : null,
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

  if (!isPlayerInstantiated) return null;

  return (
    <div
      className={`relative ${profileData?.isGuest ? '' : ''}`}
      onMouseEnter={() => setIsAvatarHovered(true)}
      onMouseLeave={() => setIsAvatarHovered(false)}
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
    </div>
  );
}

export default ProfileButton;
