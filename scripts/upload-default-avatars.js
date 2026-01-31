#!/usr/bin/env node
/**
 * Upload default avatar GLB files to Firebase Storage.
 *
 * Usage:
 *   cd functions && node ../scripts/upload-default-avatars.js
 *
 * Prerequisites:
 *   - Run from functions directory (has firebase-admin installed)
 *   - Service account key at functions/serviceAccountKey.json
 *     OR set GOOGLE_APPLICATION_CREDENTIALS env var
 *
 * Get service account key:
 *   Firebase Console > Project Settings > Service Accounts > Generate New Private Key
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configuration
const SOURCE_DIR = '/Users/comparethecloud/Downloads/Disruptive Live';
const STORAGE_PATH = 'avatars/defaults';
const BUCKET_NAME = 'disruptive-metaverse.appspot.com';

// Avatar names mapping
const AVATAR_NAMES = {
  '65a18fa5676505696ce66a14.glb': 'Avatar 1',
  '65a18fcf6698a5166e9a1b43.glb': 'Avatar 2',
  '65a294956698a5166ea194c8.glb': 'Avatar 3',
  '65a54ab950377ef74b6dff36.glb': 'Avatar 4',
  '66759370ab338d43c80ee3a3.glb': 'Avatar 5',
  '66759420c5fe24b037ad1488.glb': 'Avatar 6',
  '66759500ab338d43c80ef226.glb': 'Avatar 7',
};

async function main() {
  console.log('Firebase Storage Avatar Uploader');
  console.log('='.repeat(40) + '\n');

  // Check if running from functions directory
  if (!fs.existsSync('./node_modules/firebase-admin')) {
    console.error('Error: firebase-admin not found.');
    console.log('Run this script from the functions directory:');
    console.log('  cd functions && node ../scripts/upload-default-avatars.js\n');
    process.exit(1);
  }

  // Initialize Firebase Admin
  const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');

  if (!fs.existsSync(serviceAccountPath)) {
    console.error('Error: serviceAccountKey.json not found at', serviceAccountPath);
    console.log('\nTo create one:');
    console.log('1. Go to Firebase Console > Project Settings > Service Accounts');
    console.log('2. Click "Generate New Private Key"');
    console.log('3. Save as functions/serviceAccountKey.json');
    console.log('\nAlternatively, set GOOGLE_APPLICATION_CREDENTIALS env var\n');
    process.exit(1);
  }

  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: BUCKET_NAME,
  });
  console.log('✓ Firebase Admin initialized\n');

  const bucket = admin.storage().bucket();
  const uploadedUrls = [];

  // Check source directory
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error('Error: Source directory not found:', SOURCE_DIR);
    process.exit(1);
  }

  // Get all GLB files
  const files = fs.readdirSync(SOURCE_DIR).filter((f) => f.endsWith('.glb'));
  console.log(`Found ${files.length} GLB files to upload\n`);

  for (const filename of files) {
    const localPath = path.join(SOURCE_DIR, filename);
    const storagePath = `${STORAGE_PATH}/${filename}`;
    const friendlyName = AVATAR_NAMES[filename] || filename;

    process.stdout.write(`Uploading: ${friendlyName}... `);

    try {
      await bucket.upload(localPath, {
        destination: storagePath,
        metadata: {
          contentType: 'model/gltf-binary',
          cacheControl: 'public, max-age=31536000', // Cache for 1 year
        },
        public: true, // Make publicly readable
      });

      // Public URL format for Firebase Storage
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURIComponent(storagePath)}?alt=media`;

      uploadedUrls.push({
        name: friendlyName,
        filename,
        url: publicUrl,
      });

      console.log('✓');
    } catch (error) {
      console.log('✗');
      console.error(`  Error: ${error.message}`);
    }
  }

  // Output results
  console.log('\n' + '='.repeat(60));
  console.log('UPLOAD COMPLETE - ' + uploadedUrls.length + ' files');
  console.log('='.repeat(60));

  console.log('\n// Copy to useAutoAvatarSync.js DEFAULT_AVATARS:\n');
  console.log('const DEFAULT_AVATARS = [');
  uploadedUrls.forEach((avatar, i) => {
    const comma = i < uploadedUrls.length - 1 ? ',' : '';
    console.log(`  "${avatar.url}"${comma}`);
  });
  console.log('];');

  console.log('\n// Copy to AvatarModal.jsx avatarOptions:\n');
  console.log('const avatarOptions = [');
  uploadedUrls.forEach((avatar, i) => {
    console.log(`  { id: ${i + 1}, url: "${avatar.url}", name: "${avatar.name}" },`);
  });
  console.log('];');

  console.log('\n✓ Done! Update the files above with these URLs.\n');
  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
