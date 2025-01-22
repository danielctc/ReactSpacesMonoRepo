import { useContext } from "react";
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import SignIn from "@disruptive-spaces/shared/components/auth/SignIn";
import SignOut from "@disruptive-spaces/shared/components/auth/SignOut";
import Register from "@disruptive-spaces/shared/components/auth/Register";

const HeaderAuthLinks = () => {
    const { user } = useContext(UserContext);

    return (
        <div className="flex items-center gap-4 align">
            {user ? (
                <>
                    <span>{user.Nickname}</span>
                    <SignOut mode="link" label="Sign Out" />
                </>
            ) : (
                <>
                    <Register mode="link" label="Register" />&nbsp;
                    <SignIn mode="link" label="Sign In" />
                </>
            )}
        </div>
    );
};

export default HeaderAuthLinks;
