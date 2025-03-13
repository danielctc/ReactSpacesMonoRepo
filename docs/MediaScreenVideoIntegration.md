# Media Screen Video Integration Guide

This document explains how to integrate video functionality with media screens in Unity.

## Overview

Media screens can now display both images and videos. The React application handles the following:

1. **Storing video URLs**: Videos are stored as URLs in Firebase (YouTube, Vimeo, or direct video links)
2. **Generating thumbnails**: Thumbnails are automatically generated for videos
3. **Playing videos**: When a user clicks on a media screen set to display as video, a video player modal opens

## Unity Integration

### 1. Receiving Media Screen Data

When a media screen is updated, Unity will receive a message with the following data:

```json
{
  "mediaScreenId": "unique-media-screen-id",
  "imageUrl": "https://example.com/image-or-video-url",
  "mediaType": "image" or "video",
  "displayAsVideo": true or false
}
```

- `mediaScreenId`: The unique identifier for the media screen
- `imageUrl`: The URL of the image or video
- `mediaType`: The type of content ("image" or "video")
- `displayAsVideo`: Whether the content should be displayed as a video (with play button)

### 2. Displaying Thumbnails

For media screens set to `displayAsVideo: true`, Unity will receive thumbnail images via:

```json
{
  "mediaScreenId": "unique-media-screen-id",
  "thumbnailUrl": "https://example.com/thumbnail-image.jpg"
}
```

Unity should display this thumbnail image on the media screen with a play button overlay.

### 3. Handling Clicks

When a user clicks on a media screen:

- If `isEditMode` is true: Open the upload/edit modal
- If `isEditMode` is false and `displayAsVideo` is true: Send a "PlayMediaScreenVideo" event
- If `isEditMode` is false and `displayAsVideo` is false: Open the image viewer modal

To trigger video playback, send:

```csharp
// C# example
Dictionary<string, object> data = new Dictionary<string, object>
{
    { "mediaScreenId", "unique-media-screen-id" }
};
SendMessageToReact("PlayMediaScreenVideo", data);
```

## Implementation Steps

1. **Update your media screen renderer** to check the `displayAsVideo` flag
2. **Add a play button overlay** for media screens with `displayAsVideo: true`
3. **Implement click handling** to send the appropriate event based on mode
4. **Display thumbnails** when received from React

## Example Unity Code

```csharp
// Example handler for receiving media screen data
void OnSetMediaScreenImage(string jsonData)
{
    MediaScreenData data = JsonUtility.FromJson<MediaScreenData>(jsonData);
    MediaScreen mediaScreen = GetMediaScreenById(data.mediaScreenId);
    
    if (mediaScreen != null)
    {
        // Store the data
        mediaScreen.imageUrl = data.imageUrl;
        mediaScreen.mediaType = data.mediaType;
        mediaScreen.displayAsVideo = data.displayAsVideo;
        
        // Update the visual representation
        UpdateMediaScreenVisual(mediaScreen);
    }
}

// Example handler for receiving thumbnails
void OnSetMediaScreenThumbnail(string jsonData)
{
    ThumbnailData data = JsonUtility.FromJson<ThumbnailData>(jsonData);
    MediaScreen mediaScreen = GetMediaScreenById(data.mediaScreenId);
    
    if (mediaScreen != null && mediaScreen.displayAsVideo)
    {
        // Load and display the thumbnail
        StartCoroutine(LoadThumbnailImage(mediaScreen, data.thumbnailUrl));
    }
}

// Example click handler
public void OnMediaScreenClicked(string mediaScreenId)
{
    MediaScreen mediaScreen = GetMediaScreenById(mediaScreenId);
    
    if (mediaScreen == null) return;
    
    if (IsEditMode)
    {
        // Open edit modal
        Dictionary<string, object> data = new Dictionary<string, object>
        {
            { "mediaScreenId", mediaScreenId }
        };
        SendMessageToReact("OpenMediaScreenUploadModal", data);
    }
    else if (mediaScreen.displayAsVideo)
    {
        // Trigger video playback
        Dictionary<string, object> data = new Dictionary<string, object>
        {
            { "mediaScreenId", mediaScreenId }
        };
        SendMessageToReact("PlayMediaScreenVideo", data);
    }
    else
    {
        // Open image viewer
        Dictionary<string, object> data = new Dictionary<string, object>
        {
            { "mediaScreenId", mediaScreenId }
        };
        SendMessageToReact("OpenMediaScreenViewer", data);
    }
}
```

## Data Structures

```csharp
[Serializable]
public class MediaScreenData
{
    public string mediaScreenId;
    public string imageUrl;
    public string mediaType;
    public bool displayAsVideo;
}

[Serializable]
public class ThumbnailData
{
    public string mediaScreenId;
    public string thumbnailUrl;
}
```

## Testing

1. Create a media screen and upload a video URL
2. Toggle the "Display as Video" switch
3. Exit edit mode
4. Click on the media screen to verify the video plays
5. Verify thumbnails are displayed correctly 