import React, { useState, useRef } from "react";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { FaQuestionCircle } from "react-icons/fa";

function HelpButton() {
  const { fullscreenRef } = useFullscreenContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const toggleModal = () => {
    if (isModalOpen) {
      dialogRef.current?.close();
      setIsModalOpen(false);
    } else {
      dialogRef.current?.showModal();
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <div className="tooltip" data-tip="Help">
        <button
          className="btn btn-ghost"
          onClick={toggleModal}
          aria-label="Controller Help"
        >
          <FaQuestionCircle />
        </button>
      </div>

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Notes</h3>
          <p className="py-4">The help button is showing so we can see the blur and transparency styles on the button.</p>
          <div className="modal-action">
            <button className="btn btn-primary" onClick={toggleModal}>
              Close
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={toggleModal}>close</button>
        </form>
      </dialog>
    </>
  );
}

export default HelpButton;
