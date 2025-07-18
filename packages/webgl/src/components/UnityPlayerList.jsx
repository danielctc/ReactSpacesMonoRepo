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
import { CloseIcon } from "@chakra-ui/icons";
import {
  FaLinkedin,
  FaGlobe,
  FaMicrophone,
  FaMicrophoneSlash,
  FaStar,
  FaCrown,
  FaEllipsisV,
  FaBan,
  FaUserMinus,
  FaVolumeMute
} from "react-icons/fa";
import { Logger } from "@disruptive-spaces/shared/logging/react-log";
import { getUserProfileData } from "@disruptive-spaces/shared/firebase/userFirestore";
import { getSpaceItem, addBannedUserToSpace } from "@disruptive-spaces/shared/firebase/spacesFirestore";
import { userBelongsToGroup } from "@disruptive-spaces/shared/firebase/userPermissions";
import { useUnityKickPlayer } from "../hooks/unityEvents";

// Accept spaceID as a prop
const UnityPlayerList = ({ isVisible, onToggleVisibility, spaceID: propSpaceID }) => {
  // Device checks
  const [isMobile] = useMediaQuery("(max-width: 768px)");
  const [isMobileBrowser, setIsMobileBrowser] = useState(false);
  useEffect(() => {
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    setIsMobileBrowser(mobileRegex.test(navigator.userAgent || ""));
  }, []);
  const shouldHideOnMobile = isMobile || isMobileBrowser;

  // Unity player list
  const players = useUnityPlayerList();

  // Local state
  const [isReady, setIsReady] = useState(false);
  const [enrichedPlayers, setEnrichedPlayers] = useState([]);
  const [micEnabled, setMicEnabled] = useState(false);
  const [activeMics, setActiveMics] = useState({});
  const [playerUidMap, setPlayerUidMap] = useState({});
  const [voiceDisabled, setVoiceDisabled] = useState(false);
  const toast = useToast();

  // Kick / ban state
  const [processingKickPlayerName, setProcessingKickPlayerName] = useState(null);
  const [playerToKick, setPlayerToKick] = useState(null);
  const { isOpen: isKickModalOpen, onOpen: onKickModalOpen, onClose: onKickModalClose } = useDisclosure();
  const [playerToBan, setPlayerToBan] = useState(null);
  const { isOpen: isBanModalOpen, onOpen: onBanModalOpen, onClose: onBanModalClose } = useDisclosure();
  const [processingBanPlayerName, setProcessingBanPlayerName] = useState(null);

  // Current user
  const currentUser = window.currentUser || {};

  // Space ID helper
  const getSpaceId = () => propSpaceID || window.spaceID || (window.location.pathname.split("/").pop() || "fallback-space-id");
  const spaceID = getSpaceId();

  // Voice disabled check
  useEffect(() => {
    getSpaceItem(spaceID).then((space) => setVoiceDisabled(!!space?.voiceDisabled));
  }, [spaceID]);

  // Unity ready listener
  useEffect(() => {
    const handlePlayerInstantiated = () => setIsReady(true);
    window.addEventListener("PlayerInstantiated", handlePlayerInstantiated);
    if (window.isPlayerInstantiated) setIsReady(true);
    return () => window.removeEventListener("PlayerInstantiated", handlePlayerInstantiated);
  }, []);

  // Map player UID -> Agora UID helper (simplified)
  useEffect(() => {
    const map = {};
    players.forEach((p) => {
      if (p.uid && window.agoraClient?.client) {
        map[p.uid] = p.isLocalPlayer ? window.agoraClient.client.uid : p.uid;
      }
    });
    setPlayerUidMap(map);
  }, [players]);

  // Mic status polling (local & remote)
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.agoraClient) {
        setMicEnabled(!!window.agoraClient.isVoiceEnabled);
        const remote = {};
        window.agoraClient.client?.remoteUsers.forEach((u) => {
          remote[u.uid] = !!u.audioTrack && !u.audioTrack.muted;
        });
        setActiveMics(remote);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Enrich players with Firebase profile & role
  useEffect(() => {
    const enrich = async () => {
      const enriched = await Promise.all(
        players.map(async (p) => {
          if (!p.uid) return p;
          try {
            const profile = await getUserProfileData(p.uid);
            const ownerGroup = `space_${spaceID}_owners`;
            const hostGroup = `space_${spaceID}_hosts`;
            const role = profile.groups?.includes(ownerGroup) ? "owner" : profile.groups?.includes(hostGroup) ? "host" : null;

            // convert .glb avatar URL to .png thumbnail for images
            const avatarUrl = profile.rpmURL ? profile.rpmURL.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75") : undefined;

            return { ...p, ...profile, rpmURL: avatarUrl, role };
          } catch {
            return p;
          }
        })
      );
      setEnrichedPlayers(enriched);
    };
    enrich();
  }, [players, spaceID]);

  // Kick / ban hook
  const { kickPlayer, isKicking, kickResult, error: kickError, resetKickState } = useUnityKickPlayer();

  // Toast handlers for kick / ban result
  useEffect(() => {
    if (kickResult?.success && (processingKickPlayerName || processingBanPlayerName)) {
      if (processingKickPlayerName) {
        toast({ title: "Remove Successful", description: `${processingKickPlayerName} has been removed.`, status: "success", duration: 3000, isClosable: true });
        setProcessingKickPlayerName(null);
      }
      if (processingBanPlayerName) {
        toast({ title: "Ban Successful", description: `${processingBanPlayerName} has been banned.`, status: "success", duration: 3000, isClosable: true });
        setProcessingBanPlayerName(null);
      }
      resetKickState();
    }
    if (kickError) {
      toast({ title: "Error", description: kickError, status: "error", duration: 3000, isClosable: true });
      setProcessingKickPlayerName(null);
      setProcessingBanPlayerName(null);
      resetKickState();
    }
  }, [kickResult, kickError, processingKickPlayerName, processingBanPlayerName, toast, resetKickState]);

  // Utility helpers
  const isLocalUser = (p) => p.isLocalPlayer || p.uid === currentUser.uid;
  const hasActiveMic = (p) => (isLocalUser(p) ? micEnabled : activeMics[playerUidMap[p.uid]]);

  // Simple role badge component
  const RoleBadge = ({ role }) => {
    if (role === 'owner') return <Icon as={FaCrown} color="green.400" boxSize={3} ml={1} />;
    if (role === 'host') return <Icon as={FaStar} color="purple.400" boxSize={3} ml={1} />;
    return null;
  };

  // Full role badge component
  const FullRoleBadge = ({ role }) => {
    if (role === 'owner') {
      return (
        <HStack spacing={1} bg="green.800" px={3} py={1} borderRadius="md">
          <Icon as={FaCrown} color="green.300" />
          <Badge colorScheme="green" variant="solid">Owner</Badge>
        </HStack>
      );
    }
    if (role === 'host') {
      return (
        <HStack spacing={1} bg="purple.800" px={3} py={1} borderRadius="md">
          <Icon as={FaStar} color="purple.300" />
          <Badge colorScheme="purple" variant="solid">Host</Badge>
        </HStack>
      );
    }
    return null;
  };

  // Confirm kick / ban actions
  const confirmKick = () => {
    if (!playerToKick) return;
    setProcessingKickPlayerName(playerToKick.playerName);
    kickPlayer(playerToKick.uid, currentUser.uid);
    onKickModalClose();
  };
  const confirmBan = async () => {
    if (!playerToBan) return;
    setProcessingBanPlayerName(playerToBan.playerName);
    await addBannedUserToSpace(spaceID, { uid: playerToBan.uid, playerName: playerToBan.playerName, bannedAt: new Date().toISOString(), ...(currentUser.uid && { bannedBy: currentUser.uid }) });
    kickPlayer(playerToBan.uid, currentUser.uid);
    onBanModalClose();
  };

  // Player action handler
  const handlePlayerAction = (action, p) => {
    const localOwner = enrichedPlayers.find((pl) => pl.isLocalPlayer)?.role === "owner";
    if (!localOwner) return toast({ title: "Permission Denied", status: "error", duration: 3000, isClosable: true });
    if (action === "remove") {
      setPlayerToKick(p);
      onKickModalOpen();
    } else if (action === "ban") {
      setPlayerToBan(p);
      onBanModalOpen();
    }
  };

  // Render
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
        visibility={isReady && isVisible && !shouldHideOnMobile ? "visible" : "hidden"}
        role="group"
      >
        {/* Close button */}
        <Box position="absolute" top={2} right={2} opacity={0} _groupHover={{ opacity: 1 }} transition="opacity 0.2s">
          <IconButton icon={<CloseIcon boxSize={3} />} size="xs" aria-label="Close list" variant="unstyled" color="white" onClick={onToggleVisibility} />
        </Box>

        <Text fontWeight="bold" mb={2} fontSize="sm">
          People Online: {players.length}
        </Text>

        {/* Player list */}
        <Box maxHeight="200px" overflowY="auto" css={{ "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,0.3)", borderRadius: "2px" } }}>
          <VStack align="stretch" spacing={1} width="100%">
            {enrichedPlayers
              .sort((a, b) => (a.isLocalPlayer ? -1 : b.isLocalPlayer ? 1 : 0))
              .map((player, idx) => {
                const isLocal = isLocalUser(player);
                const showEllipsis = enrichedPlayers.find((pl) => pl.isLocalPlayer)?.role === "owner" && !isLocal && player.role !== "owner";
                const hasMic = !voiceDisabled && hasActiveMic(player);
                return (
                  <Box key={idx}>
                    <Popover placement="left" trigger="hover">
                      <PopoverTrigger>
                        <HStack p={1} borderRadius="md" _hover={{ bg: "whiteAlpha.200" }}>
                          <Avatar size="xs" bg="whiteAlpha.400" src={player.rpmURL} name=" " borderWidth="1px" borderColor="whiteAlpha.300" />
                          <Text fontSize="xs">{player.playerName}</Text>
                          <RoleBadge role={player.role} />
                          <Spacer />
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
                                <MenuItem
                                  icon={<FaBan />}
                                  onClick={() => handlePlayerAction('ban', player)}
                                  bg="black"
                                  color="white"
                                  _hover={{ bg: "gray.800" }}
                                  fontSize="sm"
                                >
                                  Ban
                                </MenuItem>
                              </MenuList>
                            </Menu>
                          ) : null}
                        </HStack>
                      </PopoverTrigger>
                      <PopoverContent bg="rgba(0,0,0,0.85)" color="white" border="none" p={4} minW="220px">
                        <PopoverBody>
                          <VStack align="center" spacing={3}>
                            <Avatar size="lg" src={player.rpmURL} />
                            <Text fontWeight="bold">{player.playerName}</Text>
                            <FullRoleBadge role={player.role} />
                            {player.firstName && (
                              <Text fontSize="sm" color="gray.300">{player.firstName} {player.lastName}</Text>
                            )}
                            <HStack spacing={4} pt={2}>
                              {player.linkedInProfile && (
                                <Link href={player.linkedInProfile} isExternal>
                                  <Icon as={FaLinkedin} />
                                </Link>
                              )}
                              {player.websiteUrl && (
                                <Link href={player.websiteUrl} isExternal>
                                  <Icon as={FaGlobe} />
                                </Link>
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

      {/* Ban Confirmation Modal */}
      <Modal isOpen={isBanModalOpen} onClose={onBanModalClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="gray.800" color="white">
          <ModalHeader>Confirm Ban</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Ban {playerToBan?.playerName} from the room? They will not be able to re-enter.</Text>
          </ModalBody>
          <ModalFooter>
            <Button 
              colorScheme="red" 
              onClick={confirmBan} 
              isLoading={isKicking} /* reuses kick loading state */
              mr={3}
            >
              Ban
            </Button>
            <Button 
              bg="white"
              color="gray.800"
              onClick={onBanModalClose} 
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