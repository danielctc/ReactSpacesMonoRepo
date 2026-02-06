import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { isUsernameTaken } from "@disruptive-spaces/shared/firebase/userFirestore";
import { isUsernameSafe } from "@disruptive-spaces/shared/utils/profanityFilter";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

interface UsernameConfirmationProps {
    isOpen: boolean;
    onClose: () => void;
    userData: any;
    onConfirm: (userData: any) => Promise<void>;
    fullscreenRef?: React.RefObject<HTMLElement>;
    isRegistering?: boolean;
}

const UsernameConfirmation = ({
    isOpen,
    onClose,
    userData,
    onConfirm,
    fullscreenRef,
    isRegistering
}: UsernameConfirmationProps) => {
    const [username, setUsername] = useState(userData?.username || "");
    const [nickname, setNickname] = useState(userData?.Nickname || "");
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Validate username format (alphanumeric, no spaces, max 15 chars)
    const isUsernameValid = (username: string) => {
        if (!username || username.trim() === '') {
            return false;
        }

        // Check basic format requirements
        if (!/^[a-z0-9]{1,15}$/.test(username)) {
            return false;
        }

        // Check for inappropriate content
        if (!isUsernameSafe(username)) {
            return false;
        }

        return true;
    };

    // Check if username is available (not taken)
    const checkUsername = async (username: string) => {
        // Check basic format and inappropriate content
        if (!isUsernameValid(username)) {
            if (!username || username.trim() === '') {
                setError("Username cannot be empty");
            } else if (!isUsernameSafe(username)) {
                setError("Username contains inappropriate content");
            } else {
                setError("Username must be 1-15 characters, lowercase letters and numbers only");
            }
            return false;
        }

        setIsChecking(true);
        setError(null);

        try {
            // Add retry logic for username availability check
            let isTaken = false;
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
                try {
                    // Double check with the most recent data
                    isTaken = await isUsernameTaken(username);
                    // If successful, break out of retry loop
                    break;
                } catch (checkError) {
                    Logger.error(`Attempt ${retryCount + 1}: Error checking username:`, checkError);
                    retryCount++;

                    // Only throw on the last attempt
                    if (retryCount >= maxRetries) {
                        throw checkError;
                    }

                    // Wait a bit before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            if (isTaken) {
                setError("Username is already taken");
                return false;
            }

            // Username is available
            return true;
        } catch (error: any) {
            Logger.error("Error checking username after retries:", error);

            // Show a more user-friendly error depending on the type of error
            if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
                setError("Username check unavailable. Please try again or pick a unique name.");
            } else {
                setError("Error checking username availability. Please try again.");
            }

            // Return true if it's just a permission error - allow registration to proceed
            // This is a fallback that lets the Firebase function handle any conflicts later
            return error.code === 'permission-denied' || error.message?.includes('permissions');
        } finally {
            setIsChecking(false);
        }
    };

    // Debounce the username check
    useEffect(() => {
        if (!username) {
            setError("Username cannot be empty");
            return;
        }

        // Only validate when the input changes from initial value
        if (username !== userData?.username) {
            const handler = setTimeout(async () => {
                await checkUsername(username);
            }, 500);

            return () => clearTimeout(handler);
        }
    }, [username]);

    // When first/last name changes, regenerate the Nickname suggestion
    useEffect(() => {
        // When component first loads, ensure Nickname is set to the format from UserProvider
        if (userData && userData.firstName && userData.lastName) {
            const generatedNickname = `${userData.firstName}${userData.lastName.charAt(0).toUpperCase()}`;
            setNickname(generatedNickname);
        }
    }, [userData]);

    const handleConfirm = async () => {
        setIsSubmitting(true);

        try {
            // Validate username one last time
            const isValid = await checkUsername(username);

            if (!isValid) {
                setIsSubmitting(false);
                return;
            }

            // Validate nickname (max 15 chars and no inappropriate content)
            if (nickname.length > 15) {
                setError("Display Name must be at most 15 characters");
                setIsSubmitting(false);
                return;
            }

            // Check for inappropriate content in nickname
            if (!isUsernameSafe(nickname)) {
                setError("Display Name contains inappropriate content");
                setIsSubmitting(false);
                return;
            }

            // Log minimal information about the operation
            Logger.log("UsernameConfirmation: Preparing to confirm user registration");

            // Generate the exact format of Nickname as used in UserProvider
            const generatedNickname = userData.firstName && userData.lastName
                ? `${userData.firstName}${userData.lastName.charAt(0).toUpperCase()}`
                : "";

            // All good, proceed with registration
            const dataToConfirm = {
                // First spread userData to get all original fields
                ...userData,
                // Then explicitly include critical fields with defaults
                firstName: userData.firstName || "",
                lastName: userData.lastName || "",
                companyName: userData.companyName || "",
                linkedInProfile: userData.linkedInProfile || "",
                // Add the custom fields
                username,
                // Set the Nickname field (from the input or defaulting to generated)
                Nickname: nickname || generatedNickname,
                // Keep these auth fields if they exist
                email: userData.email,
                password: userData.password
            };

            Logger.log("UsernameConfirmation: Processed registration data with fields:", Object.keys(dataToConfirm).join(', '));

            await onConfirm(dataToConfirm);

            onClose();
        } catch (error) {
            Logger.error("Error during username confirmation:", error);
            alert("Error\n\nAn error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Prevent modal closing during submission
    const handleClose = () => {
        if (isSubmitting) {
            return; // Do nothing if submission is in progress
        }
        onClose();
    };

    return (
        <dialog className={`modal ${isOpen ? 'modal-open' : ''}`} onClick={handleClose}>
            <div className="modal-box bg-gray-800 text-white max-w-md" onClick={(e) => e.stopPropagation()}>
                <form method="dialog">
                    <button
                        className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >✕</button>
                </form>

                <h3 className="font-bold text-2xl mb-2">Customise Your Profile</h3>
                <p className="text-sm text-gray-400 mb-6">
                    Set your username and nickname
                </p>

                <div className="space-y-6">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text text-white">Username</span>
                        </label>
                        <div className="flex">
                            <span className="bg-gray-700 text-gray-400 px-4 py-3 rounded-l-lg border-none">@</span>
                            <input
                                type="text"
                                placeholder="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                                className="input input-bordered w-full bg-gray-700 border-none text-white placeholder-gray-500 rounded-l-none"
                                maxLength={15}
                            />
                        </div>
                        {error ? (
                            <label className="label">
                                <span className="label-text-alt text-error">{error}</span>
                            </label>
                        ) : (
                            <label className="label">
                                <span className="label-text-alt text-gray-400">
                                    Lowercase letters and numbers only, max 15 characters
                                </span>
                            </label>
                        )}
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text text-white">Nickname</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Nickname"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            className="input input-bordered w-full bg-gray-700 border-none text-white placeholder-gray-500"
                            maxLength={15}
                        />
                        <label className="label">
                            <span className="label-text-alt text-gray-400">
                                This is the name shown to others, max 15 characters
                            </span>
                        </label>
                    </div>
                </div>

                <div className="modal-action flex gap-3 w-full mt-8">
                    <button
                        className="btn btn-outline flex-1"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Back
                    </button>
                    <button
                        className={`btn btn-primary flex-[2] ${isSubmitting || isChecking ? 'loading' : ''}`}
                        onClick={handleConfirm}
                        disabled={!!error || !username || isSubmitting}
                    >
                        Finish
                    </button>
                </div>
            </div>
        </dialog>
    );
};

UsernameConfirmation.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    userData: PropTypes.object.isRequired,
    onConfirm: PropTypes.func.isRequired,
    fullscreenRef: PropTypes.object,
    isRegistering: PropTypes.bool
};

export default UsernameConfirmation;
