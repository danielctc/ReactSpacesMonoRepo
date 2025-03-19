import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { auth, db } from '@disruptive-spaces/shared/firebase/firebase';

// Website CMS functions
const websiteCollection = collection(db, 'website');

// Get all website content
export const getAllWebsiteContent = async () => {
  const querySnapshot = await getDocs(websiteCollection);
  const content = {};
  
  querySnapshot.forEach((doc) => {
    content[doc.id] = doc.data();
  });
  
  return content;
};

// Get specific page content
export const getPageContent = async (pageId) => {
  const docRef = doc(db, 'website', pageId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    return null;
  }
};

// Update page content (admin only)
export const updatePageContent = async (pageId, content) => {
  const docRef = doc(db, 'website', pageId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    await updateDoc(docRef, content);
  } else {
    await setDoc(docRef, content);
  }
  
  return true;
};

// Delete page content (admin only)
export const deletePageContent = async (pageId) => {
  const docRef = doc(db, 'website', pageId);
  await deleteDoc(docRef);
  return true;
};

export { db, auth }; 