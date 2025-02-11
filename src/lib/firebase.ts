import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBttEMBS-TOLH8Cl45mkEUnZaCmUYQROoI",
  authDomain: "fastbooking-e8b10.firebaseapp.com",
  projectId: "fastbooking-e8b10",
  storageBucket: "fastbooking-e8b10.firebasestorage.app",
  messagingSenderId: "613762749006",
  appId: "1:613762749006:web:cf7b3565df9c88c258e91f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore(app);

// Initialize Google Provider with additional scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');

// Helper function to create notifications with error handling
export const createNotification = async (
  userId: string,
  type: 'profile_view' | 'appointment_reminder' | 'profile_update',
  title: string,
  message: string,
  data?: {
    appointmentId?: string;
    linkId?: string;
    viewerCountry?: string;
  }
) => {
  try {
    const notificationData = {
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: Timestamp.now(),
      data
    };

    // Try to create the notification
    await addDoc(collection(db, 'notifications'), notificationData);
  } catch (error: any) {
    // Log the error but don't throw it - this way the app continues working
    // even if notification creation fails
    console.error('Error creating notification:', error);
    
    // If you need to handle specific error cases, you can do it here
    if (error.code === 'permission-denied') {
      console.warn('Permission denied to create notification');
    }
  }
};