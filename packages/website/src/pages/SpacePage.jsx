import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  Spinner, 
  Alert, 
  AlertIcon, 
  AlertTitle, 
  AlertDescription,
  VStack,
  HStack,
  Badge,
  Divider,
  Flex,
  useDisclosure,
} from '@chakra-ui/react';
import { Helmet } from 'react-helmet-async';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';
import WebGLLoader from '@disruptive-spaces/webgl/src/WebGLLoader';
import { UserProvider } from '@disruptive-spaces/shared/providers/UserProvider';
import { FullScreenProvider } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import Header from '../components/Header';
import Footer from '../components/Footer';

// For development only - use the actual space ID for the potato website
const POTATO_SPACE_ID = 'thepotato';

// For development only - use SpacesMetaverse_SDK as the space ID for WebGL
// This is to avoid CORS issues with Firebase Storage in development
const DEV_WEBGL_SPACE_ID = 'SpacesMetaverse_SDK';

// Sample space data for development when Firebase permissions are not available
const getSampleSpace = (id) => ({
  id,
  name: id === 'sample1' ? 'Conference Room' : id === 'sample2' ? 'Art Gallery' : 'Social Lounge',
  description: id === 'sample1' 
    ? 'Professional virtual meeting space for team collaboration.' 
    : id === 'sample2' 
      ? 'Immersive gallery for showcasing digital art and exhibitions.' 
      : 'Casual environment for social gatherings and networking events.',
  visibility: 'public',
  createdAt: { toDate: () => new Date() },
  createdBy: { displayName: 'Demo User' }
});

// Hardcoded data for the potato website - always available regardless of auth status
const potatoSpaceData = {
  id: 'thepotato',
  name: 'Spaces Metaverse',
  description: 'Welcome to the Spaces Metaverse! This is our first test space where you can explore and interact with the virtual environment. We plan to add more functionality as we go. Please check back soon for updates.',
  visibility: 'public',
  createdAt: { toDate: () => new Date('2025-03-15') },
  createdBy: { displayName: 'Disruptive Live' },
  category: 'development'
};

// Create a new collection for SEO content
const SEO_COLLECTION = 'seoContent';

// Function to intercept and modify Firebase Storage URLs to use our proxy
function setupFirebaseStorageProxy() {
  // Save the original fetch function
  const originalFetch = window.fetch;
  
  // Override the fetch function
  window.fetch = function(url, options) {
    // Check if this is a Firebase Storage URL
    if (typeof url === 'string' && url.includes('firebasestorage.googleapis.com')) {
      console.log('Intercepting Firebase Storage URL:', url);
      
      // Replace the Firebase Storage URL with our proxy URL
      const proxyUrl = url.replace('https://firebasestorage.googleapis.com', '/firebase-proxy');
      console.log('Using proxy URL:', proxyUrl);
      
      // Call the original fetch with the proxy URL
      return originalFetch(proxyUrl, options);
    }
    
    // For all other URLs, use the original fetch
    return originalFetch(url, options);
  };
  
  // Return a cleanup function
  return () => {
    window.fetch = originalFetch;
  };
}

function SpacePage() {
  console.log("SpacePage component rendering");
  const { spaceSlug } = useParams();
  console.log("Space slug from URL:", spaceSlug);
  
  const [space, setSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actualSpaceId, setActualSpaceId] = useState(null);
  const webglContainerRef = useRef(null);
  const [seoData, setSeoData] = useState(null);
  
  useEffect(() => {
    async function fetchSpace() {
      try {
        setLoading(true);
        console.log("Fetching space with slug:", spaceSlug);
        
        // Special case for the potato website - always use hardcoded data
        if (spaceSlug === 'the-potato-website') {
          console.log("Using hardcoded potato space data");
          setSpace(potatoSpaceData);
          setActualSpaceId(POTATO_SPACE_ID);
          setLoading(false);
          return;
        }
        
        // First try to find by ID (if the slug is actually an ID)
        const spaceRef = doc(db, 'spaces', spaceSlug);
        const spaceDoc = await getDoc(spaceRef);
        
        if (spaceDoc.exists()) {
          console.log("Found space by ID:", spaceDoc.id);
          const spaceData = { id: spaceDoc.id, ...spaceDoc.data() };
          setSpace(spaceData);
          setActualSpaceId(spaceDoc.id);
        } else {
          console.log("Space not found by ID, checking by slug...");
          
          // Try to find by slug
          try {
            const spacesQuery = query(
              collection(db, 'spaces'),
              where('slug', '==', spaceSlug)
            );
            
            const querySnapshot = await getDocs(spacesQuery);
            
            if (!querySnapshot.empty) {
              const spaceDoc = querySnapshot.docs[0];
              console.log("Found space by slug:", spaceDoc.id);
              const spaceData = { id: spaceDoc.id, ...spaceDoc.data() };
              setSpace(spaceData);
              setActualSpaceId(spaceDoc.id);
            } else {
              // Check if it's a sample space ID
              if (spaceSlug.startsWith('sample')) {
                console.log('Using sample space data');
                const sampleSpace = getSampleSpace(spaceSlug);
                setSpace(sampleSpace);
                setActualSpaceId(spaceSlug);
              } else {
                console.log("Space not found by slug either");
                setError('Space not found');
              }
            }
          } catch (err) {
            console.error("Error querying by slug:", err);
            setError('Failed to load space');
          }
        }
      } catch (err) {
        console.error('Error fetching space:', err);
        
        // If there's a permissions error, use sample data if it's a sample ID
        if (err.code === 'permission-denied') {
          if (spaceSlug.startsWith('sample')) {
            console.log('Using sample space data due to Firebase permissions issue');
            const sampleSpace = getSampleSpace(spaceSlug);
            setSpace(sampleSpace);
            setActualSpaceId(spaceSlug);
          } else if (spaceSlug === 'the-potato-website') {
            console.log("Using special potato space data due to permissions issue");
            setSpace(potatoSpaceData);
            setActualSpaceId(POTATO_SPACE_ID);
          } else {
            setError('Failed to load space - Permission denied');
          }
        } else {
          setError('Failed to load space');
        }
      } finally {
        setLoading(false);
      }
    }
    
    if (spaceSlug) {
      fetchSpace();
    } else {
      setError('Invalid space URL');
      setLoading(false);
    }
  }, [spaceSlug]);
  
  // Set up the Firebase Storage proxy
  useEffect(() => {
    console.log('Setting up Firebase Storage proxy');
    return setupFirebaseStorageProxy();
  }, []);
  
  // Fetch SEO data from Firebase
  useEffect(() => {
    async function fetchSeoData() {
      if (!spaceSlug) return;
      
      try {
        console.log("Fetching SEO data for:", spaceSlug);
        
        // For the potato website, always use hardcoded data first
        if (spaceSlug === 'the-potato-website') {
          console.log("Using hardcoded data for SEO (potato website)");
          setSeoData({
            title: potatoSpaceData.name,
            description: potatoSpaceData.description,
            image: ''
          });
          
          // Try to get additional data from Firebase, but don't wait for it
          try {
            const seoRef = doc(db, SEO_COLLECTION, spaceSlug);
            const seoDoc = await getDoc(seoRef);
            
            if (seoDoc.exists()) {
              console.log("Found SEO data from collection:", seoDoc.data());
              // Update with Firebase data but keep hardcoded as fallback
              setSeoData(prevData => ({
                title: seoDoc.data().title || prevData.title,
                description: seoDoc.data().description || prevData.description,
                image: seoDoc.data().image || prevData.image
              }));
            } else {
              // Try to get from spaces collection as backup
              const spaceRef = doc(db, 'spaces', POTATO_SPACE_ID);
              const spaceDoc = await getDoc(spaceRef);
              
              if (spaceDoc.exists()) {
                const data = spaceDoc.data();
                console.log("Found space data for SEO:", data);
                // Update with Firebase data but keep hardcoded as fallback
                setSeoData(prevData => ({
                  title: data.name || prevData.title,
                  description: data.description || prevData.description,
                  image: data.imageUrl || prevData.image
                }));
              }
            }
          } catch (err) {
            console.error("Error fetching additional SEO data:", err);
            // Already using hardcoded data, so no need to set it again
          }
          
          return; // Exit early since we've already set the data
        }
        
        // For non-potato spaces, try to get SEO data from the seoContent collection
        const seoRef = doc(db, SEO_COLLECTION, spaceSlug);
        const seoDoc = await getDoc(seoRef);
        
        if (seoDoc.exists()) {
          console.log("Found SEO data:", seoDoc.data());
          setSeoData(seoDoc.data());
        } else if (space) {
          // If no dedicated SEO data, use space data
          setSeoData({
            title: space.name,
            description: space.description,
            image: space.imageUrl
          });
        }
      } catch (err) {
        console.error("Error fetching SEO data:", err);
      }
    }
    
    fetchSeoData();
  }, [spaceSlug, space]);
  
  if (loading) {
    return (
      <Box height="100vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" color="brand.500" thickness="4px" />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Container maxW="container.xl" py={10}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertTitle mr={2}>Error!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Container>
    );
  }
  
  // For the potato website, use the hardcoded WebGL space ID
  const webglSpaceId = spaceSlug === 'the-potato-website' ? POTATO_SPACE_ID : actualSpaceId;
  
  return (
    <Box bg="#1a1a1a" color="white" minH="100vh">
      <Helmet>
        <title>{seoData?.title || space?.name || "Space"} | Disruptive Spaces</title>
        <meta name="description" content={seoData?.description || space?.description || 'Explore this virtual space'} />
        {seoData?.image && <meta property="og:image" content={seoData.image} />}
      </Helmet>
      
      <Header />
      
      <Container maxW="container.xl" py={8} mt="60px">
        {/* WebGL Container */}
        <Box 
          borderRadius="md" 
          overflow="hidden" 
          mb={8}
          height="70vh"
          position="relative"
          border="1px solid rgba(255, 255, 255, 0.1)"
          ref={webglContainerRef}
        >
          {/* Create a div with ID webgl-root for WebGLLoader to find */}
          <div 
            id="webgl-root" 
            data-space-id={webglSpaceId}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              position: 'relative'
            }}
          >
            {/* WebGLLoader will mount its content in here */}
            {webglSpaceId && (
              <UserProvider>
                <FullScreenProvider>
                  <WebGLLoader spaceID={webglSpaceId} />
                </FullScreenProvider>
              </UserProvider>
            )}
          </div>
        </Box>
        
        {/* Title Section */}
        <Box mb={6}>
          <Heading as="h1" size="2xl" mb={2}>{seoData?.title || space?.name || "Space"}</Heading>
          <HStack spacing={2}>
            <Text color="#4fd1c5">{space?.createdBy?.displayName}</Text>
            <Text color="gray.500">|</Text>
            <Text color="gray.500">{space?.visibility === 'public' ? 'Public Space' : 'Private Space'}</Text>
          </HStack>
        </Box>
        
        {/* Content Section */}
        <Flex gap={8} direction={{ base: 'column', lg: 'row' }}>
          {/* Description */}
          <Box flex="2">
            <Text fontSize="lg" mb={6}>
              {seoData?.description || space?.description || "No description available."}
            </Text>
            <Divider borderColor="gray.700" mb={6} />
          </Box>
          
          {/* Information Box */}
          <Box 
            flex="1" 
            bg="#2D2D2D" 
            p={6} 
            borderRadius="md"
            border="1px solid rgba(255, 255, 255, 0.1)"
          >
            <Heading as="h2" size="lg" mb={6}>Information</Heading>
            
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text color="gray.400">Released:</Text>
                <Text>{space?.createdAt ? new Date(space.createdAt.toDate()).toLocaleDateString() : '15/3/2025'}</Text>
              </Box>
              
              <Box>
                <Text color="gray.400">Category:</Text>
                <Box mt={2}>
                  <Badge 
                    bg="#2D2D2D" 
                    color="white" 
                    px={3} 
                    py={1} 
                    borderRadius="full"
                    border="1px solid rgba(255, 255, 255, 0.2)"
                  >
                    {space?.category || 'development'}
                  </Badge>
                </Box>
              </Box>
              
              <Box>
                <Text color="gray.400">Creators:</Text>
                <Box mt={2}>
                  <Text>{space?.createdBy?.displayName || 'Disruptive Live'}</Text>
                </Box>
              </Box>
            </VStack>
          </Box>
        </Flex>
      </Container>
      
      <Footer />
    </Box>
  );
}

export default SpacePage; 