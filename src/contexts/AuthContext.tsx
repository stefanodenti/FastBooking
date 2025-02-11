import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  signOut, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { auth, googleProvider, db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to check and convert manual user
  const checkAndConvertManualUser = async (email: string, userData: User) => {
    try {
      // Search for manual user with the same email
      const q = query(
        collection(db, 'users'),
        where('email', '==', email),
        where('isManual', '==', true)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const manualUser = querySnapshot.docs[0];
        const manualUserData = manualUser.data();

        // Update the new user document with manual user data
        await setDoc(doc(db, 'users', userData.uid), {
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName || manualUserData.displayName,
          photoURL: userData.photoURL,
          lastLogin: serverTimestamp(),
          createdAt: manualUserData.createdAt, // Keep original creation date
          isManual: false // Convert to regular user
        });

        // Delete the manual user document
        await deleteDoc(doc(db, 'users', manualUser.id));

        console.log('Manual user converted to regular user');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error converting manual user:', error);
      return false;
    }
  };

  // Function to save user to Firestore
  const saveUserToFirestore = async (userData: User) => {
    try {
      // First check if this user was previously a manual user
      const wasManualUser = await checkAndConvertManualUser(userData.email!, userData);

      // If not a converted manual user, create new user document
      if (!wasManualUser) {
        const userRef = doc(db, 'users', userData.uid);
        await setDoc(userRef, {
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName || userData.email?.split('@')[0],
          photoURL: userData.photoURL,
          lastLogin: serverTimestamp(),
          createdAt: serverTimestamp(),
          isManual: false
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error saving user to Firestore:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        await saveUserToFirestore(user);
      }
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    await saveUserToFirestore(result.user);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await saveUserToFirestore(result.user);
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await saveUserToFirestore(result.user);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signInWithGoogle, 
      signInWithEmail,
      signUpWithEmail,
      logout 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};