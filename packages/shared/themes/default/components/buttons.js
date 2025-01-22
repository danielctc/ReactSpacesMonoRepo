import { defineStyleConfig } from "@chakra-ui/react";

const baseStyle = {
    px: '6',
    py: '4',
    fontSize: 'sm',
    boxShadow: "md", // Add shadow to all buttons
    _hover: {
        cursor: "pointer"
    }
};

const primary = {
    ...baseStyle,
    bg: "secondary.500",
    color: "white",
    _hover: {
        bg: "secondary.600",
    }
};

const secondary = {
    ...baseStyle,
    bg: "primary.50",

    color: "primary.500",
    _hover: {
        bg: "primary.100",
    }
}


const iconButton = {
    bg: "tertiaryAlpha.600", // Use the same background color as the primary button
    color: "white",
    backdropFilter: "blur(3px)", // Apply a blur to create the glass effect
    _hover: {
        bg: "tertiaryAlpha.700", // Use the same hover color as the primary button
    },

}

export const buttonTheme = defineStyleConfig({
    baseStyle,
    variants: { primary, secondary, iconButton },
});