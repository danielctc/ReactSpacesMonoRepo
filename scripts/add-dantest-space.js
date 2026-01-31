/**
 * Creates the dantest space document in Firestore for local development.
 * Run with: node scripts/add-dantest-space.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCaxoNKRIMaXhotGzdAjXc5gkARoqtS3bU",
  authDomain: "disruptive-metaverse.firebaseapp.com",
  projectId: "disruptive-metaverse",
  storageBucket: "disruptive-metaverse.appspot.com",
  messagingSenderId: "294433070603",
  appId: "1:294433070603:web:136cddd196eea9614fb10e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const dantestSpace = {
  loaderUrl: "/devBuilds/dantest/Build/dantest.loader.js",
  dataUrl: "/devBuilds/dantest/Build/dantest.data",
  frameworkUrl: "/devBuilds/dantest/Build/dantest.framework.js",
  codeUrl: "/devBuilds/dantest/Build/dantest.wasm",
  allowGuestUsers: true,
  showAuthButton: true,
  showDisruptiveLogo: true,
  showHelpButton: true,
  enableVoiceChat: true,
  name: "Dan Test - Local Development",
  createdAt: new Date().toISOString()
};

async function createDantestSpace() {
  try {
    console.log('Creating dantest space document...');
    await setDoc(doc(db, 'spaces', 'dantest'), dantestSpace);
    console.log('✅ Successfully created spaces/dantest document');
    console.log('Config:', JSON.stringify(dantestSpace, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating document:', error.message);
    process.exit(1);
  }
}

createDantestSpace();
