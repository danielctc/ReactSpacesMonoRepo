import { useState, useEffect, useContext } from 'react';
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';

export const useAvatarUpdate = () => {
  const [profileData, setProfileData] = useState(null);
  const { user, currentUser, isGuestUser } = useContext(UserContext);

  const fetchProfileData = async () => {
    // Handle authenticated users
    if (user?.uid) {
      try {
        const userProfile = await getUserProfileData(user.uid);
        if (userProfile?.rpmURL) {
          setProfileData({
            rpmURL: userProfile.rpmURL.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75")
          });
        }
      } catch (error) {
        // Silent fail - no logging
      }
    }
    // Handle guest users
    else if (currentUser && isGuestUser(currentUser)) {
      if (currentUser.rpmURL) {
        setProfileData({
          rpmURL: currentUser.rpmURL.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75")
        });
      }
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [user?.uid, currentUser?.uid, currentUser?.rpmURL]);

  return [profileData?.rpmURL, fetchProfileData];
}; 