import React from 'react';
import {
  TabPanel,
  Text,
  VStack,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Button,
  Switch,
  HStack,
  Box,
  Badge,
  Divider,
} from '@chakra-ui/react';

/**
 * Streaming Tab - Manages HLS stream settings.
 */
const StreamingTab = ({
  streamingEnabled,
  setStreamingEnabled,
  hlsStreamUrl,
  setHlsStreamUrl,
  rtmpUrl,
  setRtmpUrl,
  streamKey,
  setStreamKey,
  isSavingStream,
  playerStatus,
  isStreamLoading,
  handleSaveStreamSettings,
}) => {
  return (
    <TabPanel p={4} display="flex" flexDirection="column">
      <Text fontSize="sm" fontWeight="600" mb={3} color="white">
        Streaming Settings
      </Text>

      <VStack spacing={4} align="stretch">
        {/* Enable/Disable Toggle */}
        <FormControl display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <FormLabel mb={0} fontSize="sm" color="white">
              Enable Streaming
            </FormLabel>
            <FormHelperText fontSize="xs" mt={0}>
              {streamingEnabled ? 'Streaming is enabled for this space' : 'Streaming is disabled'}
            </FormHelperText>
          </Box>
          <HStack spacing={2}>
            {playerStatus && (
              <Badge
                colorScheme={playerStatus === 'playing' ? 'green' : playerStatus === 'error' ? 'red' : 'gray'}
                fontSize="xs"
              >
                {playerStatus}
              </Badge>
            )}
            <Switch
              colorScheme="blue"
              isChecked={streamingEnabled}
              onChange={(e) => setStreamingEnabled(e.target.checked)}
              isDisabled={isSavingStream}
            />
          </HStack>
        </FormControl>

        <Divider borderColor="whiteAlpha.200" />

        {/* HLS Stream URL */}
        <FormControl>
          <FormLabel fontSize="xs" color="white">
            HLS Stream URL
          </FormLabel>
          <Input
            value={hlsStreamUrl}
            onChange={(e) => setHlsStreamUrl(e.target.value)}
            placeholder="https://stream.example.com/live/playlist.m3u8"
            size="sm"
            bg="whiteAlpha.100"
            borderColor="whiteAlpha.200"
            _hover={{ borderColor: 'whiteAlpha.300' }}
            _focus={{ borderColor: 'blue.300', boxShadow: '0 0 0 1px #63B3ED' }}
            color="white"
            isDisabled={!streamingEnabled}
          />
          <FormHelperText fontSize="xs">The .m3u8 playlist URL for your HLS stream</FormHelperText>
        </FormControl>

        <Divider borderColor="whiteAlpha.200" />

        {/* RTMP Settings (for reference) */}
        <Box>
          <Text fontSize="xs" fontWeight="medium" color="gray.400" mb={3}>
            RTMP Details (for streaming software)
          </Text>

          <VStack spacing={3} align="stretch">
            <FormControl>
              <FormLabel fontSize="xs" color="white">
                RTMP URL
              </FormLabel>
              <Input
                value={rtmpUrl}
                onChange={(e) => setRtmpUrl(e.target.value)}
                placeholder="rtmp://live.example.com/live"
                size="sm"
                bg="whiteAlpha.100"
                borderColor="whiteAlpha.200"
                _hover={{ borderColor: 'whiteAlpha.300' }}
                _focus={{ borderColor: 'blue.300', boxShadow: '0 0 0 1px #63B3ED' }}
                color="white"
                isDisabled={!streamingEnabled}
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="xs" color="white">
                Stream Key
              </FormLabel>
              <Input
                value={streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
                placeholder="your-stream-key"
                size="sm"
                bg="whiteAlpha.100"
                borderColor="whiteAlpha.200"
                _hover={{ borderColor: 'whiteAlpha.300' }}
                _focus={{ borderColor: 'blue.300', boxShadow: '0 0 0 1px #63B3ED' }}
                color="white"
                type="password"
                isDisabled={!streamingEnabled}
              />
              <FormHelperText fontSize="xs">Keep this secret - used in OBS/streaming software</FormHelperText>
            </FormControl>
          </VStack>
        </Box>

        <Button
          colorScheme="blue"
          size="sm"
          onClick={handleSaveStreamSettings}
          isLoading={isSavingStream}
          loadingText="Saving..."
          alignSelf="flex-start"
          mt={2}
        >
          Save Stream Settings
        </Button>
      </VStack>
    </TabPanel>
  );
};

export default StreamingTab;
