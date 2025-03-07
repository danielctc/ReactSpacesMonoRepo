import { useContext, useEffect, useState } from "react";
import { Box, Avatar, Flex, Menu, MenuButton, MenuList, MenuItem, Text, Divider, Button, useDisclosure, Portal } from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import SignIn from "@disruptive-spaces/shared/components/auth/SignIn";
import SignOut from "@disruptive-spaces/shared/components/auth/SignOut";
import Register from "@disruptive-spaces/shared/components/auth/Register";
import ProfileModal from "./ProfileModal";

const buttonStyles = {
    bg: "white",
    color: "black",
    borderRadius: "full",
    px: "6",
    py: "2",
    height: "auto",
    fontSize: "md",
    fontWeight: "medium",
    _hover: { bg: "gray.100" },
    display: "flex",
    alignItems: "center",
    gap: 2
};

const HeaderAuthLinks = () => {
    const { user, updateUser } = useContext(UserContext);
    const [isLoading, setIsLoading] = useState(true);
    const { isOpen, onOpen, onClose } = useDisclosure();

    useEffect(() => {
        // Short timeout to allow user context to be loaded
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    const handleProfileClose = () => {
        onClose();
        // Force a refresh of the user data
        updateUser();
    };

    const profileImageUrl = user?.rpmURL
        ? user.rpmURL.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75")
        : null;

    // Don't render anything while loading
    if (isLoading) {
        return null;
    }

    return (
        <Flex align="center" gap="4">
            {user ? (
                <>
                    <ProfileModal 
                        isOpen={isOpen} 
                        onClose={handleProfileClose} 
                        user={user}
                        profileImageUrl={profileImageUrl}
                    />
                    <Menu>
                        <MenuButton
                            as={Box}
                            cursor="pointer"
                        >
                            <Flex
                                align="center"
                                height="40px"
                                px={4}
                                borderRadius="full"
                                border="1px solid rgba(255, 255, 255, 0.3)"
                                transition="all 0.2s"
                                sx={{
                                    '&:hover': {
                                        border: '2px solid white'
                                    }
                                }}
                            >
                                <Flex align="center" gap="3">
                                    <Box
                                        width="28px"
                                        height="28px"
                                        borderRadius="full"
                                        overflow="hidden"
                                        bg="white"
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                    >
                                        <Avatar
                                            src={profileImageUrl}
                                            width="100%"
                                            height="100%"
                                            borderRadius="full"
                                        />
                                    </Box>
                                    <Text color="white" fontWeight="medium">
                                        {user.Nickname}
                                    </Text>
                                    <Box 
                                        display="flex" 
                                        alignItems="center"
                                        height="28px"
                                    >
                                        <ChevronDownIcon color="white" w={4} h={4} />
                                    </Box>
                                </Flex>
                            </Flex>
                        </MenuButton>
                        <Portal>
                            <MenuList 
                                bg="gray.800" 
                                borderColor="gray.700"
                                zIndex={9999}
                            >
                                <Box p={4} display="flex" alignItems="center" gap={3}>
                                    <Avatar 
                                        src={profileImageUrl}
                                        size="md"
                                        borderRadius="full"
                                    />
                                    <Text fontSize="xl" fontWeight="bold" color="white">
                                        {user.Nickname}
                                    </Text>
                                </Box>
                                <Divider borderColor="gray.700" />
                                <MenuItem _hover={{ bg: "gray.700" }} color="white" bg="gray.800">
                                    My Spaces
                                </MenuItem>
                                <MenuItem 
                                    onClick={onOpen}
                                    _hover={{ bg: "gray.700" }} 
                                    color="white" 
                                    bg="gray.800"
                                >
                                    View Profile
                                </MenuItem>
                                <Divider borderColor="gray.700" />
                                <MenuItem _hover={{ bg: "gray.700" }} color="white" bg="gray.800">
                                    Support
                                </MenuItem>
                                <MenuItem 
                                    _hover={{ bg: "gray.700" }} 
                                    color="white" 
                                    bg="gray.800"
                                >
                                    <SignOut 
                                        mode="link" 
                                        label="Log out" 
                                        linkProps={{
                                            color: "white",
                                            _hover: { textDecoration: "none" }
                                        }}
                                    />
                                </MenuItem>
                            </MenuList>
                        </Portal>
                    </Menu>
                </>
            ) : (
                <>
                    <Register 
                        mode="button" 
                        label="Register"
                        buttonProps={{
                            ...buttonStyles,
                            width: ["100%", "auto"]
                        }}
                        customButton={
                            <Button {...buttonStyles}>
                                <Box as="span" fontSize="xl">👤</Box>
                                Register
                            </Button>
                        }
                    />
                    <SignIn 
                        mode="button" 
                        label="Sign In"
                        buttonProps={{
                            ...buttonStyles,
                            width: ["100%", "auto"]
                        }}
                        customButton={
                            <Button {...buttonStyles}>
                                <Box as="span" fontSize="xl">👤</Box>
                                Sign In
                            </Button>
                        }
                    />
                </>
            )}
        </Flex>
    );
};

export default HeaderAuthLinks;
