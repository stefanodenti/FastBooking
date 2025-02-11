import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { db, createNotification } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, limit, getDocs } from 'firebase/firestore';

interface Notification {
  id: string;
  userId: string;
  type: 'profile_view' | 'appointment_reminder' | 'profile_update';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  data?: {
    appointmentId?: string;
    linkId?: string;
    viewerCountry?: string;
    isWelcome?: boolean;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  error: string | null;
  loading: boolean;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCreatedWelcomeNotification, setHasCreatedWelcomeNotification] = useState(false);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const setupNotificationListener = async () => {
      try {
        // First, check if welcome notification exists
        const welcomeQuery = query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid),
          where('data.isWelcome', '==', true),
          limit(1)
        );

        const welcomeSnapshot = await getDocs(welcomeQuery);
        const hasWelcomeNotification = !welcomeSnapshot.empty;

        // Set up the real query for all notifications
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(50)
        );

        unsubscribe = onSnapshot(q, 
          (snapshot) => {
            const notificationsData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt.toDate()
            })) as Notification[];
            
            setNotifications(notificationsData);
            setError(null);
            setLoading(false);

            // Create welcome notification if it doesn't exist and we haven't tried to create one yet
            if (!hasWelcomeNotification && !hasCreatedWelcomeNotification) {
              createWelcomeNotification();
            }
          },
          (err) => {
            console.error('Error fetching notifications:', err);
            if (err.code === 'failed-precondition') {
              setError('Notification system is being initialized. Please wait a moment.');
            } else {
              setError('Failed to load notifications');
            }
            setLoading(false);
          }
        );
      } catch (err) {
        // If we get here, the collection probably doesn't exist yet
        // Create welcome notification if we haven't tried yet
        if (!hasCreatedWelcomeNotification) {
          createWelcomeNotification();
        }
      }
    };

    const createWelcomeNotification = async () => {
      try {
        await createNotification(
          user.uid,
          'profile_update',
          'Welcome to FastBooking! 👋',
          'Thank you for joining us. Start by completing your profile and exploring our features.',
          { isWelcome: true }
        );
        setHasCreatedWelcomeNotification(true);
      } catch (error) {
        console.error('Error creating welcome notification:', error);
      }
    };

    setupNotificationListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, hasCreatedWelcomeNotification]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      const promises = notifications
        .filter(n => !n.read)
        .map(n => updateDoc(doc(db, 'notifications', n.id), { read: true }));
      
      await Promise.all(promises);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setError('Failed to mark all notifications as read');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      error,
      loading
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};