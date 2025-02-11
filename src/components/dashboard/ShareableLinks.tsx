import { Link, Plus, X, Copy, Trash2, AlertCircle, Eye, Calendar } from 'lucide-react';
import { ShareableLink } from '../../types/dashboard';

interface ShareableLinksProps {
  links: ShareableLink[];
  showNewLinkForm: boolean;
  newLinkName: string;
  newLinkVisibility: {
    avatar: boolean;
    cover: boolean;
    attachments: boolean;
  };
  isGeneratingLink: boolean;
  deleteConfirm: string | null;
  deleting: string | null;
  onNewLinkNameChange: (value: string) => void;
  onVisibilityChange: (key: keyof typeof newLinkVisibility, value: boolean) => void;
  onGenerateLink: () => void;
  onCopyLink: (token: string) => void;
  onDeleteLink: (id: string) => void;
  onCancelDelete: () => void;
  onShowNewLinkForm: () => void;
  onHideNewLinkForm: () => void;
  formatTimeAgo: (date: Date) => string;
}

export default function ShareableLinks({
  links,
  showNewLinkForm,
  newLinkName,
  newLinkVisibility,
  isGeneratingLink,
  deleteConfirm,
  deleting,
  onNewLinkNameChange,
  onVisibilityChange,
  onGenerateLink,
  onCopyLink,
  onDeleteLink,
  onCancelDelete,
  onShowNewLinkForm,
  onHideNewLinkForm,
  formatTimeAgo
}: ShareableLinksProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Shareable Profile Links</h2>
        </div>
        {!showNewLinkForm && (
          <button
            onClick={onShowNewLinkForm}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Link
          </button>
        )}
      </div>

      {showNewLinkForm && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">Create New Shareable Link</h3>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newLinkName}
                onChange={(e) => onNewLinkNameChange(e.target.value)}
                placeholder="Enter a name for this link..."
                className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={onGenerateLink}
                disabled={isGeneratingLink || !newLinkName.trim()}
                className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg transition-colors ${
                  isGeneratingLink || !newLinkName.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
              >
                <Link className="h-4 w-4" />
                {isGeneratingLink ? 'Generating...' : 'Generate'}
              </button>
              <button
                onClick={onHideNewLinkForm}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-t border-blue-100 dark:border-blue-800 pt-3">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Visibility Settings</h4>
              <div className="space-y-2">
                {Object.entries(newLinkVisibility).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => onVisibilityChange(key as keyof typeof newLinkVisibility, e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Show {key.charAt(0).toUpperCase() + key.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {links.map((link) => (
          <div key={link.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-white mb-1">
                {link.name}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 truncate mb-2">
                {`${window.location.origin}/profile/share/${link.token}`}
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <Calendar className="h-4 w-4" />
                  Created {formatTimeAgo(link.createdAt)}
                </div>
                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <Eye className="h-4 w-4" />
                  {link.usageCount} {link.usageCount === 1 ? 'view' : 'views'}
                </div>
                {link.lastUsed && (
                  <div className="text-gray-500 dark:text-gray-400">
                    Last viewed {formatTimeAgo(link.lastUsed)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => onCopyLink(link.token)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                title="Copy link"
              >
                <Copy className="h-5 w-5" />
              </button>
              {deleteConfirm === link.id ? (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/50 p-2 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
                  <span className="text-sm text-red-600 dark:text-red-400">Delete?</span>
                  <button
                    onClick={() => onDeleteLink(link.id)}
                    disabled={deleting === link.id}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    {deleting === link.id ? 'Deleting...' : 'Yes'}
                  </button>
                  <button
                    onClick={onCancelDelete}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-200 text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onDeleteLink(link.id)}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                  title="Delete link"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        ))}
        {links.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            No shareable links generated yet
          </div>
        )}
      </div>
    </div>
  );
}