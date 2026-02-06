import React, { useContext, useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { useForm } from "react-hook-form";
import ReCAPTCHA from "react-google-recaptcha";
import { isUsernameSafe } from '@disruptive-spaces/shared/utils/profanityFilter';
import { useUnityInputManager } from '@disruptive-spaces/webgl/src/hooks/useUnityInputManager';
import UsernameConfirmation from './UsernameConfirmation';
import { generateUniqueUsername } from '@disruptive-spaces/shared/firebase/userFirestore';

// reCAPTCHA site key - Uses environment variable or fallback
// Note: reCAPTCHA site keys are PUBLIC and safe to include in code
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6Le4oQUrAAAAAHe0GMH5Z0tpuqTV2qqDzK9Yk4Uv";

if (!import.meta.env.VITE_RECAPTCHA_SITE_KEY && import.meta.env.DEV) {
    console.warn('DEV MODE: Using fallback reCAPTCHA key. Set VITE_RECAPTCHA_SITE_KEY in .env for production.');
}

interface RegisterProps {
    mode?: 'button' | 'link';
    label?: string;
    buttonProps?: Record<string, unknown>;
    isOpen?: boolean;
    onClose?: () => void;
}

interface RegisterFormData {
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    companyName: string;
    linkedInProfile?: string;
}

function Register({ mode, label, buttonProps = {}, isOpen: propIsOpen, onClose: propOnClose }: RegisterProps) {
    const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>();
    const { register: userProviderRegister } = useContext(UserContext);
    const { fullscreenRef } = useFullscreenContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const recaptchaRef = useRef<ReCAPTCHA>(null);
    const [toastMessage, setToastMessage] = useState<{ title: string; description: string | React.ReactNode; type: 'error' | 'success' } | null>(null);

    // State for username confirmation step
    const [showUsernameConfirmation, setShowUsernameConfirmation] = useState(false);
    const [pendingUserData, setPendingUserData] = useState<any>(null);
    const [registrationInProgress, setRegistrationInProgress] = useState(false);

    const isOpen = propIsOpen !== undefined ? propIsOpen : isModalOpen;
    const onClose = propOnClose || (() => setIsModalOpen(false));

    useUnityInputManager(isOpen || showUsernameConfirmation);

    // Reset captcha when modal closes/opens
    useEffect(() => {
        if (!isOpen && recaptchaRef.current) {
            recaptchaRef.current.reset();
            setCaptchaToken(null);
        }
    }, [isOpen]);

    // Show toast messages
    useEffect(() => {
        if (toastMessage) {
            const isError = toastMessage.type === 'error';
            alert(`${toastMessage.title}\n\n${typeof toastMessage.description === 'string' ? toastMessage.description : 'See console for details'}`);
            setToastMessage(null);
        }
    }, [toastMessage]);

    const handleCaptchaChange = (token: string | null) => {
        setCaptchaToken(token);
    };

    const handleRegister = async (data: RegisterFormData) => {
        Logger.log("Register.tsx: Processing registration form submission");
        const { email, password, confirmPassword, ...additionalData } = data;
        Logger.log("Register.tsx: Registration data fields:", Object.keys(additionalData).join(', '));

        if (!captchaToken) {
            setToastMessage({
                title: "Verification Required",
                description: "Please complete the reCAPTCHA verification.",
                type: "error"
            });
            return;
        }

        if (password !== confirmPassword) {
            setToastMessage({
                title: "Error",
                description: "Passwords do not match.",
                type: "error"
            });
            return;
        }

        // Check for profanity in name fields
        if (!isUsernameSafe(additionalData.firstName)) {
            setToastMessage({
                title: "Registration Error",
                description: "First name contains inappropriate content.",
                type: "error"
            });
            return;
        }

        if (!isUsernameSafe(additionalData.lastName)) {
            setToastMessage({
                title: "Registration Error",
                description: "Last name contains inappropriate content.",
                type: "error"
            });
            return;
        }

        if (!isUsernameSafe(additionalData.companyName)) {
            setToastMessage({
                title: "Registration Error",
                description: "Company name contains inappropriate content.",
                type: "error"
            });
            return;
        }

        setIsSubmitting(true);

        try {
            // Generate a suggested username based on first and last name
            const suggestedUsername = await generateUniqueUsername(
                additionalData.firstName || "",
                additionalData.lastName || ""
            );

            // Generate Nickname in the same format as in UserProvider
            const Nickname = additionalData.firstName && additionalData.lastName
                ? `${additionalData.firstName}${additionalData.lastName.charAt(0).toUpperCase()}`
                : "";

            // Check if the generated Nickname contains profanity
            if (Nickname && !isUsernameSafe(Nickname)) {
                setToastMessage({
                    title: "Registration Error",
                    description: "The generated nickname contains inappropriate content. Please use different name values.",
                    type: "error"
                });
                setIsSubmitting(false);
                return;
            }

            Logger.log("Register.tsx: Generated username and nickname for new user");

            // Ensure all fields have proper values
            const userData = {
                ...additionalData,
                firstName: additionalData.firstName || "",
                lastName: additionalData.lastName || "",
                companyName: additionalData.companyName || "",
                linkedInProfile: additionalData.linkedInProfile || "",
                email,
                password,
                username: suggestedUsername,
                Nickname,
                captchaToken,
            };

            Logger.log("Register.tsx: Prepared registration data with fields:", Object.keys(userData).join(', '));

            // Store pending user data for the confirmation step
            setPendingUserData(userData);

            // Show username confirmation modal
            setShowUsernameConfirmation(true);

        } catch (error: any) {
            Logger.error("User: Registration Error:", error);

            // Provide specific error message for duplicate email
            let errorMessage = "An error occurred during registration. Please try again.";
            let showSignInLink = false;

            // Handle specific error codes from Firebase Auth
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "This email address is already registered. Please sign in instead.";
                showSignInLink = true;
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "The email address is not valid. Please check and try again.";
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "The password is too weak. Please choose a stronger password.";
            } else if (error.message) {
                errorMessage = error.message;
            }

            setToastMessage({
                title: "Registration Failed",
                description: showSignInLink
                    ? `${errorMessage}\n\nClick OK to go to Sign In.`
                    : errorMessage,
                type: "error"
            });

            if (showSignInLink) {
                setTimeout(() => {
                    onClose();
                    window.dispatchEvent(new CustomEvent('openSignInModal'));
                }, 1000);
            }
        } finally {
            setIsSubmitting(false);

            // Reset reCAPTCHA
            if (recaptchaRef.current) {
                recaptchaRef.current.reset();
            }
        }
    };

    // Complete registration with username and nickname
    const completeRegistration = async (userData: any) => {
        setIsSubmitting(true);

        try {
            Logger.log("Register.tsx: Completing registration with confirmed username");

            // Extract auth data
            const { email, password, ...additionalData } = userData;

            // Prepare the final registration data
            const finalData = {
                ...additionalData,
                firstName: additionalData.firstName || "",
                lastName: additionalData.lastName || "",
                companyName: additionalData.companyName || "",
                linkedInProfile: additionalData.linkedInProfile || "",
                username: additionalData.username || "",
                Nickname: additionalData.Nickname || ""
            };

            Logger.log("Register.tsx: Final registration data includes fields:", Object.keys(finalData).join(', '));

            // Register user with Firebase (the global overlay will be shown by UserProvider)
            const registeredUserData = await userProviderRegister(email, password, finalData);

            // Success! The overlay will be shown by UserProvider
            onClose();
            setShowUsernameConfirmation(false);

            Logger.log('User: Registration process complete.');

            // Display email verification toast
            setToastMessage({
                title: "Registration Successful",
                description: "Please check your email for a verification link. You'll need to verify your email before signing in.",
                type: "success"
            });

            // Reset the state
            setPendingUserData(null);
            setRegistrationInProgress(false);

        } catch (error: any) {
            Logger.error("User: Registration Error during final step:", error);

            // Handle specific error scenarios
            let errorMessage = "An error occurred during registration. Please try again.";

            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "This email address is already in use. Please try another one.";
            } else if (error.message) {
                errorMessage = error.message;
            }

            setToastMessage({
                title: "Registration Failed",
                description: errorMessage,
                type: "error"
            });

            setShowUsernameConfirmation(false);
            setPendingUserData(null);
            setRegistrationInProgress(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleModal = () => {
        if (propOnClose) {
            propOnClose();
        } else {
            setIsModalOpen(!isModalOpen);
        }
    }

    const registerTrigger = mode === 'link' ? (
        <a className="link" onClick={toggleModal}>
            {label}
        </a>
    ) : (
        <button
            className="btn"
            onClick={toggleModal}
            {...buttonProps}
        >
            {label}
        </button>
    );

    // Close both modals
    const handleCloseAll = () => {
        setShowUsernameConfirmation(false);
        onClose();
    };

    return (
        <>
            {!propIsOpen && registerTrigger}
            <dialog className={`modal ${isOpen && !showUsernameConfirmation ? 'modal-open' : ''}`} onClick={onClose}>
                <div className="modal-box bg-gray-800 text-white max-w-md" onClick={(e) => e.stopPropagation()}>
                    <form method="dialog">
                        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={onClose}>✕</button>
                    </form>

                    <h3 className="font-bold text-2xl mb-2 text-center">Create Account</h3>
                    <p className="text-sm text-gray-400 text-center mb-6">
                        Fill in your details to get started
                    </p>

                    <form onSubmit={handleSubmit(handleRegister)} className="space-y-4">
                        <div className="form-control">
                            <input
                                type="text"
                                placeholder="Company Name"
                                className="input input-bordered w-full bg-gray-700 border-none text-white placeholder-gray-500"
                                {...register("companyName", { required: "Company name is required" })}
                            />
                            {errors.companyName && (
                                <label className="label">
                                    <span className="label-text-alt text-error">{errors.companyName.message}</span>
                                </label>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <div className="form-control flex-1">
                                <input
                                    type="text"
                                    placeholder="First Name"
                                    className="input input-bordered w-full bg-gray-700 border-none text-white placeholder-gray-500"
                                    {...register("firstName", { required: "First name is required" })}
                                />
                                {errors.firstName && (
                                    <label className="label">
                                        <span className="label-text-alt text-error">{errors.firstName.message}</span>
                                    </label>
                                )}
                            </div>
                            <div className="form-control flex-1">
                                <input
                                    type="text"
                                    placeholder="Last Name"
                                    className="input input-bordered w-full bg-gray-700 border-none text-white placeholder-gray-500"
                                    {...register("lastName", { required: "Last name is required" })}
                                />
                                {errors.lastName && (
                                    <label className="label">
                                        <span className="label-text-alt text-error">{errors.lastName.message}</span>
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="form-control">
                            <input
                                type="email"
                                placeholder="Work Email Address"
                                className="input input-bordered w-full bg-gray-700 border-none text-white placeholder-gray-500"
                                {...register("email", {
                                    required: "Email is required",
                                    pattern: {
                                        value: /^[^@ \t\r\n]+@[^@ \t\r\n]+\.[^@ \t\r\n]+$/,
                                        message: "Invalid email address"
                                    }
                                })}
                            />
                            {errors.email && (
                                <label className="label">
                                    <span className="label-text-alt text-error">{errors.email.message}</span>
                                </label>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <div className="form-control flex-1">
                                <input
                                    type="password"
                                    placeholder="Password"
                                    className="input input-bordered w-full bg-gray-700 border-none text-white placeholder-gray-500"
                                    {...register("password", {
                                        required: "Password is required",
                                        minLength: {
                                            value: 8,
                                            message: "Password must be at least 8 characters long"
                                        }
                                    })}
                                />
                                {errors.password && (
                                    <label className="label">
                                        <span className="label-text-alt text-error">{errors.password.message}</span>
                                    </label>
                                )}
                            </div>
                            <div className="form-control flex-1">
                                <input
                                    type="password"
                                    placeholder="Confirm Password"
                                    className="input input-bordered w-full bg-gray-700 border-none text-white placeholder-gray-500"
                                    {...register("confirmPassword", { required: "Confirm password is required" })}
                                />
                                {errors.confirmPassword && (
                                    <label className="label">
                                        <span className="label-text-alt text-error">{errors.confirmPassword.message}</span>
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="form-control">
                            <input
                                type="text"
                                placeholder="LinkedIn Profile (optional)"
                                className="input input-bordered w-full bg-gray-700 border-none text-white placeholder-gray-500"
                                {...register("linkedInProfile")}
                            />
                        </div>

                        <div className="flex justify-center my-4">
                            <ReCAPTCHA
                                ref={recaptchaRef}
                                sitekey={RECAPTCHA_SITE_KEY}
                                onChange={handleCaptchaChange}
                                theme="dark"
                            />
                        </div>

                        <div className="modal-action flex-col gap-4 mt-6">
                            <button
                                type="submit"
                                className={`btn btn-primary w-full ${isSubmitting ? 'loading' : ''}`}
                                disabled={!captchaToken}
                            >
                                {isSubmitting ? 'Processing...' : 'Next: Set Your Username'}
                            </button>
                            <p className="text-sm text-gray-400 text-center">
                                Already have an account?{" "}
                                <a className="link link-primary" onClick={() => {
                                    onClose();
                                    window.dispatchEvent(new CustomEvent('openSignInModal'));
                                }}>
                                    Sign In
                                </a>
                            </p>
                        </div>
                    </form>
                </div>
            </dialog>

            {/* Username Confirmation Modal */}
            {showUsernameConfirmation && (
                <UsernameConfirmation
                    isOpen={showUsernameConfirmation}
                    onClose={() => setShowUsernameConfirmation(false)}
                    userData={pendingUserData}
                    onConfirm={completeRegistration}
                    fullscreenRef={fullscreenRef}
                    isRegistering={registrationInProgress}
                />
            )}
        </>
    );
}

Register.propTypes = {
    mode: PropTypes.oneOf(['button', 'link']),
    label: PropTypes.string,
    buttonProps: PropTypes.object,
    isOpen: PropTypes.bool,
    onClose: PropTypes.func
};

export default Register;
