import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  HStack,
  Button,
  IconButton,
  useToast,
  Divider,
  Spinner,
  Text,
  InputGroup,
  InputLeftAddon,
  RadioGroup,
  Radio,
  Stack,
  FormHelperText,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { getPageContent, updatePageContent } from '../../services/firebase';

const HomePageEditor = () => {
  const [pageData, setPageData] = useState({
    title: '',
    description: '',
    heroHeading: '',
    videoSrc: '',
    videoType: 'local', // 'local' or 'vimeo'
    missionHeading: '',
    missionTitle: '',
    missionPoints: [],
    learnMoreText: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // Fetch current content
  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const content = await getPageContent('homepage');
        
        if (content) {
          // Set video type based on source URL
          const updatedContent = {
            ...content,
            videoType: content.videoSrc?.includes('vimeo.com') ? 'vimeo' : 'local'
          };
          setPageData(updatedContent);
        }
      } catch (error) {
        console.error('Error fetching homepage content:', error);
        toast({
          title: 'Error',
          description: 'Failed to load homepage content',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [toast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPageData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleVideoTypeChange = (value) => {
    setPageData(prev => ({
      ...prev,
      videoType: value,
      // Clear the videoSrc when switching types
      videoSrc: ''
    }));
  };

  const handlePointChange = (index, value) => {
    const updatedPoints = [...pageData.missionPoints];
    updatedPoints[index] = value;
    setPageData(prev => ({
      ...prev,
      missionPoints: updatedPoints
    }));
  };

  const addPoint = () => {
    setPageData(prev => ({
      ...prev,
      missionPoints: [...prev.missionPoints, '']
    }));
  };

  const removePoint = (index) => {
    const updatedPoints = [...pageData.missionPoints];
    updatedPoints.splice(index, 1);
    setPageData(prev => ({
      ...prev,
      missionPoints: updatedPoints
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Extract the data to save (exclude videoType which is only for the UI)
      const { videoType, ...dataToSave } = pageData;
      await updatePageContent('homepage', dataToSave);
      
      toast({
        title: 'Success',
        description: 'Homepage content updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error updating homepage content:', error);
      toast({
        title: 'Error',
        description: 'Failed to update homepage content',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  // Extract Vimeo ID from URL for preview
  const getVimeoIdFromUrl = (url) => {
    if (!url || !url.includes('vimeo.com')) return null;
    
    // Format 1: https://vimeo.com/123456789
    const simpleRegex = /(?:vimeo\.com\/)(\d+)(?:\?.*)?$/;
    
    // Format 2: https://player.vimeo.com/video/123456789?h=31a7abd0d0
    const playerRegex = /(?:player\.vimeo\.com\/video\/)(\d+)(?:\?.*)?$/;
    
    const simpleMatch = url.match(simpleRegex);
    const playerMatch = url.match(playerRegex);
    
    if (simpleMatch) {
      return simpleMatch[1];
    } else if (playerMatch) {
      return playerMatch[1];
    }
    
    return null;
  };

  const vimeoId = getVimeoIdFromUrl(pageData.videoSrc);

  if (loading) {
    return (
      <Box p={4} textAlign="center">
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box p={4}>
      <VStack spacing={6} align="stretch">
        <Heading size="md">Homepage Content</Heading>
        
        {/* SEO Settings */}
        <Box>
          <Heading size="sm" mb={3}>SEO Settings</Heading>
          <FormControl mb={3}>
            <FormLabel>Page Title</FormLabel>
            <Input 
              name="title" 
              value={pageData.title} 
              onChange={handleChange}
              placeholder="Page title for SEO"
            />
          </FormControl>
          
          <FormControl mb={3}>
            <FormLabel>Description</FormLabel>
            <Textarea
              name="description"
              value={pageData.description}
              onChange={handleChange}
              placeholder="Meta description for SEO"
            />
          </FormControl>
        </Box>
        
        <Divider />
        
        {/* Hero Section */}
        <Box>
          <Heading size="sm" mb={3}>Hero Section</Heading>
          <FormControl mb={3}>
            <FormLabel>Heading</FormLabel>
            <Input
              name="heroHeading"
              value={pageData.heroHeading}
              onChange={handleChange}
              placeholder="Main hero heading"
            />
          </FormControl>
          
          <FormControl mb={3}>
            <FormLabel>Video Type</FormLabel>
            <RadioGroup 
              onChange={handleVideoTypeChange} 
              value={pageData.videoType}
              mb={3}
            >
              <Stack direction="row">
                <Radio value="local">Local Video File</Radio>
                <Radio value="vimeo">Vimeo Video</Radio>
              </Stack>
            </RadioGroup>
            
            {pageData.videoType === 'local' ? (
              <>
                <FormLabel>Local Video Path</FormLabel>
                <Input
                  name="videoSrc"
                  value={pageData.videoSrc}
                  onChange={handleChange}
                  placeholder="/videos/example.mp4"
                />
                <FormHelperText>
                  Path to video file in the public directory
                </FormHelperText>
              </>
            ) : (
              <>
                <FormLabel>Vimeo Video URL</FormLabel>
                <Input
                  name="videoSrc"
                  value={pageData.videoSrc}
                  onChange={handleChange}
                  placeholder="https://player.vimeo.com/video/123456789?h=31a7abd0d0"
                />
                <FormHelperText>
                  Full Vimeo video URL (e.g., https://player.vimeo.com/video/123456789?h=31a7abd0d0 or https://vimeo.com/123456789)
                </FormHelperText>
                
                {vimeoId && (
                  <Box mt={2} p={2} borderWidth="1px" borderRadius="md">
                    <Text fontSize="sm" mb={1}>Preview Vimeo ID: {vimeoId}</Text>
                    <Text fontSize="sm" color="green.500">
                      Video recognized successfully. It will autoplay muted when viewed.
                    </Text>
                  </Box>
                )}
              </>
            )}
          </FormControl>
        </Box>
        
        <Divider />
        
        {/* Mission Section */}
        <Box>
          <Heading size="sm" mb={3}>Mission Section</Heading>
          <FormControl mb={3}>
            <FormLabel>Subtitle</FormLabel>
            <Input
              name="missionHeading"
              value={pageData.missionHeading}
              onChange={handleChange}
              placeholder="Mission subtitle"
            />
          </FormControl>
          
          <FormControl mb={3}>
            <FormLabel>Title</FormLabel>
            <Input
              name="missionTitle"
              value={pageData.missionTitle}
              onChange={handleChange}
              placeholder="Mission title"
            />
          </FormControl>
          
          <FormControl mb={3}>
            <FormLabel>Mission Points</FormLabel>
            <VStack spacing={2} align="stretch">
              {pageData.missionPoints.map((point, index) => (
                <HStack key={index}>
                  <Input
                    value={point}
                    onChange={(e) => handlePointChange(index, e.target.value)}
                    placeholder={`Point ${index + 1}`}
                  />
                  <IconButton
                    aria-label="Remove point"
                    icon={<DeleteIcon />}
                    colorScheme="red"
                    onClick={() => removePoint(index)}
                  />
                </HStack>
              ))}
              <Button leftIcon={<AddIcon />} onClick={addPoint} size="sm">
                Add Point
              </Button>
            </VStack>
          </FormControl>
          
          <FormControl mb={3}>
            <FormLabel>Learn More Text</FormLabel>
            <Input
              name="learnMoreText"
              value={pageData.learnMoreText}
              onChange={handleChange}
              placeholder="Text for learn more link"
            />
          </FormControl>
        </Box>
        
        <Button
          colorScheme="blue"
          onClick={handleSave}
          isLoading={saving}
          loadingText="Saving"
          mt={4}
        >
          Save Changes
        </Button>
      </VStack>
    </Box>
  );
};

export default HomePageEditor; 