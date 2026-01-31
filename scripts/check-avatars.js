/**
 * Check avatars in Firestore
 */
const { db } = require('./firebaseAdmin.js');
const { collection, getDocs } = require('firebase/firestore');

async function checkAvatars() {
  try {
    // Check avatars collection
    console.log('\n=== AVATARS COLLECTION ===');
    const avatarsRef = collection(db, 'avatars');
    const avatarsSnap = await getDocs(avatarsRef);
    console.log('Total avatars:', avatarsSnap.size);

    avatarsSnap.forEach((doc) => {
      const data = doc.data();
      console.log('---');
      console.log('ID:', doc.id);
      console.log('Name:', data.name);
      console.log('GLB:', data.glbUrl);
      console.log('Thumbnail:', data.thumbnailUrl);
    });

    // Search for Andrew McLean user
    console.log('\n=== SEARCHING FOR ANDREW MCLEAN ===');
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);

    let found = false;
    usersSnap.forEach((doc) => {
      const data = doc.data();
      const name = (data.displayName || data.name || '').toLowerCase();
      if (name.includes('andrew') || name.includes('mclean')) {
        found = true;
        console.log('---');
        console.log('User ID:', doc.id);
        console.log('Name:', data.displayName || data.name);
        console.log('Email:', data.email || 'N/A');
        console.log('Avatar ID:', data.avatarId || 'N/A');
        console.log('Avatar URL:', data.avatarUrl || 'N/A');
        console.log('Avatar Thumbnail:', data.avatarThumbnailUrl || 'N/A');
        console.log('RPM URL (legacy):', data.rpmURL || 'N/A');
      }
    });

    if (found === false) {
      console.log('No user found matching andrew/mclean');
      console.log('\nAll users:');
      usersSnap.forEach((doc) => {
        const data = doc.data();
        console.log('-', data.displayName || data.name || doc.id);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAvatars();
