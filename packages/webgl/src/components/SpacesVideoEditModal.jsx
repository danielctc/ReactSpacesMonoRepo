import React from 'react';
import PropTypes from 'prop-types';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  Box, Tabs, TabList, TabPanels, Tab, TabPanel, useDisclosure
} from "@chakra-ui/react";
import TransformVideoController from "./TransformVideoController";

const SpacesVideoEditModal = ({ gameObjectName, onClose }) => {
  const { isOpen, onClose: internalClose } = useDisclosure({
    isOpen: true, // Ensure the modal stays open when triggered
    onClose: onClose, // Use the external onClose to control the modal state
  });

  // Closing the modal should trigger the external onClose function
  const handleClose = () => {
    internalClose();
    onClose(); // Call the parent onClose to sync state
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" isCentered>
      <ModalOverlay bg="none" backdropFilter="none" />
      <ModalContent
        bg="rgba(255, 255, 255, 0.7)"
        color="black"
        borderRadius="xl"
        boxShadow="2xl"
        padding="4"
        position="absolute"
        top="10%"
        right="5%"
        maxWidth="350px"
        backdropFilter="blur(8px)"
        border="1px solid rgba(255, 255, 255, 0.18)"
      >
        <ModalHeader fontWeight="semibold" fontSize="lg">Edit Properties</ModalHeader>
        <ModalCloseButton onClick={handleClose} />
        <ModalBody>
          <Tabs variant="enclosed-colored" colorScheme="teal" size="sm">
            <TabList>
              <Tab fontSize="sm">Transform</Tab>
              <Tab fontSize="sm">Info</Tab>
              <Tab fontSize="sm">Asset</Tab>
            </TabList>
            <TabPanels>
              {/* Transform Tab */}
              <TabPanel>
                <Box p={3}>
                  <TransformVideoController gameObjectName={gameObjectName} />
                </Box>
              </TabPanel>
              <TabPanel>
                {/* Info Tab */}
                {/* Add your content for Info */}
              </TabPanel>
              <TabPanel>
                {/* Asset Tab */}
                {/* Add your content for Asset */}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

SpacesVideoEditModal.propTypes = {
  gameObjectName: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SpacesVideoEditModal;
