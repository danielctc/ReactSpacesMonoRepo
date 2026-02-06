import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiUpload, FiTrash2, FiImage, FiVideo, FiLink } from 'react-icons/fi';
import {
  uploadMediaScreenImage,
  getMediaScreenImage,
  deleteMediaScreenImage,
  updateMediaScreenDisplayMode
} from '@disruptive-spaces/shared/firebase/mediaScreenFirestore';
import { useUnity } from '../providers/UnityProvider';
import { useSendUnityEvent } from '../hooks/unityEvents/core/useSendUnityEvent';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

interface MediaScreenUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaScreenId: string | null;
  onImageChange?: (data: any) => void;
}

const MediaScreenUploadModal: React.FC<MediaScreenUploadModalProps> = ({ isOpen, onClose, mediaScreenId, onImageChange }) => {
  const { spaceID } = useUnity();
  const queueMessage = useSendUnityEvent();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [existingImage, setExistingImage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [mediaType, setMediaType] = useState('image');
  const [videoUrl, setVideoUrl] = useState('');
  const [displayAsVideo, setDisplayAsVideo] = useState(false);

  const showToast = (title: string, description: string, status: 'success' | 'error' | 'warning' | 'info') => {
    console.log(`[${status.toUpperCase()}] ${title}: ${description}`);
  };

  useEffect(() => {
    const fetchExistingImage = async () => {
      if (isOpen && mediaScreenId && spaceID) {
        setIsLoading(true);
        try {
          const mediaScreen = await getMediaScreenImage(spaceID, mediaScreenId);
          if (mediaScreen && (mediaScreen.imageUrl || mediaScreen.videoUrl)) {
            setExistingImage(mediaScreen);

            const isVideoUrl = mediaScreen.mediaType === 'video';
            setMediaType(isVideoUrl ? 'video' : 'image');

            setDisplayAsVideo(mediaScreen.displayAsVideo || false);

            if (isVideoUrl && mediaScreen.videoUrl) {
              setVideoUrl(mediaScreen.videoUrl);
              setActiveTab(1);
            }
          } else {
            setExistingImage(null);
          }
        } catch (error) {
          Logger.error('Error fetching existing image:', error);
          setExistingImage(null);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchExistingImage();
  }, [isOpen, mediaScreenId, spaceID]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPreviewUrl('');
      setUploadProgress(0);
      setVideoUrl('');
    }
  }, [isOpen]);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelection(file);
    }
  }, []);

  useEffect(() => {
    const dropArea = dropAreaRef.current;
    if (dropArea) {
      dropArea.addEventListener('dragenter', handleDragEnter as any);
      dropArea.addEventListener('dragleave', handleDragLeave as any);
      dropArea.addEventListener('dragover', handleDragOver as any);
      dropArea.addEventListener('drop', handleDrop as any);

      return () => {
        dropArea.removeEventListener('dragenter', handleDragEnter as any);
        dropArea.removeEventListener('dragleave', handleDragLeave as any);
        dropArea.removeEventListener('dragover', handleDragOver as any);
        dropArea.removeEventListener('drop', handleDrop as any);
      };
    }
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  const handleFileSelection = (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Invalid file type', 'Please select an image file (PNG, JPEG, etc.)', 'error');
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFileSelection(file);
  };

  const handleDisplayToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplayAsVideo = e.target.checked;
    setDisplayAsVideo(newDisplayAsVideo);

    if (existingImage) {
      try {
        await updateMediaScreenDisplayMode(spaceID, mediaScreenId!, newDisplayAsVideo);

        if (newDisplayAsVideo) {
          queueMessage("SetMediaScreenImage", {
            mediaScreenId: mediaScreenId,
            imageUrl: null,
            videoUrl: existingImage.videoUrl || null,
            mediaType: existingImage.mediaType || 'image',
            displayAsVideo: true
          });
        } else {
          queueMessage("SetMediaScreenImage", {
            mediaScreenId: mediaScreenId,
            imageUrl: existingImage.imageUrl || null,
            videoUrl: existingImage.videoUrl || null,
            mediaType: existingImage.mediaType || 'image',
            displayAsVideo: false
          });
        }

        setExistingImage({
          ...existingImage,
          displayAsVideo: newDisplayAsVideo
        });

        showToast('Display mode updated', `The media screen will now be displayed as ${newDisplayAsVideo ? 'video' : 'image'}`, 'success');

        Logger.log(`Updated display mode for media screen ${mediaScreenId} to ${newDisplayAsVideo ? 'video' : 'image'}`);

        if (onImageChange) {
          onImageChange({
            type: 'update',
            mediaScreenId,
            displayAsVideo: newDisplayAsVideo
          });
        }
      } catch (error: any) {
        Logger.error('Error updating display mode:', error);
        showToast('Update failed', error.message || 'An error occurred while updating the display mode', 'error');
        setDisplayAsVideo(!newDisplayAsVideo);
      }
    }
  };

  const handleUpload = async () => {
    if (mediaType === 'image' && !selectedFile) {
      showToast('No file selected', 'Please select an image to upload', 'warning');
      return;
    }

    if (mediaType === 'video' && !videoUrl) {
      showToast('No video URL', 'Please enter a video URL', 'warning');
      return;
    }

    try {
      setIsUploading(true);

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 10;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 300);

      let uploadedUrl: string;

      if (mediaType === 'image') {
        uploadedUrl = await uploadMediaScreenImage(spaceID, mediaScreenId!, selectedFile!, {
          mediaType,
          displayAsVideo
        });
      } else {
        uploadedUrl = videoUrl;
        await uploadMediaScreenImage(spaceID, mediaScreenId!, null, {
          mediaType: 'video',
          directUrl: videoUrl,
          displayAsVideo
        });
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      let imageUrlToSend = null;
      let videoUrlToSend = null;

      if (mediaType === 'image') {
        imageUrlToSend = !displayAsVideo ? uploadedUrl : null;
        videoUrlToSend = existingImage?.videoUrl || null;
      } else {
        imageUrlToSend = (!displayAsVideo && existingImage?.imageUrl) ? existingImage.imageUrl : null;
        videoUrlToSend = uploadedUrl;
      }

      queueMessage("SetMediaScreenImage", {
        mediaScreenId: mediaScreenId,
        imageUrl: imageUrlToSend,
        videoUrl: videoUrlToSend,
        mediaType,
        displayAsVideo
      });

      Logger.log(`Uploaded and sent ${mediaType} for media screen ${mediaScreenId} (display as video: ${displayAsVideo})`);

      if (onImageChange) {
        onImageChange({
          type: 'upload',
          mediaScreenId,
          imageUrl: mediaType === 'image' ? uploadedUrl : existingImage?.imageUrl,
          videoUrl: mediaType === 'video' ? uploadedUrl : existingImage?.videoUrl,
          mediaType,
          displayAsVideo
        });
      }

      showToast('Upload successful', `The ${mediaType} has been uploaded and applied to the media screen`, 'success');

      setTimeout(() => {
        setSelectedFile(null);
        setPreviewUrl('');
        setIsUploading(false);
        setUploadProgress(0);
        onClose();
      }, 1000);

    } catch (error: any) {
      Logger.error(`Error uploading ${mediaType}:`, error);
      showToast('Upload failed', error.message || `An error occurred while uploading the ${mediaType}`, 'error');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async () => {
    setIsDeleteDialogOpen(false);

    try {
      setIsUploading(true);

      await deleteMediaScreenImage(spaceID, mediaScreenId!);

      queueMessage("SetMediaScreenImage", {
        mediaScreenId: mediaScreenId,
        imageUrl: mediaType === 'image' ? null : (existingImage?.imageUrl || null),
        videoUrl: mediaType === 'video' ? null : (existingImage?.videoUrl || null),
        mediaType: null,
        displayAsVideo: false
      });

      Logger.log(`Deleted ${mediaType} for media screen ${mediaScreenId}`);

      if (onImageChange) {
        onImageChange({
          type: 'delete',
          mediaScreenId
        });
      }

      showToast(`${mediaType === 'image' ? 'Image' : 'Video'} deleted`, `The ${mediaType} has been removed from the media screen`, 'success');

      setExistingImage(null);
      setIsUploading(false);
      setVideoUrl('');
      setDisplayAsVideo(false);

      setTimeout(() => {
        onClose();
      }, 500);

    } catch (error: any) {
      Logger.error(`Error deleting ${mediaType}:`, error);
      showToast('Deletion failed', error.message || `An error occurred while deleting the ${mediaType}`, 'error');
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setPreviewUrl('');
      setUploadProgress(0);
      onClose();
    }
  };

  const handleTabChange = (index: number) => {
    setActiveTab(index);
    setMediaType(index === 0 ? 'image' : 'video');
  };

  if (!isOpen) return null;

  return (
    <>
      <dialog open className="modal modal-open">
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm" onClick={handleClose} />
        <div className="modal-box max-w-[650px] bg-[#1a1a1a] text-white rounded-xl border border-[#333]">
          <div className="flex justify-between items-center pb-1 pt-3 px-4">
            <h3 className="text-md font-semibold">Media Screen</h3>
            <button
              className="btn btn-sm btn-circle btn-ghost text-gray-400 hover:text-white hover:bg-white/10"
              onClick={handleClose}
              disabled={isUploading}
            >
              ✕
            </button>
          </div>

          <div className="px-4 pb-1">
            <div className="flex justify-between items-center bg-white/[0.03] p-2 rounded-lg mb-1 border border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-300">Display:</span>
                <div className="flex items-center gap-2">
                  <FiImage className={!displayAsVideo ? "text-white" : "text-gray-500"} size={16} />
                  <input
                    type="checkbox"
                    className="toggle toggle-sm"
                    checked={displayAsVideo}
                    onChange={handleDisplayToggle}
                  />
                  <FiVideo className={displayAsVideo ? "text-white" : "text-gray-500"} size={16} />
                </div>
              </div>

              <span className="badge bg-white/10 text-gray-300 text-xs px-2 py-1 rounded-md font-medium">
                {displayAsVideo ? 'Video' : 'Image'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              ID: {mediaScreenId}
            </p>
          </div>

          <div className="px-4 py-1">
            <div className="flex">
              <div className="flex flex-col gap-1 min-w-[75px] mr-3">
                <button
                  className={`py-1.5 px-2.5 rounded-lg text-xs font-medium text-left flex items-center gap-1.5 ${activeTab === 0 ? 'text-white bg-white/10' : 'text-gray-400 hover:bg-white/5'}`}
                  onClick={() => handleTabChange(0)}
                >
                  <FiImage size={14} /> Image
                </button>
                <button
                  className={`py-1.5 px-2.5 rounded-lg text-xs font-medium text-left flex items-center gap-1.5 ${activeTab === 1 ? 'text-white bg-white/10' : 'text-gray-400 hover:bg-white/5'}`}
                  onClick={() => handleTabChange(1)}
                >
                  <FiVideo size={14} /> Video
                </button>
              </div>

              <div className="flex-1">
                {isLoading ? (
                  <div className="flex justify-center items-center h-[120px]">
                    <span className="loading loading-spinner loading-lg text-white"></span>
                  </div>
                ) : (
                  <>
                    {activeTab === 0 ? (
                      <div className="flex flex-col gap-4">
                        {existingImage && existingImage.imageUrl && mediaType === 'image' && (
                          <div>
                            <p className="font-semibold mb-2">Current Image:</p>
                            <div className="flex">
                              <div className="border border-white/20 rounded-md overflow-hidden mb-2 max-w-[200px] mr-4">
                                <img
                                  src={existingImage.imageUrl}
                                  alt="Current image"
                                  className="max-h-[150px] w-full object-contain"
                                />
                              </div>
                              <div className="flex flex-col gap-2 items-start">
                                <p className="text-xs text-gray-400">
                                  Uploaded: {new Date(existingImage.uploadedAt).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-400">
                                  Display Mode: {existingImage.displayAsVideo ? 'Video' : 'Image'}
                                </p>
                                <button
                                  className="btn btn-sm btn-outline btn-error"
                                  onClick={() => setIsDeleteDialogOpen(true)}
                                  disabled={isUploading}
                                >
                                  <FiTrash2 size={14} />
                                  Delete
                                </button>
                              </div>
                            </div>
                            <div className="divider my-4"></div>
                          </div>
                        )}

                        <p className="font-semibold mb-2">
                          {existingImage && existingImage.imageUrl && mediaType === 'image'
                            ? 'Replace with new image:'
                            : 'Upload new image:'}
                        </p>

                        <div
                          ref={dropAreaRef}
                          className={`border-2 border-dashed rounded-md p-4 text-center transition-all cursor-pointer ${
                            isDragging ? 'border-white/30 bg-white/[0.08]' : 'border-white/15 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.06]'
                          }`}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {previewUrl ? (
                            <div className="rounded-md overflow-hidden max-h-[200px]">
                              <img
                                src={previewUrl}
                                alt="Preview"
                                className="max-h-[200px] w-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <FiUpload className="text-gray-400" size={20} />
                              <div>
                                <p className="text-xs font-medium text-white">Drop image or click to browse</p>
                                <p className="text-xs text-gray-500">
                                  PNG, JPG, JPEG, GIF
                                </p>
                              </div>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            className="hidden"
                          />
                        </div>

                        {selectedFile && (
                          <p className="text-xs text-gray-400 bg-white/5 p-2 rounded-md border border-white/10">
                            {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {existingImage && existingImage.videoUrl && mediaType === 'video' && (
                          <div>
                            <p className="text-xs font-medium text-gray-400 mb-1">Current Video URL:</p>
                            <div className="flex">
                              <div className="border border-white/20 rounded-md p-3 mb-2 flex-1 mr-4 bg-gray-700">
                                <p className="text-sm break-all">{existingImage.videoUrl}</p>
                              </div>
                              <div className="flex flex-col gap-2 items-start">
                                <p className="text-xs text-gray-400">
                                  Added: {new Date(existingImage.uploadedAt).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-400">
                                  Display Mode: {existingImage.displayAsVideo ? 'Video' : 'Image'}
                                </p>
                                <button
                                  className="btn btn-sm btn-outline btn-error"
                                  onClick={() => setIsDeleteDialogOpen(true)}
                                  disabled={isUploading}
                                >
                                  <FiTrash2 size={14} />
                                  Delete
                                </button>
                              </div>
                            </div>
                            <div className="divider my-4"></div>
                          </div>
                        )}

                        <div className="form-control">
                          <label className="label">
                            <span className="label-text text-xs font-medium text-white">Video URL</span>
                          </label>
                          <input
                            type="text"
                            placeholder="https://youtube.com/watch?v=..."
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            className="input input-bordered input-sm bg-white/5 border-white/15 text-white text-xs rounded-lg hover:border-white/30 focus:border-white/50"
                          />
                        </div>

                        {videoUrl && (
                          <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                            <div className="flex items-center gap-1 mb-1">
                              <FiLink className="text-gray-400" size={14} />
                              <span className="text-xs font-medium text-white">Preview</span>
                            </div>
                            <p className="text-xs break-all text-gray-400">
                              {videoUrl}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {isUploading && (
                      <div className="mt-3">
                        <p className="mb-2 text-sm font-medium text-white">Uploading: {uploadProgress}%</p>
                        <progress className="progress bg-white/10" value={uploadProgress} max="100"></progress>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="modal-action pt-2 pb-3 px-4">
            <div className="flex w-full gap-3">
              <button
                className="btn btn-outline flex-1 text-gray-400 border-white/20 hover:bg-white/5 hover:border-white/30 rounded-lg btn-sm text-xs font-medium"
                onClick={handleClose}
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                className="btn bg-gray-600 text-white flex-[2] hover:bg-gray-700 active:bg-gray-800 disabled:bg-gray-800 disabled:opacity-50 rounded-lg btn-sm text-xs font-semibold"
                onClick={handleUpload}
                disabled={
                  (mediaType === 'image' && !selectedFile) ||
                  (mediaType === 'video' && !videoUrl) ||
                  isUploading ||
                  isLoading
                }
              >
                {isUploading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <>
                    {mediaType === 'image' ? <FiImage size={14} /> : <FiVideo size={14} />}
                    {mediaType === 'image' ? 'Upload' : 'Save URL'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </dialog>

      {isDeleteDialogOpen && (
        <dialog open className="modal modal-open">
          <div className="fixed inset-0 bg-black bg-opacity-80" onClick={() => setIsDeleteDialogOpen(false)} />
          <div className="modal-box max-w-[350px] bg-[#1a1a1a] text-white rounded-xl border border-[#333]">
            <h3 className="text-md font-semibold pt-4 pb-2">Delete {mediaType === 'video' ? 'Video' : 'Image'}</h3>

            <p className="py-2 text-gray-400 text-sm">
              Are you sure? This will revert the media screen to its blank state.
            </p>

            <div className="modal-action pt-3 pb-4">
              <div className="flex w-full gap-2">
                <button
                  ref={cancelRef}
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="btn btn-outline flex-1 text-gray-400 border-white/20 hover:bg-white/5 rounded-lg btn-sm"
                >
                  Cancel
                </button>
                <button
                  className="btn bg-red-600 text-white flex-1 hover:bg-red-700 rounded-lg font-semibold btn-sm"
                  onClick={handleDelete}
                >
                  <FiTrash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
};

export default MediaScreenUploadModal;
