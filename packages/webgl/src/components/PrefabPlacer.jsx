import React, { useState, useEffect, useContext } from 'react';
import { Box, Button, Text, Flex, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, Switch, FormControl, FormLabel, useToast } from "@chakra-ui/react";
import { usePlacePrefab } from '../hooks/unityEvents';
import { useSpaceObjects } from '../hooks/unityEvents/useSpaceObjects';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import PropTypes from 'prop-types';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import { userBelongsToGroup } from '@disruptive-spaces/shared/firebase/userPermissions';

const PrefabPlacer = ({ settings }) => {
  const { placePrefab, directPlacePrefab, isUnityLoaded } = usePlacePrefab();
  const toast = useToast();
  const [position, setPosition] = useState({ x: 0, y: 1, z: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [scale, setScale] = useState({ x: 1, y: 1, z: 1 });
  const [prefabName, setPrefabName] = useState("TestPrefab");
  const [useDirect, setUseDirect] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDisruptiveAdmin, setIsDisruptiveAdmin] = useState(false);
  
  // Get the user from context
  const { user } = useContext(UserContext);
  
  // Get spaceID from settings
  const spaceId = settings?.spaceID;
  
  // Use the space objects hook
  const { saveObject, isLoading } = useSpaceObjects(spaceId);
  
  // Check if user is a disruptiveAdmin
  useEffect(() => {
    const checkAdmin = async () => {
      if (user?.uid) {
        try {
          const isAdmin = await userBelongsToGroup(user.uid, 'disruptiveAdmin');
          setIsDisruptiveAdmin(isAdmin);
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsDisruptiveAdmin(false);
        }
      }
    };
    
    checkAdmin();
  }, [user?.uid]);
  
  // Listen for edit mode changes
  useEffect(() => {
    const handleEditModeChange = (event) => {
      setIsEditMode(event.detail.enabled);
    };

    window.addEventListener('editModeChanged', handleEditModeChange);
    return () => {
      window.removeEventListener('editModeChanged', handleEditModeChange);
    };
  }, []);
  
  // Handle position changes
  const handlePositionChange = (axis, value) => {
    setPosition(prev => ({
      ...prev,
      [axis]: parseFloat(value)
    }));
  };
  
  // Handle rotation changes
  const handleRotationChange = (axis, value) => {
    setRotation(prev => ({
      ...prev,
      [axis]: parseFloat(value)
    }));
  };
  
  // Handle scale changes
  const handleScaleChange = (axis, value) => {
    setScale(prev => ({
      ...prev,
      [axis]: parseFloat(value)
    }));
  };
  
  // Place prefab in Unity and save to Firebase
  const handlePlacePrefab = async () => {
    Logger.log("Placing prefab with values:", { prefabName, position, rotation, scale, useDirect, spaceId });
    
    let success;
    if (useDirect) {
      // Use direct method
      success = directPlacePrefab(prefabName, position, rotation, scale);
      Logger.log("Used direct method to place prefab");
    } else {
      // Use hook method
      success = placePrefab(prefabName, position, rotation, scale);
      Logger.log("Used hook method to place prefab");
    }
    
    if (success) {
      // Save to Firebase if we have a spaceId and we're in edit mode
      if (spaceId && isEditMode) {
        const saved = await saveObject(prefabName, position, rotation, scale);
        if (saved) {
          toast({
            title: "Success",
            description: "Prefab placed and saved to space",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
        } else {
          toast({
            title: "Warning",
            description: "Prefab placed but failed to save to space",
            status: "warning",
            duration: 3000,
            isClosable: true,
          });
        }
      } else {
        toast({
          title: "Success",
          description: "Prefab placed",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
    } else {
      toast({
        title: "Error",
        description: "Failed to place prefab",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  // Use random position
  const useRandomPosition = () => {
    const randomPos = {
      x: (Math.random() * 10 - 5).toFixed(2),
      y: (Math.random() * 2).toFixed(2),
      z: (Math.random() * 10 - 5).toFixed(2)
    };
    
    setPosition({
      x: parseFloat(randomPos.x),
      y: parseFloat(randomPos.y),
      z: parseFloat(randomPos.z)
    });
    
    Logger.log("Set random position:", randomPos);
  };
  
  // Only render if in edit mode AND user is a disruptiveAdmin
  if (!isEditMode || !isDisruptiveAdmin) return null;
  
  return (
    <Box 
      className="prefab-placer"
      bg="rgba(0, 0, 0, 0.7)"
      color="white"
      p={4}
      borderRadius="md"
      maxW="300px"
      boxShadow="0 4px 6px rgba(0, 0, 0, 0.1)"
    >
      <Text fontWeight="bold" mb={2}>Place Prefab in Unity</Text>
      
      <Box mb={3}>
        <Text fontSize="sm">Prefab Name:</Text>
        <input 
          type="text" 
          value={prefabName} 
          onChange={(e) => setPrefabName(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '8px', 
            marginTop: '4px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '4px',
            color: 'white'
          }}
        />
      </Box>
      
      <Flex direction="column" gap={2} mb={3}>
        <Text fontSize="sm">Position:</Text>
        <Flex gap={2}>
          <Box>
            <Text fontSize="xs">X</Text>
            <NumberInput 
              value={position.x} 
              onChange={(value) => handlePositionChange('x', value)}
              step={0.5}
              precision={2}
              size="sm"
            >
              <NumberInputField bg="rgba(255, 255, 255, 0.1)" borderColor="rgba(255, 255, 255, 0.3)" />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </Box>
          <Box>
            <Text fontSize="xs">Y</Text>
            <NumberInput 
              value={position.y} 
              onChange={(value) => handlePositionChange('y', value)}
              step={0.5}
              precision={2}
              size="sm"
            >
              <NumberInputField bg="rgba(255, 255, 255, 0.1)" borderColor="rgba(255, 255, 255, 0.3)" />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </Box>
          <Box>
            <Text fontSize="xs">Z</Text>
            <NumberInput 
              value={position.z} 
              onChange={(value) => handlePositionChange('z', value)}
              step={0.5}
              precision={2}
              size="sm"
            >
              <NumberInputField bg="rgba(255, 255, 255, 0.1)" borderColor="rgba(255, 255, 255, 0.3)" />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </Box>
        </Flex>
        
        <Button 
          onClick={useRandomPosition} 
          size="xs" 
          colorScheme="blue" 
          variant="outline"
          mt={1}
        >
          Random Position
        </Button>
      </Flex>
      
      <FormControl display='flex' alignItems='center' mb={3}>
        <FormLabel htmlFor='use-direct' mb='0' fontSize="sm">
          Use Direct Method
        </FormLabel>
        <Switch 
          id='use-direct' 
          colorScheme="green"
          isChecked={useDirect}
          onChange={(e) => setUseDirect(e.target.checked)}
        />
      </FormControl>
      
      <Button 
        onClick={handlePlacePrefab}
        colorScheme="green"
        width="100%"
        isDisabled={!isUnityLoaded || isLoading}
      >
        {isLoading ? "Loading..." : "Place Prefab"}
      </Button>
      
      {!isUnityLoaded && (
        <Text fontSize="xs" color="red.300" mt={1}>
          Waiting for Unity to load...
        </Text>
      )}
      
      {!spaceId && (
        <Text fontSize="xs" color="yellow.300" mt={1}>
          No space ID available - prefabs won't be saved
        </Text>
      )}
    </Box>
  );
};

PrefabPlacer.propTypes = {
  settings: PropTypes.shape({
    spaceID: PropTypes.string,
  }),
};

export default PrefabPlacer;