import React, { useState } from 'react';
import { FiUpload, FiTrash2, FiImage, FiFilm } from 'react-icons/fi';

interface BackgroundTabProps {
  existingBackground: string | null;
  bgPreviewUrl: string | null;
  selectedBgFile: File | null;
  isBgUploading: boolean;
  bgUploadProgress: number;
  bgFileInputRef: React.RefObject<HTMLInputElement>;
  handleBgFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBgUpload: () => void;
  handleBgDelete: () => void;
  handleBgBrowseClick: () => void;
  existingVideoBackground: string | null;
  videoPreviewUrl: string | null;
  selectedVideoFile: File | null;
  isVideoUploading: boolean;
  videoUploadProgress: number;
  videoFileInputRef: React.RefObject<HTMLInputElement>;
  handleVideoFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleVideoUpload: () => void;
  handleVideoDelete: () => void;
  handleVideoBrowseClick: () => void;
}

/**
 * Background Tab - Manages image and video backgrounds with nested tabs.
 */
const BackgroundTab: React.FC<BackgroundTabProps> = ({
  existingBackground,
  bgPreviewUrl,
  selectedBgFile,
  isBgUploading,
  bgUploadProgress,
  bgFileInputRef,
  handleBgFileChange,
  handleBgUpload,
  handleBgDelete,
  handleBgBrowseClick,
  existingVideoBackground,
  videoPreviewUrl,
  selectedVideoFile,
  isVideoUploading,
  videoUploadProgress,
  videoFileInputRef,
  handleVideoFileChange,
  handleVideoUpload,
  handleVideoDelete,
  handleVideoBrowseClick,
}) => {
  const [bgTabIndex, setBgTabIndex] = useState(0);

  return (
    <div className="p-4 flex flex-col">
      <p className="text-sm font-semibold mb-3 text-white">Space Background</p>

      {/* Nested Tabs */}
      <div role="tablist" className="tabs tabs-bordered mb-4">
        <button
          role="tab"
          className={`tab gap-1 ${bgTabIndex === 0 ? 'tab-active' : ''}`}
          onClick={() => setBgTabIndex(0)}
        >
          <FiImage />
          Image
        </button>
        <button
          role="tab"
          className={`tab gap-1 ${bgTabIndex === 1 ? 'tab-active' : ''}`}
          onClick={() => setBgTabIndex(1)}
        >
          <FiFilm />
          Video
        </button>
      </div>

      {/* Image Background Tab */}
      {bgTabIndex === 0 && (
        <div>
          <p className="text-xs mb-4 text-gray-400">
            Upload an image background for the loading screen.
          </p>

          {(existingBackground || bgPreviewUrl) && (
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              {existingBackground && (
                <div className="border border-white/20 rounded-md p-3 bg-white/5 flex-1">
                  <p className="text-xs font-medium mb-2 text-white">Current Background</p>
                  <img
                    src={existingBackground}
                    alt="Background"
                    className="max-h-[120px] object-cover rounded-md w-full"
                  />
                </div>
              )}

              {bgPreviewUrl && (
                <div className="border border-blue-200 rounded-md p-3 bg-white/5 flex-1">
                  <p className="text-xs font-medium mb-2 text-blue-300">New Background Preview</p>
                  <img
                    src={bgPreviewUrl}
                    alt="Preview"
                    className="max-h-[120px] object-cover rounded-md w-full"
                  />
                </div>
              )}
            </div>
          )}

          <input
            ref={bgFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleBgFileChange}
            className="hidden"
          />

          {isBgUploading && bgUploadProgress > 0 && (
            <progress
              className="progress progress-primary w-full mb-4"
              value={bgUploadProgress}
              max="100"
            ></progress>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleBgBrowseClick}
              className="btn btn-sm btn-outline btn-primary"
              disabled={isBgUploading}
            >
              <FiUpload />
              Browse
            </button>

            {selectedBgFile && (
              <button
                className="btn btn-primary btn-sm"
                onClick={handleBgUpload}
                disabled={isBgUploading}
              >
                {isBgUploading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Uploading...
                  </>
                ) : (
                  'Upload Background'
                )}
              </button>
            )}

            {existingBackground && !selectedBgFile && (
              <button
                className="btn btn-sm btn-outline btn-error"
                onClick={handleBgDelete}
                disabled={isBgUploading}
              >
                <FiTrash2 />
                Remove
              </button>
            )}
          </div>

          {selectedBgFile && (
            <p className="text-xs mt-2 text-gray-400">Selected: {selectedBgFile.name}</p>
          )}
        </div>
      )}

      {/* Video Background Tab */}
      {bgTabIndex === 1 && (
        <div>
          <p className="text-xs mb-4 text-gray-400">
            Upload a video background (max 5MB). Supported: MP4, WebM.
          </p>

          {(existingVideoBackground || videoPreviewUrl) && (
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              {existingVideoBackground && (
                <div className="border border-white/20 rounded-md p-3 bg-white/5 flex-1">
                  <p className="text-xs font-medium mb-2 text-white">Current Video</p>
                  <video
                    src={existingVideoBackground}
                    style={{ maxHeight: '120px', width: '100%', borderRadius: '6px' }}
                    controls
                    muted
                  />
                </div>
              )}

              {videoPreviewUrl && (
                <div className="border border-blue-200 rounded-md p-3 bg-white/5 flex-1">
                  <p className="text-xs font-medium mb-2 text-blue-300">New Video Preview</p>
                  <video
                    src={videoPreviewUrl}
                    style={{ maxHeight: '120px', width: '100%', borderRadius: '6px' }}
                    controls
                    muted
                  />
                </div>
              )}
            </div>
          )}

          <input
            ref={videoFileInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoFileChange}
            className="hidden"
          />

          {isVideoUploading && videoUploadProgress > 0 && (
            <progress
              className="progress progress-primary w-full mb-4"
              value={videoUploadProgress}
              max="100"
            ></progress>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleVideoBrowseClick}
              className="btn btn-sm btn-outline btn-primary"
              disabled={isVideoUploading}
            >
              <FiUpload />
              Browse
            </button>

            {selectedVideoFile && (
              <button
                className="btn btn-primary btn-sm"
                onClick={handleVideoUpload}
                disabled={isVideoUploading}
              >
                {isVideoUploading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Uploading...
                  </>
                ) : (
                  'Upload Video'
                )}
              </button>
            )}

            {existingVideoBackground && !selectedVideoFile && (
              <button
                className="btn btn-sm btn-outline btn-error"
                onClick={handleVideoDelete}
                disabled={isVideoUploading}
              >
                <FiTrash2 />
                Remove
              </button>
            )}
          </div>

          {selectedVideoFile && (
            <p className="text-xs mt-2 text-gray-400">
              Selected: {selectedVideoFile.name} ({(selectedVideoFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default BackgroundTab;
