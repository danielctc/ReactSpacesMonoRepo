import React, { useEffect, useState } from "react";
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
} from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
import { FaLinkedin, FaGlobe } from 'react-icons/fa';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';

export const UnityPlayerList = ({ isVisible, onToggleVisibility }) => {
  const players = useUnityPlayerList();
  const [isReady, setIsReady] = useState(false);
  const [enrichedPlayers, setEnrichedPlayers] = useState([]);

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
                linkedinUrl: userProfile.linkedinUrl,
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
          {sortedPlayers.map((player, index) => (
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
                    {player.isLocalPlayer && (
                      <Text fontSize="xs" color="gray.300">(you)</Text>
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
                        <Link href={player.linkedinUrl} isExternal>
                          <IconButton
                            icon={<FaLinkedin />}
                            variant="ghost"
                            colorScheme="whiteAlpha"
                            size="sm"
                            aria-label="LinkedIn profile"
                            _hover={{ bg: 'whiteAlpha.200' }}
                          />
                        </Link>
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
                      </HStack>
                    </VStack>
                  </PopoverBody>
                </PopoverContent>
              </Popover>
            </Box>
          ))}
        </VStack>
      </Box>
    </Box>
  );
}

export default UnityPlayerList;