import React, { useState, useEffect } from "react";
import { Grid, GridItem, Input, Text, Box, Slider, SliderTrack, SliderThumb, SliderFilledTrack } from "@chakra-ui/react";
import { useSendUnityEvent } from "../hooks/unityEvents/core/useSendUnityEvent";
import { useListenForUnityEvent } from "../hooks/unityEvents/core/useListenForUnityEvent";

const TransformVideoController = ({ gameObjectName = "TV2" }) => {
  const queueMessage = useSendUnityEvent();
  const listenToUnityMessage = useListenForUnityEvent();
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [scale, setScale] = useState({ x: 1, y: 1, z: 1 });

  useEffect(() => {
    const handleInitialTransform = (data) => {
      if (data.gameObjectName === gameObjectName) {
        setPosition({ x: data.position.x, y: data.position.y, z: data.position.z });
        setScale({ x: data.scale.x, y: data.scale.y, z: data.scale.z });
      }
    };

    const unsubscribe = listenToUnityMessage("InitialTransform", handleInitialTransform);
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [listenToUnityMessage, gameObjectName]);

  const handleInputChange = (axis, value, isPosition = true) => {
    const parsedValue = parseFloat(value) || 0;

    if (isPosition) {
      const updatedPosition = { ...position, [axis]: parsedValue };
      setPosition(updatedPosition);
      sendTransformUpdate(updatedPosition, scale);
    } else {
      const updatedScale = { ...scale, [axis]: Math.max(0.1, parsedValue) };
      setScale(updatedScale);
      sendTransformUpdate(position, updatedScale);
    }
  };

  const handleSliderChange = (axis, value, isPosition = true) => {
    if (isPosition) {
      const updatedPosition = { ...position, [axis]: value };
      setPosition(updatedPosition);
      sendTransformUpdate(updatedPosition, scale);
    } else {
      const updatedScale = { ...scale, [axis]: value };
      setScale(updatedScale);
      sendTransformUpdate(position, updatedScale);
    }
  };

  const sendTransformUpdate = (updatedPosition, updatedScale) => {
    const transformData = {
      gameObjectName,
      position: updatedPosition,
      scale: updatedScale,
    };
    queueMessage("TransformVideo", transformData);
  };

  const renderSliderWithLabel = (label, value, axis, isPosition) => (
    <>
      <GridItem colSpan={1}>
        <Text fontSize="xs" fontWeight="bold">{label.toUpperCase()}</Text>
      </GridItem>
      <GridItem colSpan={3}>
        <Slider
          value={value}
          min={isPosition ? -10 : 0.1}
          max={isPosition ? 10 : 10}
          step={isPosition ? 0.1 : 0.1}
          onChange={(val) => handleSliderChange(axis, val, isPosition)}
        >
          <SliderTrack>
            <SliderFilledTrack />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </GridItem>
      <GridItem colSpan={2}>
        <Input
          size="xs"
          type="number"
          value={value}
          onChange={(e) => handleInputChange(axis, e.target.value, isPosition)}
          width="60px"
        />
      </GridItem>
    </>
  );

  return (
    <>
      {/* Position Section */}
      <Text fontSize="sm" fontWeight="semibold" mb={2}>Position</Text>
      <Grid templateColumns="repeat(6, 1fr)" gap={2} mb={4}>
        {renderSliderWithLabel("x", position.x, "x", true)}
        {renderSliderWithLabel("y", position.y, "y", true)}
        {renderSliderWithLabel("z", position.z, "z", true)}
      </Grid>

      {/* Scale Section */}
      <Text fontSize="sm" fontWeight="semibold" mb={2}>Scale</Text>
      <Grid templateColumns="repeat(6, 1fr)" gap={2}>
        {renderSliderWithLabel("x", scale.x, "x", false)}
        {renderSliderWithLabel("y", scale.y, "y", false)}
        {renderSliderWithLabel("z", scale.z, "z", false)}
      </Grid>
    </>
  );
};

export default TransformVideoController;
