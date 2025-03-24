// @jsxImportSource react
import { useContext } from "react";
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider"; // Adjust the path as needed
// import { Logger } from '@disruptive-spaces/shared/logging/react-log';

import SignIn from "@disruptive-spaces/shared/components/auth/SignIn";
import SignOut from "@disruptive-spaces/shared/components/auth/SignOut";
import Register from "@disruptive-spaces/shared/components/auth/Register";

function AuthenticationButton() {

    const { user } = useContext(UserContext);
    // Logger.log('User: Auth Button: User: ', user);

    return (
        <div>
            {user !== null ? (
                <div>
                    {/* <span>Welcome, {user.Nickname} </span> */}
                    <SignOut />
                </div>
            ) : (
                <div>
                    <Register />
                    <SignIn />
                </div>
            )}
        </div>
    );
}

export default AuthenticationButton;
