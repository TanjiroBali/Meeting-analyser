/**
 * Normalizes any backend URL string to guarantee a clean /api path.
 */
export function normalizeApiUrl(rawUrl: string): string {
  if (!rawUrl || !rawUrl.trim()) return '';
  let clean = rawUrl.trim().replace(/\/+$/, '');
  clean = clean.replace(/\/login$/i, '').replace(/\/meetings.*$/i, '').replace(/\/assignments.*$/i, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
}

/**
 * Dynamic API Base URL resolution for production & local development.
 * Reads VITE_API_URL from environment or localStorage override before defaulting.
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    return normalizeApiUrl(envUrl);
  }

  const localOverride = typeof localStorage !== 'undefined' ? localStorage.getItem('anymit_backend_url') : null;
  if (localOverride && localOverride.trim() !== '') {
    return normalizeApiUrl(localOverride);
  }

  // Warn if running in production without VITE_API_URL configured
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    console.error(
      '[Anymit API Config Error] VITE_API_URL environment variable is missing! ' +
      'Production builds on Netlify require VITE_API_URL set in Netlify Site Settings to your deployed backend HTTPS URL.'
    );
  }

  return 'http://localhost:5000/api';
}

export function setApiBaseUrl(url: string): void {
  if (typeof localStorage !== 'undefined') {
    if (!url || !url.trim()) {
      localStorage.removeItem('anymit_backend_url');
    } else {
      localStorage.setItem('anymit_backend_url', normalizeApiUrl(url));
    }
  }
}

export const API_BASE_URL = getApiBaseUrl();

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      if (response.status === 404) {
        if (baseUrl.includes('netlify.app')) {
          throw new Error(
            `404 Not Found for ${options.method || 'GET'} "${url}". Netlify static host cannot process backend API requests. Please set VITE_API_URL in Netlify Environment Variables to your deployed backend HTTPS URL (e.g. https://your-backend.onrender.com/api).`
          );
        }
        throw new Error(`404 Not Found for ${options.method || 'GET'} "${cleanEndpoint}" on "${baseUrl}". Please check backend deployment.`);
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(
        `Failed to reach backend server at "${baseUrl}". If this is a deployed site (Netlify), please configure VITE_API_URL in your Netlify Environment Variables with your public HTTPS backend server URL.`
      );
    }
    throw error;
  }
}

export const api = {
  // 1. Auth / Login API
  login: (email: string, role: 'host' | 'employee', name?: string, title?: string, department?: string) =>
    apiFetch<{ message: string; user: any }>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, role, name, title, department }),
    }),

  // 2. Create Meeting API (Generates 4-letter unique code e.g. ABCD)
  createMeeting: (data: {
    title: string;
    description?: string;
    hostId: string;
    agenda?: string[];
    status?: 'WAITING' | 'ACTIVE' | 'ENDED';
    participantIds?: string[];
  }) =>
    apiFetch<{ message: string; meeting: any }>('/meetings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 3. Join Meeting API (by 4-letter code)
  joinMeeting: (code: string, userId?: string) =>
    apiFetch<{ message: string; meeting: any }>('/meetings/join', {
      method: 'POST',
      body: JSON.stringify({ code, userId }),
    }),

  // 4. Get Meeting API
  getMeeting: (idOrCode: string) =>
    apiFetch<{ meeting: any }>(`/meetings/${idOrCode}`),

  getMeetings: () =>
    apiFetch<{ meetings: any[] }>('/meetings'),

  // 5. End Meeting API
  endMeeting: (id: string, data: { summary?: string; decisions?: string[] } = {}) =>
    apiFetch<{ message: string; meeting: any }>(`/meetings/${id}/end`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // 6. Transcripts API
  saveTranscript: (meetingId: string, data: { speaker: string; text: string; language?: string; timestamp?: string }) =>
    apiFetch<{ message: string; transcript: any }>(`/meetings/${meetingId}/transcripts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getTranscripts: (meetingId: string) =>
    apiFetch<{ transcripts: any[] }>(`/meetings/${meetingId}/transcripts`),

  // 7. AI Analysis Ingestion API
  triggerAIAnalysis: (meetingId: string, hostId: string, analysisData?: any) =>
    apiFetch<{ message: string; assignmentsCreated: number; assignments: any[] }>(`/meetings/${meetingId}/analyze`, {
      method: 'POST',
      body: JSON.stringify({ hostId, analysisData }),
    }),

  // 8. Host Assignment Edit API (with Audit Logging & Employee Notification)
  hostEditAssignment: (id: string, data: { hostId: string; title?: string; assigneeId?: string; deadline?: string; status?: string; priority?: string }) =>
    apiFetch<{ message: string; assignment: any; logsCreated: number }>(`/assignments/${id}/host-edit`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // 9. Get & Create Assignments API
  getAssignments: (assigneeId?: string) => {
    const query = assigneeId ? `?assigneeId=${assigneeId}` : '';
    return apiFetch<{ assignments: any[] }>(`/assignments${query}`);
  },

  createAssignment: (data: {
    meetingId: string;
    title: string;
    description?: string;
    assigneeId?: string | null;
    assignerId: string;
    deadline?: string | null;
    priority?: 'low' | 'medium' | 'high';
    evidenceRequired?: string;
  }) =>
    apiFetch<{ message: string; assignment: any }>('/assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  editAssignment: (id: string, updates: Record<string, any>) =>
    apiFetch<{ message: string; assignment: any }>(`/assignments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  // Submit Evidence for Assignment
  submitEvidence: (assignmentId: string, evidenceData: { title: string; url?: string; notes?: string; type?: string; speaker?: string; originalText?: string }) =>
    apiFetch<{ message: string; evidence: any; assignment: any }>(`/assignments/${assignmentId}/evidence`, {
      method: 'POST',
      body: JSON.stringify(evidenceData),
    }),

  // Notifications API
  getNotifications: () =>
    apiFetch<{ notifications: any[] }>('/notifications'),

  // Users API
  getUsers: () =>
    apiFetch<{ users: any[] }>('/users'),
};
