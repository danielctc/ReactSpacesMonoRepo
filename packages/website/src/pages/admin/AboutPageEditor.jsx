import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  Button,
  useToast,
  Divider,
  Spinner,
  SimpleGrid,
  Image,
} from '@chakra-ui/react';
import { getPageContent, updatePageContent } from '../../services/firebase';

const AboutPageEditor = () => {
  const [pageData, setPageData] = useState({
    title: 'About Spaces',
    description: 'Learn about the Spaces platform, our vision, and how we empower virtual collaboration and connection.',
    tagline: 'A platform for creating virtual spaces that bring people together.',
    whoWeAre: {
      title: 'Who We Are',
      content: 'We create metaverses that are simple, accessible, and limitless. Our platform is focused on ease of use, designed for everyone, and built for creativity and connection.'
    },
    ourVision: {
      title: 'Our Vision',
      content: 'To empower everyone to build their own virtual spaces, tailored to their needs. Whether you need public or private options, fully customizable environments, our platform offers limitless possibilities.'
    },
    whatWeOffer: {
      title: 'What We Offer',
      content: 'Open spaces for exploration, exclusive environments for privacy, and powerful tools to shape your world exactly as you imagine it.'
    },
    howItWorks: {
      title: 'How It Works',
      content: 'Accessible on any device, our metaverses are easy to customize and share. No downloads required - everything runs seamlessly in web browsers with simple tools for building and sharing.'
    },
    contactSection: {
      title: 'Reach Out',
      intro: 'Interested in learning more about our spaces? Have questions about how it works? We\'d love to hear from you and help you get started on your journey.',
      callToAction: 'Fill out the form and we\'ll get back to you as soon as possible.'
    },
    images: {
      topImage: '/images/Space-office-example-2-min.jpg',
      bottomImage: '/images/Spaces-Office-example-min.jpg'
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // Fetch current content
  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const content = await getPageContent('aboutpage');
        
        if (content) {
          setPageData(content);
        }
      } catch (error) {
        console.error('Error fetching about page content:', error);
        toast({
          title: 'Error',
          description: 'Failed to load about page content',
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

  const handleNestedChange = (section, field, value) => {
    setPageData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updatePageContent('aboutpage', pageData);
      
      toast({
        title: 'Success',
        description: 'About page content updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error updating about page content:', error);
      toast({
        title: 'Error',
        description: 'Failed to update about page content',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

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
        <Heading size="md">About Page Content</Heading>
        
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
        
        {/* Header Section */}
        <Box>
          <Heading size="sm" mb={3}>Header</Heading>
          <FormControl mb={3}>
            <FormLabel>Tagline</FormLabel>
            <Textarea
              name="tagline"
              value={pageData.tagline}
              onChange={handleChange}
              placeholder="Tagline that appears below the main heading"
            />
          </FormControl>
        </Box>

        <Divider />
        
        {/* Images */}
        <Box>
          <Heading size="sm" mb={3}>Images</Heading>
          <SimpleGrid columns={2} spacing={4}>
            <FormControl>
              <FormLabel>Top Image Path</FormLabel>
              <Input
                value={pageData.images.topImage}
                onChange={(e) => handleNestedChange('images', 'topImage', e.target.value)}
                placeholder="/images/example.jpg"
              />
              {pageData.images.topImage && (
                <Image 
                  src={pageData.images.topImage} 
                  alt="Top image preview" 
                  mt={2}
                  maxH="100px"
                  objectFit="cover"
                />
              )}
            </FormControl>
            
            <FormControl>
              <FormLabel>Bottom Image Path</FormLabel>
              <Input
                value={pageData.images.bottomImage}
                onChange={(e) => handleNestedChange('images', 'bottomImage', e.target.value)}
                placeholder="/images/example.jpg"
              />
              {pageData.images.bottomImage && (
                <Image 
                  src={pageData.images.bottomImage} 
                  alt="Bottom image preview" 
                  mt={2}
                  maxH="100px"
                  objectFit="cover"
                />
              )}
            </FormControl>
          </SimpleGrid>
        </Box>
        
        <Divider />
        
        {/* Who We Are Section */}
        <Box>
          <Heading size="sm" mb={3}>Who We Are Section</Heading>
          <FormControl mb={3}>
            <FormLabel>Title</FormLabel>
            <Input
              value={pageData.whoWeAre.title}
              onChange={(e) => handleNestedChange('whoWeAre', 'title', e.target.value)}
              placeholder="Section title"
            />
          </FormControl>
          
          <FormControl mb={3}>
            <FormLabel>Content</FormLabel>
            <Textarea
              value={pageData.whoWeAre.content}
              onChange={(e) => handleNestedChange('whoWeAre', 'content', e.target.value)}
              placeholder="Section content"
              rows={4}
            />
          </FormControl>
        </Box>
        
        <Divider />
        
        {/* Our Vision Section */}
        <Box>
          <Heading size="sm" mb={3}>Our Vision Section</Heading>
          <FormControl mb={3}>
            <FormLabel>Title</FormLabel>
            <Input
              value={pageData.ourVision.title}
              onChange={(e) => handleNestedChange('ourVision', 'title', e.target.value)}
              placeholder="Section title"
            />
          </FormControl>
          
          <FormControl mb={3}>
            <FormLabel>Content</FormLabel>
            <Textarea
              value={pageData.ourVision.content}
              onChange={(e) => handleNestedChange('ourVision', 'content', e.target.value)}
              placeholder="Section content"
              rows={4}
            />
          </FormControl>
        </Box>
        
        <Divider />
        
        {/* What We Offer Section */}
        <Box>
          <Heading size="sm" mb={3}>What We Offer Section</Heading>
          <FormControl mb={3}>
            <FormLabel>Title</FormLabel>
            <Input
              value={pageData.whatWeOffer.title}
              onChange={(e) => handleNestedChange('whatWeOffer', 'title', e.target.value)}
              placeholder="Section title"
            />
          </FormControl>
          
          <FormControl mb={3}>
            <FormLabel>Content</FormLabel>
            <Textarea
              value={pageData.whatWeOffer.content}
              onChange={(e) => handleNestedChange('whatWeOffer', 'content', e.target.value)}
              placeholder="Section content"
              rows={4}
            />
          </FormControl>
        </Box>
        
        <Divider />
        
        {/* How It Works Section */}
        <Box>
          <Heading size="sm" mb={3}>How It Works Section</Heading>
          <FormControl mb={3}>
            <FormLabel>Title</FormLabel>
            <Input
              value={pageData.howItWorks.title}
              onChange={(e) => handleNestedChange('howItWorks', 'title', e.target.value)}
              placeholder="Section title"
            />
          </FormControl>
          
          <FormControl mb={3}>
            <FormLabel>Content</FormLabel>
            <Textarea
              value={pageData.howItWorks.content}
              onChange={(e) => handleNestedChange('howItWorks', 'content', e.target.value)}
              placeholder="Section content"
              rows={4}
            />
          </FormControl>
        </Box>
        
        <Divider />
        
        {/* Contact Section */}
        <Box>
          <Heading size="sm" mb={3}>Contact Section</Heading>
          <FormControl mb={3}>
            <FormLabel>Title</FormLabel>
            <Input
              value={pageData.contactSection.title}
              onChange={(e) => handleNestedChange('contactSection', 'title', e.target.value)}
              placeholder="Section title"
            />
          </FormControl>
          
          <FormControl mb={3}>
            <FormLabel>Introduction</FormLabel>
            <Textarea
              value={pageData.contactSection.intro}
              onChange={(e) => handleNestedChange('contactSection', 'intro', e.target.value)}
              placeholder="Introduction text"
              rows={3}
            />
          </FormControl>
          
          <FormControl mb={3}>
            <FormLabel>Call to Action</FormLabel>
            <Textarea
              value={pageData.contactSection.callToAction}
              onChange={(e) => handleNestedChange('contactSection', 'callToAction', e.target.value)}
              placeholder="Call to action text"
              rows={2}
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

export default AboutPageEditor; 