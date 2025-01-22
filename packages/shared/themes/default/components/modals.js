import { modalAnatomy as parts } from '@chakra-ui/anatomy';
import { createMultiStyleConfigHelpers } from '@chakra-ui/styled-system';

const { definePartsStyle, defineMultiStyleConfig } =
    createMultiStyleConfigHelpers(parts.keys);

// Define the base style for each part of the modal
const baseStyle = definePartsStyle({
    overlay: {
        bg: 'blackAlpha.600', // Semi-transparent black background
        backdropFilter: "blur(2px)",
    },
    dialog: {
        borderRadius: 'xl', // Medium border radius
        bg: 'white', // Light purple background
        p: "1rem"
    },
    header: {
        color: "primary.500",
        fontSize: "4xl",
        fontWeight: "800",
    },
    body: {
        lineHeight: "1.5rem",
    },
    footer: {
        justifyContent: "flex-start",
        pt: "2rem",
    },
    closeButton: {
        bg: "tertiary.200", // Light grey background
        top: "12px",
        right: "12px",
        outline: 'none',
        boxShadow: 'none',
        _focus: {
            boxShadow: 'none',
        },
        _hover: {
            bg: "tertiary.300", // Slightly darker grey on hover
        },
    },

});



const videoPlayer = definePartsStyle({

    header: {  // Assuming you might have a header part
        display: "none",  // Typically no header for full-screen modals
    },
    dialogContainer: {
        p: 0,
        m: 0,

    },
    dialog: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: 0,
        padding: 0,
        borderRadius: 0,
        width: "calc(100vw - 32px)", // Adjust for padding or margins if needed
        height: "calc((100vw - 32px) * (9/16))", // 16:9 aspect ratio calculation
        maxWidth: "90vw",
        bg: 'transparent',
        p: 0,
        m: 0,
        boxShadow: "none",
    },
    body: {
        width: "100%",
        hieght: "100%",
        p: 0,
        m: 0,
    },
    footer: {  // Assuming you might have a footer part
        display: "none",  // Typically no footer for full-screen modals
    },
    size: "xxl", // Define size as xxl
    isCentered: true, // Center the modal
});



// Assemble the base style into a modal theme configuration
export const modalTheme = defineMultiStyleConfig({
    baseStyle,
    variants: {
        videoPlayer  // Assign the defined styles to the variant
    }
});

