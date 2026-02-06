import React from 'react';
import { useRegistration } from '@disruptive-spaces/shared/providers/UserProvider';

// This component shows a global overlay when registration is in progress
const RegistrationOverlay = () => {
    const { registrationInProgress } = useRegistration();

    if (!registrationInProgress) return null;

    return (
        <dialog className="modal modal-open">
            <div className="modal-box bg-transparent shadow-none max-w-full max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-col items-center justify-center p-8 max-w-md text-center">
                    <span className="loading loading-spinner loading-lg text-primary mb-6"></span>
                    <h3 className="text-2xl font-bold text-white mb-4">
                        Creating Your Account
                    </h3>
                    <p className="text-base text-gray-300 mb-3">
                        Please wait while we set up your profile with Spaces Metaverse
                    </p>
                    <p className="text-sm text-gray-400 mb-1">
                        This typically takes 5-10 seconds to complete
                    </p>
                    <p className="text-sm text-gray-400">
                        Please do not refresh or close this page
                    </p>
                </div>
            </div>
            <div className="modal-backdrop bg-black/80 backdrop-blur-lg"></div>
        </dialog>
    );
};

export default RegistrationOverlay;
