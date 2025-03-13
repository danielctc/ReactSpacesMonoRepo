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
      <Modal isOpen={isOpen} onClose={handleClose} size="xl">
        <ModalOverlay backdropFilter="blur(10px)" />
        <ModalContent bg="gray.800" color="white" maxW="900px">
          <ModalHeader>Media Screen Content</ModalHeader>
          <ModalCloseButton isDisabled={isUploading} />
          
          {/* Media Type Toggle */}
          <Box px={6} pb={2}>
            <Flex 
              justify="space-between" 
              align="center" 
              bg="gray.700" 
              p={4} 
              borderRadius="md"
              mb={4}
            >
              <HStack spacing={4}>
                <Text fontWeight="medium">Display as:</Text>
                <HStack spacing={2}>
                  <Icon as={FiImage} color={!displayAsVideo ? "green.300" : "gray.400"} />
                  <Switch 
                    colorScheme="purple" 
                    size="md" 
                    isChecked={displayAsVideo}
                    onChange={handleDisplayToggle}
                  />
                  <Icon as={FiVideo} color={displayAsVideo ? "purple.300" : "gray.400"} />
                </HStack>
              </HStack>
              
              <Badge 
                colorScheme={displayAsVideo ? "purple" : "green"}
                fontSize="sm"
                px={2}
                py={1}
                borderRadius="md"
              >
                {displayAsVideo ? 'Video Output' : 'Image Output'}
              </Badge>
            </Flex>
            <Text fontSize="sm" color="gray.400" mb={1}>
              Media Screen ID: <strong>{mediaScreenId}</strong>
            </Text>
            <Text fontSize="xs" color="gray.500" mb={2}>
              The toggle above controls how the content will be displayed in the 3D space, regardless of the content type you upload.
            </Text>
            <Divider mb={4} />
          </Box>
          
          <ModalBody>
            <Flex>
              {/* Side Tabs */}
              <Tabs 
                orientation="vertical" 
                variant="solid-rounded" 
                colorScheme="blue" 
                index={activeTab} 
                onChange={handleTabChange}
                h="100%"
                minW="120px"
                mr={4}
              >
                <TabList>
                  <Tab 
                    _selected={{ color: 'white', bg: 'blue.500' }} 
                    mb={2}
                    py={6}
                    justifyContent="flex-start"
                  >
                    <Icon as={FiImage} mr={2} /> Image
                  </Tab>
                  <Tab 
                    _selected={{ color: 'white', bg: 'blue.500' }} 
                    py={6}
                    justifyContent="flex-start"
                  >
                    <Icon as={FiVideo} mr={2} /> Video
                  </Tab>
                </TabList>
              </Tabs>
              
              {/* Content Area */}
              <Box flex="1">
                {isLoading ? (
                  <Flex justify="center" align="center" h="150px">
                    <Spinner size="xl" color="blue.400" />
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
                            borderColor={isDragging ? "blue.400" : "gray.500"}
                            bg={isDragging ? "blue.900" : "gray.700"}
                            p={6}
                            textAlign="center"
                            transition="all 0.2s"
                            _hover={{ borderColor: "blue.400", bg: "gray.600" }}
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
                                <Icon as={FiUpload} boxSize="24px" color="gray.400" />
                                <Text>Drag and drop an image here, or click to browse</Text>
                                <Text fontSize="xs" color="gray.400">
                                  Supports PNG, JPG, JPEG, GIF
                                </Text>
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
                            <Text fontSize="sm">
                              Selected file: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                            </Text>
                          )}
                        </VStack>
                      ) : (
                        /* Video Tab Content */
                        <VStack spacing={4} align="stretch">
                          {/* Existing Video Section */}
                          {existingImage && existingImage.videoUrl && mediaType === 'video' && (
                            <Box>
                              <Text fontWeight="semibold" mb={2}>Current Video URL:</Text>
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
                          
                          <Text fontWeight="semibold" mb={2}>
                            {existingImage && existingImage.videoUrl && mediaType === 'video' 
                              ? 'Replace with new video:' 
                              : 'Add video URL:'}
                          </Text>
                          
                          <Box 
                            p={3} 
                            bg="blue.900" 
                            borderRadius="md" 
                            mb={4}
                            borderLeftWidth="4px"
                            borderLeftColor="blue.400"
                          >
                            <HStack>
                              <Icon as={FiInfo} color="blue.300" />
                              <Text fontSize="sm" fontWeight="medium">
                                After entering a URL, click the "Save Video URL" button at the bottom to save your changes.
                              </Text>
                            </HStack>
                          </Box>
                          
                          <FormControl>
                            <FormLabel fontSize="sm">Video URL</FormLabel>
                            <Input
                              placeholder="Enter video URL (YouTube, Vimeo, etc.)"
                              value={videoUrl}
                              onChange={(e) => setVideoUrl(e.target.value)}
                              bg="gray.700"
                              borderColor="gray.600"
                              _hover={{ borderColor: "blue.400" }}
                              _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)" }}
                              size="lg"
                            />
                            <Text fontSize="xs" color="gray.400" mt={1}>
                              Enter a URL from YouTube, Vimeo, or other video hosting services
                            </Text>
                          </FormControl>
                          
                          <Box mt={4} p={4} bg="gray.700" borderRadius="md">
                            <HStack>
                              <Icon as={FiVideo} color="blue.300" />
                              <Text fontWeight="medium">Video Support</Text>
                            </HStack>
                            <Text fontSize="sm" mt={2} color="gray.300">
                              Video playback will be implemented in a future update. For now, you can add the URL which will be stored with the media screen.
                            </Text>
                            <Text fontSize="sm" mt={2} color="yellow.300" fontWeight="medium">
                              Important: Click the "Upload" button at the bottom to save your video URL.
                            </Text>
                          </Box>
                          
                          {videoUrl && (
                            <Box mt={4} p={4} bg="gray.900" borderRadius="md" borderWidth="1px" borderColor="blue.500">
                              <HStack mb={2}>
                                <Icon as={FiLink} color="blue.300" />
                                <Text fontWeight="medium">URL Preview</Text>
                              </HStack>
                              <Text fontSize="sm" wordBreak="break-all" color="gray.300">
                                {videoUrl}
                              </Text>
                              <Text fontSize="xs" color="gray.400" mt={2}>
                                This URL will be saved when you click the Upload button below
                              </Text>
                            </Box>
                          )}
                        </VStack>
                      )}
                    </Box>
                    
                    {isUploading && (
                      <Box mt={4}>
                        <Text mb={2}>Uploading: {uploadProgress}%</Text>
                        <Progress value={uploadProgress} colorScheme="blue" size="sm" borderRadius="md" />
                      </Box>
                    )}
                  </>
                )}
              </Box>
            </Flex>
          </ModalBody>

          <ModalFooter>
            <Button 
              variant="ghost" 
              mr={3} 
              onClick={handleClose}
              isDisabled={isUploading}
            >
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleUpload}
              isLoading={isUploading}
              loadingText="Uploading"
              isDisabled={
                (mediaType === 'image' && !selectedFile) || 
                (mediaType === 'video' && !videoUrl) || 
                isUploading || 
                isLoading
              }
              leftIcon={<Icon as={mediaType === 'image' ? FiImage : FiVideo} />}
              size="lg"
              px={6}
            >
              {mediaType === 'image' ? 'Upload Image' : 'Save Video URL'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setIsDeleteDialogOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg="gray.800" color="white">
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete {mediaType === 'video' ? 'Video' : 'Image'}
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this {mediaType}? This will revert the media screen to its blank state.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDelete} ml={3} leftIcon={<Icon as={FiTrash2} />}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default MediaScreenUploadModal; 