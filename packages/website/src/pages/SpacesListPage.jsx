import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  SimpleGrid, 
  Spinner, 
  Alert, 
  AlertIcon, 
  Input,
  InputGroup,
  InputLeftElement,
  Stack,
  Card,
  CardBody,
  CardFooter,
  Image,
  Badge,
  Flex,
  Button,
  Link,
  Code
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { Helmet } from 'react-helmet-async';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';

// Sample spaces data for development when Firebase permissions are not available
const sampleSpaces = [
  {
    id: 'sample1',
    name: 'Conference Room',
    description: 'Professional virtual meeting space for team collaboration.',
    visibility: 'public',
    createdAt: { toDate: () => new Date() },
    createdBy: { displayName: 'Demo User' }
  },
  {
    id: 'sample2',
    name: 'Art Gallery',
    description: 'Immersive gallery for showcasing digital art and exhibitions.',
    visibility: 'public',
    createdAt: { toDate: () => new Date() },
    createdBy: { displayName: 'Demo User' }
  },
  {
    id: 'sample3',
    name: 'Social Lounge',
    description: 'Casual environment for social gatherings and networking events.',
    visibility: 'public',
    createdAt: { toDate: () => new Date() },
    createdBy: { displayName: 'Demo User' }
  }
];

// Hardcoded data for the potato website
const potatoSpaceData = {
  id: 'thepotato',
  name: 'Spaces Metaverse',
  description: 'Welcome to the Spaces Metaverse! This is our first test space where you can explore and interact with the virtual environment. We plan to add more functionality as we go. Please check back soon for updates.',
  visibility: 'public',
  createdAt: { toDate: () => new Date('2025-03-15') },
  createdBy: { displayName: 'Disruptive Live' },
  category: 'development',
  thumbnailUrl: 'https://placehold.co/400x200?text=Spaces+Metaverse'
};

function SpacesListPage() {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  
  useEffect(() => {
    async function fetchSpaces() {
      try {
        setLoading(true);
        console.log("Fetching spaces from Firebase...");
        
        // Query for all spaces without any filters to ensure we get all data
        const spacesQuery = query(
          collection(db, 'spaces'),
          limit(50)
        );
        
        console.log("Executing Firebase query:", spacesQuery);
        const querySnapshot = await getDocs(spacesQuery);
        console.log("Query snapshot size:", querySnapshot.size);
        
        // Log each document for debugging
        querySnapshot.forEach((doc) => {
          console.log("Found space document:", doc.id, doc.data());
        });
        
        const spacesData = [];
        
        querySnapshot.forEach((doc) => {
          // Ensure we have valid data before adding to the array
          const data = doc.data();
          if (data) {
            // Ensure required fields exist
            const spaceItem = { 
              id: doc.id, 
              ...data,
              // Provide defaults for required fields if they don't exist
              name: data.name || `Space ${doc.id}`,
              description: data.description || 'No description available',
              visibility: data.visibility || 'public'
            };
            spacesData.push(spaceItem);
          }
        });
        
        console.log(`Found ${spacesData.length} spaces in Firebase:`, spacesData);
        
        // Sort spaces by createdAt date in JavaScript instead of in the query
        spacesData.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB - dateA; // descending order (newest first)
        });
        
        // Always include the potato space data
        const potatoExists = spacesData.some(space => space.id === 'thepotato');
        if (!potatoExists) {
          console.log("Adding potato space data to the list");
          spacesData.push(potatoSpaceData);
        }
        
        setSpaces(spacesData);
        setDebugInfo({
          spacesCount: spacesData.length,
          firstSpace: spacesData.length > 0 ? spacesData[0].id : 'none',
          allSpaceIds: spacesData.map(space => space.id),
          firebaseQuerySize: querySnapshot.size
        });
      } catch (err) {
        console.error('Error fetching spaces:', err);
        setDebugInfo({ 
          error: err.message, 
          code: err.code,
          stack: err.stack
        });
        
        // If there's a permissions error or index error, use sample data instead
        if (err.code === 'permission-denied' || err.message.includes('requires an index')) {
          console.log('Using sample spaces data due to Firebase error:', err.message);
          // Always include the potato space data with sample data
          setSpaces([...sampleSpaces, potatoSpaceData]);
        } else {
          setError(`Failed to load spaces: ${err.message}`);
          // Still show the potato space even if there's an error
          setSpaces([potatoSpaceData]);
        }
      } finally {
        setLoading(false);
      }
    }
    
    fetchSpaces();
  }, []);
  
  // Filter spaces based on search term
  const filteredSpaces = spaces.filter(space => 
    space && space.name && space.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (space && space.description && space.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Create a URL-friendly slug from the space name and ID
  const createSpaceSlug = (name, id) => {
    if (!name || !id) return 'unknown-space';
    if (id === 'thepotato') return 'the-potato-website';
    const nameSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `${nameSlug}_${id}`;
  };
  
  // Calculate and store slugs for all spaces
  const spacesWithSlugs = filteredSpaces.map(space => {
    if (!space) return null;
    return {
      ...space,
      calculatedSlug: space.slug || createSpaceSlug(space.name, space.id)
    };
  }).filter(Boolean); // Remove any null entries
  
  // Filter to only show spaces with an actual slug property defined in Firebase
  const spacesWithDefinedSlugs = spacesWithSlugs.filter(space => space && space.slug);
  
  if (loading) {
    return (
      <Box height="50vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" color="brand.500" thickness="4px" />
      </Box>
    );
  }
  
  return (
    <>
      <Helmet>
        <title>Explore Spaces | Disruptive Spaces</title>
        <meta name="description" content="Explore virtual spaces created by our community" />
      </Helmet>
      
      <Box py={10}>
        <Container maxW="container.xl">
          <Stack spacing={8}>
            <Heading as="h1" size="xl">Explore Spaces</Heading>
            
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input 
                placeholder="Search spaces..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                bg="white"
                borderRadius="md"
                boxShadow="sm"
              />
            </InputGroup>
            
            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Text>{error}</Text>
              </Alert>
            )}
            
            {debugInfo && (
              <Alert status="info" borderRadius="md" variant="subtle">
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">Debug Info:</Text>
                  <Code>{JSON.stringify(debugInfo, null, 2)}</Code>
                </Box>
              </Alert>
            )}
            
            {/* List of all spaces with their slugs */}
            <Card overflow="hidden" variant="outline" boxShadow="md">
              <Box p={4} bg="blue.50">
                <Heading size="md">Spaces with Defined Slugs</Heading>
              </Box>
              <CardBody>
                {spacesWithDefinedSlugs.length === 0 ? (
                  <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <Text>No spaces with defined slugs found. Add a 'slug' property to your spaces in Firebase.</Text>
                  </Alert>
                ) : (
                  <Stack spacing={3}>
                    {spacesWithDefinedSlugs.map(space => (
                      <Box key={space.id} p={3} borderWidth="1px" borderRadius="md">
                        <Flex justify="space-between" wrap="wrap" gap={2}>
                          <Box>
                            <Text fontWeight="bold">{space.name}</Text>
                            <Text fontSize="sm" color="gray.500">ID: {space.id}</Text>
                          </Box>
                          <Box>
                            <Text fontSize="sm" fontWeight="bold">Slug:</Text>
                            <Code p={1}>{space.slug}</Code>
                          </Box>
                          <Button 
                            as={RouterLink} 
                            to={`/w/${space.slug}`}
                            size="sm"
                            colorScheme="blue"
                          >
                            Visit
                          </Button>
                        </Flex>
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardBody>
            </Card>
            
            {/* List of all spaces with calculated slugs */}
            <Card overflow="hidden" variant="outline" boxShadow="md">
              <Box p={4} bg="gray.50">
                <Heading size="md">All Spaces (with calculated slugs)</Heading>
              </Box>
              <CardBody>
                <Stack spacing={3}>
                  {spacesWithSlugs.map(space => (
                    <Box key={space.id} p={3} borderWidth="1px" borderRadius="md">
                      <Flex justify="space-between" wrap="wrap" gap={2}>
                        <Box>
                          <Text fontWeight="bold">{space.name}</Text>
                          <Text fontSize="sm" color="gray.500">ID: {space.id}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="sm" fontWeight="bold">
                            {space.slug ? "Defined Slug:" : "Calculated Slug:"}
                          </Text>
                          <Code p={1} bg={space.slug ? "green.50" : "gray.50"}>
                            {space.calculatedSlug}
                          </Code>
                        </Box>
                        <Button 
                          as={RouterLink} 
                          to={`/w/${space.calculatedSlug}`}
                          size="sm"
                          colorScheme={space.slug ? "green" : "blue"}
                        >
                          Visit
                        </Button>
                      </Flex>
                    </Box>
                  ))}
                </Stack>
              </CardBody>
            </Card>
            
            {/* Special test space - The Potato Website */}
            <Card overflow="hidden" variant="outline" boxShadow="md" bg="yellow.50">
              <Box p={4} bg="yellow.100">
                <Heading size="md">Test Space: The Potato Website</Heading>
              </Box>
              <CardBody>
                <Text color="gray.600" mb={4}>
                  This is a special test space with ID "thepotato" and slug "the-potato-website".
                </Text>
              </CardBody>
              <CardFooter>
                <Button 
                  as={RouterLink} 
                  to="/w/the-potato-website"
                  colorScheme="yellow" 
                  width="100%"
                >
                  Enter Test Space
                </Button>
              </CardFooter>
            </Card>
            
            {filteredSpaces.length === 0 ? (
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Text>No spaces found. Try a different search term or check back later.</Text>
              </Alert>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                {filteredSpaces.map(space => (
                  <Card key={space.id} overflow="hidden" variant="outline" boxShadow="md">
                    <Image
                      src={space.backgroundUrl || space.thumbnailUrl || `https://placehold.co/400x200?text=${encodeURIComponent(space.name)}`}
                      alt={space.name}
                      height="200px"
                      objectFit="cover"
                    />
                    <CardBody>
                      <Stack spacing={2}>
                        <Flex justify="space-between" align="center">
                          <Heading size="md">{space.name}</Heading>
                          <Badge colorScheme="green">Public</Badge>
                        </Flex>
                        <Text color="gray.600" noOfLines={2}>
                          {space.description || "No description available"}
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                          ID: {space.id}
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                          Slug: <Code p={1}>{space.calculatedSlug}</Code>
                        </Text>
                      </Stack>
                    </CardBody>
                    <CardFooter>
                      <Button 
                        as={RouterLink} 
                        to={`/w/${space.calculatedSlug}`}
                        colorScheme="blue" 
                        width="100%"
                      >
                        Enter Space
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </SimpleGrid>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
}

export default SpacesListPage; 