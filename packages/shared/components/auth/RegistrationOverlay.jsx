import React from 'react';
import {
  Box,
  Flex,
  Text,
  Spinner,
  Center,
  Modal,
  ModalOverlay,
  ModalContent,
  useToast
} from '@chakra-ui/react';
import { useRegistration } from '@disruptive-spaces/shared/providers/UserProvider';

// This component shows a global overlay when registration is in progress
const RegistrationOverlay = () => {
  const { registrationInProgress } = useRegistration();
  
  if (!registrationInProgress) return null;
  
  return (
    <Modal 
      isOpen={true} 
      onClose={() => {}} // Empty function - can't be closed
      closeOnEsc={false}
      closeOnOverlayClick={false}
      isCentered
      motionPreset="none"
      size="full"
    >
      <ModalOverlay 
        bg="rgba(0,0,0,0.8)"
        backdropFilter="blur(8px)"
      />
      <ModalContent
        bg="transparent"
        boxShadow="none"
        maxW="100%"
        maxH="100%"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Flex
          direction="column"
          align="center"
          justify="center"
          p={8}
          maxW="md"
          textAlign="center"
        >
          <Spinner 
            size="xl" 
            thickness="4px"
            speed="0.8s"
            color="blue.400"
            mb={6}
          />
          <Text
            fontSize="2xl"
            fontWeight="bold"
            color="white"
            mb={4}
          >
            Creating Your Account
          </Text>
          <Text
            fontSize="md"
            color="gray.300"
            mb={3}
          >
            Please wait while we set up your profile with Spaces Metaverse
          </Text>
          <Text
            fontSize="sm"
            color="gray.400"
            mb={1}
          >
            This typically takes 5-10 seconds to complete
          </Text>
          <Text
            fontSize="sm"
            color="gray.400"
          >
            Please do not refresh or close this page
          </Text>
        </Flex>
      </ModalContent>
    </Modal>
  );
};

export default RegistrationOverlay; 