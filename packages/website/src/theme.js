import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  colors: {
    brand: {
      50: '#e0f2ff',
      100: '#b0d5ff',
      200: '#80b9ff',
      300: '#509eff',
      400: '#2084ff',
      500: '#0080ff', // primary color
      600: '#0059b3',
      700: '#003d80',
      800: '#00264d',
      900: '#00101f',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    }
  },
  fonts: {
    heading: "'Montserrat', sans-serif",
    body: "'Lato', sans-serif",
  },
  styles: {
    global: {
      body: {
        bg: 'white',
        color: 'gray.800',
      }
    }
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'medium',
      },
      variants: {
        solid: {
          bg: 'brand.500',
          color: 'white',
          _hover: {
            bg: 'brand.600',
          },
        },
      },
    },
    Link: {
      baseStyle: {
        _hover: {
          textDecoration: 'none',
          color: 'brand.500',
        },
      },
    },
  },
});

export default theme; 