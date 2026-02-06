import React from 'react';
import { FiAward, FiStar, FiUserMinus } from 'react-icons/fi';

interface User {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  firstName?: string;
  lastName?: string;
}

interface UsersTabProps {
  spaceOwners: User[];
  spaceHosts: User[];
  isLoadingUsers: boolean;
  bannedUsers: User[];
  unbanningUid: string | null;
  handleUnbanUser: (uid: string) => void;
}

/**
 * Users Tab - Displays space owners, hosts, and banned users.
 */
const UsersTab: React.FC<UsersTabProps> = ({
  spaceOwners,
  spaceHosts,
  isLoadingUsers,
  bannedUsers,
  unbanningUid,
  handleUnbanUser,
}) => {
  const UserCard = ({ user, roleIcon: RoleIcon, roleColor, roleName }: {
    user: User;
    roleIcon: React.ElementType;
    roleColor: string;
    roleName: string;
  }) => (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-md border border-white/10">
      <div className="flex items-center gap-3">
        <div className="avatar placeholder">
          <div className="bg-neutral text-neutral-content rounded-full w-8">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} />
            ) : (
              <span className="text-xs">{user.displayName?.charAt(0) || '?'}</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-white">{user.displayName}</p>
          <p className="text-xs text-gray-400">{user.email}</p>
        </div>
      </div>
      <span className={`badge badge-${roleColor} text-xs gap-1`}>
        <RoleIcon />
        {roleName}
      </span>
    </div>
  );

  if (isLoadingUsers) {
    return (
      <div className="p-4 flex flex-col items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="text-sm mt-3 text-gray-400">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col">
      <p className="text-sm font-semibold mb-3 text-white">Space Users</p>

      <div className="flex flex-col gap-4">
        {/* Owners Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FiAward className="text-yellow-400" />
            <p className="text-xs font-medium text-gray-400">Owners ({spaceOwners.length})</p>
          </div>
          <div className="flex flex-col gap-2">
            {spaceOwners.length > 0 ? (
              spaceOwners.map((owner) => (
                <UserCard
                  key={owner.uid}
                  user={owner}
                  roleIcon={FiAward}
                  roleColor="warning"
                  roleName="Owner"
                />
              ))
            ) : (
              <p className="text-xs text-gray-500 italic">No owners assigned</p>
            )}
          </div>
        </div>

        <div className="divider my-0"></div>

        {/* Hosts Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FiStar className="text-blue-400" />
            <p className="text-xs font-medium text-gray-400">Hosts ({spaceHosts.length})</p>
          </div>
          <div className="flex flex-col gap-2">
            {spaceHosts.length > 0 ? (
              spaceHosts.map((host) => (
                <UserCard
                  key={host.uid}
                  user={host}
                  roleIcon={FiStar}
                  roleColor="info"
                  roleName="Host"
                />
              ))
            ) : (
              <p className="text-xs text-gray-500 italic">No hosts assigned</p>
            )}
          </div>
        </div>

        <div className="divider my-0"></div>

        {/* Banned Users Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FiUserMinus className="text-red-400" />
            <p className="text-xs font-medium text-gray-400">Banned Users ({bannedUsers.length})</p>
          </div>
          <div className="flex flex-col gap-2">
            {bannedUsers.length > 0 ? (
              bannedUsers.map((user) => (
                <div
                  key={user.uid}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-md border border-red-900"
                >
                  <div className="flex items-center gap-3">
                    <div className="avatar placeholder">
                      <div className="bg-neutral text-neutral-content rounded-full w-8">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName} />
                        ) : (
                          <span className="text-xs">{user.displayName?.charAt(0) || '?'}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{user.displayName}</p>
                      {user.firstName && user.lastName && (
                        <p className="text-xs text-gray-400">
                          {user.firstName} {user.lastName}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    className="btn btn-xs btn-outline btn-success"
                    onClick={() => handleUnbanUser(user.uid)}
                    disabled={unbanningUid === user.uid}
                  >
                    {unbanningUid === user.uid ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        Unbanning...
                      </>
                    ) : (
                      'Unban'
                    )}
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 italic">No banned users</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersTab;
