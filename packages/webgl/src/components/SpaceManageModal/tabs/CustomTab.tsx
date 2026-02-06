import React from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

interface CustomPlayer {
  id: string;
  url: string;
  createdAt: string;
}

interface CustomTabProps {
  overrideEnabled: boolean;
  customPlayers: CustomPlayer[];
  newPlayerUrl: string;
  setNewPlayerUrl: (url: string) => void;
  isSavingOverride: boolean;
  handleAddCustomPlayer: () => void;
  handleRemoveCustomPlayer: (playerId: string) => void;
  handleOverrideToggle: () => void;
  handleSaveOverrideSettings: () => void;
}

/**
 * Custom Tab - Manages Override settings for custom player URLs.
 * Override allows temporary RPM URL replacement for all users in this space.
 */
const CustomTab: React.FC<CustomTabProps> = ({
  overrideEnabled,
  customPlayers,
  newPlayerUrl,
  setNewPlayerUrl,
  isSavingOverride,
  handleAddCustomPlayer,
  handleRemoveCustomPlayer,
  handleOverrideToggle,
  handleSaveOverrideSettings,
}) => {
  return (
    <div className="p-4 flex flex-col">
      <p className="text-sm font-semibold mb-3 text-white">Custom Player Override</p>

      <div className="alert alert-info mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="stroke-current shrink-0 w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <span className="text-xs">
          When enabled, users in this space will use avatars from your custom URL list instead of their
          profile avatars. This only affects this space.
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Enable Override</p>
            <p className="text-xs text-gray-400 mt-0">
              {overrideEnabled
                ? 'Custom avatars are active for all users'
                : 'Users use their profile avatars'}
            </p>
          </div>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={overrideEnabled}
            onChange={handleOverrideToggle}
            disabled={isSavingOverride}
          />
        </div>

        <div className="divider my-0"></div>

        {/* Add Custom Player URL */}
        <label className="form-control w-full">
          <span className="label text-xs text-white">Add Custom Avatar URL</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={newPlayerUrl}
              onChange={(e) => setNewPlayerUrl(e.target.value)}
              placeholder="https://models.readyplayer.me/..."
              className="input input-sm input-bordered bg-white/10 border-white/20 hover:border-white/30 focus:border-blue-300 text-white flex-1"
            />
            <button
              className="btn btn-primary btn-sm btn-square"
              onClick={handleAddCustomPlayer}
              aria-label="Add URL"
            >
              <FiPlus />
            </button>
          </div>
          <span className="label-text-alt text-xs">Ready Player Me avatar URLs (GLB format)</span>
        </label>

        {/* Custom Players List */}
        {customPlayers.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2">
              Custom Avatars ({customPlayers.length})
            </p>
            <div className="flex flex-col gap-2">
              {customPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-2 bg-white/5 rounded-md border border-white/10"
                >
                  <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    <span className="text-xs text-gray-400 font-medium min-w-[20px]">
                      #{index + 1}
                    </span>
                    <span className="text-xs text-white truncate" title={player.url}>
                      {player.url}
                    </span>
                  </div>
                  <button
                    className="btn btn-ghost btn-xs text-error"
                    onClick={() => handleRemoveCustomPlayer(player.id)}
                    aria-label="Remove URL"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {customPlayers.length === 0 && (
          <p className="text-xs text-gray-500 italic">
            No custom avatars added. Add URLs above to override user avatars.
          </p>
        )}

        <button
          className="btn btn-primary btn-sm self-start mt-2"
          onClick={handleSaveOverrideSettings}
          disabled={isSavingOverride}
        >
          {isSavingOverride ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Saving...
            </>
          ) : (
            'Save Override Settings'
          )}
        </button>
      </div>
    </div>
  );
};

export default CustomTab;
