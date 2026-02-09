import React, { useEffect, useCallback } from 'react';
import {
  FiInfo,
  FiImage,
  FiCamera,
  FiSettings,
  FiUsers,
  FiVideo,
  FiTool,
} from 'react-icons/fi';

import { useSpaceManage } from './hooks/useSpaceManage';
import {
  DetailsTab,
  LogoTab,
  BackgroundTab,
  SettingsTab,
  UsersTab,
  StreamingTab,
  CustomTab,
} from './tabs';

interface SpaceManageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * SpaceManageModal - Admin modal for managing space settings.
 * Renders inline (no createPortal) so daisyUI/Tailwind CSS applies within the micro-frontend.
 */
const SpaceManageModal: React.FC<SpaceManageModalProps> = ({ isOpen, onClose }) => {
  const state = useSpaceManage(isOpen);

  const handleEscKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [isOpen, handleEscKey]);

  const tabs = [
    { icon: FiInfo, label: 'Details' },
    { icon: FiImage, label: 'Logo' },
    { icon: FiCamera, label: 'Background' },
    { icon: FiSettings, label: 'Settings' },
    { icon: FiUsers, label: 'Users' },
    { icon: FiVideo, label: 'Stream' },
    { icon: FiTool, label: 'Custom' },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998]"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
        <div className="max-w-4xl w-full max-h-[90vh] bg-[#1a1a1a] border border-[#333] overflow-hidden rounded-2xl shadow-xl pointer-events-auto">
          <div className="border-b border-white/20 px-4 pt-3 pb-1 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-white">Manage Space</h3>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm btn-circle bg-white/10 hover:bg-transparent text-white hover:text-gray-400"
            >
              ✕
            </button>
          </div>

          <div className="flex" style={{ height: 'calc(90vh - 48px)' }}>
            {/* Vertical Tab List */}
            <div
              role="tablist"
              className="flex flex-col bg-black/20 w-20 py-4 border-r border-white/20 flex-shrink-0"
            >
              {tabs.map((tab, index) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={index}
                    role="tab"
                    className={`flex flex-col items-center py-3 text-xs ${
                      state.tabIndex === index
                        ? 'bg-white/10 text-blue-300'
                        : 'hover:bg-white/5 text-white'
                    }`}
                    onClick={() => state.setTabIndex(index)}
                  >
                    <Icon className="mb-1" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Panels */}
            <div className="flex-grow overflow-y-auto custom-scrollbar">
              {state.tabIndex === 0 && (
                <DetailsTab
                  spaceID={state.spaceID}
                  spaceName={state.spaceName}
                  setSpaceName={state.setSpaceName}
                  spaceDescription={state.spaceDescription}
                  setSpaceDescription={state.setSpaceDescription}
                  isSavingDetails={state.isSavingDetails}
                  handleSaveSpaceDetails={state.handleSaveSpaceDetails}
                />
              )}

              {state.tabIndex === 1 && (
                <LogoTab
                  existingLogo={state.existingLogo}
                  previewUrl={state.previewUrl}
                  selectedFile={state.selectedFile}
                  isUploading={state.isUploading}
                  uploadProgress={state.uploadProgress}
                  fileInputRef={state.fileInputRef}
                  handleFileChange={state.handleFileChange}
                  handleUpload={state.handleUpload}
                  handleDelete={state.handleDelete}
                  handleBrowseClick={state.handleBrowseClick}
                />
              )}

              {state.tabIndex === 2 && (
                <BackgroundTab
                  existingBackground={state.existingBackground}
                  bgPreviewUrl={state.bgPreviewUrl}
                  selectedBgFile={state.selectedBgFile}
                  isBgUploading={state.isBgUploading}
                  bgUploadProgress={state.bgUploadProgress}
                  bgFileInputRef={state.bgFileInputRef}
                  handleBgFileChange={state.handleBgFileChange}
                  handleBgUpload={state.handleBgUpload}
                  handleBgDelete={state.handleBgDelete}
                  handleBgBrowseClick={state.handleBgBrowseClick}
                  existingVideoBackground={state.existingVideoBackground}
                  videoPreviewUrl={state.videoPreviewUrl}
                  selectedVideoFile={state.selectedVideoFile}
                  isVideoUploading={state.isVideoUploading}
                  videoUploadProgress={state.videoUploadProgress}
                  videoFileInputRef={state.videoFileInputRef}
                  handleVideoFileChange={state.handleVideoFileChange}
                  handleVideoUpload={state.handleVideoUpload}
                  handleVideoDelete={state.handleVideoDelete}
                  handleVideoBrowseClick={state.handleVideoBrowseClick}
                />
              )}

              {state.tabIndex === 3 && (
                <SettingsTab
                  voiceDisabled={state.voiceDisabled}
                  textChatDisabled={state.textChatDisabled}
                  accessibleToAllUsers={state.accessibleToAllUsers}
                  allowGuestUsers={state.allowGuestUsers}
                  hideGuestSignInButton={state.hideGuestSignInButton}
                  isUpdatingSettings={state.isUpdatingSettings}
                  handleVoiceToggle={state.handleVoiceToggle}
                  handleTextChatToggle={state.handleTextChatToggle}
                  handleAccessibilityToggle={state.handleAccessibilityToggle}
                  handleGuestUsersToggle={state.handleGuestUsersToggle}
                  handleHideSignInButtonToggle={state.handleHideSignInButtonToggle}
                />
              )}

              {state.tabIndex === 4 && (
                <UsersTab
                  spaceOwners={state.spaceOwners}
                  spaceHosts={state.spaceHosts}
                  isLoadingUsers={state.isLoadingUsers}
                  bannedUsers={state.bannedUsers}
                  unbanningUid={state.unbanningUid}
                  handleUnbanUser={state.handleUnbanUser}
                />
              )}

              {state.tabIndex === 5 && (
                <StreamingTab
                  streamingEnabled={state.streamingEnabled}
                  setStreamingEnabled={state.setStreamingEnabled}
                  hlsStreamUrl={state.hlsStreamUrl}
                  setHlsStreamUrl={state.setHlsStreamUrl}
                  rtmpUrl={state.rtmpUrl}
                  setRtmpUrl={state.setRtmpUrl}
                  streamKey={state.streamKey}
                  setStreamKey={state.setStreamKey}
                  isSavingStream={state.isSavingStream}
                  playerStatus={state.playerStatus}
                  isStreamLoading={state.isStreamLoading}
                  handleSaveStreamSettings={state.handleSaveStreamSettings}
                />
              )}

              {state.tabIndex === 6 && (
                <CustomTab
                  overrideEnabled={state.overrideEnabled}
                  customPlayers={state.customPlayers}
                  newPlayerUrl={state.newPlayerUrl}
                  setNewPlayerUrl={state.setNewPlayerUrl}
                  isSavingOverride={state.isSavingOverride}
                  handleAddCustomPlayer={state.handleAddCustomPlayer}
                  handleRemoveCustomPlayer={state.handleRemoveCustomPlayer}
                  handleOverrideToggle={state.handleOverrideToggle}
                  handleSaveOverrideSettings={state.handleSaveOverrideSettings}
                />
              )}

            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 4px;
        }
      `}</style>
    </>
  );
};

export default SpaceManageModal;
