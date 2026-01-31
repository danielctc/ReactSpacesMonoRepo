import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  Flex,
} from '@chakra-ui/react';

/**
 * PortalPromptModal - Confirmation modal for portal navigation.
 */
const PortalPromptModal = ({
  isOpen,
  onClose,
  targetSpaceName,
  targetSpaceSlug,
  onConfirm,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay bg="rgba(0, 0, 0, 0.8)" backdropFilter="blur(8px)" />
      <ModalContent
        bg="#1a1a1a"
        borderRadius="xl"
        border="1px solid #333"
        maxW="420px"
        p={0}
      >
        <ModalHeader
          fontSize="md"
          fontWeight="600"
          pb={1}
          pt={3}
          px={4}
          color="white"
          textAlign="center"
        >
          {targetSpaceName ? `Visit ${targetSpaceName}?` : 'Visit Space?'}
        </ModalHeader>
        <ModalCloseButton
          color="white"
          bg="rgba(255,255,255,0.1)"
          _hover={{ color: 'gray.400', bg: 'transparent' }}
          borderRadius="full"
          size="sm"
          top={2}
          right={3}
        />
        <ModalBody pb={8} pt={2} px={8}>
          <Flex mt={4} gap={6} justify="center">
            <Button
              variant="outline"
              borderColor="whiteAlpha.400"
              color="white"
              fontWeight="bold"
              borderRadius="2xl"
              px={10}
              py={6}
              fontSize="lg"
              onClick={onClose}
              _hover={{ bg: 'whiteAlpha.100' }}
            >
              Cancel
            </Button>
            <Button
              colorScheme="whiteAlpha"
              bg="white"
              color="#181818"
              fontWeight="bold"
              borderRadius="2xl"
              px={10}
              py={6}
              fontSize="lg"
              onClick={onConfirm}
              _hover={{ bg: 'gray.100' }}
            >
              Visit
            </Button>
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default PortalPromptModal;
