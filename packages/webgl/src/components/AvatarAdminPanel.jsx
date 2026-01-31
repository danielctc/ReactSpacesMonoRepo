import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box,
    VStack,
    HStack,
    Text,
    Image,
    SimpleGrid,
    Button,
    Input,
    Select,
    FormControl,
    FormLabel,
    useToast,
    Spinner,
    Badge,
    IconButton,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
    useDisclosure,
    Skeleton,
    Icon,
    Flex
} from '@chakra-ui/react';
import { FaUpload, FaEdit, FaTrash, FaPlus, FaEye, FaEyeSlash } from 'react-icons/fa';
import {
    getAllAvatarsAdmin,
    uploadAvatarCollectionAssets,
    updateAvatar,
    deleteAvatar,
    getNextSortOrder
} from '@disruptive-spaces/shared/firebase/avatarsFirestore';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

const CATEGORIES = [
    { value: 'default', label: 'Default' },
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'fantasy', label: 'Fantasy' },
    { value: 'custom', label: 'Custom' }
];

function AvatarAdminPanel() {
    const [avatars, setAvatars] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [editingAvatar, setEditingAvatar] = useState(null);
    const toast = useToast();
    const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();

    // Upload form state
    const [glbFile, setGlbFile] = useState(null);
    const [pngFile, setPngFile] = useState(null);
    const [avatarName, setAvatarName] = useState('');
    const [avatarCategory, setAvatarCategory] = useState('default');
    const [pngPreview, setPngPreview] = useState(null);

    const glbInputRef = useRef(null);
    const pngInputRef = useRef(null);

    // Fetch avatars on mount
    const fetchAvatars = useCallback(async () => {
        setIsLoading(true);
        try {
            const avatarList = await getAllAvatarsAdmin();
            setAvatars(avatarList);
            Logger.log('AvatarAdminPanel: Fetched avatars:', avatarList.length);
        } catch (error) {
            Logger.error('AvatarAdminPanel: Error fetching avatars:', error);
            toast({
                title: 'Error',
                description: 'Failed to load avatars.',
                status: 'error',
                duration: 3000,
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchAvatars();
    }, [fetchAvatars]);

    // Handle file selection
    const handleGlbSelect = (e) => {
        const file = e.target.files?.[0];
        if (file && file.name.endsWith('.glb')) {
            setGlbFile(file);
        } else {
            toast({
                title: 'Invalid File',
                description: 'Please select a .glb file.',
                status: 'warning',
                duration: 3000,
            });
        }
    };

    const handlePngSelect = (e) => {
        const file = e.target.files?.[0];
        if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
            setPngFile(file);
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPngPreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            toast({
                title: 'Invalid File',
                description: 'Please select a PNG or JPEG image.',
                status: 'warning',
                duration: 3000,
            });
        }
    };

    // Handle avatar upload
    const handleUpload = async () => {
        if (!glbFile || !pngFile || !avatarName.trim()) {
            toast({
                title: 'Missing Fields',
                description: 'Please provide a GLB file, PNG thumbnail, and name.',
                status: 'warning',
                duration: 3000,
            });
            return;
        }

        setIsUploading(true);
        try {
            const sortOrder = await getNextSortOrder();
            await uploadAvatarCollectionAssets(glbFile, pngFile, {
                name: avatarName.trim(),
                category: avatarCategory,
                sortOrder
            });

            toast({
                title: 'Avatar Uploaded',
                description: 'The avatar has been added to the collection.',
                status: 'success',
                duration: 3000,
            });

            // Reset form
            setGlbFile(null);
            setPngFile(null);
            setAvatarName('');
            setAvatarCategory('default');
            setPngPreview(null);
            if (glbInputRef.current) glbInputRef.current.value = '';
            if (pngInputRef.current) pngInputRef.current.value = '';

            // Refresh list
            fetchAvatars();
        } catch (error) {
            Logger.error('AvatarAdminPanel: Error uploading avatar:', error);
            toast({
                title: 'Upload Failed',
                description: 'Failed to upload avatar. Please try again.',
                status: 'error',
                duration: 3000,
            });
        } finally {
            setIsUploading(false);
        }
    };

    // Handle edit
    const handleEditClick = (avatar) => {
        setEditingAvatar({ ...avatar });
        onEditOpen();
    };

    const handleEditSave = async () => {
        if (!editingAvatar) return;

        try {
            await updateAvatar(editingAvatar.id, {
                name: editingAvatar.name,
                category: editingAvatar.category,
                isActive: editingAvatar.isActive
            });

            toast({
                title: 'Avatar Updated',
                description: 'Changes have been saved.',
                status: 'success',
                duration: 2000,
            });

            onEditClose();
            fetchAvatars();
        } catch (error) {
            Logger.error('AvatarAdminPanel: Error updating avatar:', error);
            toast({
                title: 'Update Failed',
                description: 'Failed to save changes.',
                status: 'error',
                duration: 3000,
            });
        }
    };

    // Handle delete (soft delete)
    const handleDelete = async (avatarId) => {
        try {
            await deleteAvatar(avatarId);

            toast({
                title: 'Avatar Disabled',
                description: 'The avatar has been hidden from users.',
                status: 'info',
                duration: 2000,
            });

            fetchAvatars();
        } catch (error) {
            Logger.error('AvatarAdminPanel: Error deleting avatar:', error);
            toast({
                title: 'Delete Failed',
                description: 'Failed to disable avatar.',
                status: 'error',
                duration: 3000,
            });
        }
    };

    // Toggle active status
    const handleToggleActive = async (avatar) => {
        try {
            await updateAvatar(avatar.id, { isActive: !avatar.isActive });
            fetchAvatars();
        } catch (error) {
            Logger.error('AvatarAdminPanel: Error toggling avatar:', error);
        }
    };

    return (
        <VStack spacing={6} align="stretch" p={4}>
            {/* Upload Section */}
            <Box
                bg="rgba(255, 255, 255, 0.05)"
                borderRadius="lg"
                p={4}
                border="1px solid"
                borderColor="whiteAlpha.200"
            >
                <Text fontSize="md" fontWeight="600" mb={4} color="white">
                    Upload New Avatar
                </Text>

                <Flex gap={4} flexWrap="wrap">
                    {/* GLB File Input */}
                    <Box flex="1" minW="200px">
                        <FormControl>
                            <FormLabel fontSize="sm" color="whiteAlpha.700">GLB Model</FormLabel>
                            <Input
                                ref={glbInputRef}
                                type="file"
                                accept=".glb"
                                onChange={handleGlbSelect}
                                display="none"
                            />
                            <Button
                                leftIcon={<FaUpload />}
                                onClick={() => glbInputRef.current?.click()}
                                size="sm"
                                variant="outline"
                                colorScheme="blue"
                                w="100%"
                            >
                                {glbFile ? glbFile.name : 'Select GLB'}
                            </Button>
                        </FormControl>
                    </Box>

                    {/* PNG File Input */}
                    <Box flex="1" minW="200px">
                        <FormControl>
                            <FormLabel fontSize="sm" color="whiteAlpha.700">Thumbnail (PNG)</FormLabel>
                            <Input
                                ref={pngInputRef}
                                type="file"
                                accept="image/png,image/jpeg"
                                onChange={handlePngSelect}
                                display="none"
                            />
                            <HStack>
                                <Button
                                    leftIcon={<FaUpload />}
                                    onClick={() => pngInputRef.current?.click()}
                                    size="sm"
                                    variant="outline"
                                    colorScheme="blue"
                                    flex="1"
                                >
                                    {pngFile ? pngFile.name : 'Select PNG'}
                                </Button>
                                {pngPreview && (
                                    <Image
                                        src={pngPreview}
                                        boxSize="32px"
                                        borderRadius="md"
                                        objectFit="cover"
                                    />
                                )}
                            </HStack>
                        </FormControl>
                    </Box>

                    {/* Name Input */}
                    <Box flex="1" minW="200px">
                        <FormControl>
                            <FormLabel fontSize="sm" color="whiteAlpha.700">Name</FormLabel>
                            <Input
                                value={avatarName}
                                onChange={(e) => setAvatarName(e.target.value)}
                                placeholder="Avatar name"
                                size="sm"
                                bg="whiteAlpha.100"
                                borderColor="whiteAlpha.300"
                            />
                        </FormControl>
                    </Box>

                    {/* Category Select */}
                    <Box flex="1" minW="150px">
                        <FormControl>
                            <FormLabel fontSize="sm" color="whiteAlpha.700">Category</FormLabel>
                            <Select
                                value={avatarCategory}
                                onChange={(e) => setAvatarCategory(e.target.value)}
                                size="sm"
                                bg="whiteAlpha.100"
                                borderColor="whiteAlpha.300"
                            >
                                {CATEGORIES.map((cat) => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Upload Button */}
                    <Box alignSelf="flex-end">
                        <Button
                            leftIcon={<FaPlus />}
                            colorScheme="green"
                            size="sm"
                            onClick={handleUpload}
                            isLoading={isUploading}
                            loadingText="Uploading"
                        >
                            Upload Avatar
                        </Button>
                    </Box>
                </Flex>
            </Box>

            {/* Avatar Grid */}
            <Box>
                <Text fontSize="md" fontWeight="600" mb={4} color="white">
                    Avatar Collection ({avatars.length})
                </Text>

                {isLoading ? (
                    <SimpleGrid columns={5} spacing={3}>
                        {Array.from({ length: 10 }, (_, i) => `admin-skeleton-${i}`).map((key) => (
                            <Skeleton key={key} height="150px" borderRadius="lg" />
                        ))}
                    </SimpleGrid>
                ) : avatars.length === 0 ? (
                    <Box textAlign="center" py={8} color="whiteAlpha.600">
                        <Text>No avatars in collection. Upload one above.</Text>
                    </Box>
                ) : (
                    <SimpleGrid columns={5} spacing={3}>
                        {avatars.map((avatar) => (
                            <Box
                                key={avatar.id}
                                position="relative"
                                borderRadius="lg"
                                overflow="hidden"
                                border="2px solid"
                                borderColor={avatar.isActive ? 'whiteAlpha.300' : 'red.500'}
                                opacity={avatar.isActive ? 1 : 0.6}
                                bg="rgba(0, 0, 0, 0.3)"
                            >
                                <Image
                                    src={avatar.thumbnailUrl}
                                    alt={avatar.name}
                                    w="100%"
                                    aspectRatio="1"
                                    objectFit="cover"
                                    fallback={<Skeleton height="100%" />}
                                />

                                {/* Status Badge */}
                                {!avatar.isActive && (
                                    <Badge
                                        position="absolute"
                                        top={1}
                                        left={1}
                                        colorScheme="red"
                                        fontSize="2xs"
                                    >
                                        Hidden
                                    </Badge>
                                )}

                                {/* Category Badge */}
                                <Badge
                                    position="absolute"
                                    top={1}
                                    right={1}
                                    colorScheme="blue"
                                    fontSize="2xs"
                                >
                                    {avatar.category || 'default'}
                                </Badge>

                                {/* Name and Actions */}
                                <Box
                                    position="absolute"
                                    bottom={0}
                                    left={0}
                                    right={0}
                                    bg="rgba(0, 0, 0, 0.8)"
                                    p={2}
                                >
                                    <Text fontSize="xs" color="white" noOfLines={1} mb={1}>
                                        {avatar.name}
                                    </Text>
                                    <HStack spacing={1}>
                                        <IconButton
                                            icon={<FaEdit />}
                                            size="xs"
                                            variant="ghost"
                                            colorScheme="blue"
                                            onClick={() => handleEditClick(avatar)}
                                            aria-label="Edit avatar"
                                        />
                                        <IconButton
                                            icon={avatar.isActive ? <FaEyeSlash /> : <FaEye />}
                                            size="xs"
                                            variant="ghost"
                                            colorScheme={avatar.isActive ? 'yellow' : 'green'}
                                            onClick={() => handleToggleActive(avatar)}
                                            aria-label={avatar.isActive ? 'Hide avatar' : 'Show avatar'}
                                        />
                                        <IconButton
                                            icon={<FaTrash />}
                                            size="xs"
                                            variant="ghost"
                                            colorScheme="red"
                                            onClick={() => handleDelete(avatar.id)}
                                            aria-label="Delete avatar"
                                        />
                                    </HStack>
                                </Box>
                            </Box>
                        ))}
                    </SimpleGrid>
                )}
            </Box>

            {/* Edit Modal */}
            <Modal isOpen={isEditOpen} onClose={onEditClose} isCentered>
                <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
                <ModalContent bg="#1a1a1a" color="white">
                    <ModalHeader>Edit Avatar</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        {editingAvatar && (
                            <VStack spacing={4}>
                                <Image
                                    src={editingAvatar.thumbnailUrl}
                                    boxSize="100px"
                                    borderRadius="lg"
                                    objectFit="cover"
                                />
                                <FormControl>
                                    <FormLabel fontSize="sm">Name</FormLabel>
                                    <Input
                                        value={editingAvatar.name}
                                        onChange={(e) => setEditingAvatar({
                                            ...editingAvatar,
                                            name: e.target.value
                                        })}
                                        bg="whiteAlpha.100"
                                    />
                                </FormControl>
                                <FormControl>
                                    <FormLabel fontSize="sm">Category</FormLabel>
                                    <Select
                                        value={editingAvatar.category || 'default'}
                                        onChange={(e) => setEditingAvatar({
                                            ...editingAvatar,
                                            category: e.target.value
                                        })}
                                        bg="whiteAlpha.100"
                                    >
                                        {CATEGORIES.map((cat) => (
                                            <option key={cat.value} value={cat.value}>
                                                {cat.label}
                                            </option>
                                        ))}
                                    </Select>
                                </FormControl>
                            </VStack>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={onEditClose}>
                            Cancel
                        </Button>
                        <Button colorScheme="blue" onClick={handleEditSave}>
                            Save Changes
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </VStack>
    );
}

export default AvatarAdminPanel;
