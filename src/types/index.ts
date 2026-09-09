export type Role = 'host' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  title: string;
  department: string;
}

export type MeetingStatus = 'scheduled' | 'live' | 'completed';

export interface Meeting {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: string;
  status: MeetingStatus;
  hostId: string;
  hostName: string;
  inviteCode: string;
  agenda: string[];
  participants: Array<{
    id: string;
    name: string;
    avatar: string;
    role: string;
  }>;
  actionItemsCount: number;
  decisionsCount: number;
  summary?: string;
  decisions?: string[];
}

export type AssignmentPriority = 'low' | 'medium' | 'high';
export type AssignmentStatus = 'todo' | 'in_progress' | 'submitted' | 'approved';

export interface Evidence {
  id: string;
  assignmentId: string;
  title: string;
  url: string;
  notes: string;
  submittedAt: string;
  type: 'link' | 'document' | 'pr' | 'design';
}

export interface Assignment {
  id: string;
  meetingId: string;
  meetingTitle: string;
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  assigneeAvatar: string;
  assignerId: string;
  assignerName: string;
  deadline: string;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  evidenceRequired: string;
  evidenceSubmitted?: Evidence;
}

export type NotificationType = 'assignment' | 'meeting' | 'evidence' | 'system';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: NotificationType;
  targetRole?: Role | 'all';
}

export interface TranscriptItem {
  id: string;
  speaker: string;
  timestamp: string;
  text: string;
  isActionItem?: boolean;
  actionItemData?: {
    title: string;
    assignee: string;
    deadline: string;
  };
}
