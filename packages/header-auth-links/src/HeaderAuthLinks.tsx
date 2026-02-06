import React, { useContext, useEffect, useState } from "react";
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import SignIn from "@disruptive-spaces/shared/components/auth/SignIn";
import SignOut from "@disruptive-spaces/shared/components/auth/SignOut";
import Register from "@disruptive-spaces/shared/components/auth/Register";
import ProfileModal from "./ProfileModal";

const HeaderAuthLinks = () => {
    const { user, updateUser } = useContext(UserContext);
    const [isLoading, setIsLoading] = useState(true);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        // Short timeout to allow user context to be loaded
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    const handleProfileClose = () => {
        setIsProfileOpen(false);
        // Force a refresh of the user data
        updateUser();
    };

    const profileImageUrl = user?.rpmURL
        ? user.rpmURL.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75")
        : null;

    const isAdmin = user?.groups?.includes('disruptiveAdmin');

    // Don't render anything while loading
    if (isLoading) {
        return null;
    }

    return (
        <div className="flex items-center gap-4">
            {user ? (
                <>
                    <ProfileModal
                        isOpen={isProfileOpen}
                        onClose={handleProfileClose}
                        user={user}
                        profileImageUrl={profileImageUrl}
                    />
                    <div className="dropdown dropdown-end">
                        <div
                            tabIndex={0}
                            className="flex items-center h-10 px-4 rounded-full border border-white/30 hover:border-2 hover:border-white cursor-pointer transition-all"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full overflow-hidden bg-white flex items-center justify-center">
                                    <div className="avatar">
                                        <div className="w-full h-full rounded-full">
                                            {profileImageUrl ? (
                                                <img src={profileImageUrl} alt={user.Nickname} />
                                            ) : (
                                                <div className="w-full h-full bg-gray-500 flex items-center justify-center text-white text-xs">
                                                    {user.Nickname?.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-white font-medium">
                                    {user.Nickname}
                                </span>
                                <div className="flex items-center h-7">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        {isMenuOpen && (
                            <ul
                                tabIndex={0}
                                className="dropdown-content menu p-2 shadow bg-gray-800 border border-gray-700 rounded-box w-52 mt-2 z-[9999]"
                            >
                                <li className="p-4 flex items-center gap-3">
                                    <div className="avatar">
                                        <div className="w-12 rounded-full">
                                            {profileImageUrl ? (
                                                <img src={profileImageUrl} alt={user.Nickname} />
                                            ) : (
                                                <div className="w-12 h-12 bg-gray-500 flex items-center justify-center text-white text-xl rounded-full">
                                                    {user.Nickname?.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-xl font-bold text-white">
                                        {user.Nickname}
                                    </span>
                                </li>
                                <div className="divider my-0 border-gray-700"></div>
                                {isAdmin && (
                                    <li>
                                        <a
                                            href="/myadmin"
                                            className="text-white hover:bg-gray-700"
                                        >
                                            My Admin
                                        </a>
                                    </li>
                                )}
                                <li>
                                    <a className="text-white hover:bg-gray-700">
                                        My Spaces
                                    </a>
                                </li>
                                <li>
                                    <a
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            setIsProfileOpen(true);
                                        }}
                                        className="text-white hover:bg-gray-700"
                                    >
                                        View Profile
                                    </a>
                                </li>
                                <div className="divider my-0 border-gray-700"></div>
                                <li>
                                    <a className="text-white hover:bg-gray-700">
                                        Support
                                    </a>
                                </li>
                                <li>
                                    <SignOut
                                        mode="link"
                                        label="Log out"
                                    />
                                </li>
                            </ul>
                        )}
                    </div>
                </>
            ) : (
                <>
                    <Register
                        mode="button"
                        label="Register"
                        buttonProps={{
                            className: "btn bg-white text-black rounded-full px-6 py-2 font-medium hover:bg-gray-100 flex items-center gap-2"
                        }}
                    />
                    <SignIn
                        mode="button"
                        label="Sign In"
                        buttonProps={{
                            className: "btn bg-white text-black rounded-full px-6 py-2 font-medium hover:bg-gray-100 flex items-center gap-2"
                        }}
                    />
                </>
            )}
        </div>
    );
};

export default HeaderAuthLinks;
