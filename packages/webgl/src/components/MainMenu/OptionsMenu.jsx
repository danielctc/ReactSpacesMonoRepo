import React from "react";
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  MenuGroup,
  MenuDivider,
} from "@chakra-ui/react";
import { FaBars, FaComment, FaFileCode, FaPhone } from "react-icons/fa"; // Import appropriate icons

function OptionsMenu() {
  return (
    <Menu>
      {({ isOpen }) => (
        <>
          <MenuButton
            as={IconButton}
            aria-label="Options"
            icon={<FaBars />}
            color="white"
            backgroundColor="rgba(0, 0, 0, 0.25)"
            _hover={{ backgroundColor: "rgba(255, 255, 255, 0.25)" }}
            borderRadius="md"
            backdrop="auto"
            backdropFilter="blur(3px)"
          />

          <MenuList>
            <MenuGroup title="Profile">
              <MenuItem icon={<FaComment />}>Settings</MenuItem>{" "}
              {/* Represent sending text */}
              <MenuItem icon={<FaComment />}>Log Out</MenuItem>{" "}
              {/* Represent sending text */}
            </MenuGroup>
            <MenuGroup title="Another Section"></MenuGroup>
          </MenuList>
        </>
      )}
    </Menu>
  );
}

export default OptionsMenu;
