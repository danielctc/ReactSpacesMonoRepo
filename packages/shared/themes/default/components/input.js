import { inputAnatomy } from '@chakra-ui/anatomy';
import { createMultiStyleConfigHelpers } from '@chakra-ui/react';

const { definePartsStyle, defineMultiStyleConfig } =
    createMultiStyleConfigHelpers(inputAnatomy.keys);

const baseStyle = definePartsStyle({
    // define the part you're going to style
    field: {
        color: 'copy.dark', // change the input text color
        borderColor: 'tertiary.500',
        borderRadius: 'xs',
    },
});


const chatInput = definePartsStyle({
    field: {
        bg: 'white',
        color: 'copy.dark',
        borderColor: 'primary.100',
        minHeight: '40px',
        borderRadius: 'md',
        _placeholder: { color: 'primary.500' },
        _focus: {
            borderColor: 'primary.500',
            boxShadow: '0 0 0 1px #3182CE', // Example shadow on focus
        },
    },
});

export const inputTheme = defineMultiStyleConfig({
    baseStyle,
    variants: { chatInput },
    defaultProps: {
        size: 'sm',
        background: 'white',
    },
});
