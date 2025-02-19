import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Box
} from "@chakra-ui/react";

function SpacesSettingsModal({ open, onClose }) {
  return (
    <Modal isOpen={open} onClose={onClose} size="lg" isCentered>
      <ModalOverlay />
      <ModalContent bg="gray.900" color="white" borderRadius="lg">
        <ModalHeader>Settings</ModalHeader>

        {/* Custom close button */}
        <ModalCloseButton
          size="lg"
          bg="gray.700"
          color="white"
          borderRadius="full"
          _hover={{ bg: "gray.600" }}
          _focus={{ boxShadow: "none" }}
        />

        <ModalBody>
          {/* Tab structure for different settings */}
          <Tabs variant="enclosed">
            <TabList mb={4}>
              <Tab _selected={{ color: 'white', borderBottom: '2px solid white' }}>Audio</Tab>
              <Tab _selected={{ color: 'white', borderBottom: '2px solid white' }}>Graphics</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                {/* Audio settings content */}
                <Box p={4} bg="gray.800" borderRadius="md">
                  Audio settings content will go here.
                </Box>
              </TabPanel>
              <TabPanel>
                {/* Graphics settings content */}
                <Box p={4} bg="gray.800" borderRadius="md">
                  Graphics settings content goes here.
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default SpacesSettingsModal;
