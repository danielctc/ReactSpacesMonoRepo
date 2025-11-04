// shared/firebase/spaceChatFirestore.js
import { collection, addDoc, onSnapshot, query, orderBy, startAt } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

export const sendMessageToSpaceChat = async (spaceId, message) => {
    try {
        const chatRef = collection(db, `spaces/${spaceId}/chatMessages`);
        await addDoc(chatRef, message); // Directly store the provided message
        Logger.log('Message sent to space chat:', message);
    } catch (error) {
        Logger.error('Error sending message to space chat:', error);
        throw error;
    }
};

export const subscribeToSpaceChatMessages = (spaceId, callback) => {
    try {
        const chatRef = collection(db, `spaces/${spaceId}/chatMessages`);
        const currentTime = new Date(); // Get current time
        const chatQuery = query(chatRef, orderBy('timestamp', 'asc'), startAt(currentTime));

        return onSnapshot(chatQuery, (snapshot) => {
            const newMessages = [];
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const messageData = change.doc.data();
                     // Log each document's data
                    newMessages.push({ id: change.doc.id, ...messageData });
                }
            });
            if (newMessages.length > 0) {
                callback(newMessages);
            }
        });
    } catch (error) {
        Logger.error('Error subscribing to space chat messages:', error);
        throw error;
    }
};
