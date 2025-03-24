/**
 * Initialize Tags Collection in Firestore
 * 
 * This script creates a set of initial tags in the Firestore 'tags' collection.
 * Run this script once to set up your tagging system.
 */

// Import Firebase
require('./firebaseAdmin');

// Make a custom simplified version of the Logger
const Logger = {
  log: (...args) => console.log('[LOG]', ...args),
  error: (...args) => console.error('[ERROR]', ...args)
};

// Import the Firestore functions
const { doc, collection, setDoc, getDoc, addDoc } = require('firebase/firestore');
const { db } = require('./firebaseAdmin');

/**
 * Create a new tag in Firestore
 */
const createTag = async ({ id, name, color, description }) => {
  try {
    Logger.log(`Creating new tag: ${name}`);
    
    const tagData = {
      name,
      color: color || '#808080', // Default gray if no color provided
      description: description || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    let tagId;
    
    if (id) {
      // Use provided ID
      const tagRef = doc(db, 'tags', id);

      // Check if tag already exists
      const existingTag = await getDoc(tagRef);
      if (existingTag.exists()) {
        Logger.log(`Tag ${id} already exists, skipping creation`);
        return { id, ...existingTag.data() };
      }

      await setDoc(tagRef, tagData);
      tagId = id;
    } else {
      // Auto-generate ID
      const tagsRef = collection(db, 'tags');
      const docRef = await addDoc(tagsRef, tagData);
      tagId = docRef.id;
    }
    
    return {
      id: tagId,
      ...tagData
    };
  } catch (error) {
    Logger.error('Error creating tag:', error);
    throw error;
  }
};

const initialTags = [
  {
    id: 'collaboration',
    name: 'Collaboration',
    color: '#4287f5',
    description: 'Spaces designed for team collaboration and meetings'
  },
  {
    id: 'social',
    name: 'Social',
    color: '#f54242',
    description: 'Social gathering and networking spaces'
  },
  {
    id: 'education',
    name: 'Education',
    color: '#42f581',
    description: 'Learning and educational environments'
  },
  {
    id: 'events',
    name: 'Events',
    color: '#f5a742',
    description: 'Spaces optimized for hosting events'
  },
  {
    id: 'showcase',
    name: 'Showcase',
    color: '#9f42f5',
    description: 'Spaces for exhibiting content and creations'
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    color: '#f542b3',
    description: 'Entertainment and leisure spaces'
  },
  {
    id: 'productivity',
    name: 'Productivity',
    color: '#42dbf5',
    description: 'Spaces focused on work and productivity'
  },
  {
    id: 'featured',
    name: 'Featured',
    color: '#f5f242',
    description: 'Featured and highlighted spaces'
  }
];

const initTags = async () => {
  console.log('Initializing tags collection...');
  
  try {
    // Create each tag
    let created = 0;
    let skipped = 0;
    
    for (const tag of initialTags) {
      Logger.log(`Processing tag: ${tag.name}`);
      
      // Check if tag already exists
      const tagRef = doc(db, 'tags', tag.id);
      const existingTag = await getDoc(tagRef);
      
      if (existingTag.exists()) {
        Logger.log(`Tag ${tag.id} already exists, skipping`);
        skipped++;
      } else {
        await createTag(tag);
        created++;
        Logger.log(`Created tag: ${tag.name}`);
      }
    }
    
    console.log(`Tags initialization complete. Created: ${created}, Skipped: ${skipped}`);
  } catch (error) {
    console.error('Error initializing tags:', error);
  }
};

// Run the initialization
initTags()
  .then(() => {
    console.log('Tag initialization complete.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Tag initialization failed:', error);
    process.exit(1);
  }); 