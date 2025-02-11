import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import Profile from './Profile';

interface ShareableLink {
  userId: string;
  visibility: {
    avatar: boolean;
    cover: boolean;
    attachments: boolean;
  };
}

export default function SharedProfile() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<ShareableLink['visibility'] | null>(null);

  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const q = query(
        collection(db, 'shareableLinks'),
        where('token', '==', token)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setError('Invalid or expired link');
        setLoading(false);
        return;
      }

      const linkDoc = snapshot.docs[0];
      const linkData = linkDoc.data() as ShareableLink;
      
      // Update usage statistics
      await updateDoc(doc(db, 'shareableLinks', linkDoc.id), {
        lastUsed: Timestamp.now(),
        usageCount: increment(1)
      });

      setUserId(linkData.userId);
      setVisibility(linkData.visibility);
    } catch (error) {
      console.error('Error validating token:', error);
      setError('Failed to validate link');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!userId || !visibility) {
    return <Navigate to="/login" />;
  }

  return <Profile userId={userId} visibility={visibility} sharedView />;
}