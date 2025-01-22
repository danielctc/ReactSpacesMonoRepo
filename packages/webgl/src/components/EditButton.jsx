// EditButtons.jsx
import React from "react";
import { Box, Button } from "@chakra-ui/react";

// New component to render the Edit Buttons on top of thumbnails
const EditButtons = ({ thumbnails }) => {
  if (!thumbnails || thumbnails.length === 0) {
    return null; // Do not render anything if thumbnails are not available
  }

  return (
    <Box position="relative" zIndex="10">
      {thumbnails.map(({ id, thumbnailUrl }, index) => (
        <Box key={id} position="relative" marginBottom={4}>
          {/* Use a background image to ensure correct overlay for each thumbnail */}
          <Box
            backgroundImage={`url(${thumbnailUrl})`}
            backgroundSize="cover"
            width="300px" // Adjust width and height as per the thumbnail size
            height="200px"
            position="relative"
          >
            {/* Edit Button on top of the Thumbnail */}
            <Button
              position="absolute"
              top="5px"
              right="5px"
              zIndex="20"
              backgroundColor="red"
              color="white"
              onClick={() => console.log(`Edit clicked for ${id}`)}
            >
              Edit {id}
            </Button>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default EditButtons;
