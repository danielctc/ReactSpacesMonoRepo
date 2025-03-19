import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Flex,
  Text,
  IconButton,
  Button,
  Stack,
  Collapse,
  Icon,
  Link,
  Popover,
  PopoverTrigger,
  PopoverContent,
  useColorModeValue,
  useBreakpointValue,
  useDisclosure,
  Container,
  Image,
  HStack,
} from '@chakra-ui/react';
import {
  HamburgerIcon,
  CloseIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@chakra-ui/icons';
import { UserProvider } from '@disruptive-spaces/shared/providers/UserProvider';
import { FullScreenProvider } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import HeaderAuthLinks from '@disruptive-spaces/header-auth-links/src/HeaderAuthLinks';

const Header = ({ transparent = false }) => {
  const { isOpen, onToggle } = useDisclosure();
  const isMobile = useBreakpointValue({ base: true, md: false });

  return (
    <Box 
      as="header" 
      py={4} 
      boxShadow={transparent ? "none" : "sm"} 
      bg={transparent ? "rgba(26, 32, 44, 0.2)" : "gray.800"}
      backdropFilter={transparent ? "blur(5px)" : "none"}
      position={transparent ? "absolute" : "relative"}
      width="100%"
      zIndex="10"
    >
      <Container maxW="container.xl">
        <Flex justify="space-between" align="center">
          <RouterLink to="/">
            <Image 
              src="/SpaceEmblem.png" 
              alt="Space Emblem" 
              h="40px"
              filter="brightness(0) invert(1)"
              fallbackSrc="https://placehold.co/150x40?text=Logo"
            />
          </RouterLink>
          
          {!isMobile && (
            <HStack spacing={8} color="white" position="absolute" left="50%" transform="translateX(-50%)">
              <Link as={RouterLink} to="/" fontWeight="medium">Home</Link>
              <Link as={RouterLink} to="/spaces" fontWeight="medium">Spaces</Link>
              <Link as={RouterLink} to="/about" fontWeight="medium">About</Link>
            </HStack>
          )}
          
          {isMobile && (
            <IconButton
              onClick={onToggle}
              icon={isOpen ? <CloseIcon w={3} h={3} /> : <HamburgerIcon w={5} h={5} />}
              variant="ghost"
              color="white"
              aria-label="Toggle Navigation"
            />
          )}
          
          <Box>
            <UserProvider>
              <FullScreenProvider>
                <HeaderAuthLinks />
              </FullScreenProvider>
            </UserProvider>
          </Box>
        </Flex>
        
        <Collapse in={isOpen} animateOpacity>
          <Box pt={4} pb={4} display={{ md: 'none' }}>
            <Stack spacing={4} color="white">
              <Link as={RouterLink} to="/" fontWeight="medium">Home</Link>
              <Link as={RouterLink} to="/spaces" fontWeight="medium">Spaces</Link>
              <Link as={RouterLink} to="/about" fontWeight="medium">About</Link>
            </Stack>
          </Box>
        </Collapse>
      </Container>
    </Box>
  );
};

const DesktopNav = () => {
  const linkColor = useColorModeValue('gray.600', 'gray.200');
  const linkHoverColor = useColorModeValue('gray.800', 'white');
  const popoverContentBgColor = useColorModeValue('white', 'gray.800');

  return (
    <Stack direction={'row'} spacing={4}>
      {NAV_ITEMS.map((navItem) => (
        <Box key={navItem.label}>
          <Popover trigger={'hover'} placement={'bottom-start'}>
            <PopoverTrigger>
              <Link
                as={RouterLink}
                p={2}
                to={navItem.href ?? '#'}
                fontSize={'sm'}
                fontWeight={500}
                color={linkColor}
                _hover={{
                  textDecoration: 'none',
                  color: linkHoverColor,
                }}
              >
                {navItem.label}
              </Link>
            </PopoverTrigger>

            {navItem.children && (
              <PopoverContent
                border={0}
                boxShadow={'xl'}
                bg={popoverContentBgColor}
                p={4}
                rounded={'xl'}
                minW={'sm'}
              >
                <Stack>
                  {navItem.children.map((child) => (
                    <DesktopSubNav key={child.label} {...child} />
                  ))}
                </Stack>
              </PopoverContent>
            )}
          </Popover>
        </Box>
      ))}
    </Stack>
  );
};

const DesktopSubNav = ({ label, href, subLabel }) => {
  return (
    <Link
      as={RouterLink}
      to={href}
      role={'group'}
      display={'block'}
      p={2}
      rounded={'md'}
      _hover={{ bg: useColorModeValue('brand.50', 'gray.900') }}
    >
      <Stack direction={'row'} align={'center'}>
        <Box>
          <Text
            transition={'all .3s ease'}
            _groupHover={{ color: 'brand.500' }}
            fontWeight={500}
          >
            {label}
          </Text>
          <Text fontSize={'sm'}>{subLabel}</Text>
        </Box>
        <Flex
          transition={'all .3s ease'}
          transform={'translateX(-10px)'}
          opacity={0}
          _groupHover={{ opacity: '100%', transform: 'translateX(0)' }}
          justify={'flex-end'}
          align={'center'}
          flex={1}
        >
          <Icon color={'brand.500'} w={5} h={5} as={ChevronRightIcon} />
        </Flex>
      </Stack>
    </Link>
  );
};

const MobileNav = () => {
  return (
    <Stack
      bg={useColorModeValue('white', 'gray.800')}
      p={4}
      display={{ md: 'none' }}
    >
      {NAV_ITEMS.map((navItem) => (
        <MobileNavItem key={navItem.label} {...navItem} />
      ))}
    </Stack>
  );
};

const MobileNavItem = ({ label, children, href }) => {
  const { isOpen, onToggle } = useDisclosure();

  return (
    <Stack spacing={4} onClick={children && onToggle}>
      <Flex
        py={2}
        as={RouterLink}
        to={href ?? '#'}
        justify={'space-between'}
        align={'center'}
        _hover={{
          textDecoration: 'none',
        }}
      >
        <Text
          fontWeight={600}
          color={useColorModeValue('gray.600', 'gray.200')}
        >
          {label}
        </Text>
        {children && (
          <Icon
            as={ChevronDownIcon}
            transition={'all .25s ease-in-out'}
            transform={isOpen ? 'rotate(180deg)' : ''}
            w={6}
            h={6}
          />
        )}
      </Flex>

      <Collapse in={isOpen} animateOpacity style={{ marginTop: '0!important' }}>
        <Stack
          mt={2}
          pl={4}
          borderLeft={1}
          borderStyle={'solid'}
          borderColor={useColorModeValue('gray.200', 'gray.700')}
          align={'start'}
        >
          {children &&
            children.map((child) => (
              <Link
                key={child.label}
                py={2}
                as={RouterLink}
                to={child.href}
              >
                {child.label}
              </Link>
            ))}
        </Stack>
      </Collapse>
    </Stack>
  );
};

const NAV_ITEMS = [
  {
    label: 'Home',
    href: '/',
  },
  {
    label: 'Spaces',
    href: '/spaces',
  },
  {
    label: 'About',
    href: '/about',
  },
  {
    label: 'Solutions',
    children: [
      {
        label: 'Virtual Events',
        subLabel: 'Host immersive virtual events',
        href: '/solutions/virtual-events',
      },
      {
        label: 'Training & Education',
        subLabel: 'Interactive learning environments',
        href: '/solutions/training',
      },
    ],
  },
  {
    label: 'Contact',
    href: '/contact',
  },
];

export default Header; 