import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Box, Container, Heading, Text, VStack, Image, SimpleGrid, Flex, Spinner, Center } from '@chakra-ui/react';
import { useWebsiteContent } from '../contexts/WebsiteContentContext';

const AboutPage = () => {
  const { content, loading, getContent } = useWebsiteContent();
  const [pageContent, setPageContent] = useState(null);

  useEffect(() => {
    const loadAboutPage = async () => {
      // Try to get content from context first
      let aboutContent = content?.aboutpage;
      
      // If not available, fetch it
      if (!aboutContent) {
        aboutContent = await getContent('aboutpage');
      }
      
      setPageContent(aboutContent);
    };
    
    loadAboutPage();
  }, [content, getContent]);

  // Default content to use if CMS content is not available
  const defaultContent = {
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
  };

  // Use CMS content if available, otherwise use defaults
  const displayContent = pageContent || defaultContent;

  if (loading && !pageContent) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <>
      <Helmet>
        <title>{displayContent.title}</title>
        <meta name="description" content={displayContent.description} />
      </Helmet>
      
      <Container maxW="container.xl" py={10}>
        <VStack spacing={10} align="stretch">
          <Box textAlign="center">
            <Heading as="h1" size="2xl" mb={6}>{displayContent.title}</Heading>
            <Text fontSize="xl">
              {displayContent.tagline}
            </Text>
          </Box>

          <SimpleGrid columns={{base: 1, md: 2}} spacing={10}>
            <Box>
              <Image 
                src={displayContent.images.topImage} 
                alt="Office Space Example" 
                borderRadius="md"
                width="100%"
              />
            </Box>
            <VStack align="start" spacing={6}>
              <Box>
                <Heading as="h2" size="xl" mb={4}>{displayContent.whoWeAre.title}</Heading>
                <Text>
                  {displayContent.whoWeAre.content}
                </Text>
              </Box>
              <Box>
                <Heading as="h2" size="xl" mb={4}>{displayContent.ourVision.title}</Heading>
                <Text>
                  {displayContent.ourVision.content}
                </Text>
              </Box>
            </VStack>
          </SimpleGrid>

          <SimpleGrid columns={{base: 1, md: 2}} spacing={10} pt={10}>
            <VStack align="start" spacing={6}>
              <Box>
                <Heading as="h2" size="xl" mb={4}>{displayContent.whatWeOffer.title}</Heading>
                <Text>
                  {displayContent.whatWeOffer.content}
                </Text>
              </Box>
              <Box>
                <Heading as="h2" size="xl" mb={4}>{displayContent.howItWorks.title}</Heading>
                <Text>
                  {displayContent.howItWorks.content}
                </Text>
              </Box>
            </VStack>
            <Box>
              <Image 
                src={displayContent.images.bottomImage} 
                alt="Another Office Space Example" 
                borderRadius="md"
                width="100%"
              />
            </Box>
          </SimpleGrid>

          <Box bg="blue.50" p={10} borderRadius="md" mt={10}>
            <Heading as="h2" size="xl" mb={6} textAlign="center">{displayContent.contactSection.title}</Heading>
            <Flex direction={{base: "column", md: "row"}} justify="space-between" gap={8}>
              <VStack align="start" spacing={4} flex={1}>
                <Text fontSize="lg">
                  {displayContent.contactSection.intro}
                </Text>
                <Text fontSize="lg">
                  {displayContent.contactSection.callToAction}
                </Text>
              </VStack>
              <Box flex={1} bg="white" p={6} borderRadius="md">
                <VStack spacing={4}>
                  <Text>Contact form placeholder</Text>
                </VStack>
              </Box>
            </Flex>
          </Box>
        </VStack>
      </Container>
    </>
  );
};

export default AboutPage; 