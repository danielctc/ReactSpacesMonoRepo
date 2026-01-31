/**
 * Seed avatars to Firebase Storage and Firestore
 *
 * Uploads GLB files from local directory and creates avatar documents in Firestore.
 * Uses placeholder thumbnails that can be replaced later via the admin panel.
 *
 * Usage: node scripts/seed-avatars.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../functions/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'disruptive-metaverse.appspot.com'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Source directory for GLB files
const GLB_SOURCE_DIR = '/Volumes/Daniel Crucial/Unity work/RPM GLB';

// Avatar categories based on folder structure
const CATEGORIES = {
  'Disruptive Live': 'default',
  'Generic': 'default',
  'Generic Man': 'default',
  'Generic Woman': 'default',
  'Lenovo': 'professional',
  'TD Synnex': 'professional',
  'Spaces': 'default'
};

// Placeholder colours for thumbnails (used in UI Avatars URL)
const COLOURS = [
  '4F46E5', '059669', 'DC2626', '2563EB', '7C3AED', '0891B2',
  '10B981', 'F97316', '06B6D4', 'EC4899', '14B8A6', '6366F1'
];

/**
 * Generate placeholder thumbnail URL using ui-avatars service
 * These can be replaced later with real thumbnails via admin panel
 */
function getPlaceholderThumbnailUrl(name, index) {
  const colour = COLOURS[index % COLOURS.length];
  const encodedName = encodeURIComponent(name);
  return `https://ui-avatars.com/api/?name=${encodedName}&background=${colour}&color=fff&size=256&bold=true`;
}

/**
 * Find all GLB files recursively
 */
function findGlbFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findGlbFiles(fullPath, files);
    } else if (entry.name.endsWith('.glb')) {
      // Extract category from parent folder name
      const parentDir = path.basename(path.dirname(fullPath));
      const category = CATEGORIES[parentDir] || 'default';

      files.push({
        path: fullPath,
        filename: entry.name,
        category,
        parentDir
      });
    }
  }

  return files;
}

/**
 * Upload a single avatar
 */
async function uploadAvatar(glbInfo, index, total) {
  const avatarId = glbInfo.filename.replace('.glb', '');
  const name = `Avatar ${index + 1}`;

  console.log(`[${index + 1}/${total}] Uploading ${name} (${avatarId})...`);

  try {
    // Check if avatar already exists
    const existingDoc = await db.collection('avatars').doc(avatarId).get();
    if (existingDoc.exists) {
      console.log(`  ⏭️  Skipping - already exists`);
      return null;
    }

    // Read GLB file
    const glbBuffer = fs.readFileSync(glbInfo.path);

    // Upload GLB to Storage
    const glbPath = `avatars/collection/${avatarId}/model.glb`;
    const glbFile = bucket.file(glbPath);
    await glbFile.save(glbBuffer, {
      metadata: { contentType: 'model/gltf-binary' }
    });
    await glbFile.makePublic();
    const glbUrl = `https://storage.googleapis.com/disruptive-metaverse.appspot.com/${glbPath}`;

    // Use placeholder thumbnail URL (can be replaced later)
    const thumbnailUrl = getPlaceholderThumbnailUrl(name, index);

    // Create Firestore document
    await db.collection('avatars').doc(avatarId).set({
      name,
      glbUrl,
      thumbnailUrl,
      category: glbInfo.category,
      sortOrder: index,
      isActive: true,
      sourceFolder: glbInfo.parentDir,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`  ✅ Uploaded successfully`);
    return { id: avatarId, name, glbUrl, thumbnailUrl };
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting avatar seed...\n');

  // Find all GLB files
  console.log(`📂 Scanning ${GLB_SOURCE_DIR}...\n`);
  const glbFiles = findGlbFiles(GLB_SOURCE_DIR);
  console.log(`Found ${glbFiles.length} GLB files\n`);

  if (glbFiles.length === 0) {
    console.log('No GLB files found. Exiting.');
    process.exit(0);
  }

  // Upload each avatar
  const results = [];
  for (let i = 0; i < glbFiles.length; i++) {
    const result = await uploadAvatar(glbFiles[i], i, glbFiles.length);
    if (result) {
      results.push(result);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Completed: ${results.length} avatars uploaded`);
  console.log(`⏭️  Skipped: ${glbFiles.length - results.length} (already existed)`);
  console.log('='.repeat(50));
  console.log('\n💡 Thumbnails are placeholders. Replace them via the admin panel.');

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
