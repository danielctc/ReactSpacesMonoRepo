import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
  IconButton, 
  Menu,
  MenuButton,
  MenuList,
  VStack,
  Text,
  Box,
  HStack,
  Divider,
  Avatar,
  Portal,
  useToast,
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  Button,
  Flex,
  Spacer,
  MenuItem,
  MenuDivider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Icon,
} from "@chakra-ui/react";
import { HamburgerIcon } from "@chakra-ui/icons";
import { FaUsers, FaDesktop } from 'react-icons/fa';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';
import { useVoiceChat, ScreenShareMenuOption } from '../voice-chat';
import AgoraRTC from 'agora-rtc-sdk-ng';
import SpacesControlsModal from './SpacesControlsModal';
import SpacesSettingsModal from './SpacesSettingsModal';
import ReadyPlayerMeModal from './ReadyPlayerMeModal';
import AuthenticationButton from './AuthenticationButton'; 