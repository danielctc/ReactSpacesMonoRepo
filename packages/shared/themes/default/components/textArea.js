import { defineStyle, defineStyleConfig } from '@chakra-ui/react';

// Define custom styles for the chat textarea
const chatInput = defineStyle({
    bg: 'white',
    color: 'copy.dark',
    borderColor: 'primary.500',
    borderWidth: "1px",
    minHeight: '38px',
    borderRadius: 'md',
    _placeholder: { color: 'primary.500' },
    _focus: {
        borderWidth: "1px",
        minHeight: '38px',
        borderColor: 'secondary.500',
        // boxShadow: '0 0 0 1px ${primary.500}', // Example shadow on focus
    },
});

// Define the style configuration
export const textareaTheme = defineStyleConfig({
    variants: { chatInput },
    defaultProps: {
        // size: 'sm',
        // variant: 'chatInput',
    },
});