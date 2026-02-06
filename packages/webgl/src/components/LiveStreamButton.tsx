import React, { useState, useEffect, useContext } from 'react';
import { FaCopy, FaCheck, FaWifi } from 'react-icons/fa';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { useHLSStream } from '../hooks/unityEvents';
import { useUnity } from '../providers/UnityProvider';
import { isSpaceOwner } from '@disruptive-spaces/shared/firebase/userPermissions';
import { userBelongsToGroup } from '@disruptive-spaces/shared/firebase/userFirestore';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';

interface LiveStreamData {
  enabled?: boolean;
  rtmpUrl?: string;
  streamKey?: string;
}

interface Props {
  size?: string;
  tooltipPlacement?: string;
  className?: string;
}

const LiveStreamButton: React.FC<Props> = ({
  size = "md",
  tooltipPlacement = "top",
  className = 'livestream-button'
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const { savedStreamData, reloadStreamData } = useHLSStream();
  const { spaceID } = useUnity();
  const { user } = useContext(UserContext);
  const [toast, setToast] = useState<{message: string; type: string} | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [rtmpCopied, setRtmpCopied] = useState(false);
  const [streamKeyCopied, setStreamKeyCopied] = useState(false);

  useEffect(() => {
    if (spaceID) {
      Logger.log('LiveStreamButton: Forcing reload of stream data');
      reloadStreamData();

      const handleStreamSettingsChanged = () => {
        Logger.log('LiveStreamButton: Stream settings changed, reloading data');
        reloadStreamData();
      };

      window.addEventListener('StreamSettingsChanged', handleStreamSettingsChanged);

      return () => {
        window.removeEventListener('StreamSettingsChanged', handleStreamSettingsChanged);
      };
    }
  }, [spaceID, reloadStreamData]);

  useEffect(() => {
    const checkPermissions = async () => {
      if (!user?.uid || !spaceID) {
        setHasPermission(false);
        return;
      }

      try {
        const isAdmin = await userBelongsToGroup(user.uid, 'disruptiveAdmin');
        const isOwner = await isSpaceOwner(user, spaceID);
        setHasPermission(isAdmin || isOwner);
      } catch (error) {
        Logger.error('Error checking user permissions:', error);
        setHasPermission(false);
      }
    };

    checkPermissions();
  }, [user?.uid, spaceID]);

  useEffect(() => {
    Logger.log('LiveStreamButton: Current streaming data:', {
      enabled: savedStreamData?.enabled,
      hasRtmpUrl: !!savedStreamData?.rtmpUrl,
      hasStreamKey: !!savedStreamData?.streamKey,
      hasPermission,
      isPlayerReady
    });
  }, [savedStreamData, hasPermission, isPlayerReady]);

  useEffect(() => {
    const handlePlayerInstantiated = () => {
      Logger.log("LiveStreamButton: Player instantiated, showing button");
      setIsPlayerReady(true);
    };

    window.addEventListener("PlayerInstantiated", handlePlayerInstantiated);

    if ((window as any).isPlayerInstantiated) {
      Logger.log("LiveStreamButton: Player was already instantiated");
      setIsPlayerReady(true);
    }

    return () => {
      window.removeEventListener("PlayerInstantiated", handlePlayerInstantiated);
    };
  }, []);

  const handleOpenModal = () => {
    window.dispatchEvent(new Event('modal-opened'));
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    window.dispatchEvent(new Event('modal-closed'));
    setIsModalOpen(false);
  };

  const copyToClipboard = (text: string, type: 'rtmp' | 'streamKey') => {
    navigator.clipboard.writeText(text);
    if (type === 'rtmp') {
      setRtmpCopied(true);
      setTimeout(() => setRtmpCopied(false), 2000);
      setToast({ message: "RTMP URL copied", type: "success" });
    } else {
      setStreamKeyCopied(true);
      setTimeout(() => setStreamKeyCopied(false), 2000);
      setToast({ message: "Stream Key copied", type: "success" });
    }
    setTimeout(() => setToast(null), 2000);
  };

  if (!isPlayerReady || !hasPermission || savedStreamData?.enabled !== true) {
    Logger.log('LiveStreamButton: Not rendering button because:', {
      playerNotReady: !isPlayerReady,
      noPermission: !hasPermission,
      streamingDisabled: savedStreamData?.enabled !== true,
      enabledValue: savedStreamData?.enabled
    });
    return null;
  }

  return (
    <>
      <div className="tooltip" data-tip="Live Stream Info">
        <div
          className={`avatar ${size === 'md' ? 'w-10 h-10' : 'w-12 h-12'} cursor-pointer ${className}`}
          data-testid="livestream-button"
          onClick={handleOpenModal}
        >
          <div className="rounded-full bg-black border border-white/30 flex items-center justify-center">
            <FaWifi color="white" />
          </div>
        </div>
      </div>

      {isModalOpen && (
        <dialog open className="modal">
          <div className="modal-box bg-[rgba(23,25,35,0.95)] text-white shadow-xl">
            <h3 className="font-semibold text-md py-2 border-b border-white/20">Live Stream Info</h3>
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 text-white/70 hover:text-white hover:bg-white/10"
              onClick={handleCloseModal}
            >
              ✕
            </button>
            <div className="p-4">
              {savedStreamData?.rtmpUrl && savedStreamData?.streamKey ? (
                <div>
                  <p className="text-sm mb-4">Copy these details to your streaming software (OBS, Streamlabs, etc.)</p>

                  <div className="mb-4">
                    <p className="text-xs font-semibold mb-1">RTMP URL</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="input input-sm input-bordered bg-white/10 border-white/20 hover:border-white/30 flex-1 text-white"
                        value={savedStreamData.rtmpUrl}
                        readOnly
                      />
                      <button
                        className={`btn btn-xs ${rtmpCopied ? 'btn-success' : 'btn-primary'}`}
                        onClick={() => copyToClipboard(savedStreamData.rtmpUrl!, 'rtmp')}
                        aria-label="Copy RTMP URL"
                      >
                        {rtmpCopied ? <FaCheck /> : <FaCopy />}
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs font-semibold mb-1">Stream Key</p>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        className="input input-sm input-bordered bg-white/10 border-white/20 hover:border-white/30 flex-1 text-white"
                        value={savedStreamData.streamKey}
                        readOnly
                      />
                      <button
                        className={`btn btn-xs ${streamKeyCopied ? 'btn-success' : 'btn-primary'}`}
                        onClick={() => copyToClipboard(savedStreamData.streamKey!, 'streamKey')}
                        aria-label="Copy Stream Key"
                      >
                        {streamKeyCopied ? <FaCheck /> : <FaCopy />}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-white/80 mt-4">
                    Stream to this RTMP server using the Stream Key above. View and manage stream settings in the Space Manager.
                  </p>
                </div>
              ) : (
                <div className="text-center p-4">
                  <p>No stream configuration found for this space.</p>
                  <p className="text-xs mt-2 text-white/80">
                    Configure streaming in the Space Manager under Stream tab.
                  </p>
                </div>
              )}
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={handleCloseModal}>close</button>
          </form>
        </dialog>
      )}

      {toast && (
        <div className="toast toast-top">
          <div className={`alert ${toast.type === 'error' ? 'alert-error' : 'alert-success'}`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveStreamButton;
