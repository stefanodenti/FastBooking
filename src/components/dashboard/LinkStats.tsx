import { Eye, Share2, Clock, Calendar } from 'lucide-react';
import { LinkStats as LinkStatsType } from '../../types/dashboard';

interface LinkStatsProps {
  stats: LinkStatsType;
}

export default function LinkStats({ stats }: LinkStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
          <Eye className="h-5 w-5" />
          <h3 className="font-semibold">Total Views</h3>
        </div>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">
          {stats.totalViews}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Across all shared links
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
          <Share2 className="h-5 w-5" />
          <h3 className="font-semibold">Active Links</h3>
        </div>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">
          {stats.activeLinks}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Total shared profiles
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
          <Clock className="h-5 w-5" />
          <h3 className="font-semibold">Recent Views</h3>
        </div>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">
          {stats.recentViews}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          In the last 7 days
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
          <Calendar className="h-5 w-5" />
          <h3 className="font-semibold">Daily Average</h3>
        </div>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">
          {stats.averageViewsPerDay.toFixed(1)}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Views per day
        </p>
      </div>
    </div>
  );
}