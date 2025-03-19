import { Box, Flex } from '@chakra-ui/react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

function Layout() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <Flex direction="column" minH="100vh">
      <Header transparent={isHomePage} />
      <Box as="main" flex="1">
        <Outlet />
      </Box>
      <Footer />
    </Flex>
  );
}

export default Layout; 