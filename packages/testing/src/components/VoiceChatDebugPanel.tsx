import React, { useState, useEffect } from 'react';
import { useVoiceChat } from '@disruptive-spaces/webgl/voice-chat';
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';

interface UserProfile {
  Nickname?: string;
  rpmURL?: string;
}

interface VoiceUser {
  uid: string;
  audioTrack?: {
    isPlaying?: boolean;
  };
}

/**
 * Debug panel for voice chat that shows user information from Firebase
 * NOTE: Simplified version without Agora SDK - uses VoiceProvider from webgl package
 */
const VoiceChatDebugPanel: React.FC = () => {
  const voiceChat = useVoiceChat();
  const [speakerProfiles, setSpeakerProfiles] = useState<Record<string, UserProfile>>({});

  // Fetch user profiles from Firebase when users change
  useEffect(() => {
    const fetchUserProfiles = async () => {
      if (!voiceChat?.users || voiceChat.users.length === 0) return;

      const profiles: Record<string, UserProfile> = {};

      for (const user of voiceChat.users) {
        try {
          // Try to get user profile from Firebase
          const profile = await getUserProfileData(user.uid);
          profiles[user.uid] = profile;
        } catch (err) {
          console.error(`Error fetching profile for user ${user.uid}:`, err);
          profiles[user.uid] = { Nickname: `User ${user.uid.slice(0, 6)}...` };
        }
      }

      setSpeakerProfiles(profiles);
    };

    fetchUserProfiles();
  }, [voiceChat?.users]);

  if (!voiceChat) {
    return (
      <div className="p-4 bg-gray-800 text-white rounded-md shadow-lg w-full">
        <p className="text-red-300">Voice chat not available. Wrap this component in VoiceProvider.</p>
      </div>
    );
  }

  const { isEnabled, isConnected, users, error, channel } = voiceChat;

  // Get connection status badge
  const getStatusBadge = () => {
    if (error) return <span className="badge badge-error">Error</span>;
    if (!isConnected) return <span className="badge badge-warning">Disconnected</span>;
    return <span className="badge badge-success">Connected</span>;
  };

  // Get microphone status badge
  const getMicBadge = () => {
    if (!isConnected) return <span className="badge badge-ghost">Unavailable</span>;
    if (isEnabled) return <span className="badge badge-success">Enabled</span>;
    return <span className="badge badge-error">Muted</span>;
  };

  return (
    <div className="p-4 bg-gray-800 text-white rounded-md shadow-lg w-full">
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Voice Chat Debug</h2>

        <div className="divider my-0"></div>

        <div className="flex justify-between">
          <span>Status:</span>
          {getStatusBadge()}
        </div>

        <div className="flex justify-between">
          <span>Microphone:</span>
          {getMicBadge()}
        </div>

        <div className="flex justify-between">
          <span>Channel:</span>
          <span className="font-bold">{channel || 'Not set'}</span>
        </div>

        {error && (
          <p className="text-red-300 text-sm">Error: {error}</p>
        )}

        <div className="divider my-0"></div>

        <div>
          <h3 className="text-sm font-bold mb-2">Active Speakers ({users?.length || 0})</h3>
          {!users || users.length === 0 ? (
            <p className="text-sm text-gray-400">No active speakers</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {users.map((user: VoiceUser) => {
                const profile = speakerProfiles[user.uid] || {};
                const nickname = profile.Nickname || `User ${user.uid.slice(0, 6)}...`;
                const avatarUrl = profile.rpmURL
                  ? profile.rpmURL.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75")
                  : undefined;

                return (
                  <li key={user.uid} className="flex items-center gap-2">
                    <div className="avatar">
                      <div className="w-8 rounded-full">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={nickname} />
                        ) : (
                          <div className="bg-gray-600 w-full h-full flex items-center justify-center text-xs">
                            {nickname[0]}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="font-bold">{nickname}</span>
                      <span className="text-xs text-gray-400">ID: {user.uid}</span>
                    </div>
                    <span className={`badge ${user.audioTrack?.isPlaying ? "badge-success" : "badge-ghost"}`}>
                      {user.audioTrack?.isPlaying ? "Speaking" : "Silent"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceChatDebugPanel;
