import withFullAdmin from "@disruptive-spaces/shared/permissions/withFullAdmin";
import EditButton from "./EditButton";

// Wrap EditButton with access control (can be extended for other permissions)
const AccessEditButton = withFullAdmin(EditButton);

export default AccessEditButton;
