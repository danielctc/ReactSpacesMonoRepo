import React, { useState } from 'react';
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
import PortalAdminModal from './PortalAdminModal';

// Updated categories
const categories = [
  "Recent", "Furniture", "Upload", "Portals"
];

// Updated placeholder item data
const items = {
  Recent: [
    { id: 'rec1', name: 'Recent Item 1', thumbnail: 'https://via.placeholder.com/150' },
    { id: 'rec2', name: 'Recent Item 2', thumbnail: 'https://via.placeholder.com/150' },
  ],
  Furniture: [
    { id: 'furn1', name: 'Chair', thumbnail: 'https://via.placeholder.com/150' },
    { id: 'furn2', name: 'Table', thumbnail: 'https://via.placeholder.com/150' },
    { id: 'furn3', name: 'Lamp', thumbnail: 'https://via.placeholder.com/150' },
  ],
  Upload: [], // Placeholder
  Portals: [], // Placeholder
  // Removed other categories
};

const ContentAdminModal = ({ isOpen, onClose, settings }) => {
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreatePortalView, setShowCreatePortalView] = useState(false);
  const [isPortalAdminModalOpen, setIsPortalAdminModalOpen] = useState(false);

  // Style for active/inactive tabs
  const activeTabColor = useColorModeValue("blue.500", "blue.300");
  const inactiveTabColor = useColorModeValue("gray.500", "gray.400");
  const activeTabBg = useColorModeValue("whiteAlpha.200", "whiteAlpha.200");

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setSearchTerm(''); // Reset search when category changes
    if (category === "Portals") {
      setShowCreatePortalView(true);
    } else {
      setShowCreatePortalView(false);
    }
  };

  const filteredItems = (items[selectedCategory] || []).filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePlaceItem = (item) => {
    console.log(`Placing item: ${item.name}`);
    // TODO: Implement actual item placement logic (e.g., call Unity function)
    onClose(); // Close modal after placing (optional)
  };

  const handleOpenPortalAdminModal = () => {
    setIsPortalAdminModalOpen(true);
  };

  const handleClosePortalAdminModal = () => {
    setIsPortalAdminModalOpen(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl" isCentered>
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(5px)" />
      <ModalContent 
        bg="rgba(30, 30, 30, 0.85)"
        backdropFilter="blur(15px)"
        color="white" 
        borderRadius="xl"
        height="85vh"
        maxHeight="750px" 
        width="85vw" 
        maxWidth="1200px"
        overflow="hidden"
      >
        <ModalHeader 
          pb={2}
          borderBottom="1px solid" 
          borderColor="whiteAlpha.300"
        >
          {showCreatePortalView ? "Create New Portal" : "Content Catalogue"}
        </ModalHeader>
        <ModalCloseButton top="14px" />
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
                  {filteredItems.length > 0 ? (
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
                    <Text color="whiteAlpha.700">No items found in "{selectedCategory}"{searchTerm && ` matching "${searchTerm}"`}.</Text>
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