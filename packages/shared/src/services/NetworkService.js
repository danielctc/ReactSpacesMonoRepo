/**
 * NetworkService - Platform service for networking, RPCs, and events
 *
 * Follows Spatial.io pattern: platform handles networking, Unity is thin client.
 * Provides RPC-like functionality via Firebase for event broadcasting.
 */

import { ref, push, onChildAdded, off, serverTimestamp, set, get } from 'firebase/database';
import { Logger } from '../logging/react-log';
import { rtdb } from '../firebase/firebase';

// Connection states
export const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting'
};

class NetworkServiceClass {
  constructor() {
    this.currentSpaceId = null;
    this.currentInstanceId = null;
    this.localActorId = null;
    this.connectionState = ConnectionState.DISCONNECTED;
    this.eventHandlers = new Map();
    this.unsubscribe = null;
    this.connectionListeners = new Set();
    this.eventTTL = 5000; // Events older than 5s are ignored
  }

  /**
   * Connect to a space instance
   * @param {string} spaceId
   * @param {string} instanceId
   * @param {string} actorId
   */
  async connect(spaceId, instanceId, actorId) {
    if (this.connectionState !== ConnectionState.DISCONNECTED) {
      await this.disconnect();
    }

    this._setConnectionState(ConnectionState.CONNECTING);

    this.currentSpaceId = spaceId;
    this.currentInstanceId = instanceId;
    this.localActorId = actorId;

    // Subscribe to events
    this._subscribeToEvents(spaceId, instanceId);

    this._setConnectionState(ConnectionState.CONNECTED);

    Logger.log(`[NetworkService] Connected to ${spaceId}/${instanceId}`);
  }

  /**
   * Disconnect from current instance
   */
  async disconnect() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.currentSpaceId = null;
    this.currentInstanceId = null;
    this.localActorId = null;
    this._setConnectionState(ConnectionState.DISCONNECTED);

    Logger.log('[NetworkService] Disconnected');
  }

  /**
   * Get current connection state
   * @returns {string}
   */
  getConnectionState() {
    return this.connectionState;
  }

  /**
   * Subscribe to connection state changes
   * @param {Function} callback
   * @returns {Function} Unsubscribe
   */
  onConnectionStateChange(callback) {
    this.connectionListeners.add(callback);
    return () => this.connectionListeners.delete(callback);
  }

  /**
   * Broadcast an event to all actors in the instance
   * @param {string} eventName - Event type name
   * @param {Object} data - Event payload
   * @param {Object} options - { reliable: boolean, targetActors: string[] }
   */
  async broadcast(eventName, data, options = {}) {
    if (this.connectionState !== ConnectionState.CONNECTED) {
      Logger.warn('[NetworkService] Cannot broadcast: not connected');
      return false;
    }

    const eventsRef = ref(rtdb, `spaces/${this.currentSpaceId}/instances/${this.currentInstanceId}/events`);

    const event = {
      eventName,
      data,
      senderId: this.localActorId,
      targetActors: options.targetActors || null, // null = broadcast to all
      timestamp: serverTimestamp(),
      clientTimestamp: Date.now()
    };

    await push(eventsRef, event);

    Logger.log(`[NetworkService] Broadcast: ${eventName}`, data);
    return true;
  }

  /**
   * Send an event to specific actors
   * @param {string} eventName
   * @param {Object} data
   * @param {string[]} targetActorIds
   */
  async sendTo(eventName, data, targetActorIds) {
    return this.broadcast(eventName, data, { targetActors: targetActorIds });
  }

  /**
   * Send an event to the server/host (first actor in instance)
   * For authority-based operations
   * @param {string} eventName
   * @param {Object} data
   */
  async sendToHost(eventName, data) {
    // Get instance host
    const instanceRef = ref(rtdb, `spaces/${this.currentSpaceId}/instances/${this.currentInstanceId}`);
    const snapshot = await get(instanceRef);
    const instanceData = snapshot.val();

    if (instanceData?.hostActorId) {
      return this.sendTo(eventName, data, [instanceData.hostActorId]);
    }

    Logger.warn('[NetworkService] No host found for instance');
    return false;
  }

  /**
   * Register an event handler
   * @param {string} eventName
   * @param {Function} handler - (data, senderId) => void
   * @returns {Function} Unsubscribe
   */
  on(eventName, handler) {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, new Set());
    }
    this.eventHandlers.get(eventName).add(handler);

    return () => {
      const handlers = this.eventHandlers.get(eventName);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  /**
   * Remove all handlers for an event
   * @param {string} eventName
   */
  off(eventName) {
    this.eventHandlers.delete(eventName);
  }

  /**
   * Request ownership of an object (for distributed authority)
   * @param {string} objectId
   * @returns {Promise<boolean>}
   */
  async requestOwnership(objectId) {
    return this.broadcast('RequestOwnership', {
      objectId,
      requesterId: this.localActorId
    });
  }

  /**
   * Transfer ownership of an object
   * @param {string} objectId
   * @param {string} newOwnerId
   */
  async transferOwnership(objectId, newOwnerId) {
    return this.broadcast('TransferOwnership', {
      objectId,
      previousOwnerId: this.localActorId,
      newOwnerId
    });
  }

  /**
   * Internal: Set connection state and notify listeners
   */
  _setConnectionState(state) {
    if (this.connectionState === state) return;

    this.connectionState = state;
    for (const callback of this.connectionListeners) {
      try {
        callback(state);
      } catch (error) {
        Logger.error('[NetworkService] Connection listener error:', error);
      }
    }
  }

  /**
   * Internal: Subscribe to events in an instance
   */
  _subscribeToEvents(spaceId, instanceId) {
    const eventsRef = ref(rtdb, `spaces/${spaceId}/instances/${instanceId}/events`);

    // Only listen for new events (not historical)
    const startTime = Date.now();

    this.unsubscribe = onChildAdded(eventsRef, (snapshot) => {
      const event = snapshot.val();
      if (!event) return;

      // Ignore old events
      if (event.clientTimestamp && event.clientTimestamp < startTime - this.eventTTL) {
        return;
      }

      // Ignore own events
      if (event.senderId === this.localActorId) {
        return;
      }

      // Check if targeted to us
      if (event.targetActors && !event.targetActors.includes(this.localActorId)) {
        return;
      }

      // Dispatch to handlers
      this._dispatchEvent(event);

      // Clean up old events (fire and forget)
      this._cleanupOldEvent(snapshot.key, event.clientTimestamp);
    });
  }

  /**
   * Internal: Dispatch event to registered handlers
   */
  _dispatchEvent(event) {
    const handlers = this.eventHandlers.get(event.eventName);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        handler(event.data, event.senderId);
      } catch (error) {
        Logger.error(`[NetworkService] Handler error for ${event.eventName}:`, error);
      }
    }
  }

  /**
   * Internal: Clean up old events to prevent database bloat
   */
  async _cleanupOldEvent(eventKey, timestamp) {
    if (!timestamp) return;

    const age = Date.now() - timestamp;
    if (age > this.eventTTL * 2) {
      const eventRef = ref(rtdb, `spaces/${this.currentSpaceId}/instances/${this.currentInstanceId}/events/${eventKey}`);
      await set(eventRef, null);
    }
  }
}

// Singleton instance
export const NetworkService = new NetworkServiceClass();

// React hook for using NetworkService
import { useState, useEffect, useCallback } from 'react';

export function useNetworkService(spaceId, instanceId, actorId) {
  const [connectionState, setConnectionState] = useState(ConnectionState.DISCONNECTED);

  useEffect(() => {
    if (!spaceId || !instanceId || !actorId) return;

    NetworkService.connect(spaceId, instanceId, actorId)
      .catch(err => Logger.error('[useNetworkService] Connect failed:', err));

    const unsubscribe = NetworkService.onConnectionStateChange(setConnectionState);

    return () => {
      unsubscribe();
      NetworkService.disconnect();
    };
  }, [spaceId, instanceId, actorId]);

  const broadcast = useCallback((eventName, data) => {
    return NetworkService.broadcast(eventName, data);
  }, []);

  const on = useCallback((eventName, handler) => {
    return NetworkService.on(eventName, handler);
  }, []);

  return {
    connectionState,
    isConnected: connectionState === ConnectionState.CONNECTED,
    broadcast,
    sendTo: NetworkService.sendTo.bind(NetworkService),
    on
  };
}
