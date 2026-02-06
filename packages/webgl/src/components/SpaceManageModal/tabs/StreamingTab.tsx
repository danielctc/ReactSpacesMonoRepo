import React from 'react';

interface StreamingTabProps {
  streamingEnabled: boolean;
  setStreamingEnabled: (enabled: boolean) => void;
  hlsStreamUrl: string;
  setHlsStreamUrl: (url: string) => void;
  rtmpUrl: string;
  setRtmpUrl: (url: string) => void;
  streamKey: string;
  setStreamKey: (key: string) => void;
  isSavingStream: boolean;
  playerStatus: any;
  isStreamLoading: boolean;
  handleSaveStreamSettings: () => void;
}

/**
 * Streaming Tab - Manages HLS stream settings.
 */
const StreamingTab: React.FC<StreamingTabProps> = ({
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
    <div className="p-4 flex flex-col">
      <p className="text-sm font-semibold mb-3 text-white">Streaming Settings</p>

      <div className="flex flex-col gap-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Enable Streaming</p>
            <p className="text-xs text-gray-400 mt-0">
              {streamingEnabled ? 'Streaming is enabled for this space' : 'Streaming is disabled'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {playerStatus && (
              <span
                className={`badge badge-xs ${
                  playerStatus === 'playing'
                    ? 'badge-success'
                    : playerStatus === 'error'
                    ? 'badge-error'
                    : 'badge-neutral'
                }`}
              >
                {playerStatus}
              </span>
            )}
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={streamingEnabled}
              onChange={(e) => setStreamingEnabled(e.target.checked)}
              disabled={isSavingStream}
            />
          </div>
        </div>

        <div className="divider my-0"></div>

        {/* HLS Stream URL */}
        <label className="form-control w-full">
          <span className="label text-xs text-white">HLS Stream URL</span>
          <input
            type="text"
            value={hlsStreamUrl}
            onChange={(e) => setHlsStreamUrl(e.target.value)}
            placeholder="https://stream.example.com/live/playlist.m3u8"
            className="input input-sm input-bordered bg-white/10 border-white/20 hover:border-white/30 focus:border-blue-300 text-white"
            disabled={!streamingEnabled}
          />
          <span className="label-text-alt text-xs">The .m3u8 playlist URL for your HLS stream</span>
        </label>

        <div className="divider my-0"></div>

        {/* RTMP Settings (for reference) */}
        <div>
          <p className="text-xs font-medium text-gray-400 mb-3">RTMP Details (for streaming software)</p>

          <div className="flex flex-col gap-3">
            <label className="form-control w-full">
              <span className="label text-xs text-white">RTMP URL</span>
              <input
                type="text"
                value={rtmpUrl}
                onChange={(e) => setRtmpUrl(e.target.value)}
                placeholder="rtmp://live.example.com/live"
                className="input input-sm input-bordered bg-white/10 border-white/20 hover:border-white/30 focus:border-blue-300 text-white"
                disabled={!streamingEnabled}
              />
            </label>

            <label className="form-control w-full">
              <span className="label text-xs text-white">Stream Key</span>
              <input
                type="password"
                value={streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
                placeholder="your-stream-key"
                className="input input-sm input-bordered bg-white/10 border-white/20 hover:border-white/30 focus:border-blue-300 text-white"
                disabled={!streamingEnabled}
              />
              <span className="label-text-alt text-xs">
                Keep this secret - used in OBS/streaming software
              </span>
            </label>
          </div>
        </div>

        <button
          className="btn btn-primary btn-sm self-start mt-2"
          onClick={handleSaveStreamSettings}
          disabled={isSavingStream}
        >
          {isSavingStream ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Saving...
            </>
          ) : (
            'Save Stream Settings'
          )}
        </button>
      </div>
    </div>
  );
};

export default StreamingTab;
