import { useRef, useEffect } from "react";
import { useUnityOnHelloFromUnity } from "../../hooks/unityEvents";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogOverlay,
  Button,
  useDisclosure,
} from "@chakra-ui/react";

function HelloFromUnityListener() {
  // Get eventData and resetEventData from the new hook
  const [eventData, resetEventData] = useUnityOnHelloFromUnity();

  // Alert State
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef();

  // Whenever eventData changes, if it's not null, open the alert dialog
  useEffect(() => {
    if (eventData) {
      onOpen();
    }
  }, [eventData, onOpen]);

  return (
    <>
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => {
          onClose();
          resetEventData(); // Reset the eventData when dialog is closed
        }}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>HelloFromUnity Event</AlertDialogHeader>
            <AlertDialogBody>
              {eventData ? (
                <>
                  Name: {eventData.name}
                  <br />
                  Email: {eventData.email}
                  <br />
                  Message: {eventData.message}
                  <br />
                  Favourite Number: {eventData.favouriteNumber}
                </>
              ) : (
                "No data received."
              )}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Close
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}

export default HelloFromUnityListener;
