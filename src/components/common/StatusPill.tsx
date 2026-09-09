import React from 'react';
import type { AssignmentStatus, MeetingStatus, AssignmentPriority } from '../../types';
import { CheckCircle2, Clock, FileText, PlayCircle, CalendarCheck, CheckCheck } from 'lucide-react';

interface StatusPillProps {
  status?: AssignmentStatus | MeetingStatus;
  priority?: AssignmentPriority;
  type?: 'assignment' | 'meeting' | 'priority';
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, priority, type = 'assignment' }) => {
  if (type === 'priority' && priority) {
    switch (priority) {
      case 'high':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            <span>High Priority</span>
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>Medium Priority</span>
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            <span>Low Priority</span>
          </span>
        );
    }
  }

  if (type === 'meeting' && status) {
    switch (status as MeetingStatus) {
      case 'live':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
            <PlayCircle className="w-3.5 h-3.5 fill-emerald-600 text-white" />
            <span>LIVE NOW</span>
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Scheduled</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <CheckCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>Concluded</span>
          </span>
        );
    }
  }

  switch (status as AssignmentStatus) {
    case 'todo':
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>To Do</span>
        </span>
      );
    case 'in_progress':
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
          <Clock className="w-3.5 h-3.5 text-sky-600" />
          <span>In Progress</span>
        </span>
      );
    case 'submitted':
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
          <FileText className="w-3.5 h-3.5 text-amber-600" />
          <span>Evidence Submitted</span>
        </span>
      );
    case 'approved':
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Verified & Approved</span>
        </span>
      );
    default:
      return null;
  }
};
