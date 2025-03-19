import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Link,
  Stack,
  Textarea,
  Tooltip,
  useClipboard,
  useColorModeValue,
  VStack,
  Text,
  Container,
  SimpleGrid,
  Icon,
  useToast,
  FormErrorMessage,
} from '@chakra-ui/react';
import {
  BsPerson,
  BsPhone,
  BsEnvelope,
  BsGlobe,
  BsBuilding,
} from 'react-icons/bs';
import { MdEmail, MdOutlineEmail } from 'react-icons/md';
import { FaGithub, FaLinkedin, FaTwitter } from 'react-icons/fa';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';

const ContactPage = () => {
  const { hasCopied, onCopy } = useClipboard('hello@disruptivespaces.com');
  const toast = useToast();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Store in Firebase
      await addDoc(collection(db, 'contactSubmissions'), {
        name: formData.name,
        email: formData.email,
        message: formData.message,
        timestamp: serverTimestamp(),
        status: 'new',
        recipient: 'andrew@disruptive.live'
      });
      
      // Show success message
      toast({
        title: 'Message sent!',
        description: "We've received your message and will get back to you soon.",
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        message: ''
      });
      
    } catch (error) {
      console.error('Error submitting contact form:', error);
      
      toast({
        title: 'Error',
        description: "There was an error sending your message. Please try again.",
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Contact Us - Disruptive Spaces</title>
        <meta name="description" content="Get in touch with the Disruptive Spaces team for inquiries, demos, or support." />
      </Helmet>

      <Box as="section" py={20}>
        <Container maxW={'6xl'}>
          <Stack spacing={{ base: 8, md: 10 }}>
            <Heading
              fontWeight={600}
              fontSize={{ base: '3xl', sm: '4xl', md: '5xl' }}
              lineHeight={'110%'}
              textAlign={'center'}
            >
              Get in Touch
            </Heading>
            <Text
              color={'gray.500'}
              maxW={'3xl'}
              textAlign={'center'}
              fontSize={'xl'}
              mx={'auto'}
            >
              Have questions about our platform? Want to schedule a demo? We'd love to hear from you.
            </Text>
          </Stack>

          <SimpleGrid
            columns={{ base: 1, md: 2 }}
            spacing={10}
            mt={10}
          >
            <Stack spacing={8}>
              <Heading
                fontSize={'2xl'}
                fontWeight={'500'}
                mb={5}
              >
                Contact Information
              </Heading>

              <Stack spacing={4}>
                <Flex align="center">
                  <Icon as={BsEnvelope} mr={2} color={'brand.500'} />
                  <Text fontWeight="medium">andrew@disruptive.live</Text>
                  <Tooltip
                    label={hasCopied ? 'Email Copied!' : 'Copy Email'}
                    closeOnClick={false}
                    hasArrow
                  >
                    <IconButton
                      aria-label="Copy Email"
                      variant="ghost"
                      size="sm"
                      fontSize="lg"
                      icon={<MdOutlineEmail />}
                      _hover={{
                        bg: 'brand.500',
                        color: useColorModeValue('white', 'gray.700'),
                      }}
                      onClick={onCopy}
                      ml={2}
                    />
                  </Tooltip>
                </Flex>

                <Flex align="center">
                  <Icon as={BsPhone} mr={2} color={'brand.500'} />
                  <Text fontWeight="medium">+1 (555) 123-4567</Text>
                </Flex>

                <Flex align="center">
                  <Icon as={BsBuilding} mr={2} color={'brand.500'} />
                  <Text fontWeight="medium">
                    Disruptive Spaces HQ<br />
                    London, UK
                  </Text>
                </Flex>

                <Flex align="center">
                  <Icon as={BsGlobe} mr={2} color={'brand.500'} />
                  <Text fontWeight="medium">
                    Operating Hours: Monday-Friday, 9AM-6PM GMT
                  </Text>
                </Flex>
              </Stack>

              <Stack direction={'row'} spacing={6} mt={8}>
                <SocialButton label={'Twitter'} href={'#'}>
                  <FaTwitter />
                </SocialButton>
                <SocialButton label={'LinkedIn'} href={'#'}>
                  <FaLinkedin />
                </SocialButton>
                <SocialButton label={'GitHub'} href={'#'}>
                  <FaGithub />
                </SocialButton>
              </Stack>
            </Stack>

            <Box
              bg={useColorModeValue('white', 'gray.700')}
              borderRadius="lg"
              p={8}
              color={useColorModeValue('gray.700', 'whiteAlpha.900')}
              shadow="base"
            >
              <VStack spacing={5} as="form" onSubmit={handleSubmit}>
                <Heading fontSize="2xl" fontWeight="500">
                  Send us a message
                </Heading>

                <FormControl isRequired isInvalid={!!errors.name}>
                  <FormLabel>Name</FormLabel>
                  <InputGroup>
                    <InputLeftElement>
                      <BsPerson />
                    </InputLeftElement>
                    <Input 
                      type="text" 
                      name="name" 
                      placeholder="Your Name" 
                      value={formData.name}
                      onChange={handleInputChange}
                    />
                  </InputGroup>
                  {errors.name && <FormErrorMessage>{errors.name}</FormErrorMessage>}
                </FormControl>

                <FormControl isRequired isInvalid={!!errors.email}>
                  <FormLabel>Email</FormLabel>
                  <InputGroup>
                    <InputLeftElement>
                      <MdEmail />
                    </InputLeftElement>
                    <Input 
                      type="email" 
                      name="email" 
                      placeholder="Your Email" 
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </InputGroup>
                  {errors.email && <FormErrorMessage>{errors.email}</FormErrorMessage>}
                </FormControl>

                <FormControl isRequired isInvalid={!!errors.message}>
                  <FormLabel>Message</FormLabel>
                  <Textarea
                    name="message"
                    placeholder="Your Message"
                    rows={6}
                    resize="none"
                    value={formData.message}
                    onChange={handleInputChange}
                  />
                  {errors.message && <FormErrorMessage>{errors.message}</FormErrorMessage>}
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="brand"
                  bg="brand.500"
                  color="white"
                  _hover={{
                    bg: 'brand.600',
                  }}
                  width="full"
                  isLoading={isSubmitting}
                  loadingText="Sending..."
                >
                  Send Message
                </Button>
              </VStack>
            </Box>
          </SimpleGrid>
        </Container>
      </Box>

      {/* Map Section */}
      <Box as="section" py={10} bg={useColorModeValue('gray.50', 'gray.900')}>
        <Container maxW={'6xl'}>
          <Heading
            fontSize={'2xl'}
            fontWeight={'500'}
            mb={5}
            textAlign={'center'}
          >
            Visit Our Office
          </Heading>
          <Box
            borderRadius="lg"
            overflow="hidden"
            height="400px"
            width="100%"
            position="relative"
          >
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19868.687200276698!2d-0.1365972346495695!3d51.50701470841451!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487604ce3941eb1f%3A0x1a5b0945da5764f0!2sCity%20of%20Westminster%2C%20London%2C%20UK!5e0!3m2!1sen!2sus!4v1710894636826!5m2!1sen!2sus"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Office Location"
            ></iframe>
          </Box>
        </Container>
      </Box>
    </>
  );
};

const SocialButton = ({ children, label, href }) => {
  return (
    <Tooltip label={label}>
      <IconButton
        bg={useColorModeValue('blackAlpha.100', 'whiteAlpha.100')}
        borderRadius="full"
        as={'a'}
        href={href}
        target="_blank"
        aria-label={label}
        icon={children}
        _hover={{
          bg: 'brand.500',
          color: useColorModeValue('white', 'gray.700'),
        }}
      />
    </Tooltip>
  );
};

export default ContactPage; 