import { useState, useEffect, useContext } from 'react';
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';

export const useAvatarUpdate = () => {
  const [profileData, setProfileData] = useState(null);
  const { user } = useContext(UserContext);

  const fetchProfileData = async () => {
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
  };

  useEffect(() => {
    fetchProfileData();
  }, [user?.uid]);

  return [profileData?.rpmURL, fetchProfileData];
}; 