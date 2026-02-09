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
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-[10000]" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-[10001] flex items-center justify-center pointer-events-none">
        <div
          className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl pointer-events-auto overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="font-semibold text-sm text-white">Voice Chat Settings</h3>
            <button
              className="btn btn-ghost btn-sm btn-circle text-white/60 hover:text-white hover:bg-white/10"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Microphone selection */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-medium text-white">Microphone</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${micEnabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {micEnabled ? "Enabled" : "Muted"}
                </span>
              </div>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-400/50"
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

            {/* Microphone level indicator */}
            <div>
              <p className="text-sm font-medium text-white mb-1.5">Microphone Level</p>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-75"
                  style={{ width: `${volumeLevel}%` }}
                />
              </div>
            </div>

            {/* Microphone volume */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-white">Microphone Volume</span>
                <span className="text-xs text-white/50">{microphoneVolume}%</span>
              </div>
              <input
                type="range" min="0" max="100"
                value={microphoneVolume}
                className="range range-sm range-primary w-full"
                onChange={handleMicrophoneVolumeChange}
              />
            </div>

            {/* Speaker volume */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-white">Speaker Volume</span>
                <span className="text-xs text-white/50">{speakerVolume}%</span>
              </div>
              <input
                type="range" min="0" max="100"
                value={speakerVolume}
                className="range range-sm range-primary w-full"
                onChange={handleSpeakerVolumeChange}
              />
            </div>

            {/* Toggles */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">Microphone Enabled</span>
                <input type="checkbox" className="toggle toggle-primary toggle-sm" checked={micEnabled} onChange={toggleMicrophone} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">Echo Cancellation</span>
                <input type="checkbox" className="toggle toggle-primary toggle-sm" checked={isEchoEnabled} onChange={() => setIsEchoEnabled(!isEchoEnabled)} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">Noise Suppression</span>
                <input type="checkbox" className="toggle toggle-primary toggle-sm" checked={isNoiseSuppressionEnabled} onChange={() => setIsNoiseSuppressionEnabled(!isNoiseSuppressionEnabled)} />
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-2.5 mt-2">
              <span className="text-xs text-blue-300">Settings apply when you join a voice chat.</span>
            </div>
          </div>
        </div>
      </div>
    </>
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998]"
        onClick={onClose}
      />

      {/* Settings Side Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 w-[380px] max-w-[90vw] bg-[#1a1a1a] border-l border-white/10 z-[9999] overflow-y-auto transition-transform duration-300"
        style={{ transform: open ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 sticky top-0 bg-[#1a1a1a] z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-white">Settings</h2>
            <button
              className="btn btn-ghost btn-sm btn-circle text-white/60 hover:text-white hover:bg-white/10"
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
          <div className="flex gap-1 mb-5 bg-white/5 rounded-xl p-1">
            <button
              className={`flex-1 text-xs py-2 px-3 rounded-lg font-medium transition-colors ${
                activeTab === 0
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
              onClick={() => setActiveTab(0)}
            >
              Audio & Video
            </button>
            <button
              className={`flex-1 text-xs py-2 px-3 rounded-lg font-medium transition-colors ${
                activeTab === 1
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
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
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">Audio</p>
                <div className="space-y-4">
                  {/* Master Volume */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-white">Master Volume</span>
                      <span className="text-xs text-white/50">{masterVolume}%</span>
                    </div>
                    <input
                      type="range" min="0" max="100"
                      value={masterVolume}
                      className="range range-sm range-primary w-full"
                      onChange={handleMasterVolumeChange}
                    />
                  </div>

                  {/* Music Volume */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-white">Music Volume</span>
                      <span className="text-xs text-white/50">{musicVolume}%</span>
                    </div>
                    <input
                      type="range" min="0" max="100"
                      value={musicVolume}
                      className="range range-sm range-success w-full"
                      onChange={handleMusicVolumeChange}
                    />
                  </div>

                  {/* Sound Effects Volume */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-white">Sound Effects</span>
                      <span className="text-xs text-white/50">{sfxVolume}%</span>
                    </div>
                    <input
                      type="range" min="0" max="100"
                      value={sfxVolume}
                      className="range range-sm range-warning w-full"
                      onChange={handleSfxVolumeChange}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10" />

              {/* Voice Chat Section */}
              <div>
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">Voice Chat</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white">Microphone</span>
                  <button
                    onClick={openVoiceChatSettings}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
                  >
                    Configure ›
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 1 && (
            <div>
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">Graphics</p>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-sm text-white/50">
                  Graphics settings coming soon.
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
