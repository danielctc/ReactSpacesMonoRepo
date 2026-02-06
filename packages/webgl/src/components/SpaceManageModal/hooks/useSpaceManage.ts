import { useState, useRef, useEffect, useCallback } from 'react';
import {
  uploadSpaceLogo,
  deleteSpaceLogo,
  getSpaceItem,
  uploadSpaceBackground,
  deleteSpaceBackground,
  updateSpaceSettings,
  setSpaceAccessibleToAllUsers,
  updateSpaceHLSStream,
  getSpaceHLSStream,
  uploadSpaceVideoBackground,
  deleteSpaceVideoBackground,
} from '@disruptive-spaces/shared/firebase/spacesFirestore';
import { useUnity } from '../../../providers/UnityProvider';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  arrayRemove,
} from 'firebase/firestore';
import { useHLSStream } from '../../../hooks/unityEvents';

/**
 * Custom hook that manages all state and handlers for the SpaceManageModal.
 * This centralizes the complex state management across all tabs.
 */
export const useSpaceManage = (isOpen: boolean) => {
  const { spaceID } = useUnity();
  const [tabIndex, setTabIndex] = useState(0);

  // Space details state
  const [spaceName, setSpaceName] = useState('');
  const [spaceDescription, setSpaceDescription] = useState('');
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // Logo state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [existingLogo, setExistingLogo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Background state
  const [selectedBgFile, setSelectedBgFile] = useState<File | null>(null);
  const [bgPreviewUrl, setBgPreviewUrl] = useState<string | null>(null);
  const [isBgUploading, setIsBgUploading] = useState(false);
  const [bgUploadProgress, setBgUploadProgress] = useState(0);
  const [existingBackground, setExistingBackground] = useState<string | null>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  // Video Background state
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [existingVideoBackground, setExistingVideoBackground] = useState<string | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Users state
  const [spaceOwners, setSpaceOwners] = useState<any[]>([]);
  const [spaceHosts, setSpaceHosts] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [unbanningUid, setUnbanningUid] = useState<string | null>(null);

  // Settings state
  const [voiceDisabled, setVoiceDisabled] = useState(false);
  const [textChatDisabled, setTextChatDisabled] = useState(false);
  const [accessibleToAllUsers, setAccessibleToAllUsers] = useState(true);
  const [allowGuestUsers, setAllowGuestUsers] = useState(false);
  const [hideGuestSignInButton, setHideGuestSignInButton] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // Streaming state
  const [streamingEnabled, setStreamingEnabled] = useState(false);
  const [hlsStreamUrl, setHlsStreamUrl] = useState('');
  const [rtmpUrl, setRtmpUrl] = useState('');
  const [streamKey, setStreamKey] = useState('');
  const [isSavingStream, setIsSavingStream] = useState(false);
  const {
    setHLSStreamUrl,
    playerStatus,
    isLoading: isStreamLoading,
    savedStreamData,
  } = useHLSStream();

  // Override state
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [customPlayers, setCustomPlayers] = useState<any[]>([]);
  const [newPlayerUrl, setNewPlayerUrl] = useState('');
  const [isSavingOverride, setIsSavingOverride] = useState(false);

  // Fetch space users
  const fetchSpaceUsers = useCallback(
    async (spaceData: any) => {
      if (spaceID && isOpen) {
        setIsLoadingUsers(true);
        try {
          const db = getFirestore();

          // Fetch owners
          const ownersGroupId = `space_${spaceID}_owners`;
          const ownersQuery = query(
            collection(db, 'users'),
            where('groups', 'array-contains', ownersGroupId)
          );
          const ownersSnapshot = await getDocs(ownersQuery);
          const ownersData = [];

          for (const docSnap of ownersSnapshot.docs) {
            const userData = docSnap.data();
            const userProfile = await getUserProfileData(docSnap.id);
            ownersData.push({
              uid: docSnap.id,
              email: userData.email,
              displayName: userData.displayName || userProfile.Nickname || 'Unknown User',
              photoURL: userData.photoURL || userProfile.photoURL,
              firstName: userProfile.firstName,
              lastName: userProfile.lastName,
            });
          }

          setSpaceOwners(ownersData);

          // Fetch hosts
          const hostsGroupId = `space_${spaceID}_hosts`;
          const hostsQuery = query(
            collection(db, 'users'),
            where('groups', 'array-contains', hostsGroupId)
          );
          const hostsSnapshot = await getDocs(hostsQuery);
          const hostsData = [];

          for (const docSnap of hostsSnapshot.docs) {
            const userData = docSnap.data();
            const userProfile = await getUserProfileData(docSnap.id);
            hostsData.push({
              uid: docSnap.id,
              email: userData.email,
              displayName: userData.displayName || userProfile.Nickname || 'Unknown User',
              photoURL: userData.photoURL || userProfile.photoURL,
              firstName: userProfile.firstName,
              lastName: userProfile.lastName,
            });
          }

          setSpaceHosts(hostsData);

          // Fetch banned users from sub-collection
          const bannedColRef = collection(db, `spaces/${spaceID}/BannedUsers`);
          const bannedSnap = await getDocs(bannedColRef);
          const bannedArr = [];
          for (const bannedDoc of bannedSnap.docs) {
            const uid = bannedDoc.id;
            try {
              const userProfile = await getUserProfileData(uid);
              bannedArr.push({
                uid,
                displayName: userProfile?.Nickname || uid,
                firstName: userProfile?.firstName,
                lastName: userProfile?.lastName,
                photoURL: userProfile?.photoURL,
              });
            } catch (e) {
              bannedArr.push({ uid, displayName: uid });
            }
          }
          setBannedUsers(bannedArr);
        } catch (error) {
          Logger.error('Error fetching space users:', error);
          console.error('Failed to load space users');
        } finally {
          setIsLoadingUsers(false);
        }
      }
    },
    [spaceID, isOpen]
  );

  // Fetch space data
  const fetchSpaceData = useCallback(async () => {
    try {
      const spaceData = await getSpaceItem(spaceID);

      if (spaceData.logoUrl) setExistingLogo(spaceData.logoUrl);
      if (spaceData.backgroundUrl) setExistingBackground(spaceData.backgroundUrl);
      if (spaceData.videoBackgroundUrl) setExistingVideoBackground(spaceData.videoBackgroundUrl);

      if (spaceData.voiceDisabled !== undefined) setVoiceDisabled(spaceData.voiceDisabled);
      if (spaceData.textChatDisabled !== undefined) setTextChatDisabled(spaceData.textChatDisabled);
      if (spaceData.accessibleToAllUsers !== undefined)
        setAccessibleToAllUsers(spaceData.accessibleToAllUsers);
      if (spaceData.allowGuestUsers !== undefined) setAllowGuestUsers(spaceData.allowGuestUsers);
      if (spaceData.hideGuestSignInButton !== undefined)
        setHideGuestSignInButton(spaceData.hideGuestSignInButton);

      setSpaceName(spaceData.name || '');
      setSpaceDescription(spaceData.description || '');

      // Load Override data
      if (spaceData.Override) {
        setOverrideEnabled(spaceData.Override.enabled === true);
        setCustomPlayers(spaceData.Override.customPlayers || []);
      } else {
        setOverrideEnabled(false);
        setCustomPlayers([]);
      }

      // Fetch HLS Stream Data
      try {
        const streamData = await getSpaceHLSStream(spaceID);
        if (streamData) {
          setHlsStreamUrl(streamData.streamUrl || '');
          setRtmpUrl(streamData.rtmpUrl || '');
          setStreamKey(streamData.streamKey || '');
          setStreamingEnabled(streamData.enabled === true);
        } else {
          setStreamingEnabled(false);
        }
      } catch (streamError) {
        Logger.error('Error fetching stream data directly:', streamError);
        if (savedStreamData) {
          setHlsStreamUrl(savedStreamData.streamUrl || '');
          setRtmpUrl(savedStreamData.rtmpUrl || '');
          setStreamKey(savedStreamData.streamKey || '');
          setStreamingEnabled(savedStreamData.enabled === true);
        } else {
          setStreamingEnabled(false);
        }
      }

      fetchSpaceUsers(spaceData);
    } catch (error) {
      Logger.error('Error fetching space data:', error);
      console.error('Failed to load space data');
    }
  }, [spaceID, savedStreamData, fetchSpaceUsers]);

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen && spaceID) {
      fetchSpaceData();
    }
  }, [isOpen, spaceID, fetchSpaceData]);

  // Update stream fields when savedStreamData changes
  useEffect(() => {
    if (savedStreamData && !isSavingStream) {
      setHlsStreamUrl(savedStreamData.streamUrl || '');
      setRtmpUrl(savedStreamData.rtmpUrl || '');
      setStreamKey(savedStreamData.streamKey || '');
      setStreamingEnabled(savedStreamData.enabled === true);
    }
  }, [savedStreamData, isSavingStream]);

  // Fetch users when switching to Users tab
  useEffect(() => {
    if (spaceID && isOpen && tabIndex === 4) {
      fetchSpaceUsers({});
    }
  }, [spaceID, isOpen, tabIndex, fetchSpaceUsers]);

  // ============ LOGO HANDLERS ============
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          console.warn('Invalid file type - please select an image file');
          return;
        }
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(file);
      }
    },
    []
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      console.warn('No file selected');
      return;
    }

    try {
      setIsUploading(true);
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 300);

      const uploadedUrl = await uploadSpaceLogo(spaceID, selectedFile);
      clearInterval(progressInterval);
      setUploadProgress(100);
      setExistingLogo(uploadedUrl);

      console.log('Space logo updated');

      setTimeout(() => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setUploadProgress(0);
        setIsUploading(false);
      }, 1000);

      window.dispatchEvent(new CustomEvent('SpaceLogoUpdated', { detail: { logoUrl: uploadedUrl } }));
    } catch (error) {
      console.error('Error uploading logo:', error);
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [selectedFile, spaceID]);

  const handleDelete = useCallback(async () => {
    if (!existingLogo) return;

    try {
      setIsUploading(true);
      await deleteSpaceLogo(spaceID);
      setExistingLogo(null);
      console.log('Logo removed');
      setIsUploading(false);
      window.dispatchEvent(new CustomEvent('SpaceLogoUpdated', { detail: { logoUrl: null } }));
    } catch (error) {
      console.error('Error deleting logo:', error);
      setIsUploading(false);
    }
  }, [existingLogo, spaceID]);

  const handleBrowseClick = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.click();
  }, []);

  // ============ BACKGROUND HANDLERS ============
  const handleBgFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          console.warn('Invalid file type - please select an image file');
          return;
        }
        setSelectedBgFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setBgPreviewUrl(reader.result as string);
        reader.readAsDataURL(file);
      }
    },
    []
  );

  const handleBgUpload = useCallback(async () => {
    if (!selectedBgFile) {
      console.warn('No file selected');
      return;
    }

    try {
      setIsBgUploading(true);
      const progressInterval = setInterval(() => {
        setBgUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 300);

      const uploadedUrl = await uploadSpaceBackground(spaceID, selectedBgFile);
      clearInterval(progressInterval);
      setBgUploadProgress(100);
      setExistingBackground(uploadedUrl);

      console.log('Space background updated');

      setTimeout(() => {
        setSelectedBgFile(null);
        setBgPreviewUrl(null);
        setBgUploadProgress(0);
        setIsBgUploading(false);
      }, 1000);

      window.dispatchEvent(
        new CustomEvent('SpaceBackgroundUpdated', { detail: { backgroundUrl: uploadedUrl } })
      );
    } catch (error) {
      console.error('Error uploading background:', error);
      setIsBgUploading(false);
      setBgUploadProgress(0);
    }
  }, [selectedBgFile, spaceID]);

  const handleBgDelete = useCallback(async () => {
    if (!existingBackground) return;

    try {
      setIsBgUploading(true);
      await deleteSpaceBackground(spaceID);
      setExistingBackground(null);
      console.log('Background removed');
      setIsBgUploading(false);
      window.dispatchEvent(
        new CustomEvent('SpaceBackgroundUpdated', { detail: { backgroundUrl: null } })
      );
    } catch (error) {
      console.error('Error deleting background:', error);
      setIsBgUploading(false);
    }
  }, [existingBackground, spaceID]);

  const handleBgBrowseClick = useCallback(() => {
    if (bgFileInputRef.current) bgFileInputRef.current.click();
  }, []);

  // ============ VIDEO BACKGROUND HANDLERS ============
  const handleVideoFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (!file.type.startsWith('video/')) {
          console.warn('Invalid file type - please select a video file');
          return;
        }
        const maxSizeBytes = 5 * 1024 * 1024;
        if (file.size > maxSizeBytes) {
          console.warn('File too large - video must be smaller than 5MB');
          return;
        }
        setSelectedVideoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setVideoPreviewUrl(reader.result as string);
        reader.readAsDataURL(file);
      }
    },
    []
  );

  const handleVideoUpload = useCallback(async () => {
    if (!selectedVideoFile) {
      console.warn('No file selected');
      return;
    }

    try {
      setIsVideoUploading(true);
      const progressInterval = setInterval(() => {
        setVideoUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 300);

      const uploadedUrl = await uploadSpaceVideoBackground(spaceID, selectedVideoFile);
      clearInterval(progressInterval);
      setVideoUploadProgress(100);
      setExistingVideoBackground(uploadedUrl);

      console.log('Space video background updated');

      setTimeout(() => {
        setSelectedVideoFile(null);
        setVideoPreviewUrl(null);
        setVideoUploadProgress(0);
        setIsVideoUploading(false);
      }, 1000);

      window.dispatchEvent(
        new CustomEvent('SpaceVideoBackgroundUpdated', { detail: { videoBackgroundUrl: uploadedUrl } })
      );
    } catch (error) {
      console.error('Error uploading video background:', error);
      setIsVideoUploading(false);
      setVideoUploadProgress(0);
    }
  }, [selectedVideoFile, spaceID]);

  const handleVideoDelete = useCallback(async () => {
    if (!existingVideoBackground) return;

    try {
      setIsVideoUploading(true);
      await deleteSpaceVideoBackground(spaceID);
      setExistingVideoBackground(null);
      console.log('Video background removed');
      setIsVideoUploading(false);
      window.dispatchEvent(
        new CustomEvent('SpaceVideoBackgroundUpdated', { detail: { videoBackgroundUrl: null } })
      );
    } catch (error) {
      console.error('Error deleting video background:', error);
      setIsVideoUploading(false);
    }
  }, [existingVideoBackground, spaceID]);

  const handleVideoBrowseClick = useCallback(() => {
    if (videoFileInputRef.current) videoFileInputRef.current.click();
  }, []);

  // ============ SETTINGS HANDLERS ============
  const handleVoiceToggle = useCallback(async () => {
    setIsUpdatingSettings(true);
    try {
      await updateSpaceSettings(spaceID, { voiceDisabled: !voiceDisabled });
      setVoiceDisabled(!voiceDisabled);
      console.log(`Voice chat ${!voiceDisabled ? 'disabled' : 'enabled'}`);
    } catch (error) {
      Logger.error('Error updating voice settings:', error);
      console.error('Failed to update voice settings');
    } finally {
      setIsUpdatingSettings(false);
    }
  }, [voiceDisabled, spaceID]);

  const handleTextChatToggle = useCallback(async () => {
    setIsUpdatingSettings(true);
    try {
      await updateSpaceSettings(spaceID, { textChatDisabled: !textChatDisabled });
      setTextChatDisabled(!textChatDisabled);

      window.dispatchEvent(
        new CustomEvent('SpaceTextChatSettingChanged', {
          detail: { spaceId: spaceID, textChatDisabled: !textChatDisabled },
        })
      );

      console.log(`Text chat ${!textChatDisabled ? 'disabled' : 'enabled'}`);
    } catch (error) {
      Logger.error('Error updating text chat settings:', error);
      console.error('Failed to update text chat settings');
    } finally {
      setIsUpdatingSettings(false);
    }
  }, [textChatDisabled, spaceID]);

  const handleAccessibilityToggle = useCallback(async () => {
    setIsUpdatingSettings(true);
    try {
      await setSpaceAccessibleToAllUsers(spaceID, !accessibleToAllUsers);
      setAccessibleToAllUsers(!accessibleToAllUsers);
      console.log(`Space now ${!accessibleToAllUsers ? 'accessible' : 'not accessible'} to all users`);
    } catch (error) {
      Logger.error('Error updating accessibility settings:', error);
      console.error('Failed to update accessibility settings');
    } finally {
      setIsUpdatingSettings(false);
    }
  }, [accessibleToAllUsers, spaceID]);

  const handleGuestUsersToggle = useCallback(async () => {
    setIsUpdatingSettings(true);
    try {
      const newAllowGuestUsers = !allowGuestUsers;
      const updateData: any = { allowGuestUsers: newAllowGuestUsers };

      if (!newAllowGuestUsers) {
        updateData.hideGuestSignInButton = false;
        setHideGuestSignInButton(false);
      }

      await updateSpaceSettings(spaceID, updateData);
      setAllowGuestUsers(newAllowGuestUsers);
      console.log(`Guest users now ${newAllowGuestUsers ? 'allowed' : 'not allowed'}`);
    } catch (error) {
      Logger.error('Error updating guest user settings:', error);
      console.error('Failed to update guest user settings');
    } finally {
      setIsUpdatingSettings(false);
    }
  }, [allowGuestUsers, spaceID]);

  const handleHideSignInButtonToggle = useCallback(async () => {
    setIsUpdatingSettings(true);
    try {
      await updateSpaceSettings(spaceID, { hideGuestSignInButton: !hideGuestSignInButton });
      setHideGuestSignInButton(!hideGuestSignInButton);

      window.dispatchEvent(
        new CustomEvent('SpaceSettingsChanged', {
          detail: { spaceId: spaceID, hideGuestSignInButton: !hideGuestSignInButton },
        })
      );

      console.log(`Guest sign-in button now ${!hideGuestSignInButton ? 'hidden' : 'visible'}`);
    } catch (error) {
      Logger.error('Error updating sign-in button settings:', error);
      console.error('Failed to update sign-in button settings');
    } finally {
      setIsUpdatingSettings(false);
    }
  }, [hideGuestSignInButton, spaceID]);

  // ============ DETAILS HANDLERS ============
  const handleSaveSpaceDetails = useCallback(async () => {
    if (!spaceID) return;

    setIsSavingDetails(true);
    try {
      const db = getFirestore();
      const spaceRef = doc(db, 'spaces', spaceID);

      await updateDoc(spaceRef, { name: spaceName, description: spaceDescription });

      console.log('Space details updated');

      window.dispatchEvent(
        new CustomEvent('SpaceDetailsUpdated', { detail: { name: spaceName, description: spaceDescription } })
      );
    } catch (error) {
      Logger.error('Error updating space details:', error);
      console.error('Failed to update space details');
    } finally {
      setIsSavingDetails(false);
    }
  }, [spaceID, spaceName, spaceDescription]);

  // ============ STREAMING HANDLERS ============
  const handleSaveStreamSettings = useCallback(async () => {
    if (!spaceID) return;

    setIsSavingStream(true);
    try {
      const streamData = {
        enabled: streamingEnabled,
        streamUrl: hlsStreamUrl,
        rtmpUrl: rtmpUrl,
        streamKey: streamKey,
        playerIndex: '0',
        updatedAt: new Date().toISOString(),
      };

      await updateSpaceHLSStream(spaceID, streamData);
      await setHLSStreamUrl(hlsStreamUrl, 0, {
        enabled: streamingEnabled,
        rtmpUrl: rtmpUrl,
        streamKey: streamKey,
      });

      window.dispatchEvent(
        new CustomEvent('StreamSettingsChanged', { detail: { enabled: streamingEnabled, spaceId: spaceID } })
      );

      console.log(`Stream settings updated - streaming now ${streamingEnabled ? 'enabled' : 'disabled'}`);

      setTimeout(() => fetchSpaceData(), 500);
    } catch (error) {
      Logger.error('Error updating stream settings:', error);
      console.error('Failed to update stream settings');
    } finally {
      setIsSavingStream(false);
    }
  }, [spaceID, streamingEnabled, hlsStreamUrl, rtmpUrl, streamKey, setHLSStreamUrl, fetchSpaceData]);

  // ============ USER HANDLERS ============
  const handleUnbanUser = useCallback(
    async (uid: string) => {
      try {
        setUnbanningUid(uid);
        const dbInstance = getFirestore();
        await deleteDoc(doc(dbInstance, `spaces/${spaceID}/BannedUsers`, uid));

        const userRef = doc(dbInstance, 'users', uid);
        const bannedGroup = `space_${spaceID}_banned`;
        await updateDoc(userRef, { groups: arrayRemove(bannedGroup) });

        setBannedUsers((prev) => prev.filter((u) => u.uid !== uid));

        console.log('User unbanned');
      } catch (e) {
        Logger.error('Error unbanning user:', e);
        console.error('Failed to unban user');
      } finally {
        setUnbanningUid(null);
      }
    },
    [spaceID]
  );

  // ============ OVERRIDE HANDLERS ============
  const handleAddCustomPlayer = useCallback(() => {
    if (!newPlayerUrl.trim()) {
      console.warn('URL required');
      return;
    }

    const newPlayer = {
      id: Date.now().toString(),
      url: newPlayerUrl.trim(),
      createdAt: new Date().toISOString(),
    };

    setCustomPlayers((prev) => [...prev, newPlayer]);
    setNewPlayerUrl('');
  }, [newPlayerUrl]);

  const handleRemoveCustomPlayer = useCallback((playerId: string) => {
    setCustomPlayers((prev) => prev.filter((p) => p.id !== playerId));
  }, []);

  const handleOverrideToggle = useCallback(async () => {
    const newEnabledState = !overrideEnabled;
    setOverrideEnabled(newEnabledState);

    setIsSavingOverride(true);
    try {
      const db = getFirestore();
      const spaceRef = doc(db, 'spaces', spaceID);

      await updateDoc(spaceRef, { 'Override.enabled': newEnabledState });

      console.log(`Override ${newEnabledState ? 'enabled' : 'disabled'}`);

      window.dispatchEvent(
        new CustomEvent('SpaceOverrideUpdated', { detail: { enabled: newEnabledState, customPlayers } })
      );
    } catch (error) {
      Logger.error('Error updating override enabled state:', error);
      setOverrideEnabled(!newEnabledState);
      console.error('Failed to update override state');
    } finally {
      setIsSavingOverride(false);
    }
  }, [overrideEnabled, spaceID, customPlayers]);

  const handleSaveOverrideSettings = useCallback(async () => {
    if (!spaceID) return;

    setIsSavingOverride(true);
    try {
      const db = getFirestore();
      const spaceRef = doc(db, 'spaces', spaceID);

      await updateDoc(spaceRef, {
        'Override.enabled': overrideEnabled,
        'Override.customPlayers': customPlayers,
      });

      console.log('Override settings saved');

      window.dispatchEvent(
        new CustomEvent('SpaceOverrideUpdated', { detail: { enabled: overrideEnabled, customPlayers } })
      );
    } catch (error) {
      Logger.error('Error updating override settings:', error);
      console.error('Failed to update override settings');
    } finally {
      setIsSavingOverride(false);
    }
  }, [spaceID, overrideEnabled, customPlayers]);

  return {
    // Core
    spaceID,
    tabIndex,
    setTabIndex,

    // Details
    spaceName,
    setSpaceName,
    spaceDescription,
    setSpaceDescription,
    isSavingDetails,
    handleSaveSpaceDetails,

    // Logo
    selectedFile,
    previewUrl,
    isUploading,
    uploadProgress,
    existingLogo,
    fileInputRef,
    handleFileChange,
    handleUpload,
    handleDelete,
    handleBrowseClick,

    // Background
    selectedBgFile,
    bgPreviewUrl,
    isBgUploading,
    bgUploadProgress,
    existingBackground,
    bgFileInputRef,
    handleBgFileChange,
    handleBgUpload,
    handleBgDelete,
    handleBgBrowseClick,

    // Video Background
    selectedVideoFile,
    videoPreviewUrl,
    isVideoUploading,
    videoUploadProgress,
    existingVideoBackground,
    videoFileInputRef,
    handleVideoFileChange,
    handleVideoUpload,
    handleVideoDelete,
    handleVideoBrowseClick,

    // Settings
    voiceDisabled,
    textChatDisabled,
    accessibleToAllUsers,
    allowGuestUsers,
    hideGuestSignInButton,
    isUpdatingSettings,
    handleVoiceToggle,
    handleTextChatToggle,
    handleAccessibilityToggle,
    handleGuestUsersToggle,
    handleHideSignInButtonToggle,

    // Users
    spaceOwners,
    spaceHosts,
    isLoadingUsers,
    bannedUsers,
    unbanningUid,
    handleUnbanUser,

    // Streaming
    streamingEnabled,
    setStreamingEnabled,
    hlsStreamUrl,
    setHlsStreamUrl,
    rtmpUrl,
    setRtmpUrl,
    streamKey,
    setStreamKey,
    isSavingStream,
    playerStatus,
    isStreamLoading,
    handleSaveStreamSettings,

    // Override
    overrideEnabled,
    customPlayers,
    newPlayerUrl,
    setNewPlayerUrl,
    isSavingOverride,
    handleAddCustomPlayer,
    handleRemoveCustomPlayer,
    handleOverrideToggle,
    handleSaveOverrideSettings,
  };
};

export default useSpaceManage;
