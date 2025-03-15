# Manual CORS Configuration for Firebase Storage

Follow these steps to manually configure CORS for Firebase Storage:

## 1. Install the Google Cloud SDK

If you don't have the Google Cloud SDK installed, download and install it from:
https://cloud.google.com/sdk/docs/install

## 2. Authenticate with Google Cloud

```bash
gcloud auth login
```

## 3. Set the project

```bash
gcloud config set project disruptive-metaverse
```

## 4. Configure CORS for the default bucket

```bash
gsutil cors set cors.json gs://disruptive-metaverse.appspot.com
```

## 5. Verify the CORS configuration

```bash
gsutil cors get gs://disruptive-metaverse.appspot.com
```

## Alternative: Configure through Google Cloud Console

1. Go to the Google Cloud Console: https://console.cloud.google.com/
2. Select your project: "disruptive-metaverse"
3. Navigate to Storage > Browser
4. Click on the bucket "disruptive-metaverse.appspot.com"
5. Go to the "Permissions" tab
6. Click on "CORS configuration"
7. Add the following configuration:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

8. Click "Save"

## Testing CORS Configuration

After updating the CORS configuration, you can test it with a simple request:

```javascript
fetch('https://firebasestorage.googleapis.com/v0/b/disruptive-metaverse.appspot.com/o/common%2Fimages%2Fbackground.jpg?alt=media')
  .then(response => {
    console.log('CORS is configured correctly!', response);
  })
  .catch(error => {
    console.error('CORS is not configured correctly:', error);
  });
```

You can run this code in your browser's developer console to test if CORS is working. 