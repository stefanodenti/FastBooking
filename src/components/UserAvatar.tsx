import { User } from 'lucide-react';

interface UserAvatarProps {
  photoURL: string | null;
  displayName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function UserAvatar({ photoURL, displayName, size = 'md', className = '' }: UserAvatarProps) {
  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-8 w-8 text-sm';
      case 'lg':
        return 'h-12 w-12 text-xl';
      default:
        return 'h-10 w-10 text-base';
    }
  };

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={displayName}
        className={`rounded-full object-cover border-2 border-white shadow-sm ${getSizeClasses()} ${className}`}
      />
    );
  }

  return (
    <div className={`rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border-2 border-white shadow-sm ${getSizeClasses()} ${className}`}>
      {displayName ? (
        <span className="font-medium text-blue-600">{getInitial(displayName)}</span>
      ) : (
        <User className="h-1/2 w-1/2 text-blue-600" />
      )}
    </div>
  );
}