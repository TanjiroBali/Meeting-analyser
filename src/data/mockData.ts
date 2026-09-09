import type { User, Meeting, Assignment, NotificationItem, TranscriptItem } from '../types';

/**
 * Clean empty initial states for production mode.
 * All real user accounts, meetings, work assignments, evidence proofs,
 * and notifications are stored dynamically in the database.
 */

export const mockUsers: User[] = [];

export const mockMeetings: Meeting[] = [];

export const mockAssignments: Assignment[] = [];

export const mockNotifications: NotificationItem[] = [];

export const mockTranscript: TranscriptItem[] = [];
