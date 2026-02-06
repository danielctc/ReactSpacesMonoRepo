import React, { useState, useContext, useEffect, useCallback } from 'react';
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { getAllAvatars } from '@disruptive-spaces/shared/firebase/avatarsFirestore';
import { updateUserAvatar } from '@disruptive-spaces/shared/firebase/userFirestore';
import { useSendUnityEvent } from "../hooks/unityEvents/core/useSendUnityEvent";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

interface Avatar {
  id: string;
  name: string;
  thumbnailUrl: string;
  glbUrl: string;
  categories?: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
}

function AvatarModal({ isOpen, onClose, spaceId }: Props) {
    const [avatars, setAvatars] = useState<Avatar[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [toast, setToast] = useState<{message: string; type: string} | null>(null);
    const { user, currentUser } = useContext(UserContext);
    const sendUnityEvent = useSendUnityEvent();

    const fetchAvatars = useCallback(async () => {
        setIsLoading(true);
        try {
            const userGroups = currentUser?.groups || [];
            const avatarList = await getAllAvatars({
                spaceId,
                userGroups
            });
            setAvatars(avatarList);
            Logger.log('AvatarModal: Fetched avatars:', avatarList.length);
        } catch (error) {
            Logger.error('AvatarModal: Error fetching avatars:', error);
            setToast({
                message: 'Failed to load avatars. Please try again.',
                type: 'error'
            });
            setTimeout(() => setToast(null), 3000);
        } finally {
            setIsLoading(false);
        }
    }, [spaceId, currentUser?.groups]);

    useEffect(() => {
        if (isOpen) {
            fetchAvatars();
        }
    }, [isOpen, fetchAvatars]);

    const handleAvatarSelect = async (avatar: Avatar) => {
        if (!user?.uid) {
            Logger.error('AvatarModal: No authenticated user found.');
            setToast({
                message: 'You must be signed in to change your avatar.',
                type: 'error'
            });
            setTimeout(() => setToast(null), 3000);
            return;
        }

        setSelectedAvatar(avatar);
        setIsUpdating(true);

        try {
            await updateUserAvatar(user.uid, avatar.id, avatar.glbUrl, avatar.thumbnailUrl);
            Logger.log('AvatarModal: Avatar updated in Firestore:', avatar.id);

            sendUnityEvent("AvatarUrlFromReact", { url: avatar.glbUrl });
            Logger.log('AvatarModal: Sent avatar to Unity:', avatar.glbUrl);

            setToast({
                message: 'Your avatar has been saved.',
                type: 'success'
            });
            setTimeout(() => setToast(null), 2000);

            onClose();
        } catch (error) {
            Logger.error('AvatarModal: Error updating avatar:', error);
            setToast({
                message: 'Failed to save avatar. Please try again.',
                type: 'error'
            });
            setTimeout(() => setToast(null), 3000);
        } finally {
            setIsUpdating(false);
        }
    };

    const currentAvatarId = currentUser?.avatarId;

    if (!isOpen) return null;

    return (
        <>
            <dialog open className="modal z-[9999]">
                <div className="modal-box bg-[#1a1a1a] text-white rounded-xl border border-[#333] max-w-[900px]">
                    <h3 className="font-semibold text-md pb-1 pt-1">Customise Your Avatar</h3>
                    <button
                        className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                    <div className="flex flex-col gap-4">
                        <p className="text-sm">Choose from our collection of avatars</p>

                        {isLoading ? (
                            <div className="grid grid-cols-5 gap-2">
                                {Array.from({ length: 10 }, (_, i) => (
                                    <div key={i} className="skeleton h-[120px] rounded-lg"></div>
                                ))}
                            </div>
                        ) : avatars.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-400">No avatars available yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-5 gap-2">
                                {avatars.map((avatar) => {
                                    const isCurrentAvatar = avatar.id === currentAvatarId;
                                    const isSelected = selectedAvatar?.id === avatar.id;

                                    return (
                                        <div
                                            key={avatar.id}
                                            className={`relative cursor-pointer border-2 rounded-lg overflow-hidden aspect-square transition-all ${
                                                isSelected ? 'border-blue-400' : isCurrentAvatar ? 'border-green-400' : 'border-white/30'
                                            } ${isUpdating && !isSelected ? 'opacity-50' : ''} ${!isUpdating && 'hover:bg-black/30'}`}
                                            onClick={() => !isUpdating && handleAvatarSelect(avatar)}
                                        >
                                            <img
                                                src={avatar.thumbnailUrl}
                                                alt={avatar.name}
                                                className="w-full h-full object-cover"
                                            />
                                            {isUpdating && isSelected && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                                    <span className="loading loading-spinner loading-lg text-white"></span>
                                                </div>
                                            )}
                                            {isCurrentAvatar && (
                                                <span className="badge badge-success badge-xs absolute top-1 right-1">
                                                    Current
                                                </span>
                                            )}
                                            <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/70">
                                                <p className="text-xs truncate">{avatar.name}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button onClick={onClose}>close</button>
                </form>
            </dialog>

            {toast && (
                <div className="toast toast-top">
                    <div className={`alert ${toast.type === 'error' ? 'alert-error' : 'alert-success'}`}>
                        <span>{toast.message}</span>
                    </div>
                </div>
            )}
        </>
    );
}

export default AvatarModal;
