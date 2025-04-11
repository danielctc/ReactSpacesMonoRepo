import React, { useEffect, useState, useRef } from "react";
import { useUnityPlayerList } from "../hooks/unityEvents/useUnityPlayerList";
import { 
  Box, 
  Text, 
  VStack, 
  HStack, 
  Spacer, 
  IconButton, 
  Avatar,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  Link,
  Icon,
  Tooltip,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useToast,
  useMediaQuery,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  useDisclosure
} from "@chakra-ui/react";
import { CloseIcon, ChevronDownIcon, SettingsIcon } from "@chakra-ui/icons";
import { FaLinkedin, FaGlobe, FaMicrophone, FaMicrophoneSlash, FaStar, FaCrown, FaEllipsisV, FaBan, FaUserPlus, FaVolumeUp, FaVolumeMute, FaUserMinus } from 'react-icons/fa';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';
import { getSpaceItem } from '@disruptive-spaces/shared/firebase/spacesFirestore';
import { userBelongsToGroup } from '@disruptive-spaces/shared/firebase/userPermissions';
import { useUnityKickPlayer } from '../hooks/unityEvents';

// Accept spaceID as a prop
const UnityPlayerList = ({ isVisible, onToggleVisibility, spaceID: propSpaceID }) => {
  // Check if the device is mobile using useMediaQuery
  const [isMobile] = useMediaQuery("(max-width: 768px)");
  
  // Check if the user agent indicates a mobile browser
  const [isMobileBrowser, setIsMobileBrowser] = useState(false);
  
  // Detect mobile browsers using user agent
  useEffect(() => {
    const checkMobileBrowser = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const result = mobileRegex.test(userAgent);
      setIsMobileBrowser(result);
      
      if (result) {
        Logger.log("UnityPlayerList: Mobile browser detected, component will not render");
      }
    };
    
    checkMobileBrowser();
  }, []);
  
  // Determine if we should hide the component based on mobile detection
  const shouldHideOnMobile = isMobile || isMobileBrowser;
  
  const players = useUnityPlayerList();
  const [isReady, setIsReady] = useState(false);
  const [enrichedPlayers, setEnrichedPlayers] = useState([]);
  const [micEnabled, setMicEnabled] = useState(false);
  const [activeMics, setActiveMics] = useState({});
  const [playerUidMap, setPlayerUidMap] = useState({});
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [isDisruptiveAdmin, setIsDisruptiveAdmin] = useState(false);
  const [voiceDisabled, setVoiceDisabled] = useState(false);
  const toast = useToast();
  const [processingKickPlayerName, setProcessingKickPlayerName] = useState(null);
  const { isOpen: isKickModalOpen, onOpen: onKickModalOpen, onClose: onKickModalClose } = useDisclosure();
  const [playerToKick, setPlayerToKick] = useState(null);
  
  // Get the current user from the window object if available
  const currentUser = window.currentUser || {};
  
  // Log current user info for debugging
  useEffect(() => {
    Logger.log("Current user info:", {
      uid: currentUser?.uid,
      groups: currentUser?.groups,
      isAdmin: currentUser?.groups?.includes('disruptiveAdmin')
    });
  }, [currentUser]);
  
  // Check if current user is a disruptiveAdmin - directly from window.currentUser first for simplicity
  useEffect(() => {
    // First check if it's available in currentUser object (faster)
    if (currentUser && currentUser.groups && currentUser.groups.includes('disruptiveAdmin')) {
      Logger.log("Current user is disruptiveAdmin (from groups)");
      setIsDisruptiveAdmin(true);
      return;
    }

    // Otherwise check using the proper API
    const checkDisruptiveAdmin = async () => {
      if (currentUser && currentUser.uid) {
        try {
          const isAdmin = await userBelongsToGroup(currentUser.uid, 'disruptiveAdmin');
          Logger.log("Current user disruptiveAdmin status:", isAdmin);
          setIsDisruptiveAdmin(isAdmin);
        } catch (error) {
          console.error("UnityPlayerList: Error checking disruptiveAdmin status:", error);
          setIsDisruptiveAdmin(false);
        }
      }
    };
    
    checkDisruptiveAdmin();
  }, [currentUser]);
  
  // Get the current space ID from various sources
  const getSpaceId = () => {
    // First check if it was passed as a prop
    if (propSpaceID) {
      return propSpaceID;
    }
    
    // Then try to get it from window.spaceID
    if (window.spaceID) {
      return window.spaceID;
    }
    
    // Then try to get it from URL
    const pathname = window.location.pathname || '';
    const parts = pathname.split('/');
    // The space ID is typically the last part of the URL
    const spaceId = parts[parts.length - 1];
    if (spaceId && spaceId.length > 5) {
      return spaceId;
    }
    
    // If all else fails, check if there's a data attribute on the body
    const bodySpaceId = document.body.getAttribute('data-space-id');
    if (bodySpaceId) {
      return bodySpaceId;
    }
    
    // Try to find it in localStorage
    const localStorageSpaceId = localStorage.getItem('currentSpaceId');
    if (localStorageSpaceId) {
      return localStorageSpaceId;
    }
    
    return 'fallback-space-id';
  };
  
  const spaceID = getSpaceId();
  
  // Check if voice is disabled for the space
  useEffect(() => {
    const checkVoiceDisabled = async () => {
      try {
        // Get space data
        const spaceData = await getSpaceItem(spaceID);
        
        if (spaceData && spaceData.voiceDisabled) {
          console.log("UnityPlayerList: Voice is disabled for this space");
          setVoiceDisabled(true);
        } else {
          setVoiceDisabled(false);
        }
      } catch (error) {
        console.error("UnityPlayerList: Error checking if voice is disabled:", error);
      }
    };
    
    checkVoiceDisabled();
    
    // Listen for voice setting changes
    const handleVoiceSettingChanged = (event) => {
      if (event.detail && typeof event.detail.voiceDisabled === 'boolean') {
        console.log("UnityPlayerList: Voice setting changed:", event.detail.voiceDisabled);
        setVoiceDisabled(event.detail.voiceDisabled);
      }
    };
    
    window.addEventListener("SpaceVoiceSettingChanged", handleVoiceSettingChanged);
    
    return () => {
      window.removeEventListener("SpaceVoiceSettingChanged", handleVoiceSettingChanged);
    };
  }, [spaceID]);
  
  // Create a mapping between player UIDs and Agora UIDs
  useEffect(() => {
    // This effect runs when players change
    const newPlayerUidMap = {};
    
    // Try to map player UIDs to Agora UIDs
    players.forEach(player => {
      if (player.uid) {
        // For local player, use the local UID from Agora
        if (player.isLocalPlayer && window.agoraClient && window.agoraClient.client) {
          newPlayerUidMap[player.uid] = window.agoraClient.client.uid;
        } 
        // For remote players, try to find a matching UID in Agora remote users
        else if (window.agoraClient && window.agoraClient.client && window.agoraClient.client.remoteUsers) {
          const remoteUsers = window.agoraClient.client.remoteUsers;
          
          // Try to find a direct match
          const directMatch = remoteUsers.find(u => String(u.uid) === String(player.uid));
          if (directMatch) {
            newPlayerUidMap[player.uid] = directMatch.uid;
          } 
          // Try to find a match where the Agora UID contains the player UID
          else {
            const partialMatch = remoteUsers.find(u => 
              typeof u.uid === 'string' && u.uid.includes(player.uid)
            );
            if (partialMatch) {
              newPlayerUidMap[player.uid] = partialMatch.uid;
            }
            // If no match found, try the reverse - check if player UID contains Agora UID
            else {
              const reverseMatch = remoteUsers.find(u => 
                typeof player.uid === 'string' && player.uid.includes(String(u.uid))
              );
              if (reverseMatch) {
                newPlayerUidMap[player.uid] = reverseMatch.uid;
              }
              // Special case: if there's only one remote user (excluding screen shares), map it to this player
              else {
                const nonScreenShareUsers = remoteUsers.filter(u => 
                  !(typeof u.uid === 'string' && u.uid.startsWith('screen-'))
                );
                
                if (nonScreenShareUsers.length === 1 && !player.isLocalPlayer) {
                  newPlayerUidMap[player.uid] = nonScreenShareUsers[0].uid;
                }
              }
            }
          }
        }
      }
    });
    
    setPlayerUidMap(newPlayerUidMap);
  }, [players]);
  
  // Update the checkMicStatus function to properly check the microphone state
  const checkMicStatus = () => {
    // Try to access the mic status from the window object
    if (window.agoraClient && typeof window.agoraClient.isVoiceEnabled === 'boolean') {
      const newMicState = window.agoraClient.isVoiceEnabled;
      if (newMicState !== micEnabled) {
        setMicEnabled(newMicState);
      }
    }
    
    // Check for remote users with active mics - simplified approach
    if (window.agoraClient && window.agoraClient.client && window.agoraClient.client.remoteUsers) {
      const remoteUsers = window.agoraClient.client.remoteUsers;
      const newActiveMics = {};
      
      remoteUsers.forEach(user => {
        // Skip screen share users
        if (typeof user.uid === 'string' && user.uid.startsWith('screen-')) {
          return;
        }
        
        // Store the mic status based on audioTrack
        newActiveMics[user.uid] = !!user.audioTrack && !user.audioTrack.muted;
      });
      
      // Only update if there are changes
      if (JSON.stringify(newActiveMics) !== JSON.stringify(activeMics)) {
        setActiveMics(newActiveMics);
      }
    }
  };
  
  // Add an effect to listen for VoiceToggled events
  useEffect(() => {
    // Set up interval to check mic status
    const intervalId = setInterval(checkMicStatus, 500);
    
    // Listen for voice toggle events
    const handleVoiceToggle = (event) => {
      if (event.detail && typeof event.detail.enabled === 'boolean') {
        setMicEnabled(event.detail.enabled);
      }
    };
    
    window.addEventListener("VoiceToggled", handleVoiceToggle);
    
    // Check initially
    checkMicStatus();
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("VoiceToggled", handleVoiceToggle);
    };
  }, []);
  
  useEffect(() => {
    const handlePlayerInstantiated = () => {
      Logger.log("UnityPlayerList: Player instantiated, showing list");
      setIsReady(true);
    };

    window.addEventListener("PlayerInstantiated", handlePlayerInstantiated);
    
    if (window.isPlayerInstantiated) {
      Logger.log("UnityPlayerList: Player was already instantiated");
      setIsReady(true);
    }

    return () => {
      window.removeEventListener("PlayerInstantiated", handlePlayerInstantiated);
    };
  }, []);

  // Enrich player data with Firebase info
  useEffect(() => {
    const enrichPlayerData = async () => {
      const enriched = await Promise.all(
        players.map(async (player) => {
          if (player.uid) {
            try {
              const userProfile = await getUserProfileData(player.uid);
              
              // Check if user is an owner or host based on their groups
              let role = null;
              if (userProfile.groups) {
                const ownerGroupId = `space_${spaceID}_owners`;
                const hostGroupId = `space_${spaceID}_hosts`;
                
                if (userProfile.groups.includes(ownerGroupId)) {
                  role = 'owner';
                } else if (userProfile.groups.includes(hostGroupId)) {
                  role = 'host';
                }
              }
              
              // If this is the current user, set their role
              if (isLocalUser({ uid: player.uid })) {
                setCurrentUserRole(role);
              }
              
              return {
                ...player,
                firstName: userProfile.firstName,
                lastName: userProfile.lastName,
                linkedInProfile: userProfile.linkedInProfile,
                websiteUrl: userProfile.websiteUrl,
                rpmURL: userProfile.rpmURL ? 
                  userProfile.rpmURL.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75") 
                  : null,
                role: role
              };
            } catch (error) {
              Logger.error(`Error fetching data for player ${player.playerName}:`, error);
              return player;
            }
          }
          return player;
        })
      );
      setEnrichedPlayers(enriched);
    };

    enrichPlayerData();
  }, [players, spaceID]);

  // Sort players to put local player first
  const sortedPlayers = [...enrichedPlayers].sort((a, b) => {
    if (a.isLocalPlayer) return -1;
    if (b.isLocalPlayer) return 1;
    return 0;
  });

  // Handle visibility toggle
  const handleToggleVisibility = () => {
    Logger.log("UnityPlayerList: Toggling visibility");
    if (onToggleVisibility) {
      onToggleVisibility();
    }
  };
  
  // Check if a player is the local user based on UID
  const isLocalUser = (player) => {
    // First check if player is marked as local player
    if (player.isLocalPlayer) {
      return true;
    }
    
    // Then check if player UID matches current user UID or ID
    if (currentUser) {
      // Check both uid and id fields
      if ((currentUser.uid && player.uid === currentUser.uid) || 
          (currentUser.uid && player.id === currentUser.uid)) {
        return true;
      }
    }
    
    return false;
  };
  
  // Update the hasActiveMic function to properly check the microphone state
  const hasActiveMic = (player) => {
    try {
      // For local player, use the window.agoraClient state
      if (isLocalUser(player)) {
        // First check window.agoraClient
        if (window.agoraClient && typeof window.agoraClient.isVoiceEnabled === 'boolean') {
          return window.agoraClient.isVoiceEnabled;
        }
        // Fall back to local state
        return micEnabled;
      }
      
      // For remote players, check the activeMics object
      if (player.uid) {
        // Check direct match
        if (activeMics[player.uid]) {
          return true;
        }
        
        // Check using the mapped Agora UID
        const agoraUid = playerUidMap[player.uid];
        if (agoraUid && activeMics[agoraUid]) {
          return true;
        }
        
        // Check numeric UID
        const numericUid = parseInt(player.uid);
        if (!isNaN(numericUid) && activeMics[numericUid]) {
          return true;
        }
      }
      
      return false;
    } catch (e) {
      console.error("Error in hasActiveMic:", e);
      return false;
    }
  };

  // Render role badge for the popout with a unique key
  const RoleBadge = ({ player }) => {
    const role = player.role;
    
    if (role === 'owner') {
      return (
        <HStack 
          spacing={1} 
          bg="green.900" 
          p={2} 
          borderRadius="md" 
          px={3}
          boxShadow="0 0 10px rgba(72, 187, 120, 0.5)"
          border="1px solid"
          borderColor="green.400"
        >
          <Icon as={FaCrown} color="green.400" boxSize={5} />
          <Badge colorScheme="green" variant="solid" fontSize="md" px={2}>
            Owner
          </Badge>
        </HStack>
      );
    } else if (role === 'host') {
      return (
        <HStack 
          spacing={1} 
          bg="purple.900" 
          p={2} 
          borderRadius="md" 
          px={3}
          boxShadow="0 0 10px rgba(159, 122, 234, 0.5)"
          border="1px solid"
          borderColor="purple.400"
        >
          <Icon as={FaStar} color="purple.400" boxSize={5} />
          <Badge colorScheme="purple" variant="solid" fontSize="md" px={2}>
            Host
          </Badge>
        </HStack>
      );
    }
    
    return null;
  };

  // Add the useUnityKickPlayer hook without passing navigate
  const { kickPlayer, isKicking, kickResult, error: kickError, resetKickState } = useUnityKickPlayer();
  
  // Watch for changes in kick results
  useEffect(() => {
    if (kickResult?.success && processingKickPlayerName) {
      toast({
        title: "Remove Successful",
        description: `${processingKickPlayerName} has been removed from the space.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      setProcessingKickPlayerName(null);
      resetKickState();
    }
  }, [kickResult, processingKickPlayerName, toast, resetKickState]);
  
  // Watch for kick errors (network errors, etc.)
  useEffect(() => {
    if (kickError) {
      toast({
        title: "Error Removing Player",
        description: kickError,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setProcessingKickPlayerName(null);
      resetKickState();
    }
  }, [kickError, toast, resetKickState]);

  // Function to handle the actual kick after confirmation
  const confirmKick = () => {
    if (playerToKick) {
      setProcessingKickPlayerName(playerToKick.playerName);
      kickPlayer(playerToKick.uid, currentUser?.uid);
      
      // Show processing state toast immediately
      toast({
        title: "Processing",
        description: `Removing ${playerToKick.playerName}...`,
        status: "info",
        duration: 2000,
        isClosable: true,
      });
      
      setPlayerToKick(null);
      onKickModalClose();
    }
  };

  // Update the handlePlayerAction function to open the modal
  const handlePlayerAction = (action, player) => {
    console.log(`Action "${action}" triggered for player: ${player.playerName}`);
    
    // Get the local player to check permissions
    const localPlayer = sortedPlayers.find(p => p.isLocalPlayer);
    const isLocalPlayerOwner = localPlayer?.role === 'owner';
    
    // Security check - only allow actions if the local user is an owner
    if (!isLocalPlayerOwner) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to perform this action.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      console.error("Permission denied: User attempted to perform action without proper permissions");
      return;
    }
    
    // Set the player to kick and open the modal for 'remove' action
    switch(action) {
      case 'remove':
        setPlayerToKick(player);
        onKickModalOpen();
        break;
      
      default:
        console.log(`Unhandled action: ${action}`);
        break;
    }
  };

  return (
    <>
      <Box 
        position="absolute" 
        top="100px" 
        right="20px" 
        zIndex="1"
        bg="rgba(0,0,0,0.4)" 
        p={4} 
        borderRadius="md"
        color="white"
        minWidth="200px"
        maxHeight="300px"
        visibility={(isReady && isVisible && !shouldHideOnMobile) ? "visible" : "hidden"}
        role="group"
      >
        <Box
          position="absolute"
          top={2}
          right={2}
          opacity={0}
          _groupHover={{ opacity: 1 }}
          transition="opacity 0.2s"
        >
          <IconButton
            icon={<CloseIcon boxSize={3} />}
            size="xs"
            aria-label="Close list"
            variant="unstyled"
            color="white"
            onClick={handleToggleVisibility}
            _hover={{ opacity: 0.8 }}
          />
        </Box>

        <Text fontWeight="bold" mb={2} fontSize="sm">
          People Online: {players.length}
        </Text>
        
        <Box maxHeight="200px" overflowY="auto" css={{
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(0,0,0,0.1)',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255,255,255,0.3)',
            borderRadius: '2px',
          },
        }}>
          <VStack align="stretch" spacing={1} width="100%">
            {sortedPlayers.map((player, index) => {
              const isLocal = isLocalUser(player);
              const hasMic = !voiceDisabled && hasActiveMic(player);
              
              // Get player identifiers
              const playerID = player.uid || player.id;
              
              // Find the local player in sortedPlayers for reference
              const localPlayer = sortedPlayers.find(p => p.isLocalPlayer);
              const localPlayerID = localPlayer?.uid || localPlayer?.id;
              
              // Check if player is owner
              const isPlayerOwner = player.role === 'owner';
              
              // Check if current user (local player) is an owner
              const isLocalPlayerOwner = localPlayer?.role === 'owner';
              
              // UPDATED LOGIC:
              // 1. Only owners can see ellipses
              // 2. Owners don't see ellipses next to themselves
              // 3. Owners don't see ellipses next to other owners
              
              // Show ellipses ONLY if:
              // - You are an owner, AND
              // - The player is not you, AND
              // - The player is not an owner
              const showEllipsis = isLocalPlayerOwner && !isLocal && !isPlayerOwner;
              
              return (
                <Box key={index}>
                  <Popover placement="left" trigger="hover">
                    <PopoverTrigger>
                      <HStack 
                        width="100%" 
                        spacing={2}
                        p={1}
                        borderRadius="md"
                        _hover={{ bg: "whiteAlpha.200" }}
                        transition="background 0.2s"
                      >
                        <Avatar 
                          size="xs" 
                          src={player.rpmURL}
                          bg="whiteAlpha.400"
                          name=" "
                          borderWidth="1px"
                          borderColor="whiteAlpha.300"
                        />
                        <Text fontSize="xs">{player.playerName}</Text>
                        
                        {/* Show role indicator in the main list */}
                        {player.role === 'owner' && (
                          <Icon as={FaCrown} color="green.400" boxSize={2.5} />
                        )}
                        {player.role === 'host' && (
                          <Icon as={FaStar} color="purple.400" boxSize={2.5} />
                        )}
                        
                        <Spacer />
                        
                        {/* Show microphone status for all players if voice is not disabled */}
                        {!voiceDisabled && (
                          hasMic ? (
                            <Box color="green.400">
                              <FaMicrophone />
                            </Box>
                          ) : (
                            <Box color="red.400">
                              <FaMicrophoneSlash />
                            </Box>
                          )
                        )}
                        
                        {/* Show (you) for local user or ellipsis for players based on permissions */}
                        {isLocal ? (
                          <Text fontSize="xs" color="gray.300" ml={1}>(you)</Text>
                        ) : showEllipsis ? (
                          <Menu>
                            <MenuButton
                              as={IconButton}
                              aria-label="Options"
                              icon={<FaEllipsisV />}
                              variant="ghost"
                              size="xs"
                              color="gray.300"
                              ml={1}
                              minW="16px"
                              h="16px"
                              p={0}
                            />
                            <MenuList 
                              bg="rgba(0,0,0,0.8)" 
                              borderColor="whiteAlpha.300"
                              minW="120px"
                              zIndex={10001}
                            >
                              <MenuItem 
                                icon={<FaUserMinus />} 
                                onClick={() => handlePlayerAction('remove', player)}
                                bg="black"
                                color="white"
                                _hover={{ bg: "gray.800" }}
                                fontSize="sm"
                              >
                                Remove
                              </MenuItem>
                            </MenuList>
                          </Menu>
                        ) : null}
                      </HStack>
                    </PopoverTrigger>
                    <PopoverContent 
                      bg="rgba(0,0,0,0.8)" 
                      border="none" 
                      boxShadow="dark-lg"
                      color="white"
                      p={4}
                      width="auto"
                      minWidth="250px"
                      ml="-20px"
                      position="absolute"
                      left="-250px"
                      top="-100px"
                      transform="none !important"
                      zIndex={10000}
                    >
                      <PopoverBody>
                        <VStack align="center" spacing={3}>
                          <Avatar 
                            size="xl" 
                            src={player.rpmURL}
                            bg="whiteAlpha.400"
                            name=" "
                            borderWidth="2px"
                            borderColor="whiteAlpha.300"
                          />
                          <Text fontSize="xl" fontWeight="bold">
                            {player.playerName}
                          </Text>
                          
                          {/* Display role badge */}
                          <RoleBadge player={player} />
                          
                          {player.firstName && (
                            <Text fontSize="sm" color="gray.300">
                              {player.firstName} {player.lastName}
                            </Text>
                          )}
                          <HStack spacing={4} pt={2}>
                            {player.linkedInProfile && (
                              <Link href={player.linkedInProfile} isExternal>
                                <IconButton
                                  icon={<FaLinkedin />}
                                  variant="ghost"
                                  colorScheme="whiteAlpha"
                                  size="md"
                                  aria-label="LinkedIn profile"
                                  _hover={{ bg: 'whiteAlpha.200' }}
                                />
                              </Link>
                            )}
                            {player.websiteUrl && (
                              <Link href={player.websiteUrl} isExternal>
                                <IconButton
                                  icon={<FaGlobe />}
                                  variant="ghost"
                                  colorScheme="whiteAlpha"
                                  size="md"
                                  aria-label="Personal website"
                                  _hover={{ bg: 'whiteAlpha.200' }}
                                />
                              </Link>
                            )}
                            
                            {/* Show microphone status in popover if voice is not disabled */}
                            {!voiceDisabled && (
                              <IconButton
                                icon={hasMic ? <FaMicrophone /> : <FaMicrophoneSlash />}
                                variant="ghost"
                                colorScheme={hasMic ? "green" : "red"}
                                size="md"
                                aria-label="Microphone status"
                                isDisabled={true}
                              />
                            )}
                            
                            {/* Show voice disabled icon if voice is disabled */}
                            {voiceDisabled && (
                              <IconButton
                                icon={<FaVolumeMute />}
                                variant="ghost"
                                colorScheme="red"
                                size="md"
                                aria-label="Voice chat disabled"
                                isDisabled={true}
                                title="Voice chat is disabled for this space"
                              />
                            )}
                          </HStack>
                        </VStack>
                      </PopoverBody>
                    </PopoverContent>
                  </Popover>
                </Box>
              );
            })}
          </VStack>
        </Box>
      </Box>

      {/* Kick Confirmation Modal */}
      <Modal isOpen={isKickModalOpen} onClose={onKickModalClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="gray.800" color="white">
          <ModalHeader>Confirm Removal</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Remove {playerToKick?.playerName} from the room?</Text>
          </ModalBody>
          <ModalFooter>
            <Button 
              colorScheme="red" 
              onClick={confirmKick} 
              isLoading={isKicking} 
              mr={3}
            >
              Remove
            </Button>
            <Button 
              bg="white"
              color="gray.800"
              onClick={onKickModalClose} 
              _hover={{ bg: "gray.200" }}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export { UnityPlayerList };
export default UnityPlayerList;