import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, getDocs, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { Users, Search, Calendar, Plus, X, Mail, User } from 'lucide-react';
import UserAvatar from '../components/UserAvatar';

interface UserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  lastLogin: Date;
  createdAt: Date;
  isManual?: boolean;
}

export default function UsersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    displayName: '',
    email: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadUsers();
    }
  }, [user]);

  useEffect(() => {
    if (searchTerm) {
      setIsSearching(true);
      loadAllUsers();
    } else {
      setIsSearching(false);
      loadUsers();
    }
  }, [searchTerm]);

  if (!user) {
    return <Navigate to="/login" />;
  }

  const loadUsers = async () => {
    try {
      const q = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      const usersData = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        lastLogin: doc.data().lastLogin?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as UserData[];
      
      setUsers(usersData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading users:', error);
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const q = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const usersData = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        lastLogin: doc.data().lastLogin?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as UserData[];
      
      setUsers(usersData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading users:', error);
      setLoading(false);
    }
  };

  const handleCreateManualUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsCreating(true);

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

      // Reset form and reload users
      setNewUser({ displayName: '', email: '' });
      setShowNewUserForm(false);
      await loadUsers();
    } catch (error: any) {
      console.error('Error creating manual user:', error);
      setError(error.message || 'Failed to create manual user');
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleScheduleAppointment = (targetUser: UserData) => {
    navigate('/appointments', { state: { targetUser } });
  };

  const filteredUsers = users.filter(userData => 
    userData.uid !== user.uid && 
    (!searchTerm || (
      userData.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userData.email.toLowerCase().includes(searchTerm.toLowerCase())
    ))
  );

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isSearching ? 'Search Users' : 'Latest Registered Users'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by email or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64 dark:bg-gray-700 dark:text-white"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <button
              onClick={() => setShowNewUserForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Manual User
            </button>
          </div>
        </div>

        {showNewUserForm && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Add Manual User</h2>
              <button
                onClick={() => {
                  setShowNewUserForm(false);
                  setNewUser({ displayName: '', email: '' });
                  setError(null);
                }}
                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full"
              >
                <X className="h-5 w-5 text-blue-900 dark:text-blue-100" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateManualUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Display Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newUser.displayName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, displayName: e.target.value }))}
                    className="pl-10 pr-4 py-2 w-full border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter user's name"
                  />
                  <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
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
                disabled={isCreating}
                className={`w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors ${
                  isCreating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
              >
                <Plus className="h-4 w-4" />
                {isCreating ? 'Creating...' : 'Create Manual User'}
              </button>

              <p className="text-sm text-blue-700 dark:text-blue-300">
                Note: Manual users cannot log into the system. They are for appointment tracking only.
              </p>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading users...</div>
        ) : (
          <>
            {!isSearching && (
              <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                Showing the 10 most recently registered users
              </div>
            )}
            <div className="space-y-4">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'No users found matching your search' : 'No users found'}
                </div>
              ) : (
                filteredUsers.map((userData) => (
                  <div key={userData.uid} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Link to={`/profile/${userData.uid}`} className="block">
                        <UserAvatar
                          photoURL={userData.photoURL}
                          displayName={userData.displayName}
                          size="lg"
                        />
                      </Link>
                      <div>
                        <Link 
                          to={`/profile/${userData.uid}`}
                          className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {userData.displayName}
                          {userData.isManual && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full">
                              Manual User
                            </span>
                          )}
                        </Link>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{userData.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                        <div>Last login: {userData.lastLogin ? formatDate(userData.lastLogin) : 'Never'}</div>
                        <div>Registered: {formatDate(userData.createdAt)}</div>
                      </div>
                      <button
                        onClick={() => handleScheduleAppointment(userData)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Calendar className="h-4 w-4" />
                        Schedule
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}