import React, { useRef, useEffect, useState } from 'react';
import { useScreenShare } from '../hooks/useScreenShare';

export const ScreenShareDisplay: React.FC = () => {
  const { isSharing, localStream } = useScreenShare();
  const thumbnailVideoRef = useRef<HTMLVideoElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  const modalRef = useRef<HTMLDialogElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Update video elements when stream changes
  useEffect(() => {
    if (thumbnailVideoRef.current && localStream) {
      thumbnailVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (modalVideoRef.current && localStream) {
      modalVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isModalOpen]);

  const openModal = () => {
    setIsModalOpen(true);
    modalRef.current?.showModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    modalRef.current?.close();
  };

  if (!isSharing || !localStream) {
    return null;
  }

  return (
    <>
      {/* Thumbnail preview in corner */}
      <div className="fixed bottom-4 right-4 z-50">
        <div
          className="relative cursor-pointer rounded-lg shadow-lg overflow-hidden border-2 border-base-300 hover:border-primary transition-colors"
          onClick={openModal}
        >
          <video
            ref={thumbnailVideoRef}
            autoPlay
            playsInline
            muted
            className="w-48 h-auto bg-black"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-opacity flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white opacity-0 hover:opacity-100 transition-opacity"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Full-size modal */}
      <dialog ref={modalRef} className="modal">
        <div className="modal-box max-w-6xl w-full p-0">
          <div className="relative">
            <video
              ref={modalVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto bg-black"
            />
            <button
              onClick={closeModal}
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 bg-base-100 bg-opacity-80 hover:bg-opacity-100"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={closeModal}>close</button>
        </form>
      </dialog>
    </>
  );
};
