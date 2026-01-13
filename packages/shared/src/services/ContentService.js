/**
 * ContentService - Platform service for synced object/content management
 *
 * Follows Spatial.io pattern: platform handles object sync, Unity renders.
 * Manages spawning, ownership, and state sync for networked objects.
 */

import { ref, set, update, onValue, push, get, serverTimestamp } from 'firebase/database';
import { Logger } from '../logging/react-log';
import { rtdb } from '../firebase/firebase';

// Object types
export const ObjectType = {
  PREFAB: 'prefab',
  VIDEO_CANVAS: 'video_canvas',
  MEDIA_SCREEN: 'media_screen',
  PORTAL: 'portal',
  INTERACTIVE: 'interactive',
  CUSTOM: 'custom'
};

class ContentServiceClass {
  constructor() {
    this.currentSpaceId = null;
    this.currentInstanceId = null;
    this.localActorId = null;
    this.objects = new Map();
    this.listeners = new Set();
    this.unsubscribe = null;
  }

  /**
   * Initialize content service for a space instance
   * @param {string} spaceId
   * @param {string} instanceId
   * @param {string} actorId
   */
  async init(spaceId, instanceId, actorId) {
    if (this.currentSpaceId) {
      await this.cleanup();
    }

    this.currentSpaceId = spaceId;
    this.currentInstanceId = instanceId;
    this.localActorId = actorId;

    this._subscribeToObjects(spaceId, instanceId);

    Logger.log(`[ContentService] Initialized for ${spaceId}/${instanceId}`);
  }

  /**
   * Cleanup and unsubscribe
   */
  async cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.objects.clear();
    this.currentSpaceId = null;
    this.currentInstanceId = null;
    this.localActorId = null;

    Logger.log('[ContentService] Cleaned up');
  }

  /**
   * Spawn a new networked object
   * @param {string} type - ObjectType
   * @param {Object} config - Object configuration
   * @returns {Promise<string>} Object ID
   */
  async spawn(type, config) {
    if (!this.currentSpaceId) {
      Logger.error('[ContentService] Not initialized');
      return null;
    }

    const objectsRef = ref(rtdb, `spaces/${this.currentSpaceId}/instances/${this.currentInstanceId}/objects`);
    const newObjectRef = push(objectsRef);
    const objectId = newObjectRef.key;

    const objectData = {
      id: objectId,
      type,
      ownerId: this.localActorId,
      position: config.position || { x: 0, y: 0, z: 0 },
      rotation: config.rotation || { x: 0, y: 0, z: 0 },
      scale: config.scale || { x: 1, y: 1, z: 1 },
      state: config.state || {},
      prefabId: config.prefabId || null,
      glbUrl: config.glbUrl || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await set(newObjectRef, objectData);

    Logger.log(`[ContentService] Spawned object ${objectId} of type ${type}`);
    return objectId;
  }

  /**
   * Despawn/destroy a networked object
   * @param {string} objectId
   * @returns {Promise<boolean>}
   */
  async despawn(objectId) {
    const object = this.objects.get(objectId);
    if (!object) {
      Logger.warn(`[ContentService] Object ${objectId} not found`);
      return false;
    }

    // Only owner can despawn (or implement authority check)
    if (object.ownerId !== this.localActorId) {
      Logger.warn(`[ContentService] Cannot despawn: not owner of ${objectId}`);
      return false;
    }

    const objectRef = ref(rtdb, `spaces/${this.currentSpaceId}/instances/${this.currentInstanceId}/objects/${objectId}`);
    await set(objectRef, null);

    Logger.log(`[ContentService] Despawned object ${objectId}`);
    return true;
  }

  /**
   * Update object transform (position/rotation/scale)
   * Only the owner can update
   * @param {string} objectId
   * @param {Object} transform - { position?, rotation?, scale? }
   */
  async updateTransform(objectId, transform) {
    const object = this.objects.get(objectId);
    if (!object) return false;

    if (object.ownerId !== this.localActorId) {
      Logger.warn(`[ContentService] Cannot update: not owner of ${objectId}`);
      return false;
    }

    const objectRef = ref(rtdb, `spaces/${this.currentSpaceId}/instances/${this.currentInstanceId}/objects/${objectId}`);

    const updates = { updatedAt: serverTimestamp() };
    if (transform.position) updates.position = transform.position;
    if (transform.rotation) updates.rotation = transform.rotation;
    if (transform.scale) updates.scale = transform.scale;

    await update(objectRef, updates);
    return true;
  }

  /**
   * Update object custom state
   * @param {string} objectId
   * @param {Object} state - Partial state update
   */
  async updateState(objectId, state) {
    const object = this.objects.get(objectId);
    if (!object) return false;

    if (object.ownerId !== this.localActorId) {
      Logger.warn(`[ContentService] Cannot update state: not owner of ${objectId}`);
      return false;
    }

    const stateRef = ref(rtdb, `spaces/${this.currentSpaceId}/instances/${this.currentInstanceId}/objects/${objectId}/state`);
    await update(stateRef, state);

    const objectRef = ref(rtdb, `spaces/${this.currentSpaceId}/instances/${this.currentInstanceId}/objects/${objectId}`);
    await update(objectRef, { updatedAt: serverTimestamp() });

    return true;
  }

  /**
   * Request ownership of an object
   * @param {string} objectId
   * @returns {Promise<boolean>}
   */
  async requestOwnership(objectId) {
    const object = this.objects.get(objectId);
    if (!object) return false;

    // If no owner, take ownership immediately
    if (!object.ownerId) {
      return this._takeOwnership(objectId);
    }

    // If we're already the owner, return true
    if (object.ownerId === this.localActorId) {
      return true;
    }

    // Request from current owner (they need to transfer)
    // This is a simplified implementation - real version would have timeout/retry
    Logger.log(`[ContentService] Requesting ownership of ${objectId} from ${object.ownerId}`);

    // For now, just try to take ownership if object is "stale" (owner offline)
    const actorsRef = ref(rtdb, `spaces/${this.currentSpaceId}/instances/${this.currentInstanceId}/actors/${object.ownerId}`);
    const actorSnapshot = await get(actorsRef);

    if (!actorSnapshot.exists()) {
      // Owner is offline, take ownership
      return this._takeOwnership(objectId);
    }

    return false;
  }

  /**
   * Transfer ownership of an object to another actor
   * @param {string} objectId
   * @param {string} newOwnerId
   */
  async transferOwnership(objectId, newOwnerId) {
    const object = this.objects.get(objectId);
    if (!object) return false;

    if (object.ownerId !== this.localActorId) {
      Logger.warn(`[ContentService] Cannot transfer: not owner of ${objectId}`);
      return false;
    }

    const objectRef = ref(rtdb, `spaces/${this.currentSpaceId}/instances/${this.currentInstanceId}/objects/${objectId}`);
    await update(objectRef, {
      ownerId: newOwnerId,
      updatedAt: serverTimestamp()
    });

    Logger.log(`[ContentService] Transferred ownership of ${objectId} to ${newOwnerId}`);
    return true;
  }

  /**
   * Release ownership (set to null, anyone can take)
   * @param {string} objectId
   */
  async releaseOwnership(objectId) {
    const object = this.objects.get(objectId);
    if (!object) return false;

    if (object.ownerId !== this.localActorId) return false;

    const objectRef = ref(rtdb, `spaces/${this.currentSpaceId}/instances/${this.currentInstanceId}/objects/${objectId}`);
    await update(objectRef, {
      ownerId: null,
      updatedAt: serverTimestamp()
    });

    return true;
  }

  /**
   * Get all objects
   * @returns {Map}
   */
  getObjects() {
    return new Map(this.objects);
  }

  /**
   * Get a specific object
   * @param {string} objectId
   * @returns {Object|null}
   */
  getObject(objectId) {
    return this.objects.get(objectId) || null;
  }

  /**
   * Get objects by type
   * @param {string} type
   * @returns {Object[]}
   */
  getObjectsByType(type) {
    return Array.from(this.objects.values()).filter(obj => obj.type === type);
  }

  /**
   * Get objects owned by local actor
   * @returns {Object[]}
   */
  getOwnedObjects() {
    return Array.from(this.objects.values()).filter(obj => obj.ownerId === this.localActorId);
  }

  /**
   * Check if local actor owns an object
   * @param {string} objectId
   * @returns {boolean}
   */
  isOwner(objectId) {
    const object = this.objects.get(objectId);
    return object?.ownerId === this.localActorId;
  }

  /**
   * Subscribe to object changes
   * @param {Function} callback - (objectId, object, changeType) => void
   * @returns {Function} Unsubscribe
   */
  onObjectChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Internal: Take ownership of an object
   */
  async _takeOwnership(objectId) {
    const objectRef = ref(rtdb, `spaces/${this.currentSpaceId}/instances/${this.currentInstanceId}/objects/${objectId}`);
    await update(objectRef, {
      ownerId: this.localActorId,
      updatedAt: serverTimestamp()
    });

    Logger.log(`[ContentService] Took ownership of ${objectId}`);
    return true;
  }

  /**
   * Internal: Subscribe to objects in an instance
   */
  _subscribeToObjects(spaceId, instanceId) {
    const objectsRef = ref(rtdb, `spaces/${spaceId}/instances/${instanceId}/objects`);

    this.unsubscribe = onValue(objectsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const currentObjectIds = new Set(Object.keys(data));
      const previousObjectIds = new Set(this.objects.keys());

      // Handle spawns
      for (const objectId of currentObjectIds) {
        if (!previousObjectIds.has(objectId)) {
          this.objects.set(objectId, data[objectId]);
          this._notifyListeners(objectId, data[objectId], 'spawned');
        }
      }

      // Handle updates
      for (const objectId of currentObjectIds) {
        if (previousObjectIds.has(objectId)) {
          const prevState = this.objects.get(objectId);
          const newState = data[objectId];

          if (JSON.stringify(prevState) !== JSON.stringify(newState)) {
            this.objects.set(objectId, newState);
            this._notifyListeners(objectId, newState, 'updated');
          }
        }
      }

      // Handle despawns
      for (const objectId of previousObjectIds) {
        if (!currentObjectIds.has(objectId)) {
          const lastState = this.objects.get(objectId);
          this.objects.delete(objectId);
          this._notifyListeners(objectId, lastState, 'despawned');
        }
      }
    });
  }

  /**
   * Internal: Notify listeners
   */
  _notifyListeners(objectId, object, changeType) {
    for (const callback of this.listeners) {
      try {
        callback(objectId, object, changeType);
      } catch (error) {
        Logger.error('[ContentService] Listener error:', error);
      }
    }
  }
}

// Singleton instance
export const ContentService = new ContentServiceClass();

// React hook
import { useState, useEffect, useCallback } from 'react';

export function useContentService(spaceId, instanceId, actorId) {
  const [objects, setObjects] = useState(new Map());

  useEffect(() => {
    if (!spaceId || !instanceId || !actorId) return;

    ContentService.init(spaceId, instanceId, actorId)
      .catch(err => Logger.error('[useContentService] Init failed:', err));

    const unsubscribe = ContentService.onObjectChange(() => {
      setObjects(new Map(ContentService.getObjects()));
    });

    return () => {
      unsubscribe();
      ContentService.cleanup();
    };
  }, [spaceId, instanceId, actorId]);

  const spawn = useCallback((type, config) => {
    return ContentService.spawn(type, config);
  }, []);

  const despawn = useCallback((objectId) => {
    return ContentService.despawn(objectId);
  }, []);

  const updateTransform = useCallback((objectId, transform) => {
    return ContentService.updateTransform(objectId, transform);
  }, []);

  return {
    objects,
    spawn,
    despawn,
    updateTransform,
    updateState: ContentService.updateState.bind(ContentService),
    requestOwnership: ContentService.requestOwnership.bind(ContentService),
    isOwner: ContentService.isOwner.bind(ContentService)
  };
}
