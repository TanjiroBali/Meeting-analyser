import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Meeting, Assignment, NotificationItem, Evidence, AssignmentStatus } from '../types';
import { mockUsers } from '../data/mockData';
import { api } from '../services/api';

export type PageName =
  | 'login'
  | 'host_dashboard'
  | 'employee_dashboard'
  | 'create_meeting'
  | 'join_meeting'
  | 'meeting_room'
  | 'meeting_analysis'
  | 'past_meetings'
  | 'notifications';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  activePage: PageName;
  setActivePage: (page: PageName) => void;
  meetings: Meeting[];
  assignments: Assignment[];
  notifications: NotificationItem[];
  activeMeetingId: string | null;
  setActiveMeetingId: (id: string | null) => void;
  createMeeting: (newMeetingData: Partial<Meeting>) => Promise<Meeting>;
  joinMeetingByCode: (code: string) => Promise<Meeting | null>;
  endMeetingById: (id: string, summary?: string, decisions?: string[]) => Promise<void>;
  addAssignment: (newAssignmentData: Omit<Assignment, 'id'>) => Promise<void>;
  refreshAssignments: () => Promise<void>;
  updateAssignmentStatus: (assignmentId: string, status: AssignmentStatus, evidence?: Omit<Evidence, 'id' | 'submittedAt'>) => Promise<void>;
  hostEditAssignment: (id: string, updates: { title?: string; assigneeId?: string; deadline?: string; status?: string; priority?: string }) => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  logout: () => void;
  switchRole: (role: 'host' | 'employee') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('anymit_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activePage, setActivePage] = useState<PageName>(() => {
    try {
      const saved = localStorage.getItem('anymit_user');
      if (saved) {
        const u = JSON.parse(saved);
        return u.role === 'host' ? 'host_dashboard' : 'employee_dashboard';
      }
    } catch {}
    return 'login';
  });

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);

  // Load backend data from REST API
  useEffect(() => {
    async function loadBackendData() {
      try {
        const { meetings: dbMeetings } = await api.getMeetings();
        if (dbMeetings) {
          const formattedMeetings: Meeting[] = dbMeetings.map((m: any) => ({
            id: m.id,
            title: m.title,
            description: m.description || '',
            date: new Date(m.createdAt).toISOString().split('T')[0],
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            duration: '45 mins',
            status: m.status === 'ACTIVE' ? 'live' : m.status === 'ENDED' ? 'completed' : 'scheduled',
            hostId: m.hostId,
            hostName: m.host?.name || 'Host User',
            inviteCode: m.code,
            agenda: typeof m.agenda === 'string' ? JSON.parse(m.agenda) : (m.agenda || []),
            participants: (m.participants || []).map((p: any) => ({
              id: p.user?.id || p.userId,
              name: p.user?.name || 'Participant',
              avatar: p.user?.avatar || '',
              role: p.role,
            })),
            actionItemsCount: (m.assignments || []).length,
            decisionsCount: m.decisions ? JSON.parse(m.decisions).length : 0,
            summary: m.summary,
            decisions: typeof m.decisions === 'string' ? JSON.parse(m.decisions) : (m.decisions || []),
          }));
          setMeetings(formattedMeetings);
        }

        const { assignments: dbAssignments } = await api.getAssignments();
        if (dbAssignments) {
          const formattedAssignments: Assignment[] = dbAssignments.map((a: any) => ({
            id: a.id,
            meetingId: a.meetingId,
            meetingTitle: a.meeting?.title || 'Meeting',
            title: a.title,
            description: a.description,
            assigneeId: a.assigneeId || '',
            assigneeName: a.assignee?.name || 'Unassigned (Needs Review)',
            assigneeAvatar: a.assignee?.avatar || '',
            assignerId: a.assignerId,
            assignerName: a.assigner?.name || 'Host User',
            deadline: a.deadline || 'TBD (Needs Review)',
            priority: a.priority || 'medium',
            status: a.status || 'todo',
            evidenceRequired: a.evidenceRequired,
            evidenceSubmitted: a.evidence ? {
              id: a.evidence.id,
              assignmentId: a.id,
              title: a.evidence.title,
              url: a.evidence.url || '',
              notes: a.evidence.notes || '',
              submittedAt: new Date(a.evidence.submittedAt).toLocaleString(),
              type: a.evidence.type || 'link',
            } : undefined,
          }));
          setAssignments(formattedAssignments);
        }

        const { notifications: dbNotifs } = await api.getNotifications();
        if (dbNotifs) {
          const formattedNotifs: NotificationItem[] = dbNotifs.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            timestamp: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: n.read,
            type: n.type || 'system',
            targetRole: n.targetRole || 'all',
          }));
          setNotifications(formattedNotifs);
        }
      } catch (err) {
        console.log('Backend sync offline:', err);
      }
    }

    loadBackendData();
  }, []);

  const switchRole = (role: 'host' | 'employee') => {
    if (currentUser) {
      const updated = { ...currentUser, role };
      setCurrentUser(updated);
      localStorage.setItem('anymit_user', JSON.stringify(updated));
      setActivePage(role === 'host' ? 'host_dashboard' : 'employee_dashboard');
    }
  };

  const logout = () => {
    localStorage.removeItem('anymit_user');
    setCurrentUser(null);
    setActivePage('login');
  };

  const createMeeting = async (newMeetingData: Partial<Meeting>): Promise<Meeting> => {
    let createdCode = '';
    let createdId = '';

    try {
      const res = await api.createMeeting({
        title: newMeetingData.title || 'Untitled Meeting',
        description: newMeetingData.description || 'Meeting discussion and task assignment.',
        hostId: currentUser?.id || '',
        agenda: newMeetingData.agenda || ['Review discussion topics', 'Extract action items'],
        status: newMeetingData.status === 'live' ? 'ACTIVE' : 'WAITING',
      });
      if (res.meeting) {
        createdCode = res.meeting.code;
        createdId = res.meeting.id;
      } else {
        throw new Error('Server did not return a valid meeting object.');
      }
    } catch (err: any) {
      console.error('Backend create meeting error:', err);
      throw new Error(err.message || 'Failed to create meeting on server.');
    }

    const newMeeting: Meeting = {
      id: createdId,
      title: newMeetingData.title || 'Untitled Meeting',
      description: newMeetingData.description || 'Meeting discussion and task assignment.',
      date: newMeetingData.date || new Date().toISOString().split('T')[0],
      time: newMeetingData.time || '10:00 AM',
      duration: newMeetingData.duration || '45 mins',
      status: newMeetingData.status || 'scheduled',
      hostId: currentUser?.id || '',
      hostName: currentUser?.name || 'Host User',
      inviteCode: createdCode,
      agenda: newMeetingData.agenda || ['Review discussion topics', 'Extract action items'],
      participants: newMeetingData.participants && newMeetingData.participants.length > 0 ? newMeetingData.participants : [
        { id: currentUser?.id || '', name: currentUser?.name || 'Host User', avatar: currentUser?.avatar || '', role: 'Host' },
      ],
      actionItemsCount: 0,
      decisionsCount: 0,
    };

    setMeetings((prev) => [newMeeting, ...prev]);

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Meeting Created',
      message: `"${newMeeting.title}" created with unique code ${createdCode}.`,
      timestamp: 'Just now',
      read: false,
      type: 'meeting',
      targetRole: 'all',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    return newMeeting;
  };

  const joinMeetingByCode = async (code: string): Promise<Meeting | null> => {
    try {
      const cleanCode = code.trim().toUpperCase();
      const res = await api.joinMeeting(cleanCode, currentUser?.id);
      if (res.meeting) {
        const m = res.meeting;
        const joinedMeeting: Meeting = {
          id: m.id,
          title: m.title,
          description: m.description || '',
          date: new Date(m.createdAt).toISOString().split('T')[0],
          time: 'Now',
          duration: '45 mins',
          status: 'live',
          hostId: m.hostId,
          hostName: m.host?.name || 'Meeting Host',
          inviteCode: m.code,
          agenda: typeof m.agenda === 'string' ? JSON.parse(m.agenda) : (m.agenda || []),
          participants: (m.participants || []).map((p: any) => ({
            id: p.userId,
            name: p.user?.name || 'Participant',
            avatar: p.user?.avatar || '',
            role: p.role,
          })),
          actionItemsCount: (m.assignments || []).length,
          decisionsCount: 0,
        };
        setActiveMeetingId(joinedMeeting.id);
        setMeetings((prev) => {
          const exists = prev.find((x) => x.id === joinedMeeting.id);
          if (exists) {
            return prev.map((x) => (x.id === joinedMeeting.id ? joinedMeeting : x));
          }
          return [joinedMeeting, ...prev];
        });
        return joinedMeeting;
      }
      return null;
    } catch (err: any) {
      console.warn('Join meeting error:', err);
      throw new Error(err.message || 'Failed to join meeting. Please verify the meeting code.');
    }
  };

  const endMeetingById = async (id: string, summary?: string, decisions?: string[]): Promise<void> => {
    try {
      await api.endMeeting(id, { summary, decisions });
    } catch (err) {
      console.log('End meeting API error, updating locally:', err);
    }

    setMeetings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'completed', summary, decisions } : m))
    );
  };

  const addAssignment = async (newAssignmentData: Omit<Assignment, 'id'>): Promise<void> => {
    let createdId = `asg-${Date.now().toString().slice(-4)}`;
    try {
      const res = await api.createAssignment({
        meetingId: newAssignmentData.meetingId,
        title: newAssignmentData.title,
        description: newAssignmentData.description,
        assigneeId: newAssignmentData.assigneeId,
        assignerId: newAssignmentData.assignerId,
        deadline: newAssignmentData.deadline,
        priority: newAssignmentData.priority,
        evidenceRequired: newAssignmentData.evidenceRequired,
      });
      if (res.assignment) {
        createdId = res.assignment.id;
      }
    } catch (err) {
      console.log('Create assignment API error, adding locally:', err);
    }

    const newAssignment: Assignment = {
      ...newAssignmentData,
      id: createdId,
    };

    setAssignments((prev) => [newAssignment, ...prev]);

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'New Work Assignment',
      message: `You were assigned "${newAssignment.title}" due ${newAssignment.deadline}.`,
      timestamp: 'Just now',
      read: false,
      type: 'assignment',
      targetRole: 'employee',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const hostEditAssignment = async (
    id: string,
    updates: { title?: string; assigneeId?: string; deadline?: string; status?: string; priority?: string }
  ): Promise<void> => {
    try {
      const res = await api.hostEditAssignment(id, {
        hostId: currentUser?.id || 'usr-1',
        ...updates,
      });

      if (res.assignment) {
        const a = res.assignment;
        setAssignments((prev) =>
          prev.map((asg) =>
            asg.id === id
              ? {
                  ...asg,
                  title: a.title,
                  assigneeId: a.assigneeId || '',
                  assigneeName: a.assignee?.name || 'Unassigned',
                  assigneeAvatar: a.assignee?.avatar || mockUsers[1].avatar,
                  deadline: a.deadline || '',
                  status: a.status || 'todo',
                  priority: a.priority || 'medium',
                }
              : asg
          )
        );
      }
    } catch (err) {
      console.log('Host edit API error, updating locally:', err);
    }

    // Refresh notifications list after edit
    try {
      const { notifications: updatedNotifs } = await api.getNotifications();
      if (updatedNotifs && updatedNotifs.length > 0) {
        const formattedNotifs: NotificationItem[] = updatedNotifs.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          timestamp: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: n.read,
          type: n.type || 'system',
          targetRole: n.targetRole || 'all',
        }));
        setNotifications(formattedNotifs);
      }
    } catch (err) {
      console.log('Error refreshing notifications:', err);
    }
  };

  const updateAssignmentStatus = async (
    assignmentId: string,
    status: AssignmentStatus,
    evidenceData?: Omit<Evidence, 'id' | 'submittedAt'>
  ): Promise<void> => {
    try {
      if (evidenceData) {
        await api.submitEvidence(assignmentId, {
          title: evidenceData.title,
          url: evidenceData.url,
          notes: evidenceData.notes,
          type: evidenceData.type,
        });
      } else {
        await api.editAssignment(assignmentId, { status });
      }
    } catch (err) {
      console.log('Update assignment API error, updating locally:', err);
    }

    setAssignments((prev) =>
      prev.map((asg) => {
        if (asg.id !== assignmentId) return asg;

        let updatedEvidence = asg.evidenceSubmitted;
        if (evidenceData) {
          updatedEvidence = {
            id: `ev-${Date.now().toString().slice(-4)}`,
            submittedAt: new Date().toLocaleString(),
            ...evidenceData,
          };
        }

        return {
          ...asg,
          status,
          evidenceSubmitted: updatedEvidence,
        };
      })
    );

    if (status === 'submitted') {
      const targetAsg = assignments.find((a) => a.id === assignmentId);
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: 'Evidence Submitted',
        message: `${currentUser?.name || 'Assignee'} submitted evidence for "${targetAsg?.title || 'Assignment'}".`,
        timestamp: 'Just now',
        read: false,
        type: 'evidence',
        targetRole: 'host',
      };
      setNotifications((prev) => [newNotif, ...prev]);
    }
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const refreshAssignments = async (): Promise<void> => {
    try {
      const { assignments: dbAssignments } = await api.getAssignments();
      if (dbAssignments) {
        const formattedAssignments: Assignment[] = dbAssignments.map((a: any) => ({
          id: a.id,
          meetingId: a.meetingId,
          meetingTitle: a.meeting?.title || 'Meeting',
          title: a.title,
          description: a.description,
          assigneeId: a.assigneeId || '',
          assigneeName: a.assignee?.name || 'Unassigned (Needs Review)',
          assigneeAvatar: a.assignee?.avatar || '',
          assignerId: a.assignerId,
          assignerName: a.assigner?.name || 'Host User',
          deadline: a.deadline || 'TBD (Needs Review)',
          priority: a.priority || 'medium',
          status: a.status || 'todo',
          evidenceRequired: a.evidenceRequired,
          evidenceSubmitted: a.evidence ? {
            id: a.evidence.id,
            assignmentId: a.id,
            title: a.evidence.title,
            url: a.evidence.url || '',
            notes: a.evidence.notes || '',
            submittedAt: new Date(a.evidence.submittedAt).toLocaleString(),
            type: a.evidence.type || 'link',
          } : undefined,
        }));
        setAssignments(formattedAssignments);
      }
    } catch (err) {
      console.warn('Error refreshing assignments:', err);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        activePage,
        setActivePage,
        meetings,
        assignments,
        notifications,
        activeMeetingId,
        setActiveMeetingId,
        createMeeting,
        joinMeetingByCode,
        endMeetingById,
        addAssignment,
        refreshAssignments,
        updateAssignmentStatus,
        hostEditAssignment,
        markNotificationRead,
        markAllNotificationsRead,
        logout,
        switchRole,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
