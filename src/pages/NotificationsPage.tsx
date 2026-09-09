import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { NotificationType } from '../types';
import {
  Bell,
  CheckCheck,
  FileCheck,
  CalendarCheck,
  CheckSquare,
  Info,
  Clock,
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    setActivePage,
    currentUser,
  } = useApp();

  const [typeFilter, setTypeFilter] = useState<'all' | NotificationType>('all');

  const filteredNotifs = notifications.filter((n) => {
    const matchesRole =
      !n.targetRole ||
      n.targetRole === 'all' ||
      n.targetRole === currentUser?.role;

    const matchesType = typeFilter === 'all' || n.type === typeFilter;
    return matchesRole && matchesType;
  });

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'evidence':
        return <FileCheck className="w-4 h-4 text-amber-600" />;
      case 'meeting':
        return <CalendarCheck className="w-4 h-4 text-sky-600" />;
      case 'assignment':
        return <CheckSquare className="w-4 h-4 text-emerald-600" />;
      default:
        return <Info className="w-4 h-4 text-slate-500" />;
    }
  };

  const handleNotificationClick = (id: string, type: NotificationType) => {
    markNotificationRead(id);
    if (type === 'meeting') {
      setActivePage('join_meeting');
    } else if (type === 'evidence' || type === 'assignment') {
      setActivePage(currentUser?.role === 'host' ? 'host_dashboard' : 'employee_dashboard');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center space-x-2">
            <Bell className="w-6 h-6 text-sky-600" />
            <span>Activity Notifications</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time alerts for meeting schedules, work assignments, and submitted evidence.
          </p>
        </div>

        <button
          onClick={markAllNotificationsRead}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <CheckCheck className="w-4 h-4" />
          <span>Mark All as Read</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-2 flex items-center space-x-1 overflow-x-auto text-xs font-medium">
        {[
          { key: 'all', label: 'All Notifications' },
          { key: 'evidence', label: 'Evidence Proof' },
          { key: 'assignment', label: 'Work Assignments' },
          { key: 'meeting', label: 'Meetings' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTypeFilter(tab.key as any)}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              typeFilter === tab.key
                ? 'bg-sky-50 text-sky-700 font-bold border border-sky-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {filteredNotifs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No notifications in this category.
          </div>
        ) : (
          filteredNotifs.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n.id, n.type)}
              className={`p-5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start space-x-4 ${
                !n.read ? 'bg-sky-50/30' : ''
              }`}
            >
              <div className="p-2.5 rounded-xl bg-slate-100 shrink-0 mt-0.5">
                {getIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">{n.title}</span>
                  <span className="text-xs text-slate-400 font-mono flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{n.timestamp}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
              </div>

              {!n.read && (
                <span className="w-2.5 h-2.5 rounded-full bg-sky-600 shrink-0 mt-2"></span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
