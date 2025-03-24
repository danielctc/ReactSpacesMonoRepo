import { 
    doc, 
    getDoc, 
    getDocs, 
    collection, 
    query, 
    addDoc, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    arrayUnion, 
    arrayRemove, 
    where 
} from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

/**
 * Fetch all tags from Firestore
 * @returns {Promise<Array>} Array of tag objects
 */
const getAllTags = async () => {
    try {
        Logger.log('tagsFirestore: Fetching all tags');
        const tagsRef = collection(db, 'tags');
        const tagsSnapshot = await getDocs(tagsRef);
        
        const tags = [];
        tagsSnapshot.forEach(doc => {
            tags.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return tags;
    } catch (error) {
        Logger.error('tagsFirestore: Error fetching tags:', error);
        throw error;
    }
};

/**
 * Get a specific tag by ID
 * @param {string} tagId - The ID of the tag to fetch
 * @returns {Promise<Object|null>} The tag object or null if not found
 */
const getTagById = async (tagId) => {
    try {
        Logger.log(`tagsFirestore: Fetching tag with ID: ${tagId}`);
        const tagRef = doc(db, 'tags', tagId);
        const tagDoc = await getDoc(tagRef);
        
        if (tagDoc.exists()) {
            return {
                id: tagDoc.id,
                ...tagDoc.data()
            };
        } else {
            Logger.warn(`tagsFirestore: Tag with ID ${tagId} not found`);
            return null;
        }
    } catch (error) {
        Logger.error(`tagsFirestore: Error fetching tag with ID ${tagId}:`, error);
        throw error;
    }
};

/**
 * Create a new tag
 * @param {string} id - Custom ID for the tag (optional, will be auto-generated if not provided)
 * @param {string} name - Name of the tag
 * @param {string} color - Color for the tag (hex code)
 * @param {string} description - Description of the tag
 * @returns {Promise<Object>} The created tag object
 */
const createTag = async ({ id, name, color, description }) => {
    try {
        Logger.log(`tagsFirestore: Creating new tag: ${name}`);
        
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
        Logger.error('tagsFirestore: Error creating tag:', error);
        throw error;
    }
};

/**
 * Update an existing tag
 * @param {string} tagId - ID of the tag to update
 * @param {Object} updateData - Data to update (name, color, description)
 * @returns {Promise<Object>} The updated tag object
 */
const updateTag = async (tagId, updateData) => {
    try {
        Logger.log(`tagsFirestore: Updating tag with ID: ${tagId}`);
        const tagRef = doc(db, 'tags', tagId);
        
        // Get current tag data
        const tagDoc = await getDoc(tagRef);
        if (!tagDoc.exists()) {
            throw new Error(`Tag with ID ${tagId} not found`);
        }
        
        const updates = {
            ...updateData,
            updatedAt: new Date()
        };
        
        await updateDoc(tagRef, updates);
        
        return {
            id: tagId,
            ...tagDoc.data(),
            ...updates
        };
    } catch (error) {
        Logger.error(`tagsFirestore: Error updating tag with ID ${tagId}:`, error);
        throw error;
    }
};

/**
 * Delete a tag
 * @param {string} tagId - ID of the tag to delete
 * @returns {Promise<boolean>} Success status
 */
const deleteTag = async (tagId) => {
    try {
        Logger.log(`tagsFirestore: Deleting tag with ID: ${tagId}`);
        const tagRef = doc(db, 'tags', tagId);
        await deleteDoc(tagRef);
        return true;
    } catch (error) {
        Logger.error(`tagsFirestore: Error deleting tag with ID ${tagId}:`, error);
        throw error;
    }
};

/**
 * Add a tag to a space
 * @param {string} spaceId - ID of the space
 * @param {string} tagId - ID of the tag to add
 * @returns {Promise<boolean>} Success status
 */
const addTagToSpace = async (spaceId, tagId) => {
    try {
        Logger.log(`tagsFirestore: Adding tag ${tagId} to space ${spaceId}`);
        
        // First verify the tag exists
        const tagRef = doc(db, 'tags', tagId);
        const tagDoc = await getDoc(tagRef);
        
        if (!tagDoc.exists()) {
            throw new Error(`Tag with ID ${tagId} does not exist`);
        }
        
        // Add tag to space
        const spaceRef = doc(db, 'spaces', spaceId);
        await updateDoc(spaceRef, {
            tags: arrayUnion(tagId)
        });
        
        return true;
    } catch (error) {
        Logger.error(`tagsFirestore: Error adding tag ${tagId} to space ${spaceId}:`, error);
        throw error;
    }
};

/**
 * Remove a tag from a space
 * @param {string} spaceId - ID of the space
 * @param {string} tagId - ID of the tag to remove
 * @returns {Promise<boolean>} Success status
 */
const removeTagFromSpace = async (spaceId, tagId) => {
    try {
        Logger.log(`tagsFirestore: Removing tag ${tagId} from space ${spaceId}`);
        
        const spaceRef = doc(db, 'spaces', spaceId);
        await updateDoc(spaceRef, {
            tags: arrayRemove(tagId)
        });
        
        return true;
    } catch (error) {
        Logger.error(`tagsFirestore: Error removing tag ${tagId} from space ${spaceId}:`, error);
        throw error;
    }
};

/**
 * Set multiple tags for a space (replaces existing tags)
 * @param {string} spaceId - ID of the space
 * @param {Array<string>} tagIds - Array of tag IDs
 * @returns {Promise<boolean>} Success status
 */
const setSpaceTags = async (spaceId, tagIds) => {
    try {
        Logger.log(`tagsFirestore: Setting tags for space ${spaceId}:`, tagIds);
        
        // Verify all tags exist
        for (const tagId of tagIds) {
            const tagRef = doc(db, 'tags', tagId);
            const tagDoc = await getDoc(tagRef);
            
            if (!tagDoc.exists()) {
                throw new Error(`Tag with ID ${tagId} does not exist`);
            }
        }
        
        // Set tags on space
        const spaceRef = doc(db, 'spaces', spaceId);
        await updateDoc(spaceRef, {
            tags: tagIds
        });
        
        return true;
    } catch (error) {
        Logger.error(`tagsFirestore: Error setting tags for space ${spaceId}:`, error);
        throw error;
    }
};

/**
 * Get all tags for a space
 * @param {string} spaceId - ID of the space
 * @returns {Promise<Array>} Array of tag objects
 */
const getSpaceTags = async (spaceId) => {
    try {
        Logger.log(`tagsFirestore: Getting tags for space ${spaceId}`);
        
        // Get space document
        const spaceRef = doc(db, 'spaces', spaceId);
        const spaceDoc = await getDoc(spaceRef);
        
        if (!spaceDoc.exists()) {
            throw new Error(`Space with ID ${spaceId} not found`);
        }
        
        const spaceData = spaceDoc.data();
        const tagIds = spaceData.tags || [];
        
        if (tagIds.length === 0) {
            return [];
        }
        
        // Fetch all tags
        const tags = [];
        for (const tagId of tagIds) {
            const tag = await getTagById(tagId);
            if (tag) {
                tags.push(tag);
            }
        }
        
        return tags;
    } catch (error) {
        Logger.error(`tagsFirestore: Error getting tags for space ${spaceId}:`, error);
        throw error;
    }
};

/**
 * Get all spaces with a specific tag
 * @param {string} tagId - ID of the tag
 * @returns {Promise<Array>} Array of space objects
 */
const getSpacesByTag = async (tagId) => {
    try {
        Logger.log(`tagsFirestore: Getting spaces with tag ${tagId}`);
        
        const spacesRef = collection(db, 'spaces');
        const q = query(spacesRef, where('tags', 'array-contains', tagId));
        const querySnapshot = await getDocs(q);
        
        const spaces = [];
        querySnapshot.forEach(doc => {
            spaces.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return spaces;
    } catch (error) {
        Logger.error(`tagsFirestore: Error getting spaces with tag ${tagId}:`, error);
        throw error;
    }
};

/**
 * Get all spaces that have any of the specified tags
 * @param {Array<string>} tagIds - Array of tag IDs to search for
 * @returns {Promise<Array>} Array of space objects
 */
const getSpacesByAnyTag = async (tagIds) => {
    try {
        Logger.log(`tagsFirestore: Getting spaces with any tags:`, tagIds);
        
        if (!tagIds || tagIds.length === 0) {
            return [];
        }
        
        // We need to perform a separate query for each tag since Firestore
        // doesn't support OR operations in a single query
        const spacesMap = new Map(); // Use a map to deduplicate spaces
        
        for (const tagId of tagIds) {
            const spacesWithTag = await getSpacesByTag(tagId);
            
            for (const space of spacesWithTag) {
                spacesMap.set(space.id, space);
            }
        }
        
        return Array.from(spacesMap.values());
    } catch (error) {
        Logger.error('tagsFirestore: Error getting spaces with any tags:', error);
        throw error;
    }
};

/**
 * Initialize default tags in Firestore
 * This can be called from the app to set up default tags with appropriate authentication
 * @returns {Promise<{created: number, skipped: number}>} Stats about created/skipped tags
 */
const initializeDefaultTags = async () => {
    Logger.log('tagsFirestore: Initializing default tags');
    
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
    
    try {
        let created = 0;
        let skipped = 0;
        
        for (const tag of initialTags) {
            Logger.log(`tagsFirestore: Processing tag: ${tag.name}`);
            
            // Check if tag already exists
            const tagRef = doc(db, 'tags', tag.id);
            const existingTag = await getDoc(tagRef);
            
            if (existingTag.exists()) {
                Logger.log(`tagsFirestore: Tag ${tag.id} already exists, skipping`);
                skipped++;
            } else {
                await createTag(tag);
                created++;
                Logger.log(`tagsFirestore: Created tag: ${tag.name}`);
            }
        }
        
        Logger.log(`tagsFirestore: Tags initialization complete. Created: ${created}, Skipped: ${skipped}`);
        return { created, skipped };
    } catch (error) {
        Logger.error('tagsFirestore: Error initializing default tags:', error);
        throw error;
    }
};

/**
 * Update all spaces with tags field if missing
 * This ensures all spaces have a tags array field (even if empty)
 * @returns {Promise<{updated: number, skipped: number}>} Stats about updated/skipped spaces
 */
const updateAllSpacesWithTagsField = async () => {
    Logger.log('tagsFirestore: Updating spaces with tags field');
    
    try {
        // Get all spaces
        const spacesRef = collection(db, 'spaces');
        const spacesSnapshot = await getDocs(spacesRef);
        
        let updated = 0;
        let skipped = 0;
        
        // Process each space
        for (const spaceDoc of spacesSnapshot.docs) {
            const spaceData = spaceDoc.data();
            
            // Check if the space already has a tags field
            if ('tags' in spaceData) {
                Logger.log(`tagsFirestore: Space ${spaceDoc.id} already has a tags field, skipping`);
                skipped++;
                continue;
            }
            
            // Add an empty tags array
            const spaceRef = doc(db, 'spaces', spaceDoc.id);
            await updateDoc(spaceRef, {
                tags: []
            });
            
            Logger.log(`tagsFirestore: Updated space ${spaceDoc.id} with empty tags array`);
            updated++;
        }
        
        Logger.log(`tagsFirestore: Finished updating spaces. Updated: ${updated}, Skipped: ${skipped}`);
        return { updated, skipped };
    } catch (error) {
        Logger.error('tagsFirestore: Error updating spaces with tags field:', error);
        throw error;
    }
};

// Export both for ES modules and CommonJS
export {
    getAllTags,
    getTagById,
    createTag,
    updateTag,
    deleteTag,
    addTagToSpace,
    removeTagFromSpace,
    setSpaceTags,
    getSpaceTags,
    getSpacesByTag,
    getSpacesByAnyTag,
    initializeDefaultTags,
    updateAllSpacesWithTagsField
}; 