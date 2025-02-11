import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Clock, Plus, Trash2, AlertCircle, Link as LinkIcon, FileText, ArrowUpRight, ArrowDownLeft, Users, CheckCircle2, X, Mail, User } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { db, createNotification } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import FileSelectionModal from '../components/FileSelectionModal';
import UserAvatar from '../components/UserAvatar';
import { format } from 'date-fns';

interface FileAttachment {
  name: string;
  url: string;
  type: string;
}

interface Appointment {
  id: string;
  date: Date;
  time: string;
  description: string;
  userId: string;
  userName: string;
  targetUserId: string;
  targetUserName: string;
  attachment?: FileAttachment;
}

interface UserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  isManual?: boolean;
}

export default function Appointments() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const targetUser = location.state?.targetUser;
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileAttachment | null>(null);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'organized' | 'received'>('all');
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(targetUser || null);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    displayName: '',
    email: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadAppointments();
      loadUsers();
    }
  }, [user]);

  useEffect(() => {
    if (targetUser) {
      setSelectedUser(targetUser);
    }
  }, [targetUser]);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const loadUsers = async () => {
    try {
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      const usersData = querySnapshot.docs
        .map(doc => ({
          uid: doc.id,
          ...doc.data()
        }))
        .filter(u => u.uid !== user?.uid) as UserData[];
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users. Please try again.');
    }
  };

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
      
      setAppointments(appointmentsData.sort((a, b) => a.date.getTime() - b.date.getTime()));
      setError(null);
    } catch (error) {
      console.error('Error loading appointments:', error);
      setError('Failed to load appointments. Please try again.');
    }
  };

  const validateAppointment = () => {
    if (!selectedUser) {
      setError('Please select a participant');
      return false;
    }

    if (!date) {
      setError('Please select a date');
      return false;
    }

    if (!time) {
      setError('Please select a time');
      return false;
    }

    if (!description.trim()) {
      setError('Please enter a description');
      return false;
    }

    const appointmentDate = new Date(date);
    const now = new Date();
    if (appointmentDate < now) {
      setError('Please select a future date');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedUser) return;
    
    setError(null);
    if (!validateAppointment()) return;

    setLoading(true);
    try {
      const appointmentDate = new Date(date);
      const appointmentData = {
        date: Timestamp.fromDate(appointmentDate),
        time,
        description: description.trim(),
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0],
        targetUserId: selectedUser.uid,
        targetUserName: selectedUser.displayName,
        attachment: selectedFile,
        createdAt: Timestamp.now()
      };

      const appointmentDoc = await addDoc(collection(db, 'appointments'), appointmentData);
      
      // Create notification for the target user
      await createNotification(
        selectedUser.uid,
        'appointment_reminder',
        'New Appointment Scheduled',
        `${user.displayName || user.email?.split('@')[0]} has scheduled an appointment with you for ${format(appointmentDate, 'PPP')} at ${time}`,
        { appointmentId: appointmentDoc.id }
      );
      
      setDate('');
      setTime('');
      setDescription('');
      setSelectedFile(null);
      setSelectedUser(null);
      await loadAppointments();
      setError(null);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error creating appointment:', error);
      setError('Failed to create appointment. Please try again.');
    }
    setLoading(false);
  };

  const handleDelete = async (appointmentId: string) => {
    setDeleteLoading(appointmentId);
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      const appointment = appointments.find(a => a.id === appointmentId);
      
      await deleteDoc(appointmentRef);

      // Create cancellation notification for the target user
      if (appointment) {
        const targetUserId = appointment.userId === user?.uid 
          ? appointment.targetUserId 
          : appointment.userId;

        await createNotification(
          targetUserId,
          'appointment_reminder',
          'Appointment Cancelled',
          `${user?.displayName || user?.email?.split('@')[0]} has cancelled the appointment scheduled for ${format(appointment.date, 'PPP')} at ${appointment.time}`,
          { appointmentId }
        );
      }

      await loadAppointments();
      setShowDeleteConfirm(null);
      setError(null);
    } catch (error) {
      console.error('Error deleting appointment:', error);
      setError('Failed to delete appointment. Please try again.');
    }
    setDeleteLoading(null);
  };

  const handleFileSelect = (file: FileItem) => {
    setSelectedFile({
      name: file.name,
      url: file.url,
      type: file.type
    });
    setIsFileModalOpen(false);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const filteredAppointments = appointments.filter(appointment => {
    if (filter === 'organized') return appointment.userId === user.uid;
    if (filter === 'received') return appointment.userId !== user.uid;
    return true;
  });

  const filteredUsers = users.filter(u => 
    !searchTerm || 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Schedule Appointment</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {showSuccess && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Appointment created successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Participant
            </label>
            {selectedUser ? (
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    photoURL={selectedUser.photoURL}
                    displayName={selectedUser.displayName}
                    size="sm"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {selectedUser.displayName}
                      {selectedUser.isManual && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full">
                          Manual User
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{selectedUser.email}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserSelector(!showUserSelector)}
                  className="w-full flex items-center justify-between p-3 border dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Users className="h-5 w-5" />
                    Select a participant
                  </div>
                </button>

                {showUserSelector && (
                  <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700">
                    <div className="p-2">
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredUsers.map((u) => (
                        <button
                          key={u.uid}
                          type="button"
                          onClick={() => {
                            setSelectedUser(u);
                            setShowUserSelector(false);
                            setSearchTerm('');
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <UserAvatar
                            photoURL={u.photoURL}
                            displayName={u.displayName}
                            size="sm"
                          />
                          <div className="text-left">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {u.displayName}
                              {u.isManual && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full">
                                  Manual User
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{u.email}</div>
                          </div>
                        </button>
                      ))}
                      {filteredUsers.length === 0 && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg m-2">
                          <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                            No users found matching "{searchTerm}". Would you like to create a manual user?
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(null);
                              setShowUserSelector(false);
                              setSearchTerm('');
                              setNewUser({
                                displayName: searchTerm,
                                email: searchTerm.includes('@') ? searchTerm : ''
                              });
                              setShowNewUserForm(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                            Create Manual User
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Time
            </label>
            <div className="relative">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <Clock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder="Enter appointment details..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Attachment
            </label>
            {selectedFile ? (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-900 dark:text-white">{selectedFile.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsFileModalOpen(true)}
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                <LinkIcon className="h-5 w-5" />
                Attach a file
              </button>
            )}
          </div>
          
          <button
            type="submit"
            disabled={loading || !selectedUser}
            className={`w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors ${
              loading || !selectedUser ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
            }`}
          >
            <Plus size={20} />
            {loading ? 'Creating...' : 'Create Appointment'}
          </button>
          
          {!selectedUser && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Please select a participant to schedule an appointment
            </p>
          )}
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Appointments</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('organized')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'organized'
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <ArrowUpRight className="h-4 w-4" />
              Organized by you
            </button>
            <button
              onClick={() => setFilter('received')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'received'
                  ? 'bg-green-100 dark:bg-green-900/50 text-green-900 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <ArrowDownLeft className="h-4 w-4" />
              Scheduled with you
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredAppointments.map((appointment) => {
            const isOrganizer = appointment.userId === user.uid;
            return (
              <div 
                key={appointment.id} 
                className={`flex items-center justify-between p-4 rounded-lg ${
                  isOrganizer 
                    ? 'bg-blue-50 dark:bg-blue-900/50' 
                    : 'bg-green-50 dark:bg-green-900/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-full ${
                    isOrganizer 
                      ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-400' 
                      : 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-400'
                  }`}>
                    <span className="text-sm font-medium">{appointment.time}</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formatDate(appointment.date)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {appointment.description}
                    </div>
                    <div className={`text-sm mt-1 flex items-center gap-1 ${
                      isOrganizer 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {isOrganizer ? (
                        <>
                          <ArrowUpRight className="h-4 w-4" />
                          With: {appointment.targetUserName}
                        </>
                      ) : (
                        <>
                          <ArrowDownLeft className="h-4 w-4" />
                          From: {appointment.userName}
                        </>
                      )}
                    </div>
                    {appointment.attachment && (
                      <div className="mt-2">
                        <a
                          href={appointment.attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                          <FileText className="h-4 w-4" />
                          {appointment.attachment.name}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {showDeleteConfirm === appointment.id ? (
                    <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/50 p-2 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
                      <span className="text-sm text-red-600 dark:text-red-400">Delete?</span>
                      <button
                        onClick={() => handleDelete(appointment.id)}
                        disabled={deleteLoading === appointment.id}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        {deleteLoading === appointment.id ? 'Deleting...' : 'Yes'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-200 text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(appointment.id)}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {filteredAppointments.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              {filter === 'all' && 'No appointments scheduled yet'}
              {filter === 'organized' && 'No appointments organized by you'}
              {filter === 'received' && 'No appointments scheduled with you'}
            </div>
          )}
        </div>
      </div>

      {user && (
        <FileSelectionModal
          isOpen={isFileModalOpen}
          onClose={() => setIsFileModalOpen(false)}
          onSelect={handleFileSelect}
          userId={user.uid}
        />
      )}

      {showNewUserForm && (
        <div className="fixed z-20 inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Manual User</h2>
              <button
                onClick={() => {
                  setShowNewUserForm(false);
                  setNewUser({ displayName: '', email: '' });
                  setError(null);
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setIsLoading(true);

              try {
                // Validate inputs
                if (!newUser.displayName.trim() || !newUser.email.trim()) {
                  throw new Error('Please fill in all fields');
                }

                // Create manual user in Firestore
                const userDoc = await addDoc(collection(db, 'users'), {
                  displayName: newUser.displayName.trim(),
                  email: newUser.email.trim(),
                  isManual: true,
                  createdAt: serverTimestamp(),
                  lastLogin: null,
                  photoURL: null
                });

                // Create user object for selection
                const createdUser = {
                  uid: userDoc.id,
                  displayName: newUser.displayName.trim(),
                  email: newUser.email.trim(),
                  photoURL: null,
                  isManual: true
                };

                // Select the newly created user
                setSelectedUser(createdUser);
                setShowNewUserForm(false);
                setNewUser({ displayName: '', email: '' });
                await loadUsers();
              } catch (error: any) {
                console.error('Error creating manual user:', error);
                setError(error.message || 'Failed to create manual user');
              } finally {
                setIsLoading(false);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newUser.displayName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, displayName: e.target.value }))}
                    className="pl-10 pr-4 py-2 w-full border dark:border-gray-600 rounded-lg focus:ring-2  focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter user's name"
                  />
                  <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-10 pr-4 py-2 w-full border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter user's email"
                  />
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
              >
                <Plus className="h-4 w-4" />
                {isLoading ? 'Creating...' : 'Create and Select User'}
              </button>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Note: Manual users cannot log into the system. They are for appointment tracking only.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}