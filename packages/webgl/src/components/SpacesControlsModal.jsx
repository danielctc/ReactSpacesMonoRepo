import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Text,
  HStack,
  VStack,
  Flex,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Icon,
} from "@chakra-ui/react";
import { FaKeyboard, FaMouse, FaGamepad, FaInfoCircle } from 'react-icons/fa';

function SpacesControlsModal({ open, onClose }) {
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <Modal isOpen={open} onClose={onClose} size="md" isCentered>
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent 
        bg="rgba(23, 25, 35, 0.95)" 
        color="white" 
        borderRadius="md"
        boxShadow="0 4px 20px rgba(0, 0, 0, 0.5)"
        maxW="600px"
        h="350px"
        overflow="hidden"
      >
        <ModalHeader 
          borderBottom="1px solid" 
          borderColor="whiteAlpha.200" 
          py={2} 
          fontSize="md"
          fontWeight="600"
        >
          Controls
        </ModalHeader>

        <ModalCloseButton 
          size="sm"
          color="whiteAlpha.700"
          _hover={{ color: "white", bg: "whiteAlpha.100" }}
        />

        <ModalBody p={0} display="flex">
          <Tabs 
            orientation="vertical" 
            variant="unstyled" 
            index={tabIndex} 
            onChange={setTabIndex}
            display="flex" 
            flexGrow={1}
          >
            <TabList 
              bg="rgba(0, 0, 0, 0.2)" 
              w="80px" 
              py={4} 
              borderRight="1px solid" 
              borderColor="whiteAlpha.200"
            >
              <Tab 
                display="flex" 
                flexDirection="column" 
                alignItems="center"
                py={3}
                _selected={{ bg: "whiteAlpha.100", color: "blue.300" }}
                _hover={{ bg: "whiteAlpha.50" }}
              >
                <Icon as={FaKeyboard} mb={1} />
                <Text fontSize="xs">Movement</Text>
              </Tab>
              <Tab 
                display="flex" 
                flexDirection="column" 
                alignItems="center"
                py={3}
                _selected={{ bg: "whiteAlpha.100", color: "blue.300" }}
                _hover={{ bg: "whiteAlpha.50" }}
              >
                <Icon as={FaMouse} mb={1} />
                <Text fontSize="xs">Camera</Text>
              </Tab>
              <Tab 
                display="flex" 
                flexDirection="column" 
                alignItems="center"
                py={3}
                _selected={{ bg: "whiteAlpha.100", color: "blue.300" }}
                _hover={{ bg: "whiteAlpha.50" }}
              >
                <Icon as={FaGamepad} mb={1} />
                <Text fontSize="xs">Actions</Text>
              </Tab>
              <Tab 
                display="flex" 
                flexDirection="column" 
                alignItems="center"
                py={3}
                _selected={{ bg: "whiteAlpha.100", color: "blue.300" }}
                _hover={{ bg: "whiteAlpha.50" }}
              >
                <Icon as={FaInfoCircle} mb={1} />
                <Text fontSize="xs">Tips</Text>
              </Tab>
            </TabList>

            <TabPanels flexGrow={1} display="flex" flexDirection="column">
              <TabPanel p={4} display="flex" flexDirection="column" h="100%">
                <Text fontSize="sm" fontWeight="600" mb={3} color="blue.300">Movement Controls</Text>
                <Flex wrap="wrap" gap={3}>
                  <ControlItem keyLabel="W" description="Move Forward" />
                  <ControlItem keyLabel="A" description="Move Left" />
                  <ControlItem keyLabel="S" description="Move Backward" />
                  <ControlItem keyLabel="D" description="Move Right" />
                  <ControlItem keyLabel="Shift" description="Run" />
                  <ControlItem keyLabel="Space" description="Jump / Double Jump" />
                </Flex>
              </TabPanel>

              <TabPanel p={4} display="flex" flexDirection="column" h="100%">
                <Text fontSize="sm" fontWeight="600" mb={3} color="blue.300">Camera Controls</Text>
                <Flex wrap="wrap" gap={3}>
                  <ControlItem keyLabel="Mouse" description="Look Around" />
                  <ControlItem keyLabel="Click + Drag" description="Rotate Camera" />
                  <ControlItem keyLabel="Scroll" description="Zoom In/Out" />
                </Flex>
              </TabPanel>

              <TabPanel p={4} display="flex" flexDirection="column" h="100%">
                <Text fontSize="sm" fontWeight="600" mb={3} color="blue.300">Action Controls</Text>
                <Flex wrap="wrap" gap={3}>
                  <ControlItem keyLabel="E" description="Interact" />
                  <ControlItem keyLabel="F" description="Emote Menu" />
                  <ControlItem keyLabel="T" description="Chat" />
                  <ControlItem keyLabel="M" description="Mute Mic" />
                </Flex>
              </TabPanel>

              <TabPanel p={4} display="flex" flexDirection="column" h="100%">
                <Text fontSize="sm" fontWeight="600" mb={3} color="blue.300">Tips & Tricks</Text>
                <VStack align="stretch" spacing={2}>
                  <Text fontSize="xs">• Double-tap Shift to auto-run</Text>
                  <Text fontSize="xs">• Press ESC to access settings</Text>
                  <Text fontSize="xs">• Click on players to view their profile</Text>
                  <Text fontSize="xs">• Use the minimap to navigate</Text>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

// Helper component for control items
const ControlItem = ({ keyLabel, description }) => (
  <Box 
    bg="whiteAlpha.100" 
    borderRadius="md" 
    p={2} 
    minW="120px"
    maxW="180px"
  >
    <HStack spacing={2}>
      <Box 
        bg="whiteAlpha.200" 
        borderRadius="md" 
        px={2} 
        py={1} 
        fontSize="xs" 
        fontWeight="bold"
        minW="30px"
        textAlign="center"
      >
        {keyLabel}
      </Box>
      <Text fontSize="xs">{description}</Text>
    </HStack>
  </Box>
);

export default SpacesControlsModal;
