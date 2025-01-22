import { alertAnatomy } from '@chakra-ui/anatomy'
import { createMultiStyleConfigHelpers } from '@chakra-ui/react'

const { definePartsStyle, defineMultiStyleConfig } = createMultiStyleConfigHelpers(alertAnatomy.keys);

// Define the base style for each part of the alert
const baseStyle = definePartsStyle({
    body: {
        fontSize: "md",
        fontWeight: "medium",
        p: "1rem",
    },
    title: {
        fontSize: "lg",
        fontWeight: "bold",
    },
});

// Define the style for different variants of alerts (e.g., success, error)
const successAlert = definePartsStyle({
    body: {
        bg: "success", // Light background for success alerts
        color: "white", // Text color for success alerts
    },
});

const errorAlert = definePartsStyle({
    body: {
        bg: "error", // Light background for error alerts
        color: "white", // Text color for error alerts
    },
});

const warningAlert = definePartsStyle({
    body: {
        bg: "warning", // Light background for warning alerts
        color: "white", // Text color for warning alerts
    },
});

// Assemble the base style into an alert theme configuration
export const alertTheme = defineMultiStyleConfig({
    baseStyle,
    variants: {
        success: successAlert,
        warning: warningAlert,
        error: errorAlert,

    }
});
