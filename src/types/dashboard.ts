export interface Appointment {
  id: string;
  date: Date;
  time: string;
  description: string;
  userId: string;
  userName: string;
  targetUserId: string;
  targetUserName: string;
}

export interface ChartData {
  name: string;
  value: number;
}

export interface ShareableLink {
  id: string;
  userId: string;
  token: string;
  name: string;
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
  visibility: {
    avatar: boolean;
    cover: boolean;
    attachments: boolean;
  };
}

export interface ViewsData {
  name: string;
  views: number;
}

export interface LinkStats {
  totalViews: number;
  activeLinks: number;
  recentViews: number;
  averageViewsPerDay: number;
  mostViewedLink: ShareableLink | null;
  viewsByTime: ViewsData[];
  viewsByDay: ViewsData[];
}