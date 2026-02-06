import { useRef, useEffect, useState } from "react";
import { useUnityOnHelloFromUnity } from "../../hooks/unityEvents";

function HelloFromUnityListener() {
  // Get eventData and resetEventData from the new hook
  const [eventData, resetEventData] = useUnityOnHelloFromUnity();
  const [isOpen, setIsOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Whenever eventData changes, if it's not null, open the alert dialog
  useEffect(() => {
    if (eventData) {
      setIsOpen(true);
    }
  }, [eventData]);

  const handleClose = () => {
    setIsOpen(false);
    resetEventData(); // Reset the eventData when dialog is closed
  };

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">HelloFromUnity Event</h3>
        <div className="py-4">
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
        </div>
        <div className="modal-action">
          <button ref={cancelRef} onClick={handleClose} className="btn">
            Close
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={handleClose}>
        <button>close</button>
      </form>
    </dialog>
  );
}

export default HelloFromUnityListener;
