import React from 'react';

interface PortalPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSpaceName?: string;
  targetSpaceSlug?: string;
  onConfirm: () => void;
}

/**
 * PortalPromptModal - Confirmation modal for portal navigation.
 */
const PortalPromptModal: React.FC<PortalPromptModalProps> = ({
  isOpen,
  onClose,
  targetSpaceName,
  targetSpaceSlug,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open" onClick={onClose}>
      <div
        className="modal-box bg-[#1a1a1a] border border-[#333] max-w-[420px] p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-3 top-2 text-white bg-white/10 hover:bg-transparent hover:text-gray-400"
          onClick={onClose}
        >
          ✕
        </button>

        <h3 className="font-semibold text-md text-white text-center pt-3 pb-1 px-4">
          {targetSpaceName ? `Visit ${targetSpaceName}?` : 'Visit Space?'}
        </h3>

        <div className="pb-8 pt-2 px-8">
          <div className="flex mt-4 gap-6 justify-center">
            <button
              className="btn btn-outline border-white/40 text-white font-bold rounded-3xl px-10 py-6 text-lg hover:bg-white/10"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="btn bg-white text-[#181818] font-bold rounded-3xl px-10 py-6 text-lg hover:bg-gray-100 border-0"
              onClick={onConfirm}
            >
              Visit
            </button>
          </div>
        </div>
      </div>
      <div className="modal-backdrop bg-black/80 backdrop-blur-lg" onClick={onClose}></div>
    </dialog>
  );
};

export default PortalPromptModal;
