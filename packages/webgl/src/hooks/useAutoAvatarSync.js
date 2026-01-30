import { useEffect, useContext, useRef } from 'react';
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { useSendUnityEvent } from './unityEvents/core/useSendUnityEvent';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { getDefaultAvatarForUsername } from '@disruptive-spaces/shared/firebase/firebaseStorage';

/**
 * useAutoAvatarSync - Automatically syncs player avatar to Unity on spawn.
 *
 * Uses avatar URL from UserContext (no Firestore fetch needed).
 * Supports both avatarUrl (Firebase Storage) and rpmURL (legacy) fields.
 *
 * Flow:
 * 1. Unity spawns player -> sends "PlayerInstantiated" event
 * 2. React receives event -> gets avatar URL from context
 * 3. React sends "AvatarUrlFromReact" -> Unity loads avatar
 */
export const useAutoAvatarSync = () => {
  const { user, currentUser } = useContext(UserContext);
  const sendUnityEvent = useSendUnityEvent();
  const hasSentAvatar = useRef(false);
  const lastUserId = useRef(null);

  useEffect(() => {
    // Reset flag if user changed
    const currentUserId = user?.uid || currentUser?.uid;
    if (lastUserId.current !== currentUserId) {
      hasSentAvatar.current = false;
      lastUserId.current = currentUserId;
    }

    const sendAvatarToUnity = () => {
      // Prevent duplicate sends within the same session
      if (hasSentAvatar.current) {
        Logger.log("Avatar already sent this session, skipping");
        return;
      }

      // Get avatar URL from context (already loaded by UserProvider)
      const activeUser = user || currentUser;

      // Prefer avatarUrl (Firebase Storage) over rpmURL (legacy RPM)
      let avatarUrl = activeUser?.avatarUrl || activeUser?.rpmURL;

      Logger.log("Active user:", activeUser?.uid, "Avatar URL:", avatarUrl);

      // Fallback to deterministic default based on username if no avatar
      if (!avatarUrl) {
        const username = activeUser?.username || activeUser?.uid || 'guest';
        avatarUrl = getDefaultAvatarForUsername(username);
        Logger.log("No avatar found, using deterministic default for", username, ":", avatarUrl);
      }

      // Send to Unity
      if (avatarUrl) {
        Logger.log("Sending avatar URL to Unity:", avatarUrl);
        sendUnityEvent("AvatarUrlFromReact", { url: avatarUrl });
        hasSentAvatar.current = true;
      } else {
        Logger.warn("No avatar URL available to send to Unity");
      }
    };

    const handlePlayerInstantiated = () => {
      Logger.log("PlayerInstantiated received - triggering avatar sync");
      sendAvatarToUnity();
    };

    // Listen for PlayerInstantiated event from Unity
    window.addEventListener("PlayerInstantiated", handlePlayerInstantiated);

    // If player already instantiated before hook mounted, send immediately
    if (window.isPlayerInstantiated) {
      Logger.log("Player already instantiated - sending avatar immediately");
      sendAvatarToUnity();
    }

    return () => {
      window.removeEventListener("PlayerInstantiated", handlePlayerInstantiated);
    };
  }, [user, currentUser, sendUnityEvent]);
};

export default useAutoAvatarSync;
