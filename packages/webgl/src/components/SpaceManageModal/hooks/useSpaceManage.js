import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
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
export const useSpaceManage = (isOpen) => {
  const { spaceID } = useUnity();
  const toast = useToast();
  const [tabIndex, setTabIndex] = useState(0);

  // Space details state
  const [spaceName, setSpaceName] = useState('');
  const [spaceDescription, setSpaceDescription] = useState('');
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // Logo state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [existingLogo, setExistingLogo] = useState(null);
  const fileInputRef = useRef(null);

  // Background state
  const [selectedBgFile, setSelectedBgFile] = useState(null);
  const [bgPreviewUrl, setBgPreviewUrl] = useState(null);
  const [isBgUploading, setIsBgUploading] = useState(false);
  const [bgUploadProgress, setBgUploadProgress] = useState(0);
  const [existingBackground, setExistingBackground] = useState(null);
  const bgFileInputRef = useRef(null);

  // Video Background state
  const [selectedVideoFile, setSelectedVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [existingVideoBackground, setExistingVideoBackground] = useState(null);
  const videoFileInputRef = useRef(null);

  // Users state
  const [spaceOwners, setSpaceOwners] = useState([]);
  const [spaceHosts, setSpaceHosts] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [unbanningUid, setUnbanningUid] = useState(null);

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
  const [customPlayers, setCustomPlayers] = useState([]);
  const [newPlayerUrl, setNewPlayerUrl] = useState('');
  const [isSavingOverride, setIsSavingOverride] = useState(false);

  // Fetch space users
  const fetchSpaceUsers = useCallback(
    async (spaceData) => {
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
          toast({
            title: 'Error',
            description: 'Failed to load space users',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        } finally {
          setIsLoadingUsers(false);
        }
      }
    },
    [spaceID, isOpen, toast]
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
      toast({
        title: 'Error',
        description: 'Failed to load space data',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [spaceID, savedStreamData, fetchSpaceUsers, toast]);

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
    (e) => {
      const file = e.target.files[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          toast({
            title: 'Invalid file type',
            description: 'Please select an image file',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          return;
        }
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setPreviewUrl(reader.result);
        reader.readAsDataURL(file);
      }
    },
    [toast]
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
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

      toast({
        title: 'Upload successful',
        description: 'Space logo has been updated',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      setTimeout(() => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setUploadProgress(0);
        setIsUploading(false);
      }, 1000);

      window.dispatchEvent(new CustomEvent('SpaceLogoUpdated', { detail: { logoUrl: uploadedUrl } }));
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'An error occurred during upload',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [selectedFile, spaceID, toast]);

  const handleDelete = useCallback(async () => {
    if (!existingLogo) return;

    try {
      setIsUploading(true);
      await deleteSpaceLogo(spaceID);
      setExistingLogo(null);

      toast({
        title: 'Logo removed',
        description: 'Space logo has been removed',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });

      setIsUploading(false);
      window.dispatchEvent(new CustomEvent('SpaceLogoUpdated', { detail: { logoUrl: null } }));
    } catch (error) {
      console.error('Error deleting logo:', error);
      toast({
        title: 'Deletion failed',
        description: error.message || 'An error occurred during deletion',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setIsUploading(false);
    }
  }, [existingLogo, spaceID, toast]);

  const handleBrowseClick = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.click();
  }, []);

  // ============ BACKGROUND HANDLERS ============
  const handleBgFileChange = useCallback(
    (e) => {
      const file = e.target.files[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          toast({
            title: 'Invalid file type',
            description: 'Please select an image file',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          return;
        }
        setSelectedBgFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setBgPreviewUrl(reader.result);
        reader.readAsDataURL(file);
      }
    },
    [toast]
  );

  const handleBgUpload = useCallback(async () => {
    if (!selectedBgFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
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

      toast({
        title: 'Upload successful',
        description: 'Space background has been updated',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

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
      toast({
        title: 'Upload failed',
        description: error.message || 'An error occurred during upload',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setIsBgUploading(false);
      setBgUploadProgress(0);
    }
  }, [selectedBgFile, spaceID, toast]);

  const handleBgDelete = useCallback(async () => {
    if (!existingBackground) return;

    try {
      setIsBgUploading(true);
      await deleteSpaceBackground(spaceID);
      setExistingBackground(null);

      toast({
        title: 'Background removed',
        description: 'Space background has been removed',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });

      setIsBgUploading(false);
      window.dispatchEvent(
        new CustomEvent('SpaceBackgroundUpdated', { detail: { backgroundUrl: null } })
      );
    } catch (error) {
      console.error('Error deleting background:', error);
      toast({
        title: 'Deletion failed',
        description: error.message || 'An error occurred during deletion',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setIsBgUploading(false);
    }
  }, [existingBackground, spaceID, toast]);

  const handleBgBrowseClick = useCallback(() => {
    if (bgFileInputRef.current) bgFileInputRef.current.click();
  }, []);

  // ============ VIDEO BACKGROUND HANDLERS ============
  const handleVideoFileChange = useCallback(
    (e) => {
      const file = e.target.files[0];
      if (file) {
        if (!file.type.startsWith('video/')) {
          toast({
            title: 'Invalid file type',
            description: 'Please select a video file',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          return;
        }
        const maxSizeBytes = 5 * 1024 * 1024;
        if (file.size > maxSizeBytes) {
          toast({
            title: 'File too large',
            description: 'Video file must be smaller than 5MB',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          return;
        }
        setSelectedVideoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setVideoPreviewUrl(reader.result);
        reader.readAsDataURL(file);
      }
    },
    [toast]
  );

  const handleVideoUpload = useCallback(async () => {
    if (!selectedVideoFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
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

      toast({
        title: 'Upload successful',
        description: 'Space video background has been updated',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

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
      toast({
        title: 'Upload failed',
        description: error.message || 'An error occurred during upload',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setIsVideoUploading(false);
      setVideoUploadProgress(0);
    }
  }, [selectedVideoFile, spaceID, toast]);

  const handleVideoDelete = useCallback(async () => {
    if (!existingVideoBackground) return;

    try {
      setIsVideoUploading(true);
      await deleteSpaceVideoBackground(spaceID);
      setExistingVideoBackground(null);

      toast({
        title: 'Video background removed',
        description: 'Space video background has been removed',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });

      setIsVideoUploading(false);
      window.dispatchEvent(
        new CustomEvent('SpaceVideoBackgroundUpdated', { detail: { videoBackgroundUrl: null } })
      );
    } catch (error) {
      console.error('Error deleting video background:', error);
      toast({
        title: 'Deletion failed',
        description: error.message || 'An error occurred during deletion',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setIsVideoUploading(false);
    }
  }, [existingVideoBackground, spaceID, toast]);

  const handleVideoBrowseClick = useCallback(() => {
    if (videoFileInputRef.current) videoFileInputRef.current.click();
  }, []);

  // ============ SETTINGS HANDLERS ============
  const handleVoiceToggle = useCallback(async () => {
    setIsUpdatingSettings(true);
    try {
      await updateSpaceSettings(spaceID, { voiceDisabled: !voiceDisabled });
      setVoiceDisabled(!voiceDisabled);
      toast({
        title: 'Settings Updated',
        description: `Voice chat has been ${!voiceDisabled ? 'disabled' : 'enabled'} for this space.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      Logger.error('Error updating voice settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update voice settings',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsUpdatingSettings(false);
    }
  }, [voiceDisabled, spaceID, toast]);

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

      toast({
        title: 'Settings Updated',
        description: `Text chat has been ${!textChatDisabled ? 'disabled' : 'enabled'} for this space.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      Logger.error('Error updating text chat settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update text chat settings',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsUpdatingSettings(false);
    }
  }, [textChatDisabled, spaceID, toast]);

  const handleAccessibilityToggle = useCallback(async () => {
    setIsUpdatingSettings(true);
    try {
      await setSpaceAccessibleToAllUsers(spaceID, !accessibleToAllUsers);
      setAccessibleToAllUsers(!accessibleToAllUsers);
      toast({
        title: 'Settings Updated',
        description: `Space is now ${!accessibleToAllUsers ? 'accessible' : 'not accessible'} to all users.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      Logger.error('Error updating accessibility settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update accessibility settings',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsUpdatingSettings(false);
    }
  }, [accessibleToAllUsers, spaceID, toast]);

  const handleGuestUsersToggle = useCallback(async () => {
    setIsUpdatingSettings(true);
    try {
      const newAllowGuestUsers = !allowGuestUsers;
      const updateData = { allowGuestUsers: newAllowGuestUsers };

      if (!newAllowGuestUsers) {
        updateData.hideGuestSignInButton = false;
        setHideGuestSignInButton(false);
      }

      await updateSpaceSettings(spaceID, updateData);
      setAllowGuestUsers(newAllowGuestUsers);
      toast({
        title: 'Settings Updated',
        description: `Guest users are now ${newAllowGuestUsers ? 'allowed' : 'not allowed'} in this space.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      Logger.error('Error updating guest user settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update guest user settings',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsUpdatingSettings(false);
    }
  }, [allowGuestUsers, spaceID, toast]);

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

      toast({
        title: 'Settings Updated',
        description: `Guest sign-in button is now ${!hideGuestSignInButton ? 'hidden' : 'visible'}.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      Logger.error('Error updating sign-in button settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update sign-in button settings',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsUpdatingSettings(false);
    }
  }, [hideGuestSignInButton, spaceID, toast]);

  // ============ DETAILS HANDLERS ============
  const handleSaveSpaceDetails = useCallback(async () => {
    if (!spaceID) return;

    setIsSavingDetails(true);
    try {
      const db = getFirestore();
      const spaceRef = doc(db, 'spaces', spaceID);

      await updateDoc(spaceRef, { name: spaceName, description: spaceDescription });

      toast({
        title: 'Success',
        description: 'Space details updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      window.dispatchEvent(
        new CustomEvent('SpaceDetailsUpdated', { detail: { name: spaceName, description: spaceDescription } })
      );
    } catch (error) {
      Logger.error('Error updating space details:', error);
      toast({
        title: 'Error',
        description: 'Failed to update space details',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSavingDetails(false);
    }
  }, [spaceID, spaceName, spaceDescription, toast]);

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

      toast({
        title: 'Success',
        description: `Stream settings updated successfully. Streaming is now ${streamingEnabled ? 'enabled' : 'disabled'}.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setTimeout(() => fetchSpaceData(), 500);
    } catch (error) {
      Logger.error('Error updating stream settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update stream settings',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSavingStream(false);
    }
  }, [spaceID, streamingEnabled, hlsStreamUrl, rtmpUrl, streamKey, setHLSStreamUrl, fetchSpaceData, toast]);

  // ============ USER HANDLERS ============
  const handleUnbanUser = useCallback(
    async (uid) => {
      try {
        setUnbanningUid(uid);
        const dbInstance = getFirestore();
        await deleteDoc(doc(dbInstance, `spaces/${spaceID}/BannedUsers`, uid));

        const userRef = doc(dbInstance, 'users', uid);
        const bannedGroup = `space_${spaceID}_banned`;
        await updateDoc(userRef, { groups: arrayRemove(bannedGroup) });

        setBannedUsers((prev) => prev.filter((u) => u.uid !== uid));

        toast({
          title: 'User Unbanned',
          description: 'User can now re-enter this space.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } catch (e) {
        Logger.error('Error unbanning user:', e);
        toast({
          title: 'Error',
          description: 'Failed to unban user',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setUnbanningUid(null);
      }
    },
    [spaceID, toast]
  );

  // ============ OVERRIDE HANDLERS ============
  const handleAddCustomPlayer = useCallback(() => {
    if (!newPlayerUrl.trim()) {
      toast({
        title: 'URL Required',
        description: 'Please enter a URL',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const newPlayer = {
      id: Date.now().toString(),
      url: newPlayerUrl.trim(),
      createdAt: new Date().toISOString(),
    };

    setCustomPlayers((prev) => [...prev, newPlayer]);
    setNewPlayerUrl('');
  }, [newPlayerUrl, toast]);

  const handleRemoveCustomPlayer = useCallback((playerId) => {
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

      toast({
        title: 'Override ' + (newEnabledState ? 'Enabled' : 'Disabled'),
        description: `Override is now ${newEnabledState ? 'enabled' : 'disabled'}.`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });

      window.dispatchEvent(
        new CustomEvent('SpaceOverrideUpdated', { detail: { enabled: newEnabledState, customPlayers } })
      );
    } catch (error) {
      Logger.error('Error updating override enabled state:', error);
      setOverrideEnabled(!newEnabledState);
      toast({
        title: 'Error',
        description: 'Failed to update override state',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSavingOverride(false);
    }
  }, [overrideEnabled, spaceID, customPlayers, toast]);

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

      toast({
        title: 'Success',
        description: 'Override settings saved successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      window.dispatchEvent(
        new CustomEvent('SpaceOverrideUpdated', { detail: { enabled: overrideEnabled, customPlayers } })
      );
    } catch (error) {
      Logger.error('Error updating override settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update override settings',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSavingOverride(false);
    }
  }, [spaceID, overrideEnabled, customPlayers, toast]);

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
