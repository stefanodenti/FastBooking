import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subDays } from 'date-fns';
import CalendarView from '../components/dashboard/CalendarView';
import UserStats from '../components/dashboard/UserStats';
import LinkStats from '../components/dashboard/LinkStats';
import ViewsCharts from '../components/dashboard/ViewsCharts';
import ShareableLinks from '../components/dashboard/ShareableLinks';
import { Appointment, ShareableLink, ChartData, LinkStats as LinkStatsType } from '../types/dashboard';

export default function Dashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [userStats, setUserStats] = useState<ChartData[]>([]);
  const [shareableLinks, setShareableLinks] = useState<ShareableLink[]>([]);
  const [showNewLinkForm, setShowNewLinkForm] = useState(false);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkVisibility, setNewLinkVisibility] = useState({
    avatar: true,
    cover: true,
    attachments: true
  });
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [linkStats, setLinkStats] = useState<LinkStatsType | null>(null);

  useEffect(() => {
    if (user) {
      loadAppointments();
      loadShareableLinks();
    }
  }, [user]);

  if (!user) {
    return <Navigate to="/login" />;
  }

  const loadAppointments = async () => {
    try {
      const q1 = query(
        collection(db, 'appointments'),
        where('userId', '==', user.uid)
      );
      
      const q2 = query(
        collection(db, 'appointments'),
        where('targetUserId', '==', user.uid)
      );
      
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const appointmentsData = [
        ...snap1.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate()
        })),
        ...snap2.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate()
        }))
      ] as Appointment[];
      
      setAppointments(appointmentsData);
      processStats(appointmentsData);
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  const loadShareableLinks = async () => {
    try {
      const q = query(
        collection(db, 'shareableLinks'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const links = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        lastUsed: doc.data().lastUsed?.toDate(),
      })) as ShareableLink[];
      
      setShareableLinks(links);
      calculateLinkStats(links);
    } catch (error) {
      console.error('Error loading shareable links:', error);
    }
  };

  const calculateLinkStats = (links: ShareableLink[]) => {
    const totalViews = links.reduce((sum, link) => sum + (link.usageCount || 0), 0);
    const sevenDaysAgo = subDays(new Date(), 7);
    const recentViews = links.reduce((sum, link) => {
      if (link.lastUsed && link.lastUsed > sevenDaysAgo) {
        return sum + 1;
      }
      return sum;
    }, 0);

    const mostViewedLink = links.reduce((prev, current) => 
      (current.usageCount || 0) > (prev?.usageCount || 0) ? current : prev
    , null as ShareableLink | null);

    const oldestLinkDate = links.reduce((oldest, link) => 
      link.createdAt < oldest ? link.createdAt : oldest
    , new Date());
    const daysSinceOldest = Math.max(1, Math.ceil((new Date().getTime() - oldestLinkDate.getTime()) / (1000 * 60 * 60 * 24)));
    const averageViewsPerDay = totalViews / daysSinceOldest;

    const viewsByTime = Array.from({ length: 24 }, (_, hour) => ({
      name: `${hour}:00`,
      views: Math.floor(Math.random() * totalViews / 24)
    }));

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const viewsByDay = days.map(day => ({
      name: day,
      views: Math.floor(Math.random() * totalViews / 7)
    }));

    setLinkStats({
      totalViews,
      activeLinks: links.length,
      recentViews,
      averageViewsPerDay,
      mostViewedLink,
      viewsByTime,
      viewsByDay
    });
  };

  const processStats = (appointments: Appointment[]) => {
    const userCounts = appointments.reduce((acc, curr) => {
      const otherUser = curr.userId === user.uid ? curr.targetUserName : curr.userName;
      acc[otherUser] = (acc[otherUser] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const userStatsData = Object.entries(userCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    setUserStats(userStatsData);
  };

  const generateShareableLink = async () => {
    if (!user || !newLinkName.trim()) return;
    
    setIsGeneratingLink(true);
    try {
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      const linkData = {
        userId: user.uid,
        token,
        name: newLinkName.trim(),
        createdAt: Timestamp.now(),
        usageCount: 0,
        visibility: newLinkVisibility
      };
      
      await addDoc(collection(db, 'shareableLinks'), linkData);
      await loadShareableLinks();
      setNewLinkName('');
      setNewLinkVisibility({
        avatar: true,
        cover: true,
        attachments: true
      });
      setShowNewLinkForm(false);
    } catch (error) {
      console.error('Error generating link:', error);
      alert('Failed to generate link. Please try again.');
    }
    setIsGeneratingLink(false);
  };

  const deleteShareableLink = async (linkId: string) => {
    setDeleting(linkId);
    try {
      await deleteDoc(doc(db, 'shareableLinks', linkId));
      await loadShareableLinks();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting link:', error);
      alert('Failed to delete link. Please try again.');
    }
    setDeleting(null);
  };

  const copyLinkToClipboard = (token: string) => {
    const link = `${window.location.origin}/profile/share/${token}`;
    navigator.clipboard.writeText(link);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return format(date, 'PP');
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <CalendarView appointments={appointments} userId={user.uid} />
        <UserStats userStats={userStats} />
      </div>

      {linkStats && (
        <>
          <LinkStats stats={linkStats} />
          <div className="mt-6">
            <ViewsCharts
              viewsByTime={linkStats.viewsByTime}
              viewsByDay={linkStats.viewsByDay}
            />
          </div>
        </>
      )}

      <div className="mt-6">
        <ShareableLinks
          links={shareableLinks}
          showNewLinkForm={showNewLinkForm}
          newLinkName={newLinkName}
          newLinkVisibility={newLinkVisibility}
          isGeneratingLink={isGeneratingLink}
          deleteConfirm={deleteConfirm}
          deleting={deleting}
          onNewLinkNameChange={setNewLinkName}
          onVisibilityChange={(key, value) => 
            setNewLinkVisibility(prev => ({ ...prev, [key]: value }))
          }
          onGenerateLink={generateShareableLink}
          onCopyLink={copyLinkToClipboard}
          onDeleteLink={(id) => setDeleteConfirm(id)}
          onCancelDelete={() => setDeleteConfirm(null)}
          onShowNewLinkForm={() => setShowNewLinkForm(true)}
          onHideNewLinkForm={() => {
            setShowNewLinkForm(false);
            setNewLinkName('');
            setNewLinkVisibility({
              avatar: true,
              cover: true,
              attachments: true
            });
          }}
          formatTimeAgo={formatTimeAgo}
        />
      </div>
    </div>
  );
}