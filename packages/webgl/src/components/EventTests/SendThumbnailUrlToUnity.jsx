import React, { useEffect } from "react";
import { useUnityThumbnails } from "../../hooks/unityEvents/useUnityThumbnails";

const SendThumbnailUrlToUnity = () => {
  useUnityThumbnails(); // Use the hook to fetch and send thumbnails to Unity
  return null; // No UI required, only data processing
};

export default SendThumbnailUrlToUnity;