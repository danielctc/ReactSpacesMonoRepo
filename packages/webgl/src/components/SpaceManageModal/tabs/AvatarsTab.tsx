import React, { useContext, useState, useEffect } from 'react';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import { userBelongsToGroup } from '@disruptive-spaces/shared/firebase/userPermissions';
import AvatarAdminPanel from '../../AvatarAdminPanel';

/**
 * AvatarsTab - Admin panel for managing the global avatar collection.
 * Only visible to disruptiveAdmin users.
 */
const AvatarsTab: React.FC = () => {
  const { user } = useContext(UserContext);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user?.uid) {
        try {
          const isDisruptiveAdmin = await userBelongsToGroup(user.uid, 'disruptiveAdmin');
          setIsAdmin(isDisruptiveAdmin);
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        }
      }
      setIsLoading(false);
    };

    checkAdminStatus();
  }, [user?.uid]);

  if (isLoading) {
    return (
      <div className="p-4 min-h-[400px]">
        <div className="flex flex-col justify-center items-center h-[200px]">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-white/60 mt-2">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-4 min-h-[400px]">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 text-center">
          <p className="text-red-300 font-semibold mb-2">Access Denied</p>
          <p className="text-white/70 text-sm">
            Only administrators can manage the avatar collection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 min-h-[400px] max-h-[70vh] overflow-y-auto">
      <AvatarAdminPanel />
    </div>
  );
};

export default AvatarsTab;
