import { X, FileText, FileImage, FileArchive, FileVideo, FileAudio } from 'lucide-react';
import { useEffect, useState } from 'react';
import { storage } from '../lib/firebase';
import { ref, listAll, getDownloadURL, getMetadata } from 'firebase/storage';

interface FileItem {
  name: string;
  url: string;
  size: number;
  type: string;
  path: string;
}

interface FileSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (file: FileItem) => void;
  userId: string;
}

export default function FileSelectionModal({ isOpen, onClose, onSelect, userId }: FileSelectionModalProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen, userId]);

  const loadFiles = async () => {
    try {
      const storageRef = ref(storage, `users/${userId}`);
      const filesList = await listAll(storageRef);
      
      const filesData = await Promise.all(
        filesList.items.map(async (item) => {
          const url = await getDownloadURL(item);
          const metadata = await getMetadata(item);
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
      setLoading(false);
    } catch (error) {
      console.error('Error loading files:', error);
      setLoading(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return FileImage;
    if (type.startsWith('video/')) return FileVideo;
    if (type.startsWith('audio/')) return FileAudio;
    if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return FileArchive;
    return FileText;
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

  const filteredFiles = files.filter(file => {
    if (filter === 'all') return true;
    if (filter === 'images') return file.type.startsWith('image/');
    if (filter === 'documents') return file.type.includes('pdf') || file.type.includes('doc') || file.type.includes('txt');
    if (filter === 'media') return file.type.startsWith('video/') || file.type.startsWith('audio/');
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-50"></div>
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold">Select File</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4">
            <div className="flex gap-2 mb-4">
              {[
                { id: 'all', label: 'All Files' },
                { id: 'images', label: 'Images' },
                { id: 'documents', label: 'Documents' },
                { id: 'media', label: 'Media' }
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setFilter(option.id)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    filter === option.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="text-center py-8">Loading files...</div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No files found
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFiles.map((file) => {
                    const FileIcon = getFileIcon(file.type);
                    return (
                      <button
                        key={file.path}
                        onClick={() => onSelect(file)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                      >
                        <FileIcon className="h-5 w-5 text-gray-500" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{file.name}</div>
                          <div className="text-sm text-gray-500">
                            {formatSize(file.size)} • {file.type}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}