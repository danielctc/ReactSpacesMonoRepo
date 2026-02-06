import { useState, useContext, useEffect, useRef } from "react";
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { blockUnityKeyboardInput, focusUnity } from "@disruptive-spaces/webgl/src/utils/unityKeyboard";
import { isUsernameTaken, updateUsername } from '@disruptive-spaces/shared/firebase/userFirestore';
import { isUsernameSafe } from '@disruptive-spaces/shared/utils/profanityFilter';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    profileImageUrl: string | null;
}

const ProfileModal = ({ isOpen, onClose, user, profileImageUrl }: ProfileModalProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        Nickname: user?.Nickname || "",
        username: user?.username || "",
        companyName: user?.companyName || "",
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        linkedInProfile: user?.linkedInProfile || ""
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [usernameError, setUsernameError] = useState("");
    const [checkingUsername, setCheckingUsername] = useState(false);
    const { sendUserToUnity, updateUser } = useContext(UserContext);
    const inputRef = useRef<HTMLInputElement>(null);

    // Update local state when user prop changes
    useEffect(() => {
        setFormData({
            Nickname: user?.Nickname || "",
            username: user?.username || "",
            companyName: user?.companyName || "",
            firstName: user?.firstName || "",
            lastName: user?.lastName || "",
            linkedInProfile: user?.linkedInProfile || ""
        });
    }, [user]);

    // Block Unity keyboard input when modal is open
    useEffect(() => {
        if (isOpen) {
            blockUnityKeyboardInput(true);
            window.dispatchEvent(new CustomEvent('modal-opened'));
        } else {
            blockUnityKeyboardInput(false).then(() => {
                setTimeout(() => {
                    focusUnity(true);
                }, 100);
            });
            window.dispatchEvent(new CustomEvent('modal-closed'));
        }

        return () => {
            if (isOpen) {
                blockUnityKeyboardInput(false);
                window.dispatchEvent(new CustomEvent('modal-closed'));
            }
        };
    }, [isOpen]);

    // Handle focus when editing mode changes
    useEffect(() => {
        if (isEditing && inputRef.current) {
            const focusInput = () => {
                inputRef.current?.focus();
                setIsInputFocused(true);
                blockUnityKeyboardInput(true);
            };

            focusInput();
            const timer1 = setTimeout(focusInput, 100);
            const timer2 = setTimeout(focusInput, 300);

            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
            };
        } else {
            setIsInputFocused(false);
        }
    }, [isEditing]);

    // Check username availability when it changes
    useEffect(() => {
        const checkUsernameAvailability = async () => {
            if (formData.username && formData.username !== user?.username) {
                setCheckingUsername(true);
                setUsernameError("");

                try {
                    // Validate username format
                    if (!/^[a-z0-9]{1,15}$/.test(formData.username)) {
                        setUsernameError("Username must be 1-15 characters, lowercase letters and numbers only");
                        setCheckingUsername(false);
                        return;
                    }

                    // Check for profanity in username
                    if (!isUsernameSafe(formData.username)) {
                        setUsernameError("Username contains inappropriate content");
                        setCheckingUsername(false);
                        return;
                    }

                    const isTaken = await isUsernameTaken(formData.username);
                    if (isTaken) {
                        setUsernameError("Username is already taken");
                    }
                } catch (error) {
                    Logger.error("Error checking username:", error);
                    setUsernameError("Error checking username availability");
                } finally {
                    setCheckingUsername(false);
                }
            }
        };

        const debounceTimer = setTimeout(checkUsernameAvailability, 500);
        return () => clearTimeout(debounceTimer);
    }, [formData.username, user?.username]);

    const handleClose = () => {
        setIsEditing(false);
        setIsInputFocused(false);
        onClose();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        // For username, convert to lowercase and restrict to alphanumeric
        if (name === "username") {
            const formattedValue = value.toLowerCase().replace(/[^a-z0-9]/g, '');
            setFormData(prev => ({
                ...prev,
                [name]: formattedValue
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSave = async () => {
        if (formData.Nickname.trim() === "") {
            alert("Error\n\nDisplay Name cannot be empty");
            return;
        }

        // Check for profanity in Display Name
        if (!isUsernameSafe(formData.Nickname)) {
            alert("Error\n\nDisplay Name contains inappropriate content");
            return;
        }

        // Check for profanity in first name
        if (formData.firstName && !isUsernameSafe(formData.firstName)) {
            alert("Error\n\nFirst name contains inappropriate content");
            return;
        }

        // Check for profanity in last name
        if (formData.lastName && !isUsernameSafe(formData.lastName)) {
            alert("Error\n\nLast name contains inappropriate content");
            return;
        }

        // Check for profanity in company name
        if (formData.companyName && !isUsernameSafe(formData.companyName)) {
            alert("Error\n\nCompany name contains inappropriate content");
            return;
        }

        if (usernameError) {
            alert(`Error\n\n${usernameError}`);
            return;
        }

        setIsLoading(true);

        try {
            // Always check username uniqueness again before updating
            if (formData.username !== user.username) {
                // Check for profanity in username one more time
                if (!isUsernameSafe(formData.username)) {
                    setUsernameError("Username contains inappropriate content");
                    alert("Error\n\nUsername contains inappropriate content");
                    setIsLoading(false);
                    return;
                }

                const isTaken = await isUsernameTaken(formData.username);
                if (isTaken) {
                    setUsernameError("Username is already taken");
                    alert("Error\n\nUsername is already taken");
                    setIsLoading(false);
                    return;
                }
            }

            const userRef = doc(db, "users", user.uid);

            // First update username separately using the provided function
            if (formData.username !== user.username) {
                try {
                    Logger.log("ProfileModal: Updating username from", user.username, "to", formData.username);
                    const success = await updateUsername(user.uid, formData.username);
                    if (!success) {
                        throw new Error("Failed to update username");
                    }
                    Logger.log("ProfileModal: Username updated successfully");
                } catch (error: any) {
                    Logger.error("Error updating username:", error);
                    alert(`Error\n\nFailed to update username: ${error.message || "Please try again"}`);
                    setIsLoading(false);
                    return;
                }
            }

            // Then update the rest of the profile
            Logger.log("ProfileModal: Updating user profile");

            try {
                // Create a profile update object without the username field (already updated)
                const profileUpdate = {
                    Nickname: formData.Nickname,
                    companyName: formData.companyName,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    linkedInProfile: formData.linkedInProfile,
                    username: formData.username, // Include username to ensure consistency
                    lastUpdated: new Date().toISOString()
                };

                await updateDoc(userRef, profileUpdate);
                Logger.log("ProfileModal: Profile updated successfully");

                // Set up listener for updates
                const unsubscribe = onSnapshot(userRef, (docSnapshot) => {
                    if (docSnapshot.exists()) {
                        const userData = docSnapshot.data();
                        if (userData.Nickname === formData.Nickname) {
                            try {
                                sendUserToUnity();
                            } catch (error) {
                                Logger.error("Error sending user to Unity:", error);
                            }
                            unsubscribe();
                        }
                    }
                }, (error) => {
                    Logger.error("Error in profile update listener:", error);
                });

                // Update the user context with the new data
                try {
                    await updateUser();
                } catch (error) {
                    Logger.error("Error updating user context:", error);
                }

                // Update local state with the new data
                setFormData({
                    Nickname: formData.Nickname,
                    username: formData.username,
                    companyName: formData.companyName,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    linkedInProfile: formData.linkedInProfile
                });

                alert("Success\n\nProfile updated successfully");

                setIsEditing(false);
            } catch (error: any) {
                Logger.error("Error updating profile data:", error);
                alert(`Error\n\nFailed to update profile: ${error.message || "Please try again"}`);
            }
        } catch (error: any) {
            Logger.error("Error in handleSave:", error);
            alert(`Error\n\nAn unexpected error occurred: ${error.message || "Please try again"}`);
        } finally {
            setIsLoading(false);
        }
    };

    const renderViewMode = () => (
        <div className="space-y-4 w-full">
            <div className="flex flex-col items-center gap-2">
                <h3 className="text-2xl font-bold">
                    {user.Nickname}
                </h3>
                <p className="text-base text-gray-400">
                    @{user.username}
                </p>
            </div>

            <div className="space-y-3 bg-gray-700 p-4 rounded-lg">
                <div className="flex flex-col">
                    <span className="text-sm text-gray-400">Company</span>
                    <span>{user.companyName || "Not specified"}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-sm text-gray-400">Full Name</span>
                    <span>{`${user.firstName || ""} ${user.lastName || ""}`.trim() || "Not specified"}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-sm text-gray-400">LinkedIn</span>
                    <span>{user.linkedInProfile || "Not specified"}</span>
                </div>
            </div>

            <button
                onClick={() => setIsEditing(true)}
                className="btn btn-outline btn-sm w-full text-white border-gray-600 hover:bg-gray-700"
            >
                Edit Profile
            </button>
        </div>
    );

    const renderEditMode = () => (
        <div className="space-y-4 w-full">
            <div className="form-control">
                <label className="label">
                    <span className="label-text text-gray-400 text-sm">Display Name</span>
                </label>
                <input
                    ref={inputRef}
                    name="Nickname"
                    value={formData.Nickname}
                    onChange={handleInputChange}
                    onFocus={() => {
                        setIsInputFocused(true);
                        blockUnityKeyboardInput(true);
                    }}
                    placeholder="Enter display name"
                    className="input input-bordered bg-gray-700 border-none text-white placeholder-gray-500"
                    maxLength={15}
                />
            </div>

            <div className="form-control">
                <label className="label">
                    <span className="label-text text-gray-400 text-sm">Username</span>
                </label>
                <div className="flex">
                    <span className="bg-gray-700 text-gray-400 px-4 py-3 rounded-l-lg border-none">@</span>
                    <input
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        placeholder="username"
                        className="input input-bordered bg-gray-700 border-none text-white placeholder-gray-500 rounded-l-none flex-1"
                        maxLength={15}
                        disabled={checkingUsername}
                    />
                </div>
                {usernameError && (
                    <label className="label">
                        <span className="label-text-alt text-error">{usernameError}</span>
                    </label>
                )}
                <label className="label">
                    <span className="label-text-alt text-gray-400">
                        Lowercase letters and numbers only, max 15 characters
                    </span>
                </label>
            </div>

            <div className="form-control">
                <label className="label">
                    <span className="label-text text-gray-400 text-sm">Company Name</span>
                </label>
                <input
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    placeholder="Enter company name"
                    className="input input-bordered bg-gray-700 border-none text-white placeholder-gray-500"
                />
            </div>

            <div className="flex gap-4">
                <div className="form-control flex-1">
                    <label className="label">
                        <span className="label-text text-gray-400 text-sm">First Name</span>
                    </label>
                    <input
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="Enter first name"
                        className="input input-bordered bg-gray-700 border-none text-white placeholder-gray-500"
                    />
                </div>
                <div className="form-control flex-1">
                    <label className="label">
                        <span className="label-text text-gray-400 text-sm">Last Name</span>
                    </label>
                    <input
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Enter last name"
                        className="input input-bordered bg-gray-700 border-none text-white placeholder-gray-500"
                    />
                </div>
            </div>

            <div className="form-control">
                <label className="label">
                    <span className="label-text text-gray-400 text-sm">LinkedIn Profile</span>
                </label>
                <input
                    name="linkedInProfile"
                    value={formData.linkedInProfile}
                    onChange={handleInputChange}
                    placeholder="Enter LinkedIn profile URL"
                    className="input input-bordered bg-gray-700 border-none text-white placeholder-gray-500"
                />
            </div>

            <div className="flex gap-2 justify-end mt-2">
                <button
                    onClick={() => {
                        setFormData({
                            Nickname: user?.Nickname || "",
                            username: user?.username || "",
                            companyName: user?.companyName || "",
                            firstName: user?.firstName || "",
                            lastName: user?.lastName || "",
                            linkedInProfile: user?.linkedInProfile || ""
                        });
                        setIsEditing(false);
                        setUsernameError("");
                    }}
                    className="btn btn-outline btn-sm text-white border-gray-600 hover:bg-gray-700"
                    disabled={isLoading}
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className={`btn btn-primary btn-sm ${isLoading || checkingUsername ? 'loading' : ''}`}
                    disabled={!!usernameError || checkingUsername}
                >
                    Save Changes
                </button>
            </div>
        </div>
    );

    return (
        <dialog className={`modal ${isOpen ? 'modal-open' : ''}`} onClick={handleClose}>
            <div
                className="modal-box bg-[#1a1a1a] text-white border border-[#333] max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <form method="dialog">
                    <button
                        className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                        onClick={handleClose}
                    >✕</button>
                </form>

                <h3 className="font-semibold text-base mb-6">Profile</h3>

                <div className="space-y-6">
                    <div className="avatar mx-auto flex justify-center">
                        <div className="w-32 rounded-full">
                            {profileImageUrl ? (
                                <img src={profileImageUrl} alt={user.Nickname} />
                            ) : (
                                <div className="w-32 h-32 bg-gray-500 flex items-center justify-center text-white text-4xl rounded-full">
                                    {user.Nickname?.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>
                    {isEditing ? renderEditMode() : renderViewMode()}

                    {/* Support Button */}
                    {!isEditing && (
                        <button
                            className="btn btn-ghost btn-sm btn-primary w-full"
                            onClick={() => window.open('https://support.spacesmetaverse.com/', '_blank')}
                        >
                            Visit Support Site
                        </button>
                    )}
                </div>
            </div>
        </dialog>
    );
};

export default ProfileModal;
