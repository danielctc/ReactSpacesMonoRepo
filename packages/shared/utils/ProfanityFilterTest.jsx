import React, { useState } from 'react';
import {
  Box,
  Button,
  Input,
  Text,
  VStack,
  Heading,
  FormControl,
  FormLabel,
  FormHelperText,
  Code,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorModeValue,
} from '@chakra-ui/react';
import { isUsernameSafe, normalizeText, PROFANITY_LIST } from './profanityFilter';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';

/**
 * A utility component for administrators to test the profanity filter
 * This component should only be accessible to admin users
 */
const ProfanityFilterTest = () => {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState(null);
  const [normalizedText, setNormalizedText] = useState('');
  const { user } = React.useContext(UserContext);
  
  // Only admin users should be able to access this page
  const isAdmin = user?.groups?.includes('admin');
  
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  const handleCheck = () => {
    const normalized = normalizeText(inputText);
    setNormalizedText(normalized);
    
    const isSafe = isUsernameSafe(inputText);
    setResult(isSafe);
  };
  
  if (!isAdmin) {
    return (
      <Box p={5}>
        <Alert status="error">
          <AlertIcon />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            This tool is only available to administrators.
          </AlertDescription>
        </Alert>
      </Box>
    );
  }
  
  return (
    <Box p={5} maxW="600px" mx="auto">
      <Heading size="lg" mb={5}>Profanity Filter Test Tool</Heading>
      <Text mb={4}>
        This tool allows administrators to test username and nickname filtering.
        Enter text below to check if it would be flagged by the profanity filter.
      </Text>
      
      <VStack spacing={4} align="stretch">
        <FormControl>
          <FormLabel>Test Text</FormLabel>
          <Input 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter username or nickname to test"
          />
          <FormHelperText>
            Enter text to check against the profanity filter
          </FormHelperText>
        </FormControl>
        
        <Button colorScheme="blue" onClick={handleCheck}>
          Check Text
        </Button>
        
        {result !== null && (
          <Alert
            status={result ? "success" : "error"}
            variant="solid"
            borderRadius="md"
          >
            <AlertIcon />
            <AlertTitle mr={2}>
              {result ? "Safe" : "Unsafe"}
            </AlertTitle>
            <AlertDescription>
              {result 
                ? "This text passes the profanity filter." 
                : "This text contains or resembles inappropriate content."}
            </AlertDescription>
          </Alert>
        )}
        
        {normalizedText && (
          <Box 
            p={4} 
            bg={bgColor} 
            borderRadius="md" 
            borderWidth="1px"
            borderColor={borderColor}
          >
            <Text fontWeight="bold" mb={2}>Normalized Text:</Text>
            <Code>{normalizedText}</Code>
            <Text mt={4} fontSize="sm">
              The normalized text above shows how the text is processed before checking
              against the profanity list. This helps catch deliberate character substitutions.
            </Text>
          </Box>
        )}
        
        <Box 
          p={4} 
          mt={4}
          bg={bgColor} 
          borderRadius="md" 
          borderWidth="1px"
          borderColor={borderColor}
          maxH="300px"
          overflowY="auto"
        >
          <Text fontWeight="bold" mb={2}>Current Profanity List:</Text>
          <Text fontSize="sm">
            The filter checks against these terms and their variations:
          </Text>
          <Code p={2} display="block" whiteSpace="pre-wrap">
            {PROFANITY_LIST.join(', ')}
          </Code>
        </Box>
      </VStack>
    </Box>
  );
};

export default ProfanityFilterTest; 