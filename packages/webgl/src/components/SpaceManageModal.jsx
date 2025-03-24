import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Box,
  Text,
  Image,
  VStack,
  HStack,
  Flex,
  Progress,
  Icon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  Avatar,
  Badge,
  Divider,
  Spinner,
  Spacer,
  Switch,
  Textarea,
} from '@chakra-ui/react';
import { FiUpload, FiTrash2, FiImage, FiSettings, FiCamera, FiInfo, FiUsers, FiUserPlus, FiUserMinus, FiAward, FiStar, FiVolume2, FiTag } from 'react-icons/fi';
import { 
  uploadSpaceLogo, 
  deleteSpaceLogo, 
  getSpaceItem, 
  uploadSpaceBackground, 
  deleteSpaceBackground,
  updateSpaceSettings,
  setSpaceAccessibleToAllUsers
} from '@disruptive-spaces/shared/firebase/spacesFirestore';
import { useUnity } from '../providers/UnityProvider';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import SpaceTagsManager from './SpaceTagsManager';

const SpaceManageModal = ({ isOpen, onClose }) => {
  const { spaceID } = useUnity();
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
  
  // Users state
  const [spaceOwners, setSpaceOwners] = useState([]);
  const [spaceHosts, setSpaceHosts] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // Settings state
  const [voiceDisabled, setVoiceDisabled] = useState(false);
  const [accessibleToAllUsers, setAccessibleToAllUsers] = useState(true);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  
  const toast = useToast();

  // Fetch existing data when modal opens
  useEffect(() => {
    if (isOpen && spaceID) {
      fetchSpaceData();
    }
  }, [isOpen, spaceID]);

  const fetchSpaceData = async () => {
    try {
      const spaceData = await getSpaceItem(spaceID);
      
      // Set logo if exists
      if (spaceData.logoUrl) {
        setExistingLogo(spaceData.logoUrl);
      }
      
      // Set background if exists
      if (spaceData.backgroundUrl) {
        setExistingBackground(spaceData.backgroundUrl);
      }
      
      // Set settings
      if (spaceData.voiceDisabled !== undefined) {
        setVoiceDisabled(spaceData.voiceDisabled);
      }
      
      if (spaceData.accessibleToAllUsers !== undefined) {
        setAccessibleToAllUsers(spaceData.accessibleToAllUsers);
      }
      
      // Set space details from the space's name field, not from WebGL build
      setSpaceName(spaceData.name || '');
      setSpaceDescription(spaceData.description || '');
      
      // Fetch users
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
  };

  // Function to fetch space users
  const fetchSpaceUsers = async (spaceData) => {
    if (spaceID && isOpen) {
      setIsLoadingUsers(true);
      try {
        const db = getFirestore();
        
        // Fetch owners
        const ownersGroupId = `space_${spaceID}_owners`;
        const ownersQuery = query(
          collection(db, "users"),
          where("groups", "array-contains", ownersGroupId)
        );
        const ownersSnapshot = await getDocs(ownersQuery);
        const ownersData = [];
        
        for (const doc of ownersSnapshot.docs) {
          const userData = doc.data();
          const userProfile = await getUserProfileData(doc.id);
          ownersData.push({
            uid: doc.id,
            email: userData.email,
            displayName: userData.displayName || userProfile.Nickname || "Unknown User",
            photoURL: userData.photoURL || userProfile.photoURL,
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
          });
        }
        
        setSpaceOwners(ownersData);
        
        // Fetch hosts
        const hostsGroupId = `space_${spaceID}_hosts`;
        const hostsQuery = query(
          collection(db, "users"),
          where("groups", "array-contains", hostsGroupId)
        );
        const hostsSnapshot = await getDocs(hostsQuery);
        const hostsData = [];
        
        for (const doc of hostsSnapshot.docs) {
          const userData = doc.data();
          const userProfile = await getUserProfileData(doc.id);
          hostsData.push({
            uid: doc.id,
            email: userData.email,
            displayName: userData.displayName || userProfile.Nickname || "Unknown User",
            photoURL: userData.photoURL || userProfile.photoURL,
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
          });
        }
        
        setSpaceHosts(hostsData);
        
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
  };

  // Fetch space users when tab changes to Users tab
  useEffect(() => {
    if (spaceID && isOpen && tabIndex === 4) { // Only fetch when users tab is active (index is now 4)
      fetchSpaceUsers({});
    }
  }, [spaceID, isOpen, tabIndex]);

  // Handle logo file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
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
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle background file selection
  const handleBgFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
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
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setBgPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle logo upload
  const handleUpload = async () => {
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
      
      // Simulate progress (in a real implementation, you might use Firebase's upload progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 10;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 300);
      
      // Upload the logo to Firebase
      const uploadedUrl = await uploadSpaceLogo(spaceID, selectedFile);
      
      // Clear the interval and set progress to 100%
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Update the UI
      setExistingLogo(uploadedUrl);
      
      // Show success message
      toast({
        title: 'Upload successful',
        description: 'Space logo has been updated',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Reset the form after a delay
      setTimeout(() => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setUploadProgress(0);
        setIsUploading(false);
      }, 1000);
      
      // Dispatch an event to notify the loader to update the logo
      window.dispatchEvent(new CustomEvent('SpaceLogoUpdated', { 
        detail: { logoUrl: uploadedUrl } 
      }));
      
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
  };

  // Handle background upload
  const handleBgUpload = async () => {
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
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setBgUploadProgress(prev => {
          const newProgress = prev + 10;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 300);
      
      // Upload the background to Firebase
      const uploadedUrl = await uploadSpaceBackground(spaceID, selectedBgFile);
      
      // Clear the interval and set progress to 100%
      clearInterval(progressInterval);
      setBgUploadProgress(100);
      
      // Update the UI
      setExistingBackground(uploadedUrl);
      
      // Show success message
      toast({
        title: 'Upload successful',
        description: 'Space background has been updated',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Reset the form after a delay
      setTimeout(() => {
        setSelectedBgFile(null);
        setBgPreviewUrl(null);
        setBgUploadProgress(0);
        setIsBgUploading(false);
      }, 1000);
      
      // Dispatch an event to notify components to update the background
      window.dispatchEvent(new CustomEvent('SpaceBackgroundUpdated', { 
        detail: { backgroundUrl: uploadedUrl } 
      }));
      
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
  };

  // Handle logo deletion
  const handleDelete = async () => {
    if (!existingLogo) return;
    
    try {
      setIsUploading(true);
      
      // Delete the logo from Firebase
      await deleteSpaceLogo(spaceID);
      
      // Update the UI
      setExistingLogo(null);
      
      // Show success message
      toast({
        title: 'Logo removed',
        description: 'Space logo has been removed',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      
      setIsUploading(false);
      
      // Dispatch an event to notify the loader to remove the logo
      window.dispatchEvent(new CustomEvent('SpaceLogoUpdated', { 
        detail: { logoUrl: null } 
      }));
      
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
  };

  // Handle background deletion
  const handleBgDelete = async () => {
    if (!existingBackground) return;
    
    try {
      setIsBgUploading(true);
      
      // Delete the background from Firebase
      await deleteSpaceBackground(spaceID);
      
      // Update the UI
      setExistingBackground(null);
      
      // Show success message
      toast({
        title: 'Background removed',
        description: 'Space background has been removed',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      
      setIsBgUploading(false);
      
      // Dispatch an event to notify components to remove the background
      window.dispatchEvent(new CustomEvent('SpaceBackgroundUpdated', { 
        detail: { backgroundUrl: null } 
      }));
      
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
  };

  // Handle browse button click for logo
  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle browse button click for background
  const handleBgBrowseClick = () => {
    if (bgFileInputRef.current) {
      bgFileInputRef.current.click();
    }
  };

  // Handle voice toggle
  const handleVoiceToggle = async () => {
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
  };

  const handleAccessibilityToggle = async () => {
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
  };

  // Handle space details save
  const handleSaveSpaceDetails = async () => {
    if (!spaceID) return;
    
    setIsSavingDetails(true);
    try {
      const db = getFirestore();
      const spaceRef = doc(db, 'spaces', spaceID);
      
      await updateDoc(spaceRef, {
        name: spaceName,
        description: spaceDescription
      });
      
      toast({
        title: 'Success',
        description: 'Space details updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Dispatch an event to notify other components of the update
      window.dispatchEvent(new CustomEvent('SpaceDetailsUpdated', { 
        detail: { 
          name: spaceName, 
          description: spaceDescription 
        } 
      }));
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
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent 
        bg="rgba(23, 25, 35, 0.95)" 
        color="white" 
        borderRadius="md"
        boxShadow="0 4px 20px rgba(0, 0, 0, 0.5)"
        maxW="800px"
        h="500px"
        overflow="hidden"
      >
        <ModalHeader 
          borderBottom="1px solid" 
          borderColor="whiteAlpha.200" 
          py={2} 
          fontSize="md"
          fontWeight="600"
        >
          Manage Space
        </ModalHeader>
        
        <ModalCloseButton 
          size="sm"
          color="whiteAlpha.700"
          _hover={{ color: "white", bg: "whiteAlpha.100" }}
        />
        
        <ModalBody p={0} display="flex">
          <Tabs 
            orientation="vertical" 
            variant="unstyled" 
            index={tabIndex} 
            onChange={setTabIndex}
            display="flex" 
            flexGrow={1}
          >
            <TabList 
              bg="rgba(0, 0, 0, 0.2)" 
              w="80px" 
              py={4} 
              borderRight="1px solid" 
              borderColor="whiteAlpha.200"
            >
              <Tab 
                display="flex" 
                flexDirection="column" 
                alignItems="center"
                py={3}
                _selected={{ bg: "whiteAlpha.100", color: "blue.300" }}
                _hover={{ bg: "whiteAlpha.50" }}
              >
                <Icon as={FiInfo} mb={1} />
                <Text fontSize="xs">Details</Text>
              </Tab>
              <Tab 
                display="flex" 
                flexDirection="column" 
                alignItems="center"
                py={3}
                _selected={{ bg: "whiteAlpha.100", color: "blue.300" }}
                _hover={{ bg: "whiteAlpha.50" }}
              >
                <Icon as={FiImage} mb={1} />
                <Text fontSize="xs">Logo</Text>
              </Tab>
              <Tab 
                display="flex" 
                flexDirection="column" 
                alignItems="center"
                py={3}
                _selected={{ bg: "whiteAlpha.100", color: "blue.300" }}
                _hover={{ bg: "whiteAlpha.50" }}
              >
                <Icon as={FiCamera} mb={1} />
                <Text fontSize="xs">Background</Text>
              </Tab>
              <Tab 
                display="flex" 
                flexDirection="column" 
                alignItems="center"
                py={3}
                _selected={{ bg: "whiteAlpha.100", color: "blue.300" }}
                _hover={{ bg: "whiteAlpha.50" }}
              >
                <Icon as={FiSettings} mb={1} />
                <Text fontSize="xs">Settings</Text>
              </Tab>
              <Tab 
                display="flex" 
                flexDirection="column" 
                alignItems="center"
                py={3}
                _selected={{ bg: "whiteAlpha.100", color: "blue.300" }}
                _hover={{ bg: "whiteAlpha.50" }}
              >
                <Icon as={FiUsers} mb={1} />
                <Text fontSize="xs">Users</Text>
              </Tab>
            </TabList>
            
            <TabPanels flexGrow={1} display="flex" flexDirection="column" overflowY="auto">
              {/* Details Tab */}
              <TabPanel p={4} display="flex" flexDirection="column">
                <Text fontSize="sm" fontWeight="600" mb={3} color="blue.300">Space Details</Text>
                
                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel fontSize="xs">Space Name</FormLabel>
                    <Input
                      value={spaceName}
                      onChange={(e) => setSpaceName(e.target.value)}
                      placeholder="Enter space name"
                      size="sm"
                      bg="whiteAlpha.100"
                      borderColor="whiteAlpha.200"
                      _hover={{ borderColor: "whiteAlpha.300" }}
                      _focus={{ borderColor: "blue.300", boxShadow: "0 0 0 1px #63B3ED" }}
                      color="white"
                      maxLength={100}
                    />
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel fontSize="xs">Description</FormLabel>
                    <Textarea
                      value={spaceDescription}
                      onChange={(e) => setSpaceDescription(e.target.value)}
                      placeholder="Enter space description"
                      size="sm"
                      bg="whiteAlpha.100"
                      borderColor="whiteAlpha.200"
                      _hover={{ borderColor: "whiteAlpha.300" }}
                      _focus={{ borderColor: "blue.300", boxShadow: "0 0 0 1px #63B3ED" }}
                      rows={4}
                      resize="vertical"
                      maxLength={500}
                    />
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel fontSize="xs">Space Tags</FormLabel>
                    <Box 
                      p={3} 
                      bg="whiteAlpha.50"
                      borderWidth="1px"
                      borderColor="whiteAlpha.200"
                      borderRadius="md"
                    >
                      {spaceID ? (
                        <SpaceTagsManager spaceID={spaceID} />
                      ) : (
                        <Alert status="warning" variant="subtle" borderRadius="md">
                          <AlertIcon />
                          <AlertTitle fontSize="sm">Space ID missing</AlertTitle>
                          <AlertDescription fontSize="xs">
                            Unable to load tags without a valid space ID.
                          </AlertDescription>
                        </Alert>
                      )}
                    </Box>
                  </FormControl>
                  
                  <Button
                    colorScheme="blue"
                    size="sm"
                    onClick={handleSaveSpaceDetails}
                    isLoading={isSavingDetails}
                    loadingText="Saving..."
                    alignSelf="flex-start"
                    mt={2}
                  >
                    Save Details
                  </Button>
                </VStack>
              </TabPanel>
              
              {/* Logo Tab */}
              <TabPanel p={4} display="flex" flexDirection="column">
                <Text fontSize="sm" fontWeight="600" mb={3} color="blue.300">Space Logo</Text>
                <Text fontSize="xs" mb={4}>Upload a logo for your space. This will be displayed during loading.</Text>
                
                {/* Display current logo and preview side by side when both exist */}
                {(existingLogo || previewUrl) && (
                  <Flex direction={{ base: "column", md: "row" }} gap={4} mb={4}>
                    {/* Current logo display */}
                    {existingLogo && (
                      <Box 
                        borderWidth="1px" 
                        borderRadius="md" 
                        p={3} 
                        bg="whiteAlpha.50"
                        borderColor="whiteAlpha.200"
                        flex="1"
                      >
                        <Text fontSize="xs" fontWeight="medium" mb={2}>Current Logo</Text>
                        <Image 
                          src={existingLogo} 
                          alt="Space Logo" 
                          maxH="120px" 
                          mx="auto"
                          objectFit="contain"
                        />
                        <Button
                          mt={3}
                          colorScheme="red"
                          leftIcon={<Icon as={FiTrash2} />}
                          onClick={handleDelete}
                          isLoading={isUploading}
                          loadingText="Removing..."
                          size="xs"
                          variant="ghost"
                        >
                          Remove Logo
                        </Button>
                      </Box>
                    )}
                    
                    {/* Preview of selected file */}
                    {previewUrl && (
                      <Box 
                        borderWidth="1px" 
                        borderRadius="md" 
                        p={3} 
                        bg="whiteAlpha.50"
                        borderColor="whiteAlpha.200"
                        flex="1"
                      >
                        <Text fontSize="xs" fontWeight="medium" mb={2}>Preview</Text>
                        <Image 
                          src={previewUrl} 
                          alt="Preview" 
                          maxH="120px" 
                          mx="auto"
                          objectFit="contain"
                        />
                      </Box>
                    )}
                  </Flex>
                )}
                
                {/* Logo upload form */}
                <FormControl>
                  <FormLabel fontSize="xs">Upload New Logo</FormLabel>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    display="none"
                  />
                  
                  {/* Upload progress */}
                  {isUploading && (
                    <Box mt={3} mb={3}>
                      <Text fontSize="xs" mb={1}>Uploading... {uploadProgress}%</Text>
                      <Progress value={uploadProgress} size="xs" colorScheme="blue" borderRadius="full" />
                    </Box>
                  )}
                  
                  {/* Action buttons */}
                  <HStack mt={3} spacing={3}>
                    <Button
                      colorScheme="blue"
                      leftIcon={<Icon as={FiImage} />}
                      onClick={handleBrowseClick}
                      isDisabled={isUploading}
                      size="sm"
                      variant="outline"
                    >
                      Browse
                    </Button>
                    <Button
                      colorScheme="green"
                      leftIcon={<Icon as={FiUpload} />}
                      onClick={handleUpload}
                      isLoading={isUploading}
                      loadingText="Uploading..."
                      isDisabled={!selectedFile || isUploading}
                      size="sm"
                    >
                      Upload
                    </Button>
                  </HStack>
                  
                  <FormHelperText fontSize="xs" color="whiteAlpha.700" mt={2}>
                    Recommended: PNG format with transparent background. Max height: 400px.
                  </FormHelperText>
                </FormControl>
              </TabPanel>
              
              {/* Background Tab */}
              <TabPanel p={4} display="flex" flexDirection="column">
                <Text fontSize="sm" fontWeight="600" mb={3} color="blue.300">Loading Background</Text>
                <Text fontSize="xs" mb={4}>Upload a background image for your space. This will be displayed during loading.</Text>
                
                {/* Display current background and preview side by side when both exist */}
                {(existingBackground || bgPreviewUrl) && (
                  <Flex direction={{ base: "column", md: "row" }} gap={4} mb={4}>
                    {/* Current background display */}
                    {existingBackground && (
                      <Box 
                        borderWidth="1px" 
                        borderRadius="md" 
                        p={3} 
                        bg="whiteAlpha.50"
                        borderColor="whiteAlpha.200"
                        flex="1"
                      >
                        <Text fontSize="xs" fontWeight="medium" mb={2}>Current Background</Text>
                        <Image 
                          src={existingBackground} 
                          alt="Space Background" 
                          maxH="120px" 
                          mx="auto"
                          objectFit="contain"
                        />
                        <Button
                          mt={3}
                          colorScheme="red"
                          leftIcon={<Icon as={FiTrash2} />}
                          onClick={handleBgDelete}
                          isLoading={isBgUploading}
                          loadingText="Removing..."
                          size="xs"
                          variant="ghost"
                        >
                          Remove Background
                        </Button>
                      </Box>
                    )}
                    
                    {/* Preview of selected file */}
                    {bgPreviewUrl && (
                      <Box 
                        borderWidth="1px" 
                        borderRadius="md" 
                        p={3} 
                        bg="whiteAlpha.50"
                        borderColor="whiteAlpha.200"
                        flex="1"
                      >
                        <Text fontSize="xs" fontWeight="medium" mb={2}>Preview</Text>
                        <Image 
                          src={bgPreviewUrl} 
                          alt="Preview" 
                          maxH="120px" 
                          mx="auto"
                          objectFit="contain"
                        />
                      </Box>
                    )}
                  </Flex>
                )}
                
                {/* Background upload form */}
                <FormControl>
                  <FormLabel fontSize="xs">Upload New Background</FormLabel>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleBgFileChange}
                    ref={bgFileInputRef}
                    display="none"
                  />
                  
                  {/* Upload progress */}
                  {isBgUploading && (
                    <Box mt={3} mb={3}>
                      <Text fontSize="xs" mb={1}>Uploading... {bgUploadProgress}%</Text>
                      <Progress value={bgUploadProgress} size="xs" colorScheme="blue" borderRadius="full" />
                    </Box>
                  )}
                  
                  {/* Action buttons */}
                  <HStack mt={3} spacing={3}>
                    <Button
                      colorScheme="blue"
                      leftIcon={<Icon as={FiImage} />}
                      onClick={handleBgBrowseClick}
                      isDisabled={isBgUploading}
                      size="sm"
                      variant="outline"
                    >
                      Browse
                    </Button>
                    <Button
                      colorScheme="green"
                      leftIcon={<Icon as={FiUpload} />}
                      onClick={handleBgUpload}
                      isLoading={isBgUploading}
                      loadingText="Uploading..."
                      isDisabled={!selectedBgFile || isBgUploading}
                      size="sm"
                    >
                      Upload
                    </Button>
                  </HStack>
                  
                  <FormHelperText fontSize="xs" color="whiteAlpha.700" mt={2}>
                    Recommended: High-quality image (1920x1080 or higher) that works well with the frosted glass overlay.
                  </FormHelperText>
                </FormControl>
              </TabPanel>
              
              {/* Settings Tab */}
              <TabPanel p={4} display="flex" flexDirection="column">
                <Text fontSize="sm" fontWeight="600" mb={3} color="blue.300">Space Settings</Text>
                <Text fontSize="xs" mb={4}>Configure settings for your space.</Text>
                
                <VStack spacing={4} align="stretch">
                  {/* Voice Chat Setting */}
                  <Box 
                    borderWidth="1px" 
                    borderRadius="md" 
                    p={3} 
                    bg="whiteAlpha.50"
                    borderColor="whiteAlpha.200"
                  >
                    <HStack justify="space-between" align="center">
                      <Box>
                        <HStack mb={1} spacing={2}>
                          <Box position="relative" w="16px" h="16px">
                            <Icon as={FiVolume2} color={voiceDisabled ? "red.400" : "green.400"} />
                            {voiceDisabled && (
                              <Box 
                                position="absolute" 
                                top="50%" 
                                left="0" 
                                right="0" 
                                height="2px" 
                                bg="red.400" 
                                transform="rotate(45deg)" 
                                transformOrigin="center"
                              />
                            )}
                          </Box>
                          <Text fontSize="sm" fontWeight="600">Voice Chat</Text>
                        </HStack>
                        <Text fontSize="xs" color="whiteAlpha.800">
                          {voiceDisabled 
                            ? "Voice chat is currently disabled for all users in this space." 
                            : "Voice chat is currently enabled for all users in this space."}
                        </Text>
                      </Box>
                      <Switch 
                        isChecked={!voiceDisabled}
                        onChange={handleVoiceToggle}
                        colorScheme="green"
                        size="md"
                        isDisabled={isUpdatingSettings}
                      />
                    </HStack>
                  </Box>
                  
                  {/* Accessibility Setting */}
                  <Box 
                    borderWidth="1px" 
                    borderRadius="md" 
                    p={3} 
                    bg="whiteAlpha.50"
                    borderColor="whiteAlpha.200"
                  >
                    <HStack justify="space-between" align="center">
                      <Box>
                        <HStack mb={1} spacing={2}>
                          <Box position="relative" w="16px" h="16px">
                            <Icon as={FiUsers} color={accessibleToAllUsers ? "green.400" : "red.400"} />
                          </Box>
                          <Text fontSize="sm" fontWeight="600">Public Access</Text>
                        </HStack>
                        <Text fontSize="xs" color="whiteAlpha.800">
                          {accessibleToAllUsers 
                            ? "This space is accessible to all users in the 'users' group." 
                            : "This space is only accessible to specific users."}
                        </Text>
                        <Text fontSize="xs" color="blue.300" mt={1}>
                          Note: Space owners and hosts will always have access regardless of this setting.
                        </Text>
                      </Box>
                      
                      <Switch
                        isChecked={accessibleToAllUsers}
                        onChange={handleAccessibilityToggle}
                        colorScheme="green"
                        size="md"
                        isDisabled={isUpdatingSettings}
                      />
                    </HStack>
                  </Box>
                  
                  {/* Additional settings can be added here */}
                  
                  <Alert 
                    status="info" 
                    variant="subtle" 
                    bg="whiteAlpha.100" 
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="blue.800"
                  >
                    <AlertIcon color="blue.300" />
                    <Box>
                      <AlertTitle fontSize="xs" fontWeight="medium">Coming Soon</AlertTitle>
                      <AlertDescription fontSize="xs">
                        Additional space configuration options will be available in a future update.
                      </AlertDescription>
                    </Box>
                  </Alert>
                </VStack>
              </TabPanel>
              
              {/* Users Tab */}
              <TabPanel p={4} display="flex" flexDirection="column">
                <Text fontSize="sm" fontWeight="600" mb={3} color="blue.300">Manage Users</Text>
                <Text fontSize="xs" mb={4}>View and manage the owners and hosts of this space.</Text>
                
                {isLoadingUsers ? (
                  <Flex justify="center" align="center" h="200px">
                    <Spinner color="blue.300" />
                  </Flex>
                ) : (
                  <VStack spacing={4} align="stretch">
                    {/* Owners Section */}
                    <Box>
                      <HStack mb={2}>
                        <Icon as={FiAward} color="green.400" />
                        <Text fontSize="sm" fontWeight="600">Owners</Text>
                        <Badge colorScheme="green" ml={2}>{spaceOwners.length}</Badge>
                      </HStack>
                      
                      <Box 
                        borderWidth="1px" 
                        borderRadius="md" 
                        p={2} 
                        bg="whiteAlpha.50"
                        borderColor="whiteAlpha.200"
                        maxH="120px"
                        overflowY="auto"
                        css={{
                          '&::-webkit-scrollbar': {
                            width: '4px',
                          },
                          '&::-webkit-scrollbar-track': {
                            background: 'rgba(0,0,0,0.1)',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            background: 'rgba(255,255,255,0.3)',
                            borderRadius: '2px',
                          },
                        }}
                      >
                        {spaceOwners.length === 0 ? (
                          <Text fontSize="xs" color="whiteAlpha.600">No owners found</Text>
                        ) : (
                          <VStack spacing={1} align="stretch">
                            {spaceOwners.map(owner => (
                              <HStack key={owner.uid} spacing={2} p={1} borderRadius="md" _hover={{ bg: "whiteAlpha.100" }}>
                                <Avatar size="xs" src={owner.photoURL} name={owner.displayName} />
                                <Box>
                                  <Text fontSize="xs">{owner.displayName}</Text>
                                  <Text fontSize="xs" color="whiteAlpha.600">
                                    {owner.firstName && owner.lastName 
                                      ? `${owner.firstName} ${owner.lastName}` 
                                      : "Full name not available"}
                                  </Text>
                                </Box>
                                <Spacer />
                                <Badge colorScheme="green" variant="solid" fontSize="2xs">Owner</Badge>
                              </HStack>
                            ))}
                          </VStack>
                        )}
                      </Box>
                    </Box>
                    
                    {/* Hosts Section */}
                    <Box>
                      <HStack mb={2}>
                        <Icon as={FiStar} color="purple.400" />
                        <Text fontSize="sm" fontWeight="600">Hosts</Text>
                        <Badge colorScheme="purple" ml={2}>{spaceHosts.length}</Badge>
                      </HStack>
                      
                      <Box 
                        borderWidth="1px" 
                        borderRadius="md" 
                        p={2} 
                        bg="whiteAlpha.50"
                        borderColor="whiteAlpha.200"
                        maxH="120px"
                        overflowY="auto"
                        css={{
                          '&::-webkit-scrollbar': {
                            width: '4px',
                          },
                          '&::-webkit-scrollbar-track': {
                            background: 'rgba(0,0,0,0.1)',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            background: 'rgba(255,255,255,0.3)',
                            borderRadius: '2px',
                          },
                        }}
                      >
                        {spaceHosts.length === 0 ? (
                          <Text fontSize="xs" color="whiteAlpha.600">No hosts found</Text>
                        ) : (
                          <VStack spacing={1} align="stretch">
                            {spaceHosts.map(host => (
                              <HStack key={host.uid} spacing={2} p={1} borderRadius="md" _hover={{ bg: "whiteAlpha.100" }}>
                                <Avatar size="xs" src={host.photoURL} name={host.displayName} />
                                <Box>
                                  <Text fontSize="xs">{host.displayName}</Text>
                                  <Text fontSize="xs" color="whiteAlpha.600">
                                    {host.firstName && host.lastName 
                                      ? `${host.firstName} ${host.lastName}` 
                                      : "Full name not available"}
                                  </Text>
                                </Box>
                                <Spacer />
                                <Badge colorScheme="purple" variant="solid" fontSize="2xs">Host</Badge>
                              </HStack>
                            ))}
                          </VStack>
                        )}
                      </Box>
                    </Box>
                    
                    <Divider borderColor="whiteAlpha.200" />
                    
                    <Alert 
                      status="info" 
                      variant="subtle" 
                      bg="whiteAlpha.100" 
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor="blue.800"
                      py={2}
                      fontSize="xs"
                    >
                      <AlertIcon color="blue.300" boxSize={4} />
                      <Box>
                        <AlertTitle fontSize="xs" fontWeight="medium">Coming Soon</AlertTitle>
                        <AlertDescription fontSize="xs">
                          User management features like adding/removing hosts and owners will be available in a future update.
                        </AlertDescription>
                      </Box>
                    </Alert>
                  </VStack>
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default SpaceManageModal; 