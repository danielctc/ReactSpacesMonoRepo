import { Logger } from '@disruptive-spaces/shared/logging/react-log';

export const EventNames = {
    sendUserToUnity: 'sendUserToUnity', // used by UserProvider to communicate with webgl renderer.
    playerInstantiated: 'playerInstantiated',
    firstSceneLoaded: 'firstSceneLoaded',
    // userSignedIn: 'userSignedIn',
    // userSignedOut: 'userSignedOut',
    // Add more event names as needed
};



class EventBus {
    constructor() {
        this.events = {};
    }

    subscribe(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
        // Logger.log(`Subscribed to event '${eventName}'`);
    }

    publish(eventName, data) {
        const event = this.events[eventName];
        if (event) {
            event.forEach(callback => {
                callback(data);
            });
            Logger.log(`EventBus: Published event '${eventName}'`);
        } else {
            Logger.log(`EventBus: No subscribers for event '${eventName}'`,);
        }
    }

    unsubscribe(eventName, callback) {
        const eventIndex = this.events[eventName]?.indexOf(callback);
        if (eventIndex > -1) {
            this.events[eventName].splice(eventIndex, 1);
            // Logger.log(`Unsubscribed from event '${eventName}'`);
        }
    }
}

// Exporting a single instance for global use
export const eventBus = new EventBus();
