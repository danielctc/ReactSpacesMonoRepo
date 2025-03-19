import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Box,
  Heading,
  Text,
  Button,
  Container,
  Flex,
  Image,
  Stack,
  useColorModeValue,
} from '@chakra-ui/react';

const NotFoundPage = () => {
  return (
    <>
      <Helmet>
        <title>Page Not Found - Disruptive Spaces</title>
        <meta name="description" content="The page you are looking for does not exist." />
      </Helmet>

      <Box as="section" py={20}>
        <Container maxW={'6xl'}>
          <Flex
            align={'center'}
            justify={'center'}
            direction={{ base: 'column', md: 'row' }}
            py={{ base: 10, md: 20 }}
            gap={10}
          >
            <Stack flex={1} spacing={8} align={'center'} textAlign={'center'}>
              <Heading
                fontWeight={600}
                fontSize={{ base: '3xl', sm: '4xl', md: '6xl' }}
                lineHeight={'110%'}
              >
                <Text as={'span'} color={'brand.500'}>
                  404
                </Text>
                <br />
                <Text as={'span'}>
                  Page Not Found
                </Text>
              </Heading>
              <Text color={'gray.500'} maxW={'3xl'}>
                The page you are looking for does not exist or has been moved.
                Let's get you back on track.
              </Text>
              <Stack
                direction={'row'}
                spacing={4}
                align={'center'}
              >
                <Button
                  rounded={'full'}
                  bg={'brand.500'}
                  color={'white'}
                  _hover={{
                    bg: 'brand.600',
                  }}
                  as={RouterLink}
                  to="/"
                >
                  Go Home
                </Button>
                <Button
                  rounded={'full'}
                  as={RouterLink}
                  to="/contact"
                >
                  Contact Support
                </Button>
              </Stack>
            </Stack>
            <Flex
              flex={1}
              justify={'center'}
              align={'center'}
              position={'relative'}
              w={'full'}
            >
              <Box
                position={'relative'}
                height={'300px'}
                rounded={'2xl'}
                width={'full'}
                overflow={'hidden'}
              >
                <Image
                  alt={'404 Illustration'}
                  fit={'contain'}
                  align={'center'}
                  w={'100%'}
                  h={'100%'}
                  src={'https://illustrations.popsy.co/amber/crashed-error.svg'}
                />
              </Box>
            </Flex>
          </Flex>
        </Container>
      </Box>
    </>
  );
};

export default NotFoundPage; 