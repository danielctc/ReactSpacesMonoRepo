import React, { useState } from 'react';
import { FaKeyboard, FaMouse, FaGamepad, FaInfoCircle } from 'react-icons/fa';

interface SpacesControlsModalProps {
  open: boolean;
  onClose: () => void;
}

interface ControlItemProps {
  keyLabel: string;
  description: string;
}

const ControlItem: React.FC<ControlItemProps> = ({ keyLabel, description }) => (
  <div className="bg-white/10 rounded-md p-2 min-w-[120px] max-w-[180px]">
    <div className="flex items-center gap-2">
      <div className="bg-white/20 rounded-md px-2 py-1 text-xs font-bold min-w-[30px] text-center">
        {keyLabel}
      </div>
      <span className="text-xs">{description}</span>
    </div>
  </div>
);

const SpacesControlsModal: React.FC<SpacesControlsModalProps> = ({ open, onClose }) => {
  const [tabIndex, setTabIndex] = useState(0);

  if (!open) return null;

  return (
    <dialog open className="modal modal-open">
      <div className="fixed inset-0 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-box max-w-[600px] h-[350px] bg-[rgba(23,25,35,0.95)] text-white rounded-md shadow-lg overflow-hidden">
        <div className="border-b border-white/20 py-2">
          <h3 className="text-md font-semibold">Controls</h3>
        </div>

        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 text-white/70 hover:text-white hover:bg-white/10"
          onClick={onClose}
        >
          ✕
        </button>

        <div className="flex h-full">
          <div className="bg-black/20 w-20 py-4 border-r border-white/20 flex flex-col">
            <button
              className={`flex flex-col items-center py-3 ${tabIndex === 0 ? 'bg-white/10 text-blue-300' : 'hover:bg-white/5'}`}
              onClick={() => setTabIndex(0)}
            >
              <FaKeyboard className="mb-1" />
              <span className="text-xs">Movement</span>
            </button>
            <button
              className={`flex flex-col items-center py-3 ${tabIndex === 1 ? 'bg-white/10 text-blue-300' : 'hover:bg-white/5'}`}
              onClick={() => setTabIndex(1)}
            >
              <FaMouse className="mb-1" />
              <span className="text-xs">Camera</span>
            </button>
            <button
              className={`flex flex-col items-center py-3 ${tabIndex === 2 ? 'bg-white/10 text-blue-300' : 'hover:bg-white/5'}`}
              onClick={() => setTabIndex(2)}
            >
              <FaGamepad className="mb-1" />
              <span className="text-xs">Actions</span>
            </button>
            <button
              className={`flex flex-col items-center py-3 ${tabIndex === 3 ? 'bg-white/10 text-blue-300' : 'hover:bg-white/5'}`}
              onClick={() => setTabIndex(3)}
            >
              <FaInfoCircle className="mb-1" />
              <span className="text-xs">Tips</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col">
            {tabIndex === 0 && (
              <div className="p-4 flex flex-col h-full">
                <p className="text-sm font-semibold mb-3 text-blue-300">Movement Controls</p>
                <div className="flex flex-wrap gap-3">
                  <ControlItem keyLabel="W" description="Move Forward" />
                  <ControlItem keyLabel="A" description="Move Left" />
                  <ControlItem keyLabel="S" description="Move Backward" />
                  <ControlItem keyLabel="D" description="Move Right" />
                  <ControlItem keyLabel="Shift" description="Run" />
                  <ControlItem keyLabel="Space" description="Jump / Double Jump" />
                </div>
              </div>
            )}

            {tabIndex === 1 && (
              <div className="p-4 flex flex-col h-full">
                <p className="text-sm font-semibold mb-3 text-blue-300">Camera Controls</p>
                <div className="flex flex-wrap gap-3">
                  <ControlItem keyLabel="Mouse" description="Look Around" />
                  <ControlItem keyLabel="Click + Drag" description="Rotate Camera" />
                  <ControlItem keyLabel="Scroll" description="Zoom In/Out" />
                </div>
              </div>
            )}

            {tabIndex === 2 && (
              <div className="p-4 flex flex-col h-full">
                <p className="text-sm font-semibold mb-3 text-blue-300">Action Controls</p>
                <div className="flex flex-wrap gap-3">
                  <ControlItem keyLabel="E" description="Interact" />
                  <ControlItem keyLabel="F" description="Emote Menu" />
                  <ControlItem keyLabel="T" description="Chat" />
                  <ControlItem keyLabel="M" description="Mute Mic" />
                </div>
              </div>
            )}

            {tabIndex === 3 && (
              <div className="p-4 flex flex-col h-full">
                <p className="text-sm font-semibold mb-3 text-blue-300">Tips & Tricks</p>
                <div className="flex flex-col gap-2">
                  <p className="text-xs">• Double-tap Shift to auto-run</p>
                  <p className="text-xs">• Press ESC to access settings</p>
                  <p className="text-xs">• Click on players to view their profile</p>
                  <p className="text-xs">• Use the minimap to navigate</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
};

export default SpacesControlsModal;
