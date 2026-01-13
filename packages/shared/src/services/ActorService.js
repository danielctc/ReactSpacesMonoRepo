/**
 * ActorService - Platform service for player/actor state management
 *
 * Follows Spatial.io pattern: platform handles networking, Unity is thin client.
 * All actor state synced via Firebase Realtime Database for low-latency updates.
 */

import { ref, set, onValue, off, onDisconnect, serverTimestamp, update } from 'firebase/database';
import { rtdb } from '../firebase/firebase';
import { Logger } from '../logging/react-log';

// Actor state shape
const DEFAULT_ACTOR_STATE = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  animation: 'idle',
  voice: false,
  metadata: {
    displayName: '',
    avatarUrl: '',
    role: 'user'
  },
  lastUpdate: null,
  isOnline: true
};

class ActorServiceClass {
  constructor() {
    this.currentSpaceId = null;
    this.currentInstanceId = null;
    this.localActorId = null;
    this.actors = new Map();
    this.listeners = new Set();
    this.unsubscribe = null;
    this.updateThrottle = 50; // ms between position updates
    this.lastUpdateTime = 0;
  }

  /**
   * Join a space instance
   * @param {string} spaceId - Space identifier
   * @param {string} instanceId - Instance/room identifier
   * @param {string} actorId - Local player's actor ID (usually Firebase UID)
   * @param {Object} metadata - Player metadata (displayName, avatarUrl, role)
   */
  async join(spaceId, instanceId, actorId, metadata = {}) {
    if (this.currentSpaceId) {
      await this.leave();
    }

    this.currentSpaceId = spaceId;
    this.currentInstanceId = instanceId;
    this.localActorId = actorId;

    const actorRef = ref(rtdb, `spaces/${spaceId}/instances/${instanceId}/actors/${actorId}`);

    // Set initial state
    const initialState = {
      ...DEFAULT_ACTOR_STATE,
      metadata: {
        ...DEFAULT_ACTOR_STATE.metadata,
        ...metadata
      },
      lastUpdate: serverTimestamp(),
      joinedAt: serverTimestamp()
    };

    await set(actorRef, initialState);

    // Set up disconnect cleanup
    onDisconnect(actorRef).remove();

    // Subscribe to all actors in this instance
    this._subscribeToActors(spaceId, instanceId);

    Logger.log(`[ActorService] Joined space ${spaceId} instance ${instanceId} as ${actorId}`);

    return initialState;
  }

  /**
   * Leave current space instance
   */
  async leave() {
    if (!this.currentSpaceId || !this.localActorId) return;

    // Remove local actor
    const actorRef = ref(rtdb, `spaces/${this.currentSpaceId}/instances/${this.currentInstanceId}/actors/${this.localActorId}`);
    await set(actorRef, null);

    // Unsubscribe from updates
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.actors.clear();
    this.currentSpaceId = null;
    this.currentInstanceId = null;
    this.localActorId = null;

    Logger.log('[ActorService] Left space');
  }

  /**
   * Update local actor's position and rotation
   * Throttled to prevent flooding Firebase
   * @param {Object} position - { x, y, z }
   * @param {Object} rotation - { x, y, z }
   */
  updateTransform(position, rotation) {
    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateThrottle) return;
    this.lastUpdateTime = now;

    if (!this.currentSpaceId || !this.localActorId) return;

    const actorRef = ref(rtdb, `spaces/${this.currentSpaceId}/instances/${this.currentInstanceId}/actors/${this.localActorId}`);

    update(actorRef, {
      position,
      rotation,
      lastUpdate: serverTimestamp()
    });
  }

  /**
   * Update local actor's animation state
   * @param {string} animation - Animation name (idle, walk, run, jump, etc.)
   */
  updateAnimation(animation) {
    if (!this.currentSpaceId || !this.localActorId) return;

    const actorRef = ref(rtdb, `spaces/${this.currentSpaceId}/instances/${this.currentInstanceId}/actors/${this.localActorId}`);

    update(actorRef, {
      animation,
      lastUpdate: serverTimestamp()
    });
  }

  /**
   * Update local actor's voice state
   * @param {boolean} speaking - Whether the player is speaking
   */
  updateVoice(speaking) {
    if (!this.currentSpaceId || !this.localActorId) return;

    const actorRef = ref(rtdb, `spaces/${this.currentSpaceId}/instances/${this.currentInstanceId}/actors/${this.localActorId}`);

    update(actorRef, {
      voice: speaking,
      lastUpdate: serverTimestamp()
    });
  }

  /**
   * Update local actor's metadata
   * @param {Object} metadata - Partial metadata update
   */
  updateMetadata(metadata) {
    if (!this.currentSpaceId || !this.localActorId) return;

    const actorRef = ref(rtdb, `spaces/${this.currentSpaceId}/instances/${this.currentInstanceId}/actors/${this.localActorId}/metadata`);

    update(actorRef, metadata);
  }

  /**
   * Get current list of actors
   * @returns {Map} Map of actorId -> actor state
   */
  getActors() {
    return new Map(this.actors);
  }

  /**
   * Get a specific actor's state
   * @param {string} actorId
   * @returns {Object|null}
   */
  getActor(actorId) {
    return this.actors.get(actorId) || null;
  }

  /**
   * Check if an actor is the local player
   * @param {string} actorId
   * @returns {boolean}
   */
  isLocalActor(actorId) {
    return actorId === this.localActorId;
  }

  /**
   * Subscribe to actor changes
   * @param {Function} callback - Called with (actorId, state, changeType)
   * @returns {Function} Unsubscribe function
   */
  onActorChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Internal: Subscribe to all actors in an instance
   */
  _subscribeToActors(spaceId, instanceId) {
    const actorsRef = ref(rtdb, `spaces/${spaceId}/instances/${instanceId}/actors`);

    this.unsubscribe = onValue(actorsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const currentActorIds = new Set(Object.keys(data));
      const previousActorIds = new Set(this.actors.keys());

      // Handle joins
      for (const actorId of currentActorIds) {
        if (!previousActorIds.has(actorId)) {
          this.actors.set(actorId, data[actorId]);
          this._notifyListeners(actorId, data[actorId], 'joined');
        }
      }

      // Handle updates
      for (const actorId of currentActorIds) {
        if (previousActorIds.has(actorId)) {
          const prevState = this.actors.get(actorId);
          const newState = data[actorId];

          // Only notify if actually changed
          if (JSON.stringify(prevState) !== JSON.stringify(newState)) {
            this.actors.set(actorId, newState);
            this._notifyListeners(actorId, newState, 'updated');
          }
        }
      }

      // Handle leaves
      for (const actorId of previousActorIds) {
        if (!currentActorIds.has(actorId)) {
          const lastState = this.actors.get(actorId);
          this.actors.delete(actorId);
          this._notifyListeners(actorId, lastState, 'left');
        }
      }
    });
  }

  /**
   * Internal: Notify all listeners of a change
   */
  _notifyListeners(actorId, state, changeType) {
    for (const callback of this.listeners) {
      try {
        callback(actorId, state, changeType);
      } catch (error) {
        Logger.error('[ActorService] Listener error:', error);
      }
    }
  }
}

// Singleton instance
export const ActorService = new ActorServiceClass();

// React hook for using ActorService
import { useState, useEffect, useCallback } from 'react';

export function useActorService(spaceId, instanceId, userId, userMetadata) {
  const [actors, setActors] = useState(new Map());
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    if (!spaceId || !instanceId || !userId) return;

    ActorService.join(spaceId, instanceId, userId, userMetadata)
      .then(() => setIsJoined(true))
      .catch(err => Logger.error('[useActorService] Join failed:', err));

    const unsubscribe = ActorService.onActorChange((actorId, state, changeType) => {
      setActors(new Map(ActorService.getActors()));
    });

    return () => {
      unsubscribe();
      ActorService.leave();
      setIsJoined(false);
    };
  }, [spaceId, instanceId, userId]);

  const updateTransform = useCallback((position, rotation) => {
    ActorService.updateTransform(position, rotation);
  }, []);

  const updateAnimation = useCallback((animation) => {
    ActorService.updateAnimation(animation);
  }, []);

  return {
    actors,
    isJoined,
    localActorId: ActorService.localActorId,
    updateTransform,
    updateAnimation,
    isLocalActor: ActorService.isLocalActor.bind(ActorService)
  };
}
