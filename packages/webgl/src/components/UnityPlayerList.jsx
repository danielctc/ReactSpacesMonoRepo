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
  Link
} from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
import { FaLinkedin, FaGlobe, FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';

const UnityPlayerList = ({ isVisible, onToggleVisibility }) => {
  const players = useUnityPlayerList();
  const [isReady, setIsReady] = useState(false);
  const [enrichedPlayers, setEnrichedPlayers] = useState([]);
  const [micEnabled, setMicEnabled] = useState(false);
  const [activeMics, setActiveMics] = useState({});
  const [playerUidMap, setPlayerUidMap] = useState({});
  
  // Get the current user from the window object if available
  const currentUser = window.currentUser || {};
  
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
                  console.log(`Special case: Mapping player ${player.playerName} (${player.uid}) to the only remote user: ${nonScreenShareUsers[0].uid}`);
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
        console.log("UnityPlayerList: Updating mic state from window.agoraClient:", newMicState);
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
        console.log("UnityPlayerList: Updating active mics:", newActiveMics);
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
      console.log("UnityPlayerList: Voice toggle event received:", event.detail);
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
              return {
                ...player,
                firstName: userProfile.firstName,
                lastName: userProfile.lastName,
                linkedInProfile: userProfile.linkedInProfile,
                websiteUrl: userProfile.websiteUrl,
                rpmURL: userProfile.rpmURL ? 
                  userProfile.rpmURL.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75") 
                  : null
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
  }, [players]);

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
    
    // Then check if player UID matches current user UID
    if (currentUser && currentUser.uid && player.uid === currentUser.uid) {
      return true;
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

  return (
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
      visibility={isReady && isVisible ? "visible" : "hidden"}
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
            const hasMic = hasActiveMic(player);
            
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
                      <Spacer />
                      
                      {/* Show microphone status for all players */}
                      {hasMic ? (
                        <Box color="green.400">
                          <FaMicrophone />
                        </Box>
                      ) : (
                        <Box color="red.400">
                          <FaMicrophoneSlash />
                        </Box>
                      )}
                      
                      {isLocal && (
                        <Text fontSize="xs" color="gray.300" ml={1}>(you)</Text>
                      )}
                    </HStack>
                  </PopoverTrigger>
                  <PopoverContent 
                    bg="rgba(0,0,0,0.4)"
                    border="none" 
                    boxShadow="lg"
                    color="white"
                    p={3}
                    width="auto"
                    minWidth="200px"
                    ml="-20px"
                    position="absolute"
                    left="-220px"
                    top="-100px"
                    transform="none !important"
                  >
                    <PopoverBody>
                      <VStack align="center" spacing={2}>
                        <Avatar 
                          size="lg" 
                          src={player.rpmURL}
                          bg="whiteAlpha.400"
                          name=" "
                          borderWidth="2px"
                          borderColor="whiteAlpha.300"
                        />
                        <Text fontSize="lg" fontWeight="bold">
                          {player.playerName}
                        </Text>
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
                                size="sm"
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
                                size="sm"
                                aria-label="Personal website"
                                _hover={{ bg: 'whiteAlpha.200' }}
                              />
                            </Link>
                          )}
                          
                          {/* Show microphone status in popover */}
                          <IconButton
                            icon={hasMic ? <FaMicrophone /> : <FaMicrophoneSlash />}
                            variant="ghost"
                            colorScheme={hasMic ? "green" : "red"}
                            size="sm"
                            aria-label="Microphone status"
                            isDisabled={true}
                          />
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
  );
};

export { UnityPlayerList };
export default UnityPlayerList;