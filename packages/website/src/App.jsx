import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import SpacesListPage from './pages/SpacesListPage';
import SpacePage from './pages/SpacePage';
import EmbedPage from './pages/EmbedPage';
import ContactPage from './pages/ContactPage';
import WebsiteManager from './pages/admin/WebsiteManager';
import Layout from './components/Layout';

// Admin Route Guard Component
const ProtectedAdminRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const auth = getAuth();
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [auth]);
  
  if (isLoading) {
    return null; // or a loading spinner
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Box minH="100vh">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="spaces" element={<SpacesListPage />} />
          <Route path="contact" element={<ContactPage />} />
          
          {/* Protected Admin Routes */}
          <Route path="admin">
            <Route 
              path="website" 
              element={
                <ProtectedAdminRoute>
                  <WebsiteManager />
                </ProtectedAdminRoute>
              } 
            />
            {/* Add other admin routes here */}
          </Route>
        </Route>
        
        {/* Space routes with custom layout (no header on space page) */}
        <Route path="/w/:spaceSlug" element={<SpacePage />} />
        {/* Embed route - same pattern as space route but with /embed path */}
        <Route path="/embed/:spaceSlug" element={<EmbedPage />} />
      </Routes>
    </Box>
  );
}

export default App; 