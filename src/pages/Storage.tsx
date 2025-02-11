import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../lib/firebase';
import { ref, uploadBytesResumable, listAll, getDownloadURL, getMetadata, deleteObject } from 'firebase/storage';
import { Upload, File, Trash2, AlertCircle, FileText, FileImage, FileArchive, FileVideo, FileAudio } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface FileItem {
  name: string;
  url: string;
  size: number;
  type: string;
  path: string;
}

export default function Storage() {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [totalSize, setTotalSize] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxSize = 2 * 1024 * 1024 * 1024; // 2GB in bytes

  useEffect(() => {
    if (user) {
      loadFiles();
    }
  }, [user]);

  if (!user) {
    return <Navigate to="/login" />;
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return FileImage;
    if (type.startsWith('video/')) return FileVideo;
    if (type.startsWith('audio/')) return FileAudio;
    if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return FileArchive;
    return FileText;
  };

  const loadFiles = async () => {
    try {
      const storageRef = ref(storage, `users/${user.uid}`);
      const filesList = await listAll(storageRef);
      
      let total = 0;
      const filesData = await Promise.all(
        filesList.items.map(async (item) => {
          const url = await getDownloadURL(item);
          const metadata = await getMetadata(item);
          total += metadata.size;
          return {
            name: item.name,
            url,
            size: metadata.size,
            type: metadata.contentType || 'application/octet-stream',
            path: item.fullPath
          };
        })
      );
      
      setFiles(filesData.sort((a, b) => b.size - a.size));
      setTotalSize(total);
    } catch (error) {
      console.error('Error loading files:', error);
      alert('Failed to load files. Please try again.');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const file = e.target.files[0];
    if (totalSize + file.size > maxSize) {
      alert('Not enough storage space. 2GB limit would be exceeded.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      const storageRef = ref(storage, `users/${user.uid}/${file.name}`);
      
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          alert('Upload failed. Please try again.');
          setUploading(false);
        },
        async () => {
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          await loadFiles();
          setUploading(false);
          setUploadProgress(0);
        }
      );
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (filePath: string) => {
    setDeleting(filePath);
    try {
      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);
      await loadFiles();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete file. Please try again.');
    }
    setDeleting(null);
  };

  const formatSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  const getStorageUsageColor = () => {
    const percentage = (totalSize / maxSize) * 100;
    if (percentage > 90) return 'text-red-600 dark:text-red-400';
    if (percentage > 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Storage</h1>
          <div className={`text-sm ${getStorageUsageColor()}`}>
            {formatSize(totalSize)} / {formatSize(maxSize)} used
          </div>
        </div>
        
        <div className="relative">
          <input
            type="file"
            onChange={handleUpload}
            className="hidden"
            id="file-upload"
            ref={fileInputRef}
            disabled={uploading}
          />
          <label
            htmlFor="file-upload"
            className={`flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors ${
              uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 cursor-pointer'
            }`}
          >
            <Upload size={20} />
            {uploading ? `Uploading ${uploadProgress.toFixed(0)}%` : 'Upload File'}
          </label>
          
          {uploading && (
            <div className="mt-4">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Your Files</h2>
        <div className="space-y-4">
          {files.map((file) => {
            const FileIcon = getFileIcon(file.type);
            return (
              <div key={file.path} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileIcon size={20} className="text-gray-500 dark:text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{file.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatSize(file.size)} • {file.type}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {deleteConfirm === file.path ? (
                    <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/50 p-2 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
                      <span className="text-sm text-red-600 dark:text-red-400">Delete?</span>
                      <button
                        onClick={() => handleDelete(file.path)}
                        disabled={deleting === file.path}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        {deleting === file.path ? 'Deleting...' : 'Yes'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-200 text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded"
                      >
                        Download
                      </a>
                      <button
                        onClick={() => setDeleteConfirm(file.path)}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {files.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              No files uploaded yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}