import React, { useState, useEffect } from 'react';
import { FaLinkedin, FaGlobe, FaStar, FaCrown } from 'react-icons/fa';
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

interface NameplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  playerId: string;
  uid?: string;
}

interface ProfileData {
  firstName?: string;
  lastName?: string;
  linkedInProfile?: string;
  websiteUrl?: string;
  rpmURL?: string | null;
  role?: 'owner' | 'host' | null;
}

const FullRoleBadge: React.FC<{ role: 'owner' | 'host' | null }> = ({ role }) => {
  if (role === 'owner') {
    return (
      <div className="flex items-center gap-1 bg-green-900 px-3 py-1 rounded-md">
        <FaCrown className="text-green-300" />
        <span className="badge badge-success">Owner</span>
      </div>
    );
  }
  if (role === 'host') {
    return (
      <div className="flex items-center gap-1 bg-purple-900 px-3 py-1 rounded-md">
        <FaStar className="text-purple-300" />
        <span className="badge badge-secondary">Host</span>
      </div>
    );
  }
  return null;
};

function NameplateModal({ isOpen, onClose, playerName, playerId, uid }: NameplateModalProps) {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get spaceID from URL or window
  const getSpaceId = () => {
    const pathParts = window.location.pathname.split("/");
    return pathParts[pathParts.length - 1] || (window as any).spaceID || 'default-space-id';
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      setError(null);

      if (!uid) {
        Logger.warn("NameplateModal: No UID provided for player:", playerName);
        setError("No user ID available for this player");
        setLoading(false);
        return;
      }

      try {
        Logger.log("NameplateModal: Fetching profile for UID:", uid);
        const userProfile = await getUserProfileData(uid);

        if (!userProfile) {
          setError("Could not find profile data for this player");
        } else {
          // Determine role (owner/host)
          const spaceID = getSpaceId();
          const ownerGroup = `space_${spaceID}_owners`;
          const hostGroup = `space_${spaceID}_hosts`;
          const role = userProfile.groups?.includes(ownerGroup)
            ? "owner"
            : userProfile.groups?.includes(hostGroup)
            ? "host"
            : null;

          setProfileData({
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            linkedInProfile: userProfile.linkedInProfile,
            websiteUrl: userProfile.websiteUrl,
            rpmURL: userProfile.rpmURL ?
              userProfile.rpmURL.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75")
              : null,
            role: role
          });
        }
      } catch (error) {
        Logger.error('Error fetching profile data:', error);
        setError("Error loading profile data");
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchProfileData();
    }
  }, [uid, isOpen, playerName]);

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open" onClick={onClose}>
      <div
        className="modal-box bg-black/85 text-white border-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
        >
          ✕
        </button>

        <div className="py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg text-blue-400"></span>
            </div>
          ) : error ? (
            <div className="alert alert-warning">
              {error}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="avatar">
                <div className="w-16 rounded-full bg-white/20">
                  {profileData?.rpmURL ? (
                    <img src={profileData.rpmURL} alt={playerName} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-2xl">
                      {playerName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <p className="font-bold">{playerName}</p>
              <FullRoleBadge role={profileData?.role || null} />
              {profileData?.firstName && (
                <p className="text-sm text-gray-300">
                  {profileData.firstName} {profileData.lastName}
                </p>
              )}
              <div className="flex gap-4 pt-2">
                {profileData?.linkedInProfile && (
                  <a href={profileData.linkedInProfile} target="_blank" rel="noopener noreferrer">
                    <FaLinkedin className="w-5 h-5" />
                  </a>
                )}
                {profileData?.websiteUrl && (
                  <a href={profileData.websiteUrl} target="_blank" rel="noopener noreferrer">
                    <FaGlobe className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </dialog>
  );
}

export default NameplateModal;
