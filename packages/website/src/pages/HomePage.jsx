import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Box,
  Container,
  Heading,
  Text,
  Flex,
  Grid,
  GridItem,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { useWebsiteContent } from '../contexts/WebsiteContentContext';

// Hero Video component that can handle both local videos and Vimeo
const HeroVideo = ({ videoSrc }) => {
  // Check if the source is a Vimeo link
  const isVimeo = videoSrc?.includes('vimeo.com');
  
  if (isVimeo) {
    // For Vimeo, use the complete URL with hash parameter for unlisted videos
    // This preserves the ?h=HASH part which is required for unlisted videos
    return (
      <Box
        position="absolute"
        top="0"
        left="0"
        width="100%"
        height="100%"
        overflow="hidden"
      >
        <Box
          as="iframe"
          src={`${videoSrc}&background=1&autoplay=1&loop=1&byline=0&title=0&muted=1`}
          frameBorder="0"
          allow="autoplay; fullscreen"
          loading="lazy"
          position="absolute"
          top="0"
          left="0"
          width="100%"
          height="100%"
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            minWidth: "100%",
            minHeight: "100%",
            width: "auto",
            height: "auto",
            objectFit: "cover",
            overflow: "hidden",
            // Ensure the iframe is large enough on all devices
            "@media (max-width: 768px)": {
              width: "250%",
              height: "250%",
            },
            "@media (min-width: 769px) and (max-width: 1200px)": {
              width: "150%",
              height: "150%",
            },
            "@media (min-width: 1201px)": {
              width: "100%",
              height: "120%",
            }
          }}
        />
      </Box>
    );
  }
  
  // Fallback to regular video if not Vimeo
  return (
    <Box 
      as="video"
      autoPlay
      muted
      loop
      playsInline
      position="absolute"
      top="0"
      left="0"
      width="100%"
      height="100%"
      sx={{
        objectFit: "cover",
        objectPosition: "center center",
        minWidth: "100%",
        minHeight: "100%"
      }}
      src={videoSrc}
    />
  );
};

const HomePage = () => {
  const { content, loading, getContent } = useWebsiteContent();
  const [pageContent, setPageContent] = useState(null);

  useEffect(() => {
    const loadHomePage = async () => {
      // Try to get content from context first
      let homeContent = content?.homepage;
      
      // If not available, fetch it
      if (!homeContent) {
        homeContent = await getContent('homepage');
      }
      
      setPageContent(homeContent);
    };
    
    loadHomePage();
  }, [content, getContent]);

  // Return loading spinner while content is being fetched
  if (loading || !pageContent) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <>
      <Helmet>
        <title>{pageContent.title}</title>
        <meta name="description" content={pageContent.description} />
      </Helmet>

      {/* Hero Section with Video Background */}
      <Box 
        position="relative" 
        height={{ base: "100vh", md: "100vh" }}
        width="100%"
        overflow="hidden"
      >
        {/* Video Background */}
        <HeroVideo videoSrc={pageContent.videoSrc} />

        {/* Dark Overlay */}
        <Box 
          position="absolute"
          top="0"
          left="0"
          width="100%"
          height="100%"
          bg="rgba(0, 0, 0, 0.5)"
          zIndex="1"
        />

        {/* Hero Content */}
        <Flex
          height="100%"
          width="100%"
          position="relative"
          zIndex="2"
          align="center"
          justify="center"
          px={4}
        >
          <Heading
            as="h1"
            color="white"
            fontSize={{ base: "4xl", sm: "5xl", md: "6xl" }}
            fontWeight="bold"
            textAlign="center"
          >
            {pageContent.heroHeading}
          </Heading>
        </Flex>
      </Box>

      {/* Mission Section */}
      <Box as="section" py={16}>
        <Container maxW="container.xl">
          <Grid 
            templateColumns={{ base: "1fr", md: "1fr 1fr" }} 
            gap={10}
          >
            <GridItem>
              <Heading 
                as="h2" 
                fontSize="2xl" 
                fontWeight="normal"
                color="gray.500"
                mb={3}
              >
                {pageContent.missionHeading}
              </Heading>
              <Heading 
                as="h1" 
                fontSize={{ base: "4xl", md: "5xl" }} 
                fontWeight="bold"
              >
                {pageContent.missionTitle}
              </Heading>
            </GridItem>
            
            <GridItem>
              <Box mb={8}>
                {pageContent.missionPoints?.map((point, index) => (
                  <Text key={index} fontSize="xl" mb={3}>{point}</Text>
                ))}
              </Box>
              
              <Flex align="center">
                <RouterLink to="/about" style={{ color: '#0080ff', fontWeight: 500, marginRight: '10px' }}>
                  {pageContent.learnMoreText}
                </RouterLink>
                <Box as="svg" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#0080ff">
                  <path d="M10 20A10 10 0 1 0 0 10a10 10 0 0 0 10 10zM8.711 4.3l5.7 5.766L8.7 15.711l-1.4-1.422 4.289-4.242-4.3-4.347z" />
                </Box>
              </Flex>
            </GridItem>
          </Grid>
        </Container>
      </Box>
    </>
  );
};

export default HomePage; 