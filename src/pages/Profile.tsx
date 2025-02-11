import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useParams } from 'react-router-dom';
import { db, storage } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Camera, Loader2, MapPin, Mail, Globe, Phone, Briefcase, Heart, Image, Palette, Check, X, FileText } from 'lucide-react';
import UserAvatar from '../components/UserAvatar';

interface CustomField {
  id: string;
  label: string;
  value: string;
}

interface FileAttachment {
  name: string;
  url: string;
  type: string;
}

interface ProfileData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  location?: string;
  website?: string;
  phone?: string;
  occupation?: string;
  interests?: string;
  bio?: string;
  lastLogin: Date;
  createdAt: Date;
  coverType: 'image' | 'gradient';
  coverImage?: string;
  coverGradient?: string;
  customFields?: CustomField[];
  attachments?: FileAttachment[];
}

interface ProfileProps {
  userId?: string;
  sharedView?: boolean;
  visibility?: {
    avatar: boolean;
    cover: boolean;
    attachments: boolean;
  };
}

const GRADIENTS = [
  'bg-gradient-to-r from-blue-400 to-blue-600',
  'bg-gradient-to-r from-purple-400 to-pink-600',
  'bg-gradient-to-r from-green-400 to-emerald-600',
  'bg-gradient-to-r from-orange-400 to-red-600',
  'bg-gradient-to-r from-indigo-400 to-violet-600',
  'bg-gradient-to-r from-teal-400 to-cyan-600',
  'bg-gradient-to-r from-fuchsia-400 to-rose-600',
  'bg-gradient-to-r from-amber-400 to-orange-600',
  'bg-gradient-to-r from-lime-400 to-green-600',
  'bg-gradient-to-r from-sky-400 to-blue-600',
];

export default function Profile({ userId: propUserId, sharedView, visibility }: ProfileProps) {
  const { user } = useAuth();
  const { userId: paramUserId } = useParams();
  const userId = propUserId || paramUserId;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCoverEditing, setIsCoverEditing] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = user?.uid === userId;

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const docRef = doc(db, 'users', userId!);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile({
          ...data,
          lastLogin: data.lastLogin?.toDate(),
          createdAt: data.createdAt?.toDate(),
          customFields: data.customFields || [],
          attachments: data.attachments || [],
        } as ProfileData);
      } else {
        setError('Profile not found');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Failed to load profile');
    }
    setIsLoading(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !user) return;
    
    const file = e.target.files[0];
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const storageRef = ref(storage, `users/${user.uid}/avatar.jpg`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          alert('Failed to upload photo. Please try again.');
          setIsUploading(false);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            await updateDoc(doc(db, 'users', user.uid), {
              photoURL: downloadURL
            });

            setProfile(prev => prev ? { ...prev, photoURL: downloadURL } : null);
            
            setIsUploading(false);
            setUploadProgress(0);
            
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile photo. Please try again.');
            setIsUploading(false);
          }
        }
      );
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload photo. Please try again.');
      setIsUploading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !user || !profile) return;
    
    const file = e.target.files[0];
    setUploadingCover(true);
    setCoverProgress(0);

    try {
      const storageRef = ref(storage, `users/${user.uid}/cover.jpg`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setCoverProgress(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          alert('Failed to upload cover photo. Please try again.');
          setUploadingCover(false);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            await updateDoc(doc(db, 'users', user.uid), {
              coverType: 'image',
              coverImage: downloadURL
            });

            setProfile(prev => prev ? {
              ...prev,
              coverType: 'image',
              coverImage: downloadURL
            } : null);
            
            setUploadingCover(false);
            setCoverProgress(0);
            setIsCoverEditing(false);
            
            if (coverInputRef.current) {
              coverInputRef.current.value = '';
            }
          } catch (error) {
            console.error('Error updating cover:', error);
            alert('Failed to update cover photo. Please try again.');
            setUploadingCover(false);
          }
        }
      );
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload cover photo. Please try again.');
      setUploadingCover(false);
    }
  };

  const handleGradientSelect = async (gradient: string) => {
    if (!user || !profile) return;
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        coverType: 'gradient',
        coverGradient: gradient
      });

      setProfile({
        ...profile,
        coverType: 'gradient',
        coverGradient: gradient
      });
      
      setIsCoverEditing(false);
    } catch (error) {
      console.error('Error updating gradient:', error);
      alert('Failed to update cover gradient. Please try again.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...profile,
        customFields: profile.customFields || [],
        attachments: profile.attachments || []
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    }
    setSaving(false);
  };

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error || 'Profile not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {(!sharedView || visibility?.cover) && (
          <div className="relative">
            <div 
              className={`h-32 ${
                profile.coverType === 'image'
                  ? ''
                  : profile.coverGradient || 'bg-gradient-to-r from-blue-400 to-blue-600'
              }`}
              style={profile.coverType === 'image' && profile.coverImage ? {
                backgroundImage: `url(${profile.coverImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              } : undefined}
            >
              {isOwnProfile && (
                <div className="absolute top-2 right-2">
                  {isCoverEditing ? (
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-md">
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleCoverUpload}
                        ref={coverInputRef}
                        disabled={uploadingCover}
                      />
                      <button
                        onClick={() => coverInputRef.current?.click()}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        disabled={uploadingCover}
                      >
                        <Image className="h-4 w-4" />
                        {uploadingCover ? `${coverProgress.toFixed(0)}%` : 'Upload Image'}
                      </button>
                      <div className="h-6 border-r border-gray-300 dark:border-gray-600"></div>
                      <div className="flex items-center gap-1">
                        {GRADIENTS.map((gradient, index) => (
                          <button
                            key={index}
                            onClick={() => handleGradientSelect(gradient)}
                            className={`w-6 h-6 rounded-full ${gradient} hover:ring-2 hover:ring-offset-2 hover:ring-blue-500`}
                          >
                            {profile.coverType === 'gradient' && profile.coverGradient === gradient && (
                              <Check className="w-4 h-4 text-white mx-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setIsCoverEditing(false)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                      >
                        <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsCoverEditing(true)}
                      className="flex items-center gap-2 px-3 py-1 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg shadow-sm transition-colors"
                    >
                      <Palette className="h-4 w-4" />
                      Customize Cover
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-6 -mt-16">
          <div className="flex justify-between items-start mb-6">
            {(!sharedView || visibility?.avatar) && (
              <div className="relative">
                <div className="relative inline-block">
                  <UserAvatar
                    photoURL={profile.photoURL}
                    displayName={profile.displayName}
                    size="lg"
                    className="h-24 w-24 border-4 border-white dark:border-gray-800"
                  />
                  {isOwnProfile && (
                    <label className="absolute bottom-0 right-0 p-1 bg-white dark:bg-gray-800 rounded-full shadow-md cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        ref={fileInputRef}
                        disabled={isUploading}
                      />
                      {isUploading ? (
                        <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                        </div>
                      ) : (
                        <Camera className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                      )}
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={profile.location || ''}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., New York, USA"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={profile.website || ''}
                  onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., https://example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={profile.phone || ''}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., +1 234 567 8900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Occupation
                </label>
                <input
                  type="text"
                  value={profile.occupation || ''}
                  onChange={(e) => setProfile({ ...profile, occupation: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Software Engineer"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Interests
                </label>
                <input
                  type="text"
                  value={profile.interests || ''}
                  onChange={(e) => setProfile({ ...profile, interests: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Photography, Travel, Music"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bio
                </label>
                <textarea
                  value={profile.bio || ''}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={4}
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className={`flex-1 py-2 bg-blue-600 text-white rounded-lg transition-colors ${
                    saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                  }`}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile.displayName}
                </h1>
                <p className="text-gray-500 dark:text-gray-400">{profile.email}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.location && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <MapPin className="h-5 w-5" />
                    <span>{profile.location}</span>
                  </div>
                )}
                
                {profile.website && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Globe className="h-5 w-5" />
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {profile.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                
                {profile.phone && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Phone className="h-5 w-5" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                
                {profile.occupation && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Briefcase className="h-5 w-5" />
                    <span>{profile.occupation}</span>
                  </div>
                )}
                
                {profile.interests && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Heart className="h-5 w-5" />
                    <span>{profile.interests}</span>
                  </div>
                )}
                
                {profile.email && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Mail className="h-5 w-5" />
                    <span>{profile.email}</span>
                  </div>
                )}
              </div>

              {profile.bio && (
                <div className="border-t dark:border-gray-700 pt-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">About</h2>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{profile.bio}</p>
                </div>
              )}

              <div className="border-t dark:border-gray-700 pt-6">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <div>Member since {profile.createdAt.toLocaleDateString()}</div>
                  <div>Last login: {profile.lastLogin?.toLocaleDateString() || 'Never'}</div>
                </div>
              </div>

              {isOwnProfile && (
                <div className="border-t dark:border-gray-700 pt-6">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Edit Profile
                  </button>
                </div>
              )}
            </div>
          )}

          {(!sharedView || visibility?.attachments) && profile.attachments && profile.attachments.length > 0 && (
            <div className="border-t dark:border-gray-700 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Attachments</h2>
              <div className="space-y-2">
                {profile.attachments.map((attachment, index) => (
                  <a
                    key={index}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-blue-600 dark:text-blue-400 hover:underline">
                      {attachment.name}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {sharedView && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                You are viewing a shared profile. Some information might be hidden based on the link settings.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}