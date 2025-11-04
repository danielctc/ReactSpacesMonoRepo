import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db } from '@disruptive-spaces/shared/firebase/firebase';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

/**
 * Uploads an image to Firebase Storage and stores its reference in Firestore
 * 
 * @param {string} spaceId - The ID of the space
 * @param {string} mediaScreenId - The ID of the media screen (game object name)
 * @param {File} imageFile - The image file to upload (can be null for video URLs)
 * @param {Object} options - Additional options
 * @param {string} options.mediaType - The type of media ('image' or 'video')
 * @param {boolean} options.displayAsVideo - Whether to display the content as a video
 * @param {string} options.directUrl - Direct URL for video content
 * @returns {Promise<string>} - The download URL of the uploaded image or the direct URL
 */
export const uploadMediaScreenImage = async (spaceId, mediaScreenId, imageFile, options = {}) => {
  try {
    // Extract options
    const { mediaType = 'image', displayAsVideo = false, directUrl = null } = options;
    
    // Validate space and media screen IDs
    if (!spaceId || !mediaScreenId) {
      throw new Error('Missing required parameters: spaceId and mediaScreenId');
    }

    let downloadURL = null;
    
    // Handle image upload if we have an image file
    if (imageFile) {
      // Client-side rate limiting
      const rateLimitCheck = checkClientRateLimit('fileUpload', spaceId);
      if (!rateLimitCheck.allowed) {
        throw new Error(rateLimitCheck.message);
      }

      // Validate file type for images
      if (!imageFile.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      // Validate file size (10MB limit for media screen images)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (imageFile.size > MAX_FILE_SIZE) {
        throw new Error('File size must be less than 10MB');
      }

      // Create a reference to Firebase Storage
      const storage = getStorage();
      const timestamp = Date.now();
      const fileExtension = imageFile.name.split('.').pop();
      const fileName = `${mediaScreenId}_${timestamp}.${fileExtension}`;
      const storageRef = ref(storage, `spaces/${spaceId}/mediaScreens/${fileName}`);

      // Upload the file
      Logger.log(`Uploading image for media screen ${mediaScreenId} in space ${spaceId}`);
      const snapshot = await uploadBytes(storageRef, imageFile);
      
      // Get the download URL
      downloadURL = await getDownloadURL(snapshot.ref);
      
      // Store the reference in Firestore
      const mediaScreenRef = doc(db, `spaces/${spaceId}/mediaScreens`, mediaScreenId);
      await setDoc(mediaScreenRef, {
        imageUrl: downloadURL,
        gsUrl: `gs://${snapshot.ref.bucket}/${snapshot.ref.fullPath}`,
        fileName: fileName,
        mediaType,
        displayAsVideo,
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } 
    // Handle direct URL (for videos)
    else if (directUrl) {
      downloadURL = directUrl;
      
      // Store the URL in Firestore
      const mediaScreenRef = doc(db, `spaces/${spaceId}/mediaScreens`, mediaScreenId);
      await setDoc(mediaScreenRef, {
        videoUrl: directUrl,
        mediaType,
        displayAsVideo,
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } else {
      throw new Error('Either imageFile or directUrl must be provided');
    }
    
    Logger.log(`Successfully uploaded ${mediaType} for media screen ${mediaScreenId} (display as video: ${displayAsVideo})`);
    return downloadURL;
  } catch (error) {
    Logger.error(`Error uploading media screen ${options?.mediaType || 'image'}:`, error);
    throw error;
  }
};

/**
 * Gets all media screen images for a space
 * 
 * @param {string} spaceId - The ID of the space
 * @returns {Promise<Array>} - Array of media screen objects with their image URLs
 */
export const getMediaScreenImagesFromFirestore = async (spaceId) => {
  Logger.log(`Getting media screen images for space: ${spaceId}`);
  try {
    const mediaScreensCollectionRef = collection(db, `spaces/${spaceId}/mediaScreens`);
    const mediaScreensQuerySnapshot = await getDocs(mediaScreensCollectionRef);
    
    const mediaScreens = [];
    mediaScreensQuerySnapshot.forEach(doc => {
      mediaScreens.push({ id: doc.id, ...doc.data() });
    });
    
    return mediaScreens;
  } catch (error) {
    Logger.error('Error fetching media screen images from Firestore:', error);
    throw error;
  }
};

/**
 * Gets a specific media screen image
 * 
 * @param {string} spaceId - The ID of the space
 * @param {string} mediaScreenId - The ID of the media screen
 * @returns {Promise<Object|null>} - The media screen object or null if not found
 */
export const getMediaScreenImage = async (spaceId, mediaScreenId) => {
  try {
    const mediaScreenRef = doc(db, `spaces/${spaceId}/mediaScreens`, mediaScreenId);
    const mediaScreenSnapshot = await getDoc(mediaScreenRef);
    
    if (mediaScreenSnapshot.exists()) {
      return { id: mediaScreenSnapshot.id, ...mediaScreenSnapshot.data() };
    } else {
      Logger.warn(`No media screen found with ID: ${mediaScreenId}`);
      return null;
    }
  } catch (error) {
    Logger.error('Error fetching media screen image:', error);
    throw error;
  }
};

/**
 * Deletes a media screen image from Firebase Storage and removes its reference from Firestore
 * 
 * @param {string} spaceId - The ID of the space
 * @param {string} mediaScreenId - The ID of the media screen
 * @returns {Promise<boolean>} - True if deletion was successful
 */
export const deleteMediaScreenImage = async (spaceId, mediaScreenId) => {
  try {
    // Get the media screen document to find the storage reference
    const mediaScreenData = await getMediaScreenImage(spaceId, mediaScreenId);
    
    if (!mediaScreenData) {
      Logger.warn(`No media screen found with ID: ${mediaScreenId} to delete`);
      return false;
    }
    
    // If there's a storage reference, delete the file
    if (mediaScreenData.gsUrl) {
      const storage = getStorage();
      const fileRef = ref(storage, mediaScreenData.gsUrl);
      
      try {
        await deleteObject(fileRef);
        Logger.log(`Deleted file from storage: ${mediaScreenData.gsUrl}`);
      } catch (storageError) {
        // If the file doesn't exist, just log a warning
        Logger.warn(`Could not delete file from storage: ${storageError.message}`);
      }
    }
    
    // Update the Firestore document to remove image references
    const mediaScreenRef = doc(db, `spaces/${spaceId}/mediaScreens`, mediaScreenId);
    
    // Only remove the appropriate field based on media type
    if (mediaScreenData.mediaType === 'video') {
      await updateDoc(mediaScreenRef, {
        videoUrl: null,
        mediaType: null,
        displayAsVideo: false,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      Logger.log(`Successfully removed video for media screen ${mediaScreenId}`);
    } else {
      await updateDoc(mediaScreenRef, {
        imageUrl: null,
        gsUrl: null,
        fileName: null,
        mediaType: null,
        displayAsVideo: false,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      Logger.log(`Successfully removed image for media screen ${mediaScreenId}`);
    }
    
    return true;
  } catch (error) {
    Logger.error('Error deleting media screen image:', error);
    throw error;
  }
};

/**
 * Updates the display mode of a media screen without changing its content
 * 
 * @param {string} spaceId - The ID of the space
 * @param {string} mediaScreenId - The ID of the media screen
 * @param {boolean} displayAsVideo - Whether to display the content as a video
 * @returns {Promise<boolean>} - True if update was successful
 */
export const updateMediaScreenDisplayMode = async (spaceId, mediaScreenId, displayAsVideo) => {
  try {
    // Validate inputs
    if (!spaceId || !mediaScreenId || typeof displayAsVideo !== 'boolean') {
      throw new Error('Missing or invalid required parameters');
    }

    // Get the current media screen data
    const mediaScreenData = await getMediaScreenImage(spaceId, mediaScreenId);
    
    if (!mediaScreenData || (!mediaScreenData.imageUrl && !mediaScreenData.videoUrl)) {
      Logger.warn(`No media screen content found with ID: ${mediaScreenId} to update`);
      return false;
    }
    
    // Update just the display mode
    const mediaScreenRef = doc(db, `spaces/${spaceId}/mediaScreens`, mediaScreenId);
    await updateDoc(mediaScreenRef, {
      displayAsVideo,
      updatedAt: new Date().toISOString()
    });
    
    Logger.log(`Successfully updated display mode for media screen ${mediaScreenId} to ${displayAsVideo ? 'video' : 'image'}`);
    return true;
  } catch (error) {
    Logger.error('Error updating media screen display mode:', error);
    throw error;
  }
}; 