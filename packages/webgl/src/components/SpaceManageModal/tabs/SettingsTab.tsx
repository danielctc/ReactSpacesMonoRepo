import React from 'react';
import { FiVolume2, FiMessageCircle, FiUsers } from 'react-icons/fi';

interface SettingsTabProps {
  voiceDisabled: boolean;
  textChatDisabled: boolean;
  accessibleToAllUsers: boolean;
  allowGuestUsers: boolean;
  hideGuestSignInButton: boolean;
  isUpdatingSettings: boolean;
  handleVoiceToggle: () => void;
  handleTextChatToggle: () => void;
  handleAccessibilityToggle: () => void;
  handleGuestUsersToggle: () => void;
  handleHideSignInButtonToggle: () => void;
}

/**
 * Settings Tab - Manages space settings like voice, chat, accessibility.
 */
const SettingsTab: React.FC<SettingsTabProps> = ({
  voiceDisabled,
  textChatDisabled,
  accessibleToAllUsers,
  allowGuestUsers,
  hideGuestSignInButton,
  isUpdatingSettings,
  handleVoiceToggle,
  handleTextChatToggle,
  handleAccessibilityToggle,
  handleGuestUsersToggle,
  handleHideSignInButtonToggle,
}) => {
  return (
    <div className="p-4 flex flex-col">
      <p className="text-sm font-semibold mb-3 text-white">Space Settings</p>

      <div className="flex flex-col gap-4">
        {/* Communication Settings */}
        <div>
          <p className="text-xs font-medium text-gray-400 mb-3">Communication</p>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiVolume2 className="text-gray-400" />
                <div>
                  <p className="text-sm text-white">Voice Chat</p>
                  <p className="text-xs text-gray-400 mt-0">
                    {voiceDisabled ? 'Voice chat is disabled' : 'Voice chat is enabled'}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={!voiceDisabled}
                onChange={handleVoiceToggle}
                disabled={isUpdatingSettings}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiMessageCircle className="text-gray-400" />
                <div>
                  <p className="text-sm text-white">Text Chat</p>
                  <p className="text-xs text-gray-400 mt-0">
                    {textChatDisabled ? 'Text chat is disabled' : 'Text chat is enabled'}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={!textChatDisabled}
                onChange={handleTextChatToggle}
                disabled={isUpdatingSettings}
              />
            </div>
          </div>
        </div>

        <div className="divider my-0"></div>

        {/* Access Settings */}
        <div>
          <p className="text-xs font-medium text-gray-400 mb-3">Access Control</p>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiUsers className="text-gray-400" />
                <div>
                  <p className="text-sm text-white">Public Access</p>
                  <p className="text-xs text-gray-400 mt-0">
                    {accessibleToAllUsers
                      ? 'All registered users can access'
                      : 'Only authorized users can access'}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={accessibleToAllUsers}
                onChange={handleAccessibilityToggle}
                disabled={isUpdatingSettings}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Allow Guest Users</p>
                <p className="text-xs text-gray-400 mt-0">
                  {allowGuestUsers
                    ? 'Guest users can enter without account'
                    : 'Account required to enter'}
                </p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={allowGuestUsers}
                onChange={handleGuestUsersToggle}
                disabled={isUpdatingSettings}
              />
            </div>

            {allowGuestUsers && (
              <div className="flex items-center justify-between pl-4">
                <div>
                  <p className="text-sm text-white">Hide Sign-In Button</p>
                  <p className="text-xs text-gray-400 mt-0">
                    {hideGuestSignInButton
                      ? 'Sign-in button hidden for guests'
                      : 'Sign-in button visible for guests'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={hideGuestSignInButton}
                  onChange={handleHideSignInButtonToggle}
                  disabled={isUpdatingSettings}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
