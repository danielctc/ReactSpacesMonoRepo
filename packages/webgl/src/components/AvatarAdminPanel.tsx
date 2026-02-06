import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaUpload, FaEdit, FaTrash, FaPlus, FaEye, FaEyeSlash } from 'react-icons/fa';
import {
    getAllAvatarsAdmin,
    uploadAvatarCollectionAssets,
    updateAvatar,
    deleteAvatar,
    getNextSortOrder
} from '@disruptive-spaces/shared/firebase/avatarsFirestore';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

interface Avatar {
    id: string;
    name: string;
    thumbnailUrl: string;
    glbUrl: string;
    category?: string;
    isActive: boolean;
    sortOrder?: number;
    allowedSpaces?: string[];
    allowedGroups?: string[];
}

const CATEGORIES = [
    { value: 'default', label: 'Default' },
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'fantasy', label: 'Fantasy' },
    { value: 'custom', label: 'Custom' }
];

function AvatarAdminPanel() {
    const [avatars, setAvatars] = useState<Avatar[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [editingAvatar, setEditingAvatar] = useState<Avatar | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [toast, setToast] = useState<{message: string; type: string} | null>(null);

    // Upload form state
    const [glbFile, setGlbFile] = useState<File | null>(null);
    const [pngFile, setPngFile] = useState<File | null>(null);
    const [avatarName, setAvatarName] = useState('');
    const [avatarCategory, setAvatarCategory] = useState('default');
    const [pngPreview, setPngPreview] = useState<string | null>(null);

    const glbInputRef = useRef<HTMLInputElement>(null);
    const pngInputRef = useRef<HTMLInputElement>(null);

    const fetchAvatars = useCallback(async () => {
        setIsLoading(true);
        try {
            const avatarList = await getAllAvatarsAdmin();
            setAvatars(avatarList);
            Logger.log('AvatarAdminPanel: Fetched avatars:', avatarList.length);
        } catch (error) {
            Logger.error('AvatarAdminPanel: Error fetching avatars:', error);
            setToast({
                message: 'Failed to load avatars.',
                type: 'error'
            });
            setTimeout(() => setToast(null), 3000);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAvatars();
    }, [fetchAvatars]);

    const handleGlbSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.name.endsWith('.glb')) {
            setGlbFile(file);
        } else {
            setToast({ message: 'Please select a .glb file.', type: 'warning' });
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handlePngSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
            setPngFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPngPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setToast({ message: 'Please select a PNG or JPEG image.', type: 'warning' });
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleUpload = async () => {
        if (!glbFile || !pngFile || !avatarName.trim()) {
            setToast({ message: 'Please provide a GLB file, PNG thumbnail, and name.', type: 'warning' });
            setTimeout(() => setToast(null), 3000);
            return;
        }

        setIsUploading(true);
        try {
            const sortOrder = await getNextSortOrder();
            await uploadAvatarCollectionAssets(glbFile, pngFile, {
                name: avatarName.trim(),
                category: avatarCategory,
                sortOrder
            });

            setToast({ message: 'The avatar has been added to the collection.', type: 'success' });
            setTimeout(() => setToast(null), 3000);

            // Reset form
            setGlbFile(null);
            setPngFile(null);
            setAvatarName('');
            setAvatarCategory('default');
            setPngPreview(null);
            if (glbInputRef.current) glbInputRef.current.value = '';
            if (pngInputRef.current) pngInputRef.current.value = '';

            fetchAvatars();
        } catch (error) {
            Logger.error('AvatarAdminPanel: Error uploading avatar:', error);
            setToast({ message: 'Failed to upload avatar. Please try again.', type: 'error' });
            setTimeout(() => setToast(null), 3000);
        } finally {
            setIsUploading(false);
        }
    };

    const handleEditClick = (avatar: Avatar) => {
        setEditingAvatar({ ...avatar });
        setIsEditOpen(true);
    };

    const handleEditSave = async () => {
        if (!editingAvatar) return;

        try {
            await updateAvatar(editingAvatar.id, {
                name: editingAvatar.name,
                category: editingAvatar.category,
                isActive: editingAvatar.isActive,
                allowedSpaces: editingAvatar.allowedSpaces || [],
                allowedGroups: editingAvatar.allowedGroups || []
            });

            setToast({ message: 'Changes have been saved.', type: 'success' });
            setTimeout(() => setToast(null), 2000);

            setIsEditOpen(false);
            fetchAvatars();
        } catch (error) {
            Logger.error('AvatarAdminPanel: Error updating avatar:', error);
            setToast({ message: 'Failed to save changes.', type: 'error' });
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleDelete = async (avatarId: string) => {
        try {
            await deleteAvatar(avatarId);
            setToast({ message: 'The avatar has been hidden from users.', type: 'info' });
            setTimeout(() => setToast(null), 2000);
            fetchAvatars();
        } catch (error) {
            Logger.error('AvatarAdminPanel: Error deleting avatar:', error);
            setToast({ message: 'Failed to disable avatar.', type: 'error' });
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleToggleActive = async (avatar: Avatar) => {
        try {
            await updateAvatar(avatar.id, { isActive: !avatar.isActive });
            fetchAvatars();
        } catch (error) {
            Logger.error('AvatarAdminPanel: Error toggling avatar:', error);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-4">
            {/* Upload Section */}
            <div className="bg-white/5 rounded-lg p-4 border border-white/20">
                <p className="text-md font-semibold mb-4 text-white">Upload New Avatar</p>

                <div className="flex gap-4 flex-wrap">
                    {/* GLB File Input */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="form-control">
                            <span className="label text-sm text-white/70">GLB Model</span>
                            <input
                                ref={glbInputRef}
                                type="file"
                                accept=".glb"
                                onChange={handleGlbSelect}
                                className="hidden"
                            />
                            <button
                                className="btn btn-sm btn-outline btn-primary w-full"
                                onClick={() => glbInputRef.current?.click()}
                            >
                                <FaUpload /> {glbFile ? glbFile.name : 'Select GLB'}
                            </button>
                        </label>
                    </div>

                    {/* PNG File Input */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="form-control">
                            <span className="label text-sm text-white/70">Thumbnail (PNG)</span>
                            <input
                                ref={pngInputRef}
                                type="file"
                                accept="image/png,image/jpeg"
                                onChange={handlePngSelect}
                                className="hidden"
                            />
                            <div className="flex gap-2">
                                <button
                                    className="btn btn-sm btn-outline btn-primary flex-1"
                                    onClick={() => pngInputRef.current?.click()}
                                >
                                    <FaUpload /> {pngFile ? pngFile.name : 'Select PNG'}
                                </button>
                                {pngPreview && (
                                    <img
                                        src={pngPreview}
                                        className="w-8 h-8 rounded-md object-cover"
                                        alt="Preview"
                                    />
                                )}
                            </div>
                        </label>
                    </div>

                    {/* Name Input */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="form-control">
                            <span className="label text-sm text-white/70">Name</span>
                            <input
                                type="text"
                                className="input input-sm input-bordered bg-white/10 border-white/30"
                                value={avatarName}
                                onChange={(e) => setAvatarName(e.target.value)}
                                placeholder="Avatar name"
                            />
                        </label>
                    </div>

                    {/* Category Select */}
                    <div className="flex-1 min-w-[150px]">
                        <label className="form-control">
                            <span className="label text-sm text-white/70">Category</span>
                            <select
                                className="select select-sm select-bordered bg-white/10 border-white/30"
                                value={avatarCategory}
                                onChange={(e) => setAvatarCategory(e.target.value)}
                            >
                                {CATEGORIES.map((cat) => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    {/* Upload Button */}
                    <div className="self-end">
                        <button
                            className={`btn btn-sm btn-success ${isUploading ? 'loading' : ''}`}
                            onClick={handleUpload}
                            disabled={isUploading}
                        >
                            {isUploading ? 'Uploading' : <><FaPlus /> Upload Avatar</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Avatar Grid */}
            <div>
                <p className="text-md font-semibold mb-4 text-white">
                    Avatar Collection ({avatars.length})
                </p>

                {isLoading ? (
                    <div className="grid grid-cols-5 gap-3">
                        {Array.from({ length: 10 }, (_, i) => (
                            <div key={i} className="skeleton h-[150px] rounded-lg"></div>
                        ))}
                    </div>
                ) : avatars.length === 0 ? (
                    <div className="text-center py-8 text-white/60">
                        <p>No avatars in collection. Upload one above.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-5 gap-3">
                        {avatars.map((avatar) => (
                            <div
                                key={avatar.id}
                                className={`relative rounded-lg overflow-hidden border-2 ${avatar.isActive ? 'border-white/30' : 'border-red-500'} ${avatar.isActive ? 'opacity-100' : 'opacity-60'} bg-black/30`}
                            >
                                <img
                                    src={avatar.thumbnailUrl}
                                    alt={avatar.name}
                                    className="w-full aspect-square object-cover"
                                />

                                {!avatar.isActive && (
                                    <span className="badge badge-error badge-xs absolute top-1 left-1">
                                        Hidden
                                    </span>
                                )}

                                <span className="badge badge-primary badge-xs absolute top-1 right-1">
                                    {avatar.category || 'default'}
                                </span>

                                <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2">
                                    <p className="text-xs text-white truncate mb-1">{avatar.name}</p>
                                    <div className="flex gap-1">
                                        <button
                                            className="btn btn-xs btn-ghost text-blue-400"
                                            onClick={() => handleEditClick(avatar)}
                                            aria-label="Edit avatar"
                                        >
                                            <FaEdit />
                                        </button>
                                        <button
                                            className={`btn btn-xs btn-ghost ${avatar.isActive ? 'text-yellow-400' : 'text-green-400'}`}
                                            onClick={() => handleToggleActive(avatar)}
                                            aria-label={avatar.isActive ? 'Hide avatar' : 'Show avatar'}
                                        >
                                            {avatar.isActive ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                        <button
                                            className="btn btn-xs btn-ghost text-red-400"
                                            onClick={() => handleDelete(avatar.id)}
                                            aria-label="Delete avatar"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {isEditOpen && editingAvatar && (
                <dialog open className="modal">
                    <div className="modal-box bg-[#1a1a1a] text-white">
                        <h3 className="font-bold text-lg">Edit Avatar</h3>
                        <button
                            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                            onClick={() => setIsEditOpen(false)}
                        >
                            ✕
                        </button>
                        <div className="flex flex-col gap-4 py-4">
                            <img
                                src={editingAvatar.thumbnailUrl}
                                className="w-[100px] h-[100px] rounded-lg object-cover mx-auto"
                                alt={editingAvatar.name}
                            />
                            <label className="form-control">
                                <span className="label text-sm">Name</span>
                                <input
                                    type="text"
                                    className="input input-bordered bg-white/10"
                                    value={editingAvatar.name}
                                    onChange={(e) => setEditingAvatar({
                                        ...editingAvatar,
                                        name: e.target.value
                                    })}
                                />
                            </label>
                            <label className="form-control">
                                <span className="label text-sm">Category</span>
                                <select
                                    className="select select-bordered bg-white/10"
                                    value={editingAvatar.category || 'default'}
                                    onChange={(e) => setEditingAvatar({
                                        ...editingAvatar,
                                        category: e.target.value
                                    })}
                                >
                                    {CATEGORIES.map((cat) => (
                                        <option key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="form-control">
                                <span className="label text-sm">Allowed Spaces</span>
                                <input
                                    type="text"
                                    className="input input-bordered input-sm bg-white/10"
                                    value={(editingAvatar.allowedSpaces || []).join(', ')}
                                    onChange={(e) => setEditingAvatar({
                                        ...editingAvatar,
                                        allowedSpaces: e.target.value
                                            .split(',')
                                            .map(s => s.trim())
                                            .filter(s => s.length > 0)
                                    })}
                                    placeholder="Leave empty for all spaces"
                                />
                                <span className="label-text-alt text-xs text-white/60 mt-1">
                                    Comma-separated space IDs (empty = all spaces)
                                </span>
                            </label>
                            <label className="form-control">
                                <span className="label text-sm">Allowed Groups</span>
                                <input
                                    type="text"
                                    className="input input-bordered input-sm bg-white/10"
                                    value={(editingAvatar.allowedGroups || []).join(', ')}
                                    onChange={(e) => setEditingAvatar({
                                        ...editingAvatar,
                                        allowedGroups: e.target.value
                                            .split(',')
                                            .map(s => s.trim())
                                            .filter(s => s.length > 0)
                                    })}
                                    placeholder="Leave empty for all users"
                                />
                                <span className="label-text-alt text-xs text-white/60 mt-1">
                                    Comma-separated group names (empty = all users)
                                </span>
                            </label>
                        </div>
                        <div className="modal-action">
                            <button className="btn btn-ghost" onClick={() => setIsEditOpen(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleEditSave}>
                                Save Changes
                            </button>
                        </div>
                    </div>
                </dialog>
            )}

            {toast && (
                <div className="toast toast-top">
                    <div className={`alert ${toast.type === 'error' ? 'alert-error' : toast.type === 'warning' ? 'alert-warning' : toast.type === 'info' ? 'alert-info' : 'alert-success'}`}>
                        <span>{toast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AvatarAdminPanel;
