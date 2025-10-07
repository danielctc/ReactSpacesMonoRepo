import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Box,
  Text,
  Image,
  VStack,
  HStack,
  Flex,
  Divider,
  useToast,
  Progress,
  Icon,
  Spinner,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Switch,
  Radio,
  RadioGroup,
  Stack,
  Badge
} from '@chakra-ui/react';
import { FiUpload, FiTrash2, FiImage, FiVideo, FiLink, FiInfo } from 'react-icons/fi';
import { 
  uploadMediaScreenImage, 
  getMediaScreenImage, 
  deleteMediaScreenImage,
  updateMediaScreenDisplayMode 
} from '@disruptive-spaces/shared/firebase/mediaScreenFirestore';
import { useUnity } from '../providers/UnityProvider';
import { useSendUnityEvent } from '../hooks/unityEvents/core/useSendUnityEvent';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

const MediaScreenUploadModal = ({ isOpen, onClose, mediaScreenId, onImageChange }) => {
  const { spaceID } = useUnity();
  const queueMessage = useSendUnityEvent();
  const toast = useToast();
  const fileInputRef = useRef(null);
  const dropAreaRef = useRef(null);
  const cancelRef = useRef();
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [existingImage, setExistingImage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [mediaType, setMediaType] = useState('image');
  const [videoUrl, setVideoUrl] = useState('');
  const [displayAsVideo, setDisplayAsVideo] = useState(false);

  // Fetch existing image when modal opens
  useEffect(() => {
    const fetchExistingImage = async () => {
      if (isOpen && mediaScreenId && spaceID) {
        setIsLoading(true);
        try {
          const mediaScreen = await getMediaScreenImage(spaceID, mediaScreenId);
          if (mediaScreen && (mediaScreen.imageUrl || mediaScreen.videoUrl)) {
            setExistingImage(mediaScreen);
            
            // Determine which tab to show based on what was last edited
            const isVideoUrl = mediaScreen.mediaType === 'video';
            setMediaType(isVideoUrl ? 'video' : 'image');
            
            // Set display mode based on stored preference
            setDisplayAsVideo(mediaScreen.displayAsVideo || false);
            
            if (isVideoUrl && mediaScreen.videoUrl) {
              setVideoUrl(mediaScreen.videoUrl);
              setActiveTab(1); // Switch to video tab
            }
          } else {
            setExistingImage(null);
          }
        } catch (error) {
          Logger.error('Error fetching existing image:', error);
          setExistingImage(null);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchExistingImage();
  }, [isOpen, mediaScreenId, spaceID]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPreviewUrl('');
      setUploadProgress(0);
      setVideoUrl('');
    }
  }, [isOpen]);

  // Handle drag and drop events
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelection(file);
    }
  }, []);

  // Set up drag and drop event listeners
  useEffect(() => {
    const dropArea = dropAreaRef.current;
    if (dropArea) {
      dropArea.addEventListener('dragenter', handleDragEnter);
      dropArea.addEventListener('dragleave', handleDragLeave);
      dropArea.addEventListener('dragover', handleDragOver);
      dropArea.addEventListener('drop', handleDrop);
      
      return () => {
        dropArea.removeEventListener('dragenter', handleDragEnter);
        dropArea.removeEventListener('dragleave', handleDragLeave);
        dropArea.removeEventListener('dragover', handleDragOver);
        dropArea.removeEventListener('drop', handleDrop);
      };
    }
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  // Handle file selection (from input or drop)
  const handleFileSelection = (file) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file (PNG, JPEG, etc.)',
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
  };

  // Handle file selection from input
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    handleFileSelection(file);
  };

  // Handle display toggle change
  const handleDisplayToggle = async (e) => {
    const newDisplayAsVideo = e.target.checked;
    setDisplayAsVideo(newDisplayAsVideo);
    
    // If we have an existing image, update its display mode immediately
    if (existingImage) {
      try {
        // Update the display mode in Firebase
        await updateMediaScreenDisplayMode(spaceID, mediaScreenId, newDisplayAsVideo);
        
        // Send the updated display mode to Unity
        if (newDisplayAsVideo) {
          // If switching to video mode, send null imageUrl to prevent image from showing
          queueMessage("SetMediaScreenImage", { 
            mediaScreenId: mediaScreenId, 
            imageUrl: null,
            videoUrl: existingImage.videoUrl || null,
            mediaType: existingImage.mediaType || 'image',
            displayAsVideo: true
          });
        } else {
          // If switching to image mode, send the imageUrl
          queueMessage("SetMediaScreenImage", { 
            mediaScreenId: mediaScreenId, 
            imageUrl: existingImage.imageUrl || null,
            videoUrl: existingImage.videoUrl || null,
            mediaType: existingImage.mediaType || 'image',
            displayAsVideo: false
          });
        }
        
        // Update the local state
        setExistingImage({
          ...existingImage,
          displayAsVideo: newDisplayAsVideo
        });
        
        toast({
          title: 'Display mode updated',
          description: `The media screen will now be displayed as ${newDisplayAsVideo ? 'video' : 'image'}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        Logger.log(`Updated display mode for media screen ${mediaScreenId} to ${newDisplayAsVideo ? 'video' : 'image'}`);
        
        // Force a refresh of the media screens
        if (onImageChange) {
          onImageChange({
            type: 'update',
            mediaScreenId,
            displayAsVideo: newDisplayAsVideo
          });
        }
      } catch (error) {
        Logger.error('Error updating display mode:', error);
        
        toast({
          title: 'Update failed',
          description: error.message || 'An error occurred while updating the display mode',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        
        // Revert the toggle state
        setDisplayAsVideo(!newDisplayAsVideo);
      }
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (mediaType === 'image' && !selectedFile) {
      toast({
        title: 'No file selected',
        description: 'Please select an image to upload',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (mediaType === 'video' && !videoUrl) {
      toast({
        title: 'No video URL',
        description: 'Please enter a video URL',
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
      
      let uploadedUrl;
      
      if (mediaType === 'image') {
        // Upload the image to Firebase with display preference
        uploadedUrl = await uploadMediaScreenImage(spaceID, mediaScreenId, selectedFile, { 
          mediaType,
          displayAsVideo 
        });
      } else {
        // For video, we just store the URL
        uploadedUrl = videoUrl;
        // Store the video URL in Firebase (using the same function but passing the URL directly)
        await uploadMediaScreenImage(spaceID, mediaScreenId, null, { 
          mediaType: 'video', 
          directUrl: videoUrl,
          displayAsVideo
        });
      }
      
      // Clear the interval and set progress to 100%
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Determine what to send to Unity based on media type and display mode
      let imageUrlToSend = null;
      let videoUrlToSend = null;
      
      if (mediaType === 'image') {
        // If it's an image upload and should display as image, send the image URL
        // If it should display as video, send null to prevent image from showing
        imageUrlToSend = !displayAsVideo ? uploadedUrl : null;
        videoUrlToSend = existingImage?.videoUrl || null;
      } else {
        // If it's a video upload, always send the video URL
        // Only send the image URL if it should display as image
        imageUrlToSend = (!displayAsVideo && existingImage?.imageUrl) ? existingImage.imageUrl : null;
        videoUrlToSend = uploadedUrl;
      }
      
      // Send the appropriate URLs to Unity
      queueMessage("SetMediaScreenImage", { 
        mediaScreenId: mediaScreenId, 
        imageUrl: imageUrlToSend,
        videoUrl: videoUrlToSend,
        mediaType,
        displayAsVideo
      });
      
      Logger.log(`Uploaded and sent ${mediaType} for media screen ${mediaScreenId} (display as video: ${displayAsVideo})`);
      
      // Notify parent component about the image change
      if (onImageChange) {
        onImageChange({
          type: 'upload',
          mediaScreenId,
          imageUrl: mediaType === 'image' ? uploadedUrl : existingImage?.imageUrl,
          videoUrl: mediaType === 'video' ? uploadedUrl : existingImage?.videoUrl,
          mediaType,
          displayAsVideo
        });
      }
      
      toast({
        title: 'Upload successful',
        description: `The ${mediaType} has been uploaded and applied to the media screen`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Reset state and close modal
      setTimeout(() => {
        setSelectedFile(null);
        setPreviewUrl('');
        setIsUploading(false);
        setUploadProgress(0);
        onClose();
      }, 1000);
      
    } catch (error) {
      Logger.error(`Error uploading ${mediaType}:`, error);
      
      toast({
        title: 'Upload failed',
        description: error.message || `An error occurred while uploading the ${mediaType}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle image deletion
  const handleDelete = async () => {
    setIsDeleteDialogOpen(false);
    
    try {
      setIsUploading(true);
      
      // Delete the image from Firebase
      await deleteMediaScreenImage(spaceID, mediaScreenId);
      
      // Send null image URL to Unity to clear the image
      queueMessage("SetMediaScreenImage", { 
        mediaScreenId: mediaScreenId, 
        imageUrl: mediaType === 'image' ? null : (existingImage?.imageUrl || null),
        videoUrl: mediaType === 'video' ? null : (existingImage?.videoUrl || null),
        mediaType: null,
        displayAsVideo: false
      });
      
      Logger.log(`Deleted ${mediaType} for media screen ${mediaScreenId}`);
      
      // Notify parent component about the image change immediately
      if (onImageChange) {
        onImageChange({
          type: 'delete',
          mediaScreenId
        });
      }
      
      toast({
        title: `${mediaType === 'image' ? 'Image' : 'Video'} deleted`,
        description: `The ${mediaType} has been removed from the media screen`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Reset state and close modal
      setExistingImage(null);
      setIsUploading(false);
      setVideoUrl('');
      setDisplayAsVideo(false);
      
      // Close the modal after a short delay
      setTimeout(() => {
        onClose();
      }, 500);
      
    } catch (error) {
      Logger.error(`Error deleting ${mediaType}:`, error);
      
      toast({
        title: 'Deletion failed',
        description: error.message || `An error occurred while deleting the ${mediaType}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      setIsUploading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setPreviewUrl('');
      setUploadProgress(0);
      onClose();
    }
  };

  // Handle tab change
  const handleTabChange = (index) => {
    setActiveTab(index);
    setMediaType(index === 0 ? 'image' : 'video');
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} size="lg">
        <ModalOverlay bg="rgba(0, 0, 0, 0.8)" backdropFilter="blur(8px)" />
        <ModalContent bg="#1a1a1a" color="white" maxW="650px" borderRadius="xl" border="1px solid #333">
          <ModalHeader fontSize="md" fontWeight="600" pb={1} pt={3} px={4} color="white">
            Media Screen
          </ModalHeader>
          <ModalCloseButton 
            isDisabled={isUploading}
            color="gray.400"
            _hover={{ color: "white", bg: "rgba(255,255,255,0.1)" }}
            borderRadius="full"
            size="sm"
            top={3}
            right={3}
          />
          
          {/* Media Type Toggle */}
          <Box px={4} pb={1}>
            <Flex 
              justify="space-between" 
              align="center" 
              bg="rgba(255,255,255,0.03)" 
              p={2} 
              borderRadius="lg"
              mb={1}
              border="1px solid rgba(255,255,255,0.08)"
            >
              <HStack spacing={2}>
                <Text fontWeight="500" fontSize="xs" color="gray.300">Display:</Text>
                <HStack spacing={2}>
                  <Icon as={FiImage} color={!displayAsVideo ? "white" : "gray.500"} size="sm" />
                  <Switch 
                    colorScheme="gray" 
                    size="sm" 
                    isChecked={displayAsVideo}
                    onChange={handleDisplayToggle}
                  />
                  <Icon as={FiVideo} color={displayAsVideo ? "white" : "gray.500"} size="sm" />
                </HStack>
              </HStack>
              
              <Badge 
                bg="rgba(255,255,255,0.1)"
                color="gray.300"
                fontSize="xs"
                px={2}
                py={1}
                borderRadius="md"
                fontWeight="500"
              >
                {displayAsVideo ? 'Video' : 'Image'}
              </Badge>
            </Flex>
            <Text fontSize="xs" color="gray.500">
              ID: {mediaScreenId}
            </Text>
          </Box>
          
          <ModalBody px={4} py={1}>
            <Flex>
              {/* Side Tabs */}
              <Tabs 
                orientation="vertical" 
                variant="unstyled" 
                index={activeTab} 
                onChange={handleTabChange}
                h="100%"
                minW="75px"
                mr={3}
              >
                <TabList spacing={1}>
                  <Tab 
                    _selected={{ 
                      color: 'white', 
                      bg: 'rgba(255,255,255,0.1)',
                      borderRadius: 'lg'
                    }}
                    _hover={{ bg: 'rgba(255,255,255,0.05)' }}
                    mb={1}
                    py={1.5}
                    px={2.5}
                    justifyContent="flex-start"
                    borderRadius="lg"
                    fontSize="xs"
                    fontWeight="500"
                    color="gray.400"
                    w="full"
                  >
                    <Icon as={FiImage} mr={1.5} size="sm" /> Image
                  </Tab>
                  <Tab 
                    _selected={{ 
                      color: 'white', 
                      bg: 'rgba(255,255,255,0.1)',
                      borderRadius: 'lg'
                    }}
                    _hover={{ bg: 'rgba(255,255,255,0.05)' }}
                    py={1.5}
                    px={2.5}
                    justifyContent="flex-start"
                    borderRadius="lg"
                    fontSize="xs"
                    fontWeight="500"
                    color="gray.400"
                    w="full"
                  >
                    <Icon as={FiVideo} mr={1.5} size="sm" /> Video
                  </Tab>
                </TabList>
              </Tabs>
              
              {/* Content Area */}
              <Box flex="1">
                {isLoading ? (
                  <Flex justify="center" align="center" h="120px">
                    <Spinner size="lg" color="white" />
                  </Flex>
                ) : (
                  <>
                    {/* Tab Panels */}
                    <Box>
                      {activeTab === 0 ? (
                        /* Image Tab Content */
                        <VStack spacing={4} align="stretch">
                          {/* Existing Image Section */}
                          {existingImage && existingImage.imageUrl && mediaType === 'image' && (
                            <Box>
                              <Text fontWeight="semibold" mb={2}>Current Image:</Text>
                              <Flex>
                                <Box 
                                  borderWidth="1px" 
                                  borderRadius="md" 
                                  overflow="hidden" 
                                  mb={2}
                                  maxW="200px"
                                  mr={4}
                                >
                                  <Image 
                                    src={existingImage.imageUrl} 
                                    alt="Current image" 
                                    maxHeight="150px" 
                                    width="100%" 
                                    objectFit="contain"
                                  />
                                </Box>
                                <VStack align="flex-start" spacing={2}>
                                  <Text fontSize="xs" color="gray.400">
                                    Uploaded: {new Date(existingImage.uploadedAt).toLocaleString()}
                                  </Text>
                                  <Text fontSize="xs" color="gray.400">
                                    Display Mode: {existingImage.displayAsVideo ? 'Video' : 'Image'}
                                  </Text>
                                  <Button
                                    size="sm"
                                    colorScheme="red"
                                    variant="outline"
                                    leftIcon={<Icon as={FiTrash2} />}
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                    isDisabled={isUploading}
                                  >
                                    Delete
                                  </Button>
                                </VStack>
                              </Flex>
                              <Divider my={4} />
                            </Box>
                          )}
                          
                          <Text fontWeight="semibold" mb={2}>
                            {existingImage && existingImage.imageUrl && mediaType === 'image' 
                              ? 'Replace with new image:' 
                              : 'Upload new image:'}
                          </Text>
                          
                          {/* Drag & Drop Area */}
                          <Box
                            ref={dropAreaRef}
                            borderWidth="2px"
                            borderRadius="md"
                            borderStyle="dashed"
                            borderColor={isDragging ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)"}
                            bg={isDragging ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)"}
                            p={4}
                            textAlign="center"
                            transition="all 0.2s ease"
                            _hover={{ borderColor: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.06)" }}
                            cursor="pointer"
                            onClick={() => fileInputRef.current.click()}
                          >
                            {previewUrl ? (
                              <Box borderRadius="md" overflow="hidden" maxH="200px">
                                <Image 
                                  src={previewUrl} 
                                  alt="Preview" 
                                  maxHeight="200px" 
                                  width="100%" 
                                  objectFit="contain"
                                />
                              </Box>
                            ) : (
                              <VStack spacing={2}>
                                <Icon as={FiUpload} boxSize="20px" color="gray.400" />
                                <VStack spacing={0}>
                                  <Text fontSize="xs" fontWeight="500" color="white">Drop image or click to browse</Text>
                                  <Text fontSize="xs" color="gray.500">
                                    PNG, JPG, JPEG, GIF
                                  </Text>
                                </VStack>
                              </VStack>
                            )}
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              ref={fileInputRef}
                              display="none"
                            />
                          </Box>
                          
                          {selectedFile && (
                            <Text fontSize="xs" color="gray.400" bg="rgba(255,255,255,0.05)" p={2} borderRadius="md" border="1px solid rgba(255,255,255,0.1)">
                              {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                            </Text>
                          )}
                        </VStack>
                      ) : (
                        /* Video Tab Content */
                        <VStack spacing={4} align="stretch">
                          {/* Existing Video Section */}
                          {existingImage && existingImage.videoUrl && mediaType === 'video' && (
                            <Box>
                              <Text fontWeight="500" mb={1} fontSize="xs" color="gray.400">Current Video URL:</Text>
                              <Flex>
                                <Box 
                                  borderWidth="1px" 
                                  borderRadius="md" 
                                  p={3}
                                  mb={2}
                                  flex="1"
                                  mr={4}
                                  bg="gray.700"
                                >
                                  <Text fontSize="sm" wordBreak="break-all">{existingImage.videoUrl}</Text>
                                </Box>
                                <VStack align="flex-start" spacing={2}>
                                  <Text fontSize="xs" color="gray.400">
                                    Added: {new Date(existingImage.uploadedAt).toLocaleString()}
                                  </Text>
                                  <Text fontSize="xs" color="gray.400">
                                    Display Mode: {existingImage.displayAsVideo ? 'Video' : 'Image'}
                                  </Text>
                                  <Button
                                    size="sm"
                                    colorScheme="red"
                                    variant="outline"
                                    leftIcon={<Icon as={FiTrash2} />}
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                    isDisabled={isUploading}
                                  >
                                    Delete
                                  </Button>
                                </VStack>
                              </Flex>
                              <Divider my={4} />
                            </Box>
                          )}
                          
                          
                          
                          <FormControl>
                            <FormLabel fontSize="xs" fontWeight="500" color="white" mb={1.5}>Video URL</FormLabel>
                            <Input
                              placeholder="https://youtube.com/watch?v=..."
                              value={videoUrl}
                              onChange={(e) => setVideoUrl(e.target.value)}
                              bg="rgba(255,255,255,0.05)"
                              borderColor="rgba(255,255,255,0.15)"
                              _hover={{ borderColor: "rgba(255,255,255,0.3)" }}
                              _focus={{ borderColor: "rgba(255,255,255,0.5)", boxShadow: "0 0 0 1px rgba(255,255,255,0.3)" }}
                              size="sm"
                              borderRadius="lg"
                              color="white"
                              fontSize="xs"
                              _placeholder={{ color: "gray.500", fontSize: "xs" }}
                            />
                          </FormControl>
                          
                          
                          {videoUrl && (
                            <Box mt={2} p={2} bg="rgba(255,255,255,0.05)" borderRadius="lg" border="1px solid rgba(255,255,255,0.1)">
                              <HStack mb={1}>
                                <Icon as={FiLink} color="gray.400" size="sm" />
                                <Text fontWeight="500" fontSize="xs" color="white">Preview</Text>
                              </HStack>
                              <Text fontSize="xs" wordBreak="break-all" color="gray.400">
                                {videoUrl}
                              </Text>
                            </Box>
                          )}
                        </VStack>
                      )}
                    </Box>
                    
                    {isUploading && (
                      <Box mt={3}>
                        <Text mb={2} fontSize="sm" fontWeight="500" color="white">Uploading: {uploadProgress}%</Text>
                        <Progress value={uploadProgress} colorScheme="gray" size="sm" borderRadius="full" bg="rgba(255,255,255,0.1)" />
                      </Box>
                    )}
                  </>
                )}
              </Box>
            </Flex>
          </ModalBody>

          <ModalFooter pt={2} pb={3} px={4}>
            <Flex w="full" gap={3}>
              <Button 
                variant="outline"
                flex={1}
                onClick={handleClose}
                isDisabled={isUploading}
                color="gray.400"
                borderColor="rgba(255,255,255,0.2)"
                _hover={{ bg: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.3)" }}
                borderRadius="lg"
                size="sm"
                fontSize="xs"
                fontWeight="500"
              >
                Cancel
              </Button>
              <Button 
                bg="#6b7280"
                color="white"
                flex={2}
                onClick={handleUpload}
                isLoading={isUploading}
                loadingText="Saving"
                isDisabled={
                  (mediaType === 'image' && !selectedFile) || 
                  (mediaType === 'video' && !videoUrl) || 
                  isUploading || 
                  isLoading
                }
                leftIcon={<Icon as={mediaType === 'image' ? FiImage : FiVideo} size="sm" />}
                _hover={{ bg: "#4b5563" }}
                _active={{ bg: "#374151" }}
                _disabled={{ bg: "#374151", opacity: 0.5 }}
                borderRadius="lg"
                size="sm"
                fontSize="xs"
                fontWeight="600"
              >
                {mediaType === 'image' ? 'Upload' : 'Save URL'}
              </Button>
            </Flex>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setIsDeleteDialogOpen(false)}
      >
        <AlertDialogOverlay bg="rgba(0, 0, 0, 0.8)">
          <AlertDialogContent bg="#1a1a1a" color="white" borderRadius="xl" border="1px solid #333" maxW="350px">
            <AlertDialogHeader fontSize="md" fontWeight="600" pt={4} pb={2} color="white">
              Delete {mediaType === 'video' ? 'Video' : 'Image'}
            </AlertDialogHeader>

            <AlertDialogBody py={2} color="gray.400" fontSize="sm">
              Are you sure? This will revert the media screen to its blank state.
            </AlertDialogBody>

            <AlertDialogFooter pt={3} pb={4}>
              <Flex w="full" gap={2}>
                <Button 
                  ref={cancelRef} 
                  onClick={() => setIsDeleteDialogOpen(false)}
                  variant="outline"
                  flex={1}
                  color="gray.400"
                  borderColor="rgba(255,255,255,0.2)"
                  _hover={{ bg: "rgba(255,255,255,0.05)" }}
                  borderRadius="lg"
                  size="sm"
                  fontSize="sm"
                >
                  Cancel
                </Button>
                <Button 
                  bg="#dc2626"
                  color="white"
                  onClick={handleDelete} 
                  flex={1}
                  leftIcon={<Icon as={FiTrash2} size="sm" />}
                  _hover={{ bg: "#b91c1c" }}
                  borderRadius="lg"
                  fontWeight="600"
                  size="sm"
                  fontSize="sm"
                >
                  Delete
                </Button>
              </Flex>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default MediaScreenUploadModal; 