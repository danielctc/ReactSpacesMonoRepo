import React from 'react';
import {
  TabPanel,
  Text,
  Box,
  Flex,
  Image,
  Button,
  Progress,
  HStack,
  Icon,
  Input,
} from '@chakra-ui/react';
import { FiUpload, FiTrash2 } from 'react-icons/fi';

/**
 * Logo Tab - Manages space logo upload and deletion.
 */
const LogoTab = ({
  existingLogo,
  previewUrl,
  selectedFile,
  isUploading,
  uploadProgress,
  fileInputRef,
  handleFileChange,
  handleUpload,
  handleDelete,
  handleBrowseClick,
}) => {
  return (
    <TabPanel p={4} display="flex" flexDirection="column">
      <Text fontSize="sm" fontWeight="600" mb={3} color="white">
        Space Logo
      </Text>
      <Text fontSize="xs" mb={4}>
        Upload a logo for your space. This will be displayed during loading.
      </Text>

      {/* Display current logo and preview side by side when both exist */}
      {(existingLogo || previewUrl) && (
        <Flex direction={{ base: 'column', md: 'row' }} gap={4} mb={4}>
          {/* Current logo display */}
          {existingLogo && (
            <Box
              borderWidth="1px"
              borderRadius="md"
              p={3}
              bg="whiteAlpha.50"
              borderColor="whiteAlpha.200"
              flex="1"
            >
              <Text fontSize="xs" fontWeight="medium" mb={2}>
                Current Logo
              </Text>
              <Image
                src={existingLogo}
                alt="Space Logo"
                maxH="120px"
                objectFit="contain"
                borderRadius="md"
              />
            </Box>
          )}

          {/* New logo preview */}
          {previewUrl && (
            <Box
              borderWidth="1px"
              borderRadius="md"
              p={3}
              bg="whiteAlpha.50"
              borderColor="blue.200"
              flex="1"
            >
              <Text fontSize="xs" fontWeight="medium" mb={2} color="blue.300">
                New Logo Preview
              </Text>
              <Image
                src={previewUrl}
                alt="Preview"
                maxH="120px"
                objectFit="contain"
                borderRadius="md"
              />
            </Box>
          )}
        </Flex>
      )}

      {/* Hidden file input */}
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        display="none"
      />

      {/* Upload progress */}
      {isUploading && uploadProgress > 0 && (
        <Progress
          value={uploadProgress}
          size="sm"
          colorScheme="blue"
          mb={4}
          borderRadius="full"
        />
      )}

      {/* Action buttons */}
      <HStack spacing={3}>
        <Button
          leftIcon={<Icon as={FiUpload} />}
          onClick={handleBrowseClick}
          size="sm"
          variant="outline"
          colorScheme="blue"
          isDisabled={isUploading}
        >
          Browse
        </Button>

        {selectedFile && (
          <Button
            colorScheme="blue"
            size="sm"
            onClick={handleUpload}
            isLoading={isUploading}
            loadingText="Uploading..."
          >
            Upload Logo
          </Button>
        )}

        {existingLogo && !selectedFile && (
          <Button
            leftIcon={<Icon as={FiTrash2} />}
            colorScheme="red"
            variant="outline"
            size="sm"
            onClick={handleDelete}
            isLoading={isUploading}
          >
            Remove Logo
          </Button>
        )}
      </HStack>

      {selectedFile && (
        <Text fontSize="xs" mt={2} color="gray.400">
          Selected: {selectedFile.name}
        </Text>
      )}
    </TabPanel>
  );
};

export default LogoTab;
