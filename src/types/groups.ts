export interface GroupMember {
  userId: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  role: 'admin' | 'member';
  canSchedule: boolean;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  createdBy: string;
  members: GroupMember[];
  isPublic: boolean;
  schedulingLink?: string;
}

export interface GroupAppointment extends Appointment {
  groupId: string;
  assignedTo?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
}