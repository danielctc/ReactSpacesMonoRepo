/**
 * Firebase Write Guard
 *
 * Blocks ALL write operations to Firebase (Firestore, Storage, Cloud Functions).
 * Reads are unaffected.
 *
 * To disable: set FIREBASE_WRITES_BLOCKED to false, or delete this file
 * and remove all guardFirebaseWrite() calls (search the codebase).
 */

const FIREBASE_WRITES_BLOCKED = false;

export const guardFirebaseWrite = (operation: string): void => {
  if (FIREBASE_WRITES_BLOCKED) {
    const message = `FIREBASE WRITE BLOCKED: "${operation}" — write guard active, no data sent to Firebase.`;
    console.warn(`\u{1F6D1} ${message}`);
    throw new Error(message);
  }
};
