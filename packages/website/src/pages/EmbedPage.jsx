import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, Flex, Spinner } from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';
import WebGLLoader from '@disruptive-spaces/webgl';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { UserProvider } from '@disruptive-spaces/shared/providers/UserProvider';
import { FullScreenProvider } from '@disruptive-spaces/shared/providers/FullScreenProvider';

// For development only - use the actual space ID for the potato website
const POTATO_SPACE_ID = 'thepotato';

// For development only - use SpacesMetaverse_SDK as the space ID for WebGL
const DEV_WEBGL_SPACE_ID = 'SpacesMetaverse_SDK';

// Hardcoded data for the potato website - always available regardless of auth status
const potatoSpaceData = {
  id: 'thepotato',
  name: 'Spaces Metaverse',
  description: 'Welcome to the Spaces Metaverse! This is our first test space where you can explore and interact with the virtual environment.',
  visibility: 'public',
  createdAt: { toDate: () => new Date('2025-03-15') },
  createdBy: { displayName: 'Disruptive Live' },
  category: 'development',
  webglBuildId: 'fassssss'
};

/**
 * EmbedPage - A specialized page for embedding spaces in external websites
 * Uses a custom loader with space name display and continue button
 */
const EmbedPage = () => {
  const { spaceSlug } = useParams();
  const [space, setSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [webglBuildId, setWebglBuildId] = useState(null);
  const [actualSpaceId, setActualSpaceId] = useState(null);
  const containerRef = useRef(null);

  // Special case for the potato website
  const isPotatoWebsite = spaceSlug === 'the-potato-website';

  useEffect(() => {
    Logger.log(`EmbedPage: Initializing with slug: ${spaceSlug}`);
    
    // Set up container styles
    if (containerRef.current) {
      containerRef.current.style.width = '100%';
      containerRef.current.style.height = '100vh';
      containerRef.current.style.position = 'relative';
      containerRef.current.style.overflow = 'hidden';
    }
    
    fetchSpace();
  }, [spaceSlug]);

  const fetchSpace = async () => {
    try {
      Logger.log(`EmbedPage: Fetching space data for slug: ${spaceSlug}`);
      setLoading(true);
      
      // Special case for the potato website - always use hardcoded data
      if (isPotatoWebsite) {
        Logger.log('EmbedPage: Using hardcoded potato space data');
        setSpace(potatoSpaceData);
        setActualSpaceId(POTATO_SPACE_ID);
        setWebglBuildId(potatoSpaceData.webglBuildId || DEV_WEBGL_SPACE_ID);
        setLoading(false);
        return;
      }
      
      // First try to find by ID (if the slug is actually an ID)
      const spaceRef = doc(db, 'spaces', spaceSlug);
      const spaceDoc = await getDoc(spaceRef);
      
      if (spaceDoc.exists()) {
        Logger.log(`EmbedPage: Found space by ID: ${spaceDoc.id}`);
        const spaceData = { id: spaceDoc.id, ...spaceDoc.data() };
        setSpace(spaceData);
        setActualSpaceId(spaceDoc.id);
        
        // Set the WebGL build ID from the space data
        if (spaceData.webglBuildId) {
          Logger.log(`EmbedPage: Using webglBuildId from space: ${spaceData.webglBuildId}`);
          setWebglBuildId(spaceData.webglBuildId);
        } else {
          // If no webglBuildId is specified, use the space ID as fallback
          Logger.log(`EmbedPage: No webglBuildId found, using space ID as fallback: ${spaceData.id}`);
          setWebglBuildId(spaceData.id);
        }
      } else {
        Logger.log("EmbedPage: Space not found by ID, checking by slug...");
        
        // Try to find by slug
        try {
          const spacesQuery = query(
            collection(db, 'spaces'),
            where('slug', '==', spaceSlug)
          );
          
          const querySnapshot = await getDocs(spacesQuery);
          
          if (!querySnapshot.empty) {
            const spaceDoc = querySnapshot.docs[0];
            Logger.log(`EmbedPage: Found space by slug: ${spaceDoc.id}`);
            const spaceData = { id: spaceDoc.id, ...spaceDoc.data() };
            setSpace(spaceData);
            setActualSpaceId(spaceDoc.id);
            
            // Set the WebGL build ID from the space data
            if (spaceData.webglBuildId) {
              Logger.log(`EmbedPage: Using webglBuildId from space: ${spaceData.webglBuildId}`);
              setWebglBuildId(spaceData.webglBuildId);
            } else {
              // If no webglBuildId is specified, use the space ID as fallback
              Logger.log(`EmbedPage: No webglBuildId found, using space ID as fallback: ${spaceData.id}`);
              setWebglBuildId(spaceData.id);
            }
          } else {
            Logger.error(`EmbedPage: Space not found for slug: ${spaceSlug}`);
            setError('Space not found');
          }
        } catch (err) {
          Logger.error("EmbedPage: Error querying by slug:", err);
          setError('Failed to load space');
        }
      }
      
      setLoading(false);
    } catch (err) {
      Logger.error('EmbedPage: Error fetching space:', err);
      
      // If there's a permissions error and it's the potato website, use hardcoded data
      if (err.code === 'permission-denied' && isPotatoWebsite) {
        Logger.log("EmbedPage: Using special potato space data due to permissions issue");
        setSpace(potatoSpaceData);
        setActualSpaceId(POTATO_SPACE_ID);
        setWebglBuildId(potatoSpaceData.webglBuildId || DEV_WEBGL_SPACE_ID);
      } else {
        setError(`Error loading space: ${err.message}`);
      }
      
      setLoading(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <Flex 
        width="100%" 
        height="100vh" 
        justifyContent="center" 
        alignItems="center" 
        bg="gray.900"
      >
        <Spinner size="xl" color="blue.400" />
      </Flex>
    );
  }

  // Render error state
  if (error) {
    return (
      <Flex 
        width="100%" 
        height="100vh" 
        justifyContent="center" 
        alignItems="center" 
        bg="gray.900" 
        color="white"
        flexDirection="column"
        p={4}
      >
        <Text fontSize="xl" fontWeight="bold" mb={4}>
          {error}
        </Text>
        <Text>
          The requested space could not be loaded. Please check the URL and try again.
        </Text>
      </Flex>
    );
  }

  return (
    <Box 
      width="100%" 
      height="100vh" 
      position="relative" 
      overflow="hidden"
      ref={containerRef}
    >
      {/* Create webgl-root element declaratively */}
      <div 
        id="webgl-root" 
        data-space-id={isPotatoWebsite ? POTATO_SPACE_ID : actualSpaceId || webglBuildId}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          position: 'relative'
        }}
      >
        {/* WebGLLoader will mount its content in here */}
        {(actualSpaceId || webglBuildId) && (
          <UserProvider>
            <FullScreenProvider>
              <WebGLLoader spaceID={isPotatoWebsite ? POTATO_SPACE_ID : actualSpaceId || webglBuildId} />
            </FullScreenProvider>
          </UserProvider>
        )}
      </div>
    </Box>
  );
};

export default EmbedPage; 