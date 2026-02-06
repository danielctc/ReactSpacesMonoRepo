import React from 'react';
import { FiUpload, FiTrash2 } from 'react-icons/fi';

interface LogoTabProps {
  existingLogo: string | null;
  previewUrl: string | null;
  selectedFile: File | null;
  isUploading: boolean;
  uploadProgress: number;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpload: () => void;
  handleDelete: () => void;
  handleBrowseClick: () => void;
}

/**
 * Logo Tab - Manages space logo upload and deletion.
 */
const LogoTab: React.FC<LogoTabProps> = ({
  existingLogo,
  previewUrl,
  selectedFile,
  isUploading,
  uploadProgress,
  fileInputRef,
  handleFileChange,
  handleUpload,
  handleDelete,
  handleBrowseClick,
}) => {
  return (
    <div className="p-4 flex flex-col">
      <p className="text-sm font-semibold mb-3 text-white">Space Logo</p>
      <p className="text-xs mb-4 text-gray-400">
        Upload a logo for your space. This will be displayed during loading.
      </p>

      {/* Display current logo and preview side by side when both exist */}
      {(existingLogo || previewUrl) && (
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* Current logo display */}
          {existingLogo && (
            <div className="border border-white/20 rounded-md p-3 bg-white/5 flex-1">
              <p className="text-xs font-medium mb-2 text-white">Current Logo</p>
              <img
                src={existingLogo}
                alt="Space Logo"
                className="max-h-[120px] object-contain rounded-md"
              />
            </div>
          )}

          {/* New logo preview */}
          {previewUrl && (
            <div className="border border-blue-200 rounded-md p-3 bg-white/5 flex-1">
              <p className="text-xs font-medium mb-2 text-blue-300">New Logo Preview</p>
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-[120px] object-contain rounded-md"
              />
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Upload progress */}
      {isUploading && uploadProgress > 0 && (
        <progress
          className="progress progress-primary w-full mb-4"
          value={uploadProgress}
          max="100"
        ></progress>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleBrowseClick}
          className="btn btn-sm btn-outline btn-primary"
          disabled={isUploading}
        >
          <FiUpload />
          Browse
        </button>

        {selectedFile && (
          <button
            className="btn btn-primary btn-sm"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Uploading...
              </>
            ) : (
              'Upload Logo'
            )}
          </button>
        )}

        {existingLogo && !selectedFile && (
          <button
            className="btn btn-sm btn-outline btn-error"
            onClick={handleDelete}
            disabled={isUploading}
          >
            <FiTrash2 />
            Remove Logo
          </button>
        )}
      </div>

      {selectedFile && (
        <p className="text-xs mt-2 text-gray-400">Selected: {selectedFile.name}</p>
      )}
    </div>
  );
};

export default LogoTab;
