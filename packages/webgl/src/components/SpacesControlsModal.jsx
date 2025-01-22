import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Text,
  VStack,
} from "@chakra-ui/react";

function SpacesControlsModal({ open, onClose }) {
  return (
    <Modal isOpen={open} onClose={onClose} size="lg" isCentered>
      <ModalOverlay />
      <ModalContent bg="gray.900" color="white" borderRadius="lg">
        <ModalHeader>Controls</ModalHeader>

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
          {/* Example content to match the style of your reference image */}
          <VStack spacing={4}>
            <Box bg="gray.800" p={4} borderRadius="md" textAlign="center">
              <Text fontSize="xl" fontWeight="bold">Getting Started</Text>
              <Box mt={2}>
                <Text>WASD to move</Text>
                <Text>Shift to run</Text>
                <Text>Spacebar to jump/double jump</Text>
                <Text>Click to move around</Text>
              </Box>
            </Box>

            <Box bg="gray.800" p={4} borderRadius="md" textAlign="center">
              <Text fontSize="xl" fontWeight="bold">Camera Movements</Text>
              <Box mt={2}>
                <Text>Click & drag to rotate camera</Text>
              </Box>
            </Box>

            <Box bg="gray.800" p={4} borderRadius="md" textAlign="center">
              <Text fontSize="xl" fontWeight="bold">##########</Text>
              <Box mt={2}>
                <Text>Type something here</Text>
              </Box>
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default SpacesControlsModal;
