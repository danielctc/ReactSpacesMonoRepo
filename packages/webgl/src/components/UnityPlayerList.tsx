import React, { useEffect, useState, useContext } from "react";
import { useUnityPlayerList } from "../hooks/unityEvents/useUnityPlayerList";
import { getUserProfileData } from "@disruptive-spaces/shared/firebase/userFirestore";
import { getSpaceItem, addBannedUserToSpace } from "@disruptive-spaces/shared/firebase/spacesFirestore";
import { useUnityKickPlayer } from "../hooks/unityEvents";
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { useVoiceChat } from "../voice-chat/hooks/useVoiceChat";
import {
  FaLinkedin,
  FaGlobe,
  FaMicrophone,
  FaMicrophoneSlash,
  FaStar,
  FaCrown,
  FaEllipsisV,
  FaBan,
  FaUserMinus
} from "react-icons/fa";

interface UnityPlayer {
  playerName: string;
  uid?: string;
  isLocalPlayer?: boolean;
  firstName?: string;
  lastName?: string;
  linkedInProfile?: string;
  websiteUrl?: string;
  rpmURL?: string;
  role?: 'owner' | 'host' | null;
}

interface UnityPlayerListProps {
  isVisible: boolean;
  onToggleVisibility: () => void;
  spaceID?: string;
}

const UnityPlayerList: React.FC<UnityPlayerListProps> = ({ isVisible, onToggleVisibility, spaceID: propSpaceID }) => {
  // Device checks
  const [isMobileBrowser, setIsMobileBrowser] = useState(false);
  useEffect(() => {
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    setIsMobileBrowser(mobileRegex.test(navigator.userAgent || ""));
  }, []);
  const shouldHideOnMobile = isMobileBrowser;

  // Unity player list
  const players = useUnityPlayerList();

  // Voice chat context (replaces Agora)
  const { isMuted, connectedUsers } = useVoiceChat();

  // Local state
  const [isReady, setIsReady] = useState(false);
  const [enrichedPlayers, setEnrichedPlayers] = useState<UnityPlayer[]>([]);
  const [voiceDisabled, setVoiceDisabled] = useState(false);

  // Kick / ban state
  const [processingKickPlayerName, setProcessingKickPlayerName] = useState<string | null>(null);
  const [playerToKick, setPlayerToKick] = useState<UnityPlayer | null>(null);
  const [isKickModalOpen, setIsKickModalOpen] = useState(false);
  const [playerToBan, setPlayerToBan] = useState<UnityPlayer | null>(null);
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [processingBanPlayerName, setProcessingBanPlayerName] = useState<string | null>(null);

  // Popover state
  const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null);

  // Current user
  const { user } = useContext(UserContext);
  const currentUser = user || (window as any).currentUser || {};

  // Space ID helper
  const getSpaceId = () => propSpaceID || (window as any).spaceID || (window.location.pathname.split("/").pop() || "fallback-space-id");
  const spaceID = getSpaceId();

  // Voice disabled check
  useEffect(() => {
    getSpaceItem(spaceID).then((space) => setVoiceDisabled(!!space?.voiceDisabled));
  }, [spaceID]);

  // Unity ready listener
  useEffect(() => {
    const handlePlayerInstantiated = () => setIsReady(true);
    window.addEventListener("PlayerInstantiated", handlePlayerInstantiated);
    if ((window as any).isPlayerInstantiated) setIsReady(true);
    return () => window.removeEventListener("PlayerInstantiated", handlePlayerInstantiated);
  }, []);

  // Enrich players with Firebase profile & role
  useEffect(() => {
    const enrich = async () => {
      const enriched = await Promise.all(
        players.map(async (p) => {
          if (!p.uid) return p;
          try {
            const profile = await getUserProfileData(p.uid);
            const ownerGroup = `space_${spaceID}_owners`;
            const hostGroup = `space_${spaceID}_hosts`;
            const role = profile.groups?.includes(ownerGroup) ? "owner" : profile.groups?.includes(hostGroup) ? "host" : null;

            // Convert .glb avatar URL to .png thumbnail
            const avatarUrl = profile.rpmURL ? profile.rpmURL.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75") : undefined;

            return { ...p, ...profile, rpmURL: avatarUrl, role };
          } catch {
            return p;
          }
        })
      );
      setEnrichedPlayers(enriched);
    };
    enrich();
  }, [players, spaceID]);

  // Kick / ban hook
  const { kickPlayer, isKicking, kickResult, error: kickError, resetKickState } = useUnityKickPlayer();

  // Toast-like notifications via alert (simple replacement)
  useEffect(() => {
    if (kickResult?.success && (processingKickPlayerName || processingBanPlayerName)) {
      if (processingKickPlayerName) {
        console.log(`${processingKickPlayerName} has been removed.`);
        setProcessingKickPlayerName(null);
      }
      if (processingBanPlayerName) {
        console.log(`${processingBanPlayerName} has been banned.`);
        setProcessingBanPlayerName(null);
      }
      resetKickState();
    }
    if (kickError) {
      console.error(kickError);
      setProcessingKickPlayerName(null);
      setProcessingBanPlayerName(null);
      resetKickState();
    }
  }, [kickResult, kickError, processingKickPlayerName, processingBanPlayerName, resetKickState]);

  // Utility helpers
  const isLocalUser = (p: UnityPlayer) => p.isLocalPlayer || p.uid === currentUser.uid;

  // Check if user has active mic using voice chat context
  const hasActiveMic = (p: UnityPlayer) => {
    if (isLocalUser(p)) {
      return !isMuted;
    }
    // Check if this player is in connectedUsers and speaking
    const voiceUser = connectedUsers.find(u => u.uid === p.uid);
    return voiceUser?.isSpeaking || false;
  };

  // Simple role badge component
  const RoleBadge = ({ role }: { role?: 'owner' | 'host' | null }) => {
    if (role === 'owner') return <FaCrown className="text-success w-3 h-3 ml-1" />;
    if (role === 'host') return <FaStar className="text-secondary w-3 h-3 ml-1" />;
    return null;
  };

  // Full role badge component for popover
  const FullRoleBadge = ({ role }: { role?: 'owner' | 'host' | null }) => {
    if (role === 'owner') {
      return (
        <div className="flex items-center gap-1 bg-success/20 px-3 py-1 rounded-md">
          <FaCrown className="text-success" />
          <span className="badge badge-success">Owner</span>
        </div>
      );
    }
    if (role === 'host') {
      return (
        <div className="flex items-center gap-1 bg-secondary/20 px-3 py-1 rounded-md">
          <FaStar className="text-secondary" />
          <span className="badge badge-secondary">Host</span>
        </div>
      );
    }
    return null;
  };

  // Confirm kick / ban actions
  const confirmKick = () => {
    if (!playerToKick) return;
    setProcessingKickPlayerName(playerToKick.playerName);
    kickPlayer(playerToKick.uid!, currentUser.uid);
    setIsKickModalOpen(false);
  };

  const confirmBan = async () => {
    if (!playerToBan) return;
    setProcessingBanPlayerName(playerToBan.playerName);
    await addBannedUserToSpace(spaceID, {
      uid: playerToBan.uid!,
      playerName: playerToBan.playerName,
      bannedAt: new Date().toISOString(),
      ...(currentUser.uid && { bannedBy: currentUser.uid })
    });
    kickPlayer(playerToBan.uid!, currentUser.uid);
    setIsBanModalOpen(false);
  };

  // Player action handler
  const handlePlayerAction = (action: 'remove' | 'ban', p: UnityPlayer) => {
    const localOwner = enrichedPlayers.find((pl) => pl.isLocalPlayer)?.role === "owner";
    if (!localOwner) {
      console.error("Permission Denied");
      return;
    }
    if (action === "remove") {
      setPlayerToKick(p);
      setIsKickModalOpen(true);
    } else if (action === "ban") {
      setPlayerToBan(p);
      setIsBanModalOpen(true);
    }
  };

  // Render
  return (
    <>
      <div
        className={`fixed top-[100px] right-[20px] z-[1] bg-base-300/40 backdrop-blur-sm p-4 rounded-md text-base-content min-w-[200px] max-h-[300px] group ${
          isReady && isVisible && !shouldHideOnMobile ? 'visible' : 'hidden'
        }`}
      >
        {/* Close button */}
        <button
          className="btn btn-ghost btn-xs btn-circle absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onToggleVisibility}
          aria-label="Close list"
        >
          ✕
        </button>

        <p className="font-bold mb-2 text-sm">
          People Online: {players.length}
        </p>

        {/* Player list */}
        <div className="max-h-[200px] overflow-y-auto">
          <div className="flex flex-col gap-1 w-full">
            {enrichedPlayers
              .sort((a, b) => (a.isLocalPlayer ? -1 : b.isLocalPlayer ? 1 : 0))
              .map((player, idx) => {
                const isLocal = isLocalUser(player);
                const showEllipsis = enrichedPlayers.find((pl) => pl.isLocalPlayer)?.role === "owner" && !isLocal && player.role !== "owner";
                const hasMic = !voiceDisabled && hasActiveMic(player);
                const playerId = `${player.uid || idx}`;
                return (
                  <div key={idx} className="relative">
                    <div
                      className="flex items-center gap-2 p-1 rounded-md hover:bg-base-content/10 cursor-pointer"
                      onMouseEnter={() => setHoveredPlayerId(playerId)}
                      onMouseLeave={() => setHoveredPlayerId(null)}
                    >
                      <div className="avatar">
                        <div className="w-6 h-6 rounded-full ring ring-base-content/30 ring-offset-base-100 ring-offset-1">
                          {player.rpmURL ? (
                            <img src={player.rpmURL} alt={player.playerName} />
                          ) : (
                            <div className="bg-base-content/40 w-full h-full" />
                          )}
                        </div>
                      </div>
                      <span className="text-xs">{player.playerName}</span>
                      <RoleBadge role={player.role} />
                      <div className="flex-1" />
                      {!voiceDisabled && (
                        hasMic ? (
                          <FaMicrophone className="text-success" />
                        ) : (
                          <FaMicrophoneSlash className="text-error" />
                        )
                      )}
                      {isLocal ? (
                        <span className="text-xs text-base-content/60 ml-1">(you)</span>
                      ) : showEllipsis ? (
                        <div className="dropdown dropdown-left dropdown-end">
                          <button tabIndex={0} className="btn btn-ghost btn-xs p-0 min-w-[16px] h-[16px]">
                            <FaEllipsisV className="text-base-content/60" />
                          </button>
                          <ul tabIndex={0} className="dropdown-content menu bg-base-300/80 backdrop-blur-md rounded-box z-[10001] w-32 p-2 shadow border border-base-content/10">
                            <li>
                              <button onClick={() => handlePlayerAction('remove', player)} className="text-sm">
                                <FaUserMinus /> Remove
                              </button>
                            </li>
                            <li>
                              <button onClick={() => handlePlayerAction('ban', player)} className="text-sm">
                                <FaBan /> Ban
                              </button>
                            </li>
                          </ul>
                        </div>
                      ) : null}
                    </div>

                    {/* Popover on hover */}
                    {hoveredPlayerId === playerId && (
                      <div className="absolute left-[-220px] top-0 bg-base-300/85 backdrop-blur-md text-base-content border-none p-4 min-w-[220px] rounded-lg z-[10000] shadow-lg">
                        <div className="flex flex-col items-center gap-3">
                          <div className="avatar">
                            <div className="w-16 h-16 rounded-full">
                              {player.rpmURL ? (
                                <img src={player.rpmURL} alt={player.playerName} />
                              ) : (
                                <div className="bg-base-content/40 w-full h-full" />
                              )}
                            </div>
                          </div>
                          <p className="font-bold">{player.playerName}</p>
                          <FullRoleBadge role={player.role} />
                          {player.firstName && (
                            <p className="text-sm text-base-content/70">{player.firstName} {player.lastName}</p>
                          )}
                          <div className="flex items-center gap-4 pt-2">
                            {player.linkedInProfile && (
                              <a href={player.linkedInProfile} target="_blank" rel="noopener noreferrer">
                                <FaLinkedin />
                              </a>
                            )}
                            {player.websiteUrl && (
                              <a href={player.websiteUrl} target="_blank" rel="noopener noreferrer">
                                <FaGlobe />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Kick Confirmation Modal */}
      {isKickModalOpen && (
        <dialog open className="modal">
          <div className="modal-box bg-base-300">
            <h3 className="font-bold text-lg">Confirm Removal</h3>
            <p className="py-4">Remove {playerToKick?.playerName} from the room?</p>
            <div className="modal-action">
              <button
                className="btn btn-error"
                onClick={confirmKick}
                disabled={isKicking}
              >
                {isKicking ? <span className="loading loading-spinner"></span> : 'Remove'}
              </button>
              <button
                className="btn"
                onClick={() => setIsKickModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* Ban Confirmation Modal */}
      {isBanModalOpen && (
        <dialog open className="modal">
          <div className="modal-box bg-base-300">
            <h3 className="font-bold text-lg">Confirm Ban</h3>
            <p className="py-4">Ban {playerToBan?.playerName} from the room? They will not be able to re-enter.</p>
            <div className="modal-action">
              <button
                className="btn btn-error"
                onClick={confirmBan}
                disabled={isKicking}
              >
                {isKicking ? <span className="loading loading-spinner"></span> : 'Ban'}
              </button>
              <button
                className="btn"
                onClick={() => setIsBanModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
};

export { UnityPlayerList };
export default UnityPlayerList;
