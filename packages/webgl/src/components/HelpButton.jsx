import React, { useState } from "react";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';

import {
  IconButton,
  Button,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Text,
} from "@chakra-ui/react";
import { QuestionOutlineIcon } from "@chakra-ui/icons"; // Import the question mark icon

function HelpButton() {
  const { fullscreenRef } = useFullscreenContext();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  return (
    <>
      <Tooltip
        label="Help"
        hasArrow
        placement="top"
        closeOnClick
        portalProps={{ containerRef: fullscreenRef }}
      >
        <IconButton
          aria-label="Controller Help"
          icon={<QuestionOutlineIcon />}
          onClick={toggleModal}
          variant="iconButton"
        />
      </Tooltip>

      <Modal isOpen={isModalOpen} onClose={toggleModal} size="md" portalProps={{ containerRef: fullscreenRef }}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Notes</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text variant="formIntro">The help button is showing so we can see the blur and transparency styles on the button.</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" onClick={toggleModal}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export default HelpButton;
