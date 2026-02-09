import React, { useState, useEffect, useContext, useRef } from 'react';
import { FaUsers, FaStar, FaCrown, FaShieldAlt, FaBars } from 'react-icons/fa';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';
import { userBelongsToGroup } from '@disruptive-spaces/shared/firebase/userPermissions';
import { ScreenShareMenuOption } from '../screen-share';
import SpacesControlsModal from './SpacesControlsModal';
import SpacesSettingsModal from './SpacesSettingsModal';
import SpaceManageModal from './SpaceManageModal';
import AuthenticationButton from './AuthenticationButton';
interface Props {
  onTogglePlayerList?: () => void;
  spaceID: string;
  containerRef?: React.RefObject<HTMLDivElement>;
}

export const CanvasMainMenu: React.FC<Props> = ({ onTogglePlayerList, spaceID, containerRef }) => {
  const { fullscreenRef } = useFullscreenContext();
  const [isPlayerInstantiated, setIsPlayerInstantiated] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [openControlsModal, setOpenControlsModal] = useState(false);
  const [openManageSpaceModal, setOpenManageSpaceModal] = useState(false);
  const [profileData, setProfileData] = useState<{rpmURL: string | null; isGuest: boolean} | null>(null);
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  const [canEditSpace, setCanEditSpace] = useState(false);
  const [isSpaceHost, setIsSpaceHost] = useState(false);
  const [isDisruptiveAdmin, setIsDisruptiveAdmin] = useState(false);
  const [toast, setToast] = useState<{message: string; type: string} | null>(null);

  const { user, currentUser, isGuestUser } = useContext(UserContext);

  // Get display name based on user type
  const getDisplayName = () => {
    if (user?.Nickname) {
      return user.Nickname;
    }
    if (currentUser && isGuestUser(currentUser)) {
      return currentUser.username || currentUser.Nickname || "Guest User";
    }
    return "Unknown";
  };

  const userNickname = getDisplayName();
  const [voiceDisabled, setVoiceDisabled] = useState(false);

  // Helper function to get initials for guest users
  const getGuestInitials = (username?: string) => {
    if (!username) return "G";
    if (username.startsWith("Visitor_")) {
      const number = username.split("_")[1];
      return `V${number ? number.charAt(0) : ""}`;
    }
    return username.charAt(0).toUpperCase();
  };

  // Fetch Firebase profile data for the avatar and check permissions
  const fetchProfileData = async () => {
    if (user?.uid && spaceID) {
      try {
        const userProfile = await getUserProfileData(user.uid);

        let isOwner = false;
        let isHost = false;

        if (userProfile.groups) {
          const ownerGroupId = `space_${spaceID}_owners`;
          const hostGroupId = `space_${spaceID}_hosts`;

          isOwner = userProfile.groups.includes(ownerGroupId);
          isHost = userProfile.groups.includes(hostGroupId);
        }

        const isAdmin = await userBelongsToGroup(user.uid, 'disruptiveAdmin');
        setIsDisruptiveAdmin(isAdmin);

        setProfileData({
          rpmURL: userProfile.rpmURL ?
            userProfile.rpmURL.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75")
            : null,
          isGuest: false
        });

        setCanEditSpace(isOwner || isAdmin);
        setIsSpaceHost(isHost);

        if (!isOwner && !isAdmin && editModeEnabled) {
          setEditModeEnabled(false);
          const editModeEvent = new CustomEvent('editModeChanged', {
            detail: { enabled: false }
          });
          window.dispatchEvent(editModeEvent);

          setToast({
            message: "You don't have permission to edit this space.",
            type: "warning"
          });
          setTimeout(() => setToast(null), 5000);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        setCanEditSpace(false);
        setIsSpaceHost(false);
        setIsDisruptiveAdmin(false);
      }
    } else if (currentUser && isGuestUser(currentUser)) {
      setProfileData({
        rpmURL: currentUser.rpmURL ?
          currentUser.rpmURL.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75")
          : null,
        isGuest: true
      });

      setCanEditSpace(false);
      setIsSpaceHost(false);
      setIsDisruptiveAdmin(false);

      if (editModeEnabled) {
        setEditModeEnabled(false);
        const editModeEvent = new CustomEvent('editModeChanged', {
          detail: { enabled: false }
        });
        window.dispatchEvent(editModeEvent);
      }
    } else {
      setProfileData(null);
      setCanEditSpace(false);
      setIsSpaceHost(false);
      setIsDisruptiveAdmin(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [user?.uid, currentUser?.uid, currentUser?.rpmURL, spaceID, editModeEnabled]);

  useEffect(() => {
    const handlePlayerInstantiated = () => {
      setIsPlayerInstantiated(true);
    };

    window.addEventListener("PlayerInstantiated", handlePlayerInstantiated);

    return () => {
      window.removeEventListener("PlayerInstantiated", handlePlayerInstantiated);
    };
  }, []);

  // Check if voice is disabled for the space (removed Agora references)
  useEffect(() => {
    const checkVoiceDisabled = async () => {
      try {
        // Use standard browser APIs instead of Agora
        const voiceState = localStorage.getItem(`voiceDisabled_${spaceID}`);
        if (voiceState !== null) {
          setVoiceDisabled(voiceState === 'true');
        }
      } catch (error) {
        console.error("Error checking if voice is disabled:", error);
      }
    };

    checkVoiceDisabled();

    const handleVoiceSettingChanged = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.voiceDisabled === 'boolean') {
        setVoiceDisabled(event.detail.voiceDisabled);
      }
    };

    window.addEventListener("SpaceVoiceSettingChanged", handleVoiceSettingChanged as EventListener);

    return () => {
      window.removeEventListener("SpaceVoiceSettingChanged", handleVoiceSettingChanged as EventListener);
    };
  }, [spaceID]);

  const handleSettingsToggle = () => {
    setIsSettingsOpen(!isSettingsOpen);
    if (!isSettingsOpen) {
      handleCloseMenu();
    }
  };

  const handleControlsModalToggle = () => setOpenControlsModal(!openControlsModal);

  const handleManageSpaceToggle = () => {
    setOpenManageSpaceModal(!openManageSpaceModal);
    handleCloseMenu();
  };

  const handleTogglePlayerList = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (typeof onTogglePlayerList === 'function') {
      Logger.log("CanvasMainMenu: Toggling player list");
      onTogglePlayerList();
    }
  };

  const handleCloseMenu = () => {
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative">
        <button
          className={`btn btn-circle btn-ghost relative z-[9999] w-12 h-12 text-white backdrop-blur-[30px] backdrop-saturate-200 backdrop-brightness-110 transition-all duration-300 ease-in-out border bg-gradient-to-br from-black/50 to-neutral-900/40 border-white/20 shadow-[0_4px_15px_rgba(0,0,0,0.3)] hover:scale-105 hover:backdrop-blur-[35px] hover:backdrop-saturate-[220%] hover:backdrop-brightness-115 hover:from-black/60 hover:to-neutral-900/50`}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Main menu"
        >
          <FaBars />
        </button>
        {isOpen && (
          <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={handleCloseMenu}
          />
          <ul
            className="absolute right-0 top-full mt-2 menu rounded-xl z-[9999] w-[280px] p-3 bg-gradient-to-br from-black/70 to-neutral-900/60 backdrop-blur-[30px] backdrop-saturate-200 border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          >
            {/* Header */}
            <li className="flex flex-row items-center gap-3 mb-3 px-2">
              <div className="avatar">
                <div className="w-8 rounded-full border border-white/30">
                  {profileData?.rpmURL ? (
                    <img src={profileData.rpmURL} alt="Avatar" />
                  ) : (
                    <div className="bg-white text-black flex items-center justify-center">
                      {profileData?.isGuest ?
                        getGuestInitials(currentUser?.username || currentUser?.Nickname) :
                        " "
                      }
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-sm">{userNickname}</span>
                  {canEditSpace && !isDisruptiveAdmin && (
                    <div className="tooltip" data-tip="Owner">
                      <FaCrown className="text-green-400" size={10} />
                    </div>
                  )}
                  {!canEditSpace && isSpaceHost && !isDisruptiveAdmin && (
                    <div className="tooltip" data-tip="Host">
                      <FaStar className="text-teal-400" size={10} />
                    </div>
                  )}
                  {isDisruptiveAdmin && (
                    <div className="tooltip" data-tip="Admin">
                      <FaShieldAlt className="text-blue-400" size={10} />
                    </div>
                  )}
                </div>
                <span className="text-xs text-white/80">Spaces Metaverse</span>
              </div>
            </li>

            {/* Quick actions */}
            <li className="flex flex-row justify-center gap-3 mb-3">
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleTogglePlayerList}
                aria-label="People"
              >
                <FaUsers />
              </button>
            </li>

            <div className="divider my-0"></div>

            {/* Menu items */}
            <div className="flex flex-col gap-1">
              {canEditSpace && (
                <li>
                  <a className="text-sm hover:bg-white/20 rounded-md" onClick={handleManageSpaceToggle}>
                    Manage Space
                  </a>
                </li>
              )}

              {user && spaceID && !voiceDisabled && (
                <li>
                  <ScreenShareMenuOption onClose={handleCloseMenu} />
                </li>
              )}

              <li>
                <a className="text-sm hover:bg-white/20 rounded-md" onClick={handleSettingsToggle}>
                  Settings
                </a>
              </li>

              <li>
                <a
                  className="text-sm hover:bg-white/20 rounded-md"
                  onClick={() => window.open('https://support.spacesmetaverse.com/', '_blank')}
                >
                  Support
                </a>
              </li>

              <li>
                <a className="text-sm text-red-300 hover:bg-white/20 rounded-md" onClick={() => window.location.href = '/'}>
                  Leave
                </a>
              </li>
            </div>
          </ul>
          </>
        )}
      </div>

      {openControlsModal && <SpacesControlsModal open={openControlsModal} onClose={handleControlsModalToggle} />}
      {isSettingsOpen && <SpacesSettingsModal open={isSettingsOpen} onClose={handleSettingsToggle} containerRef={containerRef} />}
      {openManageSpaceModal && <SpaceManageModal isOpen={openManageSpaceModal} onClose={handleManageSpaceToggle} />}

      {toast && (
        <div className="toast toast-top">
          <div className={`alert ${toast.type === 'warning' ? 'alert-warning' : 'alert-info'}`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default CanvasMainMenu;
