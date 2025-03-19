import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container } from '@chakra-ui/react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const MainLayout = () => {
  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <Header />
      <Box as="main" flex="1">
        <Outlet />
      </Box>
      <Footer />
    </Box>
  );
};

export default MainLayout; 