import React, { useContext, useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { getSpaceItem } from '@disruptive-spaces/shared/firebase/spacesFirestore';
import { useForm } from "react-hook-form";
import Register from "./Register";
import { useUnityInputManager } from '@disruptive-spaces/webgl/src/hooks/useUnityInputManager';
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from '@disruptive-spaces/shared/firebase/firebase';
import ReCAPTCHA from "react-google-recaptcha";

// reCAPTCHA site key - Uses environment variable or fallback
// Note: reCAPTCHA site keys are PUBLIC and safe to include in code
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6Le4oQUrAAAAAHe0GMH5Z0tpuqTV2qqDzK9Yk4Uv";

// LOCAL DEV: Bypass reCAPTCHA in development mode
const SKIP_RECAPTCHA = import.meta.env.DEV || window.location.hostname === 'localhost';

if (SKIP_RECAPTCHA) {
    console.warn('DEV MODE: reCAPTCHA bypassed for local development.');
} else if (!import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
    console.warn('Using fallback reCAPTCHA key. Set VITE_RECAPTCHA_SITE_KEY in .env for production.');
}

interface SignInProps {
    mode?: 'button' | 'link';
    label?: string;
    buttonProps?: Record<string, unknown>;
    initialIsOpen?: boolean;
}

function SignIn({ mode = 'button', label = 'Sign In', buttonProps = {}, initialIsOpen = false }: SignInProps) {
    const { signIn, createGuestUser } = useContext(UserContext);
    const { fullscreenRef } = useFullscreenContext();
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOpen, setIsOpen] = useState(initialIsOpen);
    const [showRegister, setShowRegister] = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [isResetting, setIsResetting] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [allowGuestUsers, setAllowGuestUsers] = useState(false);
    const [isCreatingGuest, setIsCreatingGuest] = useState(false);
    const recaptchaRef = useRef<ReCAPTCHA>(null);

    useUnityInputManager(isOpen || showResetPassword);

    // Check if guest users are allowed for current space
    useEffect(() => {
        const checkGuestAccess = async () => {
            try {
                const path = window.location.pathname;
                const spaceSlugMatch = path.match(/\/(w|embed)\/([^\/]+)/);
                if (spaceSlugMatch) {
                    const spaceId = spaceSlugMatch[2];
                    const spaceData = await getSpaceItem(spaceId);
                    setAllowGuestUsers(spaceData?.allowGuestUsers || false);
                }
            } catch (error) {
                Logger.error('SignIn: Error checking guest access:', error);
                setAllowGuestUsers(false);
            }
        };

        if (isOpen) {
            checkGuestAccess();
        }
    }, [isOpen]);

    // Listen for custom event to open the SignIn modal
    useEffect(() => {
        const handleOpenSignInModal = () => {
            setIsOpen(true);
        };

        window.addEventListener('openSignInModal', handleOpenSignInModal);

        return () => {
            window.removeEventListener('openSignInModal', handleOpenSignInModal);
        };
    }, []);

    const handleCaptchaChange = (token: string | null) => {
        setCaptchaToken(token);
    };

    const handleSignIn = async (data: { email: string; password: string }) => {
        if (!SKIP_RECAPTCHA && !captchaToken) {
            alert("Please complete the reCAPTCHA verification.");
            return;
        }

        setIsSubmitting(true);

        try {
            const token = SKIP_RECAPTCHA ? 'dev-bypass' : captchaToken;
            await signIn(data.email, data.password, token);
            Logger.log('User: Sign-in process complete.');
            setIsOpen(false);
            window.location.reload();

        } catch (error: any) {
            Logger.error("User: SignIn Error:", error);

            const errorMessage = error.message || "An error occurred while logging in. Please check your credentials.";
            const isVerificationError = errorMessage.includes("verify your email");

            alert(`${isVerificationError ? "Email Verification Required" : "Error"}\n\n${errorMessage}`);
        } finally {
            setIsSubmitting(false);

            if (recaptchaRef.current) {
                recaptchaRef.current.reset();
            }
        }
    };

    const handleResetPassword = async () => {
        if (!resetEmail) {
            alert("Please enter your email address to reset your password.");
            return;
        }

        try {
            setIsResetting(true);
            await sendPasswordResetEmail(auth, resetEmail);

            alert("Password Reset Email Sent\n\nCheck your email for instructions to reset your password.");

            setShowResetPassword(false);
        } catch (error: any) {
            Logger.error("User: Reset Password Error:", error);

            alert(`Error\n\n${error.message || "Failed to send password reset email. Please try again."}`);
        } finally {
            setIsResetting(false);
        }
    };

    const toggleModal = () => setIsOpen(prev => !prev);

    const handleShowRegister = () => {
        setIsOpen(false);
        setShowRegister(true);
    };

    const handleShowResetPassword = () => {
        setShowResetPassword(true);
    };

    const handleContinueAsGuest = async () => {
        try {
            setIsCreatingGuest(true);

            const path = window.location.pathname;
            const spaceSlugMatch = path.match(/\/(w|embed)\/([^\/]+)/);
            if (spaceSlugMatch) {
                const spaceId = spaceSlugMatch[2];
                await createGuestUser(spaceId);

                alert("Welcome, Guest!\n\nYou're now entering as a guest user.");

                setIsOpen(false);
                window.location.reload();
            }
        } catch (error) {
            Logger.error('SignIn: Error creating guest user:', error);
            alert("Error\n\nFailed to create guest user. Please try again.");
        } finally {
            setIsCreatingGuest(false);
        }
    };

    const signInTrigger = mode === 'link' ? (
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

    return (
        <>
            {signInTrigger}
            <dialog className={`modal ${isOpen ? 'modal-open' : ''}`} onClick={toggleModal}>
                <div className="modal-box bg-gray-800 text-white max-w-md" onClick={(e) => e.stopPropagation()}>
                    <form method="dialog">
                        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={toggleModal}>✕</button>
                    </form>

                    <h3 className="font-bold text-2xl mb-2 text-center">Welcome Back</h3>
                    <p className="text-sm text-gray-400 text-center mb-6">
                        Enter your credentials to access your account
                    </p>

                    <form onSubmit={handleSubmit(handleSignIn)} className="space-y-4">
                        <div className="form-control">
                            <div className="relative">
                                <input
                                    type="email"
                                    placeholder="Email"
                                    className="input input-bordered w-full bg-gray-700 border-none text-white placeholder-gray-500"
                                    {...register("email", { required: "Email is required." })}
                                />
                            </div>
                            {errors.email && (
                                <label className="label">
                                    <span className="label-text-alt text-error">{errors.email.message as string}</span>
                                </label>
                            )}
                        </div>

                        <div className="form-control">
                            <div className="relative">
                                <input
                                    type="password"
                                    placeholder="Password"
                                    className="input input-bordered w-full bg-gray-700 border-none text-white placeholder-gray-500"
                                    {...register("password", { required: "Password is required." })}
                                />
                            </div>
                            {errors.password && (
                                <label className="label">
                                    <span className="label-text-alt text-error">{errors.password.message as string}</span>
                                </label>
                            )}
                        </div>

                        <div className="flex justify-end">
                            <a
                                className="link link-primary text-sm"
                                onClick={handleShowResetPassword}
                            >
                                Forgot Password?
                            </a>
                        </div>

                        {!SKIP_RECAPTCHA && (
                            <div className="flex justify-center my-4">
                                <ReCAPTCHA
                                    ref={recaptchaRef}
                                    sitekey={RECAPTCHA_SITE_KEY}
                                    onChange={handleCaptchaChange}
                                    theme="dark"
                                />
                            </div>
                        )}

                        <div className="modal-action flex-col gap-4 mt-6">
                            <button
                                type="submit"
                                className={`btn btn-primary w-full ${isSubmitting ? 'loading' : ''}`}
                                disabled={!SKIP_RECAPTCHA && !captchaToken}
                            >
                                {isSubmitting ? 'Signing In...' : 'Sign In'}
                            </button>

                            {allowGuestUsers && (
                                <button
                                    type="button"
                                    className={`btn btn-outline w-full ${isCreatingGuest ? 'loading' : ''}`}
                                    onClick={handleContinueAsGuest}
                                >
                                    {isCreatingGuest ? 'Creating Guest Account...' : 'Continue as Guest'}
                                </button>
                            )}

                            <p className="text-sm text-gray-400 text-center">
                                Don't have an account?{" "}
                                <a className="link link-primary" onClick={handleShowRegister}>
                                    Sign Up
                                </a>
                            </p>
                        </div>
                    </form>
                </div>
            </dialog>

            <dialog className={`modal ${showResetPassword ? 'modal-open' : ''}`} onClick={() => setShowResetPassword(false)}>
                <div className="modal-box bg-gray-800 text-white max-w-md" onClick={(e) => e.stopPropagation()}>
                    <form method="dialog">
                        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => setShowResetPassword(false)}>✕</button>
                    </form>

                    <h3 className="font-bold text-2xl mb-2 text-center">Reset Password</h3>
                    <p className="text-sm text-gray-400 text-center mb-6">
                        Enter your email to receive password reset instructions
                    </p>

                    <div className="form-control mb-6">
                        <input
                            type="email"
                            placeholder="Email"
                            className="input input-bordered w-full bg-gray-700 border-none text-white placeholder-gray-500"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                        />
                    </div>

                    <div className="modal-action flex-col gap-4">
                        <button
                            className={`btn btn-primary w-full ${isResetting ? 'loading' : ''}`}
                            onClick={handleResetPassword}
                        >
                            {isResetting ? 'Sending...' : 'Send Reset Link'}
                        </button>
                        <p className="text-sm text-gray-400 text-center">
                            Remember your password?{" "}
                            <a
                                className="link link-primary"
                                onClick={() => setShowResetPassword(false)}
                            >
                                Back to Sign In
                            </a>
                        </p>
                    </div>
                </div>
            </dialog>

            <Register
                mode="link"
                isOpen={showRegister}
                onClose={() => setShowRegister(false)}
            />
        </>
    );
}

SignIn.propTypes = {
    mode: PropTypes.oneOf(['button', 'link']),
    label: PropTypes.string,
    buttonProps: PropTypes.object,
    initialIsOpen: PropTypes.bool
};

export default SignIn;
