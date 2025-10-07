import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Flex,
  Box,
  VStack,
  HStack,
  Spacer,
  Text,
  Input,
  Grid,
  Button,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';
import PortalAdminModal from './PortalAdminModal';
import { usePlaceCatalogueItem } from '../hooks/unityEvents/usePlaceCatalogueItem';

// Updated categories to include Objects (Misc group)
const categories = [
  "Recent", "Furniture", "Objects", "Upload", "Portals"
];

// Map UI categories to Firebase category keys
const CATEGORY_KEY_MAP = {
  Furniture: "chair",
  Objects: "misc"
};

const ContentAdminModal = ({ isOpen, onClose, settings }) => {
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreatePortalView, setShowCreatePortalView] = useState(false);
  const [isPortalAdminModalOpen, setIsPortalAdminModalOpen] = useState(false);
  const [catalogueItems, setCatalogueItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const { placeCatalogueItem } = usePlaceCatalogueItem();

  // Style for active/inactive tabs
  const activeTabColor = useColorModeValue("blue.500", "blue.300");
  const inactiveTabColor = useColorModeValue("gray.500", "gray.400");
  const activeTabBg = useColorModeValue("whiteAlpha.200", "whiteAlpha.200");

  useEffect(() => {
    if (isOpen) {
      const fetchCatalogueItems = async () => {
        setIsLoading(true);
        setFetchError(null);
        setCatalogueItems([]);
        try {
          const catalogueRef = collection(db, 'catalogue');
          const querySnapshot = await getDocs(catalogueRef);
          const items = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Only include items that have a GLB URL and belong to recognised categories
            const allowedCategories = ["chair", "misc"];
            if (data.glbUrl && data.categories?.some(cat => allowedCategories.includes(cat))) {
              items.push({
                id: doc.id,
                name: data.name || 'Unnamed Item',
                thumbnail: data.thumbnail?.src || 'https://via.placeholder.com/150',
                glbUrl: data.glbUrl,
                categories: data.categories
              });
            }
          });
          
          setCatalogueItems(items);
        } catch (err) {
          console.error("Error fetching catalogue items:", err);
          setFetchError("Failed to load catalogue items. Please check your connection and try again.");
        }
        setIsLoading(false);
      };
      fetchCatalogueItems();
    }
  }, [isOpen]);

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setSearchTerm(''); // Reset search when category changes
    if (category === "Portals") {
      setShowCreatePortalView(true);
    } else {
      setShowCreatePortalView(false);
    }
  };

  // Helper to filter items based on selected category and search term
  const filterByCategory = (items, category) => {
    // If we have a mapped key, filter by that key; otherwise return all for non-mapped categories
    const key = CATEGORY_KEY_MAP[category];
    let filtered = items;

    if (key) {
      filtered = filtered.filter(item => item.categories?.includes(key));
    }

    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredItems = ["Furniture", "Objects"].includes(selectedCategory)
    ? filterByCategory(catalogueItems, selectedCategory)
    : [];

  const handlePlaceItem = async (item) => {
    console.log(`Placing item: ${item.name}`);
    
    try {
      // Validate required fields
      if (!item.glbUrl) {
        console.error('Item is missing GLB URL');
        return;
      }

      // Generate a unique ID for the item
      const itemId = `item_${settings.spaceID}_${Date.now()}`;
      
      // Default position, rotation, and scale
      const position = { x: 0, y: 0, z: 0 };
      const rotation = { x: 0, y: 0, z: 0 };
      const scale = { x: 1, y: 1, z: 1 };

      // Save to Firebase first
      const itemData = {
        itemId,
        name: item.name || 'Unnamed Item',
        glbUrl: item.glbUrl,
        thumbnail: item.thumbnail || 'https://via.placeholder.com/150',
        position,
        rotation,
        scale,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        categories: item.categories || []
      };

      // Validate the data before saving
      if (!itemData.glbUrl) {
        throw new Error('GLB URL is required');
      }

      await setDoc(doc(db, 'spaces', settings.spaceID, 'catalogue', itemId), itemData);

      // Place in Unity
      const success = placeCatalogueItem(
        itemId,
        itemData.glbUrl,
        position,
        rotation,
        scale
      );

      if (success) {
        onClose(); // Close modal after placing
      } else {
        console.error('Failed to place item in Unity');
      }
    } catch (error) {
      console.error('Error placing item:', error);
    }
  };

  const handleOpenPortalAdminModal = () => {
    setIsPortalAdminModalOpen(true);
  };

  const handleClosePortalAdminModal = () => {
    setIsPortalAdminModalOpen(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl" isCentered>
      <ModalOverlay bg="rgba(0, 0, 0, 0.8)" backdropFilter="blur(8px)" />
      <ModalContent 
        bg="#1a1a1a"
        color="white" 
        borderRadius="xl"
        border="1px solid #333"
        height="85vh"
        maxHeight="750px" 
        width="85vw" 
        maxWidth="1200px"
        overflow="hidden"
      >
        <ModalHeader 
          fontSize="md"
          fontWeight="600"
          pb={1}
          pt={3}
          px={4}
          color="white"
          borderBottom="1px solid" 
          borderColor="whiteAlpha.300"
        >
          {showCreatePortalView ? "Create New Portal" : "Content Catalogue"}
        </ModalHeader>
        <ModalCloseButton
          color="white"
          bg="rgba(255,255,255,0.1)"
          _hover={{ color: "gray.400", bg: "transparent" }}
          borderRadius="full"
          size="sm"
          top={2}
          right={3}
        />
        <ModalBody p={0} display="flex" flexDirection="column" height="calc(100% - 60px)">
          
          <HStack 
            spacing={4} 
            p={4} 
            borderBottom="1px solid" 
            borderColor="whiteAlpha.300"
            overflowX="auto"
          >
            {categories
              .filter(category => category !== 'Portals')
              .map(category => (
                <Button
                  key={category}
                  variant="ghost"
                  size="md"
                  fontWeight={selectedCategory === category ? "semibold" : "normal"}
                  color={selectedCategory === category ? "white" : inactiveTabColor}
                  bg={selectedCategory === category ? activeTabBg : "transparent"}
                  borderBottom={selectedCategory === category ? `2px solid ${activeTabColor}` : "2px solid transparent"}
                  borderRadius="md"
                  _hover={{ 
                    bg: selectedCategory !== category ? "whiteAlpha.100" : activeTabBg,
                    color: "white"
                  }}
                  onClick={() => handleCategoryClick(category)}
                  px={4}
                  whiteSpace="nowrap"
                >
                  {category}
                </Button>
              ))}
            
            <Spacer />

            <Button
              key="Portals"
              variant="ghost"
              size="md"
              fontWeight={selectedCategory === "Portals" ? "semibold" : "normal"}
              color={selectedCategory === "Portals" ? "white" : inactiveTabColor}
              bg={selectedCategory === "Portals" ? activeTabBg : "transparent"}
              borderBottom={selectedCategory === "Portals" ? `2px solid ${activeTabColor}` : "2px solid transparent"}
              borderRadius="md"
              _hover={{ 
                bg: selectedCategory !== "Portals" ? "whiteAlpha.100" : activeTabBg,
                color: "white"
              }}
              onClick={() => handleCategoryClick("Portals")}
              px={4}
              whiteSpace="nowrap"
            >
              Portals
            </Button>
          </HStack>

          {showCreatePortalView && selectedCategory === "Portals" ? (
            <Box p={4} flexGrow={1} display="flex" flexDirection="column" alignItems="center" justifyContent="center">
              {/* Content for Create New Portal view */}
              {/* Title is now handled by ModalHeader */}
              <Button size="lg" colorScheme="blue" onClick={handleOpenPortalAdminModal}>Browse</Button>
            </Box>
          ) : (
            <>
              <Box p={4}>
                <Input
                  placeholder={`Search in ${selectedCategory}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  bg="rgba(255, 255, 255, 0.05)"
                  borderColor="rgba(255, 255, 255, 0.2)"
                  borderRadius="md"
                  size="md"
                  _placeholder={{ color: 'whiteAlpha.500' }}
                />
              </Box>
              
              <Box p={4} pt={0} overflowY="auto" flexGrow={1}>
                <Grid 
                  templateColumns="repeat(auto-fill, minmax(140px, 1fr))"
                  gap={4}
                >
                  {isLoading ? (
                    <Text color="whiteAlpha.700">Loading items...</Text>
                  ) : filteredItems.length > 0 ? (
                    filteredItems.map(item => (
                      <Box 
                        key={item.id} 
                        p={2}
                        bg="whiteAlpha.100" 
                        borderRadius="lg"
                        textAlign="center"
                        cursor="pointer"
                        _hover={{ bg: 'whiteAlpha.300', transform: 'scale(1.03)' }}
                        onClick={() => handlePlaceItem(item)}
                        transition="all 0.2s ease-in-out"
                        display="flex"
                        flexDirection="column"
                      >
                        <Box 
                          bgImage={`url(${item.thumbnail})`}
                          bgSize="contain"
                          bgRepeat="no-repeat"
                          bgPos="center"
                          borderRadius="md"
                          h="100px"
                          mb={2}
                          flexShrink={0}
                        />
                        <Text 
                          fontSize="xs"
                          noOfLines={2}
                          flexGrow={1}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          {item.name}
                        </Text>
                      </Box>
                    ))
                  ) : (
                    <Text color="whiteAlpha.700">
                      {selectedCategory === "Furniture" && "No chairs found in the catalogue."}
                      {selectedCategory === "Objects" && "No miscellaneous objects found in the catalogue."}
                      {!["Furniture", "Objects"].includes(selectedCategory) &&
                        `No items found in "${selectedCategory}"${searchTerm && ` matching "${searchTerm}"`}.`}
                    </Text>
                  )}
                </Grid>
              </Box>
            </>
          )}
        </ModalBody>
      </ModalContent>
      <PortalAdminModal 
        isOpen={isPortalAdminModalOpen} 
        onClose={handleClosePortalAdminModal}
        currentSpaceId={settings?.spaceID}
      />
    </Modal>
  );
};

export default ContentAdminModal; 