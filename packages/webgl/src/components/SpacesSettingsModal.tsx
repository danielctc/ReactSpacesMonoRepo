import React, { useState, useEffect } from 'react';
import { useSendUnityEvent } from '../hooks/unityEvents/core/useSendUnityEvent';

interface VoiceChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  containerRef: React.RefObject<HTMLElement>;
}

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: string;
}

// Voice Chat Settings Modal Component
const VoiceChatSettingsModal: React.FC<VoiceChatSettingsModalProps> = ({ isOpen, onClose, containerRef }) => {
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState('');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [microphoneVolume, setMicrophoneVolume] = useState(100);
  const [speakerVolume, setSpeakerVolume] = useState(100);
  const [isEchoEnabled, setIsEchoEnabled] = useState(true);
  const [isNoiseSuppressionEnabled, setIsNoiseSuppressionEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Fetch available audio devices using navigator.mediaDevices
  useEffect(() => {
    if (!isOpen) return;

    const getDevices = async () => {
      try {
        // Get permission to access media devices
        await navigator.mediaDevices.getUserMedia({ audio: true });

        // Get list of audio input devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter(d => d.kind === 'audioinput');
        setAudioDevices(mics.map(d => ({
          deviceId: d.deviceId,
          label: d.label,
          kind: d.kind
        })));

        // Set the first device as selected if available
        if (mics.length > 0) {
          setSelectedMicrophoneId(mics[0].deviceId);
        }
      } catch (error) {
        console.error('Error getting audio devices:', error);
      }
    };

    getDevices();
  }, [isOpen]);

  // Real-time audio level monitoring
  useEffect(() => {
    if (!isOpen || !micEnabled) {
      setVolumeLevel(0);
      return;
    }

    let animationFrame: number;

    const setupAudioAnalysis = async () => {
      try {
        // Get media stream
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: selectedMicrophoneId ? { exact: selectedMicrophoneId } : undefined
          }
        });
        setMediaStream(stream);

        // Create audio context and analyser
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyserNode = context.createAnalyser();
        const source = context.createMediaStreamSource(stream);

        analyserNode.fftSize = 256;
        analyserNode.smoothingTimeConstant = 0.8;
        source.connect(analyserNode);

        setAudioContext(context);
        setAnalyser(analyserNode);

        // Start monitoring audio levels
        const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

        const updateLevel = () => {
          analyserNode.getByteFrequencyData(dataArray);

          // Calculate RMS (Root Mean Square) for better sensitivity
          const rms = Math.sqrt(dataArray.reduce((sum, value) => sum + value * value, 0) / dataArray.length);

          // Amplify the signal and apply microphone volume multiplier
          const amplified = Math.min(rms * 3, 255); // 3x amplification
          const normalizedLevel = (amplified / 255) * 100 * (microphoneVolume / 100);

          setVolumeLevel(Math.min(normalizedLevel, 100));

          if (micEnabled && isOpen) {
            animationFrame = requestAnimationFrame(updateLevel);
          }
        };

        updateLevel();

      } catch (error) {
        console.error('Error setting up audio analysis:', error);
        setVolumeLevel(0);
      }
    };

    setupAudioAnalysis();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
      }
      if (audioContext) {
        audioContext.close();
        setAudioContext(null);
      }
      setAnalyser(null);
      setVolumeLevel(0);
    };
  }, [micEnabled, isOpen, selectedMicrophoneId, microphoneVolume]);

  // Handle microphone device change
  const handleMicrophoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;
    setSelectedMicrophoneId(deviceId);
  };

  // Handle microphone volume change
  const handleMicrophoneVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMicrophoneVolume(Number(e.target.value));
  };

  // Handle speaker volume change
  const handleSpeakerVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSpeakerVolume(Number(e.target.value));
  };

  // Toggle microphone
  const toggleMicrophone = () => {
    setMicEnabled(!micEnabled);
  };

  if (!isOpen) return null;

  return (
    <dialog open className="modal" onClick={onClose}>
      <div className="modal-box bg-base-300/95 backdrop-blur-md border border-base-content/10" onClick={(e) => e.stopPropagation()}>
        <button className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3" onClick={onClose}>✕</button>
        <h3 className="font-semibold text-base mb-4">Voice Chat Settings</h3>

        <div className="space-y-4">
          {/* Microphone selection */}
          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm font-medium">
                Microphone
                <span className={`badge ml-2 ${micEnabled ? 'badge-success' : 'badge-error'}`}>
                  {micEnabled ? "Enabled" : "Muted"}
                </span>
              </span>
            </label>
            <select
              className="select select-bordered select-sm"
              value={selectedMicrophoneId}
              onChange={handleMicrophoneChange}
            >
              {audioDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
                </option>
              ))}
              {audioDevices.length === 0 && (
                <option value="">No microphones found</option>
              )}
            </select>
          </div>

          {/* Microphone volume level indicator */}
          <div>
            <p className="text-sm font-medium mb-2">Microphone Level</p>
            <progress
              className="progress progress-success"
              value={volumeLevel}
              max="100"
            ></progress>
          </div>

          {/* Microphone volume control */}
          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm font-medium">Microphone Volume: {microphoneVolume}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={microphoneVolume}
              className="range range-sm"
              onChange={handleMicrophoneVolumeChange}
            />
          </div>

          {/* Speaker volume control */}
          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm font-medium">Speaker Volume: {speakerVolume}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={speakerVolume}
              className="range range-sm"
              onChange={handleSpeakerVolumeChange}
            />
          </div>

          {/* Mute/Unmute toggle */}
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-4">
              <span className="label-text text-sm font-medium">Microphone Enabled</span>
              <input
                type="checkbox"
                className="toggle"
                checked={micEnabled}
                onChange={toggleMicrophone}
              />
            </label>
          </div>

          {/* Echo cancellation toggle */}
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-4">
              <span className="label-text text-sm font-medium">Echo Cancellation</span>
              <input
                type="checkbox"
                className="toggle"
                checked={isEchoEnabled}
                onChange={() => setIsEchoEnabled(!isEchoEnabled)}
              />
            </label>
          </div>

          {/* Noise suppression toggle */}
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-4">
              <span className="label-text text-sm font-medium">Noise Suppression</span>
              <input
                type="checkbox"
                className="toggle"
                checked={isNoiseSuppressionEnabled}
                onChange={() => setIsNoiseSuppressionEnabled(!isNoiseSuppressionEnabled)}
              />
            </label>
          </div>

          <div className="alert alert-info text-xs mt-2">
            <span>Note: These settings will be applied when you join a voice chat.</span>
          </div>
        </div>
      </div>
    </dialog>
  );
};

interface SpacesSettingsModalProps {
  open: boolean;
  onClose: () => void;
  containerRef: React.RefObject<HTMLElement>;
}

function SpacesSettingsModal({ open, onClose, containerRef }: SpacesSettingsModalProps) {
  const [isVoiceChatSettingsOpen, setIsVoiceChatSettingsOpen] = useState(false);
  const [masterVolume, setMasterVolume] = useState(100);
  const [musicVolume, setMusicVolume] = useState(100);
  const [sfxVolume, setSfxVolume] = useState(100);
  const [activeTab, setActiveTab] = useState(0);

  const sendUnityEvent = useSendUnityEvent();

  const openVoiceChatSettings = () => {
    setIsVoiceChatSettingsOpen(true);
  };

  const closeVoiceChatSettings = () => {
    setIsVoiceChatSettingsOpen(false);
  };

  // Handle master volume change
  const handleMasterVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setMasterVolume(value);
    sendUnityEvent("SetMasterVolume", { volume: value / 100 });
  };

  // Handle music volume change
  const handleMusicVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setMusicVolume(value);
    sendUnityEvent("SetMusicVolume", { volume: value / 100 });
  };

  // Handle SFX volume change
  const handleSfxVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setSfxVolume(value);
    sendUnityEvent("SetSFXVolume", { volume: value / 100 });
  };

  if (!open) return null;

  return (
    <>
      {/* Blur Overlay */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[999]"
        style={{ opacity: open ? 1 : 0, visibility: open ? 'visible' : 'hidden' }}
        onClick={onClose}
      />

      {/* Settings Side Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 w-[35%] min-w-[600px] bg-base-200/95 backdrop-blur-md border-l border-base-content/10 z-[1000] overflow-y-auto transition-transform duration-400"
        style={{ transform: open ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Header */}
        <div className="p-4 border-b border-base-content/10 sticky top-0 bg-base-200/95 backdrop-blur-md z-[1001]">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Settings</h2>
            <button
              className="btn btn-ghost btn-xs"
              onClick={onClose}
              aria-label="Close settings"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Tabs */}
          <div role="tablist" className="tabs tabs-boxed mb-4 p-1">
            <button
              role="tab"
              className={`tab ${activeTab === 0 ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(0)}
            >
              Audio & Video
            </button>
            <button
              role="tab"
              className={`tab ${activeTab === 1 ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(1)}
            >
              Graphics
            </button>
          </div>

          {/* Tab Panels */}
          {activeTab === 0 && (
            <div className="space-y-6">
              {/* Audio Section */}
              <div>
                <h3 className="text-lg font-bold mb-4">Audio</h3>
                <div className="space-y-3">
                  {/* Master Volume */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm min-w-[120px]">Master Volume</span>
                    <div className="flex items-center gap-3 flex-1 justify-end">
                      <span className="text-sm opacity-80 min-w-[50px] text-right">{masterVolume}%</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={masterVolume}
                        className="range range-sm range-primary w-[180px]"
                        onChange={handleMasterVolumeChange}
                      />
                    </div>
                  </div>

                  {/* Music Volume */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm min-w-[120px]">Music Volume</span>
                    <div className="flex items-center gap-3 flex-1 justify-end">
                      <span className="text-sm opacity-80 min-w-[50px] text-right">{musicVolume}%</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={musicVolume}
                        className="range range-sm range-success w-[180px]"
                        onChange={handleMusicVolumeChange}
                      />
                    </div>
                  </div>

                  {/* Sound Effects Volume */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm min-w-[120px]">Sound Effects Volume</span>
                    <div className="flex items-center gap-3 flex-1 justify-end">
                      <span className="text-sm opacity-80 min-w-[50px] text-right">{sfxVolume}%</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={sfxVolume}
                        className="range range-sm range-warning w-[180px]"
                        onChange={handleSfxVolumeChange}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Voice Chat Section */}
              <div>
                <h3 className="text-lg font-bold mb-4">Voice Chat</h3>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Microphone</span>
                  <button
                    onClick={openVoiceChatSettings}
                    className="btn btn-outline btn-sm"
                  >
                    Configure ›
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 1 && (
            <div className="space-y-4">
              <h3 className="text-md font-semibold">Graphics Settings</h3>
              <div className="p-4 bg-base-300/50 rounded-md border border-base-content/10">
                <p className="text-sm opacity-70">
                  Graphics settings will be available here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Voice Chat Settings Modal */}
      {isVoiceChatSettingsOpen && (
        <VoiceChatSettingsModal
          isOpen={isVoiceChatSettingsOpen}
          onClose={closeVoiceChatSettings}
          containerRef={containerRef}
        />
      )}
    </>
  );
}

export default SpacesSettingsModal;
