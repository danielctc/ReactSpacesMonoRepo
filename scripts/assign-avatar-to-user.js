#!/usr/bin/env node
/**
 * Assign a default avatar to a user by username.
 *
 * Usage:
 *   cd functions && node ../scripts/assign-avatar-to-user.js "andrew mclean"
 *
 * Or with a specific avatar index (1-7):
 *   cd functions && node ../scripts/assign-avatar-to-user.js "andrew mclean" 3
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Default avatars hosted on Firebase Storage
const DEFAULT_AVATARS = [
  'https://firebasestorage.googleapis.com/v0/b/disruptive-metaverse.appspot.com/o/avatars%2Fdefaults%2F65a18fa5676505696ce66a14.glb?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/disruptive-metaverse.appspot.com/o/avatars%2Fdefaults%2F65a18fcf6698a5166e9a1b43.glb?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/disruptive-metaverse.appspot.com/o/avatars%2Fdefaults%2F65a294956698a5166ea194c8.glb?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/disruptive-metaverse.appspot.com/o/avatars%2Fdefaults%2F65a54ab950377ef74b6dff36.glb?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/disruptive-metaverse.appspot.com/o/avatars%2Fdefaults%2F66759370ab338d43c80ee3a3.glb?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/disruptive-metaverse.appspot.com/o/avatars%2Fdefaults%2F66759420c5fe24b037ad1488.glb?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/disruptive-metaverse.appspot.com/o/avatars%2Fdefaults%2F66759500ab338d43c80ef226.glb?alt=media',
];

// Hash function for deterministic avatar assignment
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

const getDefaultAvatarForUsername = (username) => {
  if (!username) return DEFAULT_AVATARS[0];
  const index = hashString(username.toLowerCase()) % DEFAULT_AVATARS.length;
  return DEFAULT_AVATARS[index];
};

async function main() {
  const searchName = process.argv[2];
  const avatarIndex = process.argv[3] ? parseInt(process.argv[3], 10) : null;

  if (!searchName) {
    console.error('Usage: node assign-avatar-to-user.js "<name>" [avatar-index]');
    console.log('\nAvatar indices: 1-7');
    console.log('If no index provided, uses deterministic assignment based on username.');
    process.exit(1);
  }

  console.log('Avatar Assignment Script');
  console.log('='.repeat(40) + '\n');

  // Check for service account key
  const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('Error: serviceAccountKey.json not found.');
    console.log('Run this script from the functions directory.');
    process.exit(1);
  }

  // Initialize Firebase Admin
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('✓ Firebase Admin initialized\n');

  const db = admin.firestore();

  // Search for user by name (firstName, lastName, Nickname, or username)
  console.log(`Searching for user: "${searchName}"...\n`);

  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();

  const searchLower = searchName.toLowerCase();
  const matchingUsers = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    const fullName = `${data.firstName || ''} ${data.lastName || ''}`.toLowerCase().trim();
    const nickname = (data.Nickname || '').toLowerCase();
    const username = (data.username || '').toLowerCase();

    if (
      fullName.includes(searchLower) ||
      nickname.includes(searchLower) ||
      username.includes(searchLower) ||
      searchLower.includes(fullName)
    ) {
      matchingUsers.push({ id: doc.id, ...data });
    }
  });

  if (matchingUsers.length === 0) {
    console.log('No users found matching that name.');
    process.exit(1);
  }

  console.log(`Found ${matchingUsers.length} matching user(s):\n`);

  for (const user of matchingUsers) {
    console.log(`  ID: ${user.id}`);
    console.log(`  Name: ${user.firstName} ${user.lastName}`);
    console.log(`  Username: ${user.username || 'N/A'}`);
    console.log(`  Nickname: ${user.Nickname || 'N/A'}`);
    console.log(`  Current avatarUrl: ${user.avatarUrl ? 'Set' : 'Not set'}`);
    console.log(`  Current rpmURL: ${user.rpmURL ? 'Set' : 'Not set'}`);
    console.log('');
  }

  // Use the first matching user
  const targetUser = matchingUsers[0];
  console.log(`\nAssigning avatar to: ${targetUser.firstName} ${targetUser.lastName} (${targetUser.id})`);

  // Determine which avatar to assign
  let avatarUrl;
  if (avatarIndex !== null && avatarIndex >= 1 && avatarIndex <= DEFAULT_AVATARS.length) {
    avatarUrl = DEFAULT_AVATARS[avatarIndex - 1];
    console.log(`Using manually specified Avatar ${avatarIndex}`);
  } else {
    avatarUrl = getDefaultAvatarForUsername(targetUser.username || targetUser.id);
    const deterministicIndex = DEFAULT_AVATARS.indexOf(avatarUrl) + 1;
    console.log(`Using deterministic Avatar ${deterministicIndex} (based on username hash)`);
  }

  console.log(`Avatar URL: ${avatarUrl}\n`);

  // Update the user document
  await usersRef.doc(targetUser.id).update({
    avatarUrl: avatarUrl,
    avatarUpdatedAt: new Date().toISOString(),
  });

  console.log('✓ Avatar assigned successfully!\n');
  console.log('The user will see their new avatar when they next spawn in Unity.');

  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
