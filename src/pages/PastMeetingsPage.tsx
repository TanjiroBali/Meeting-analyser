import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatusPill } from '../components/common/StatusPill';
import {
  History,
  Search,
  Calendar,
  User,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';

export const PastMeetingsPage: React.FC = () => {
  const { meetings, setActiveMeetingId, setActivePage } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'scheduled' | 'completed'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const filteredMeetings = meetings.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.hostName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center space-x-2">
            <History className="w-6 h-6 text-sky-600" />
            <span>Past Meetings & Deliverables Archive</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Access meeting transcripts, AI summaries, and action item evidence records.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search meetings by title, host, or keyword..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs w-full sm:w-auto justify-center">
          {[
            { key: 'all', label: 'All' },
            { key: 'live', label: 'Live' },
            { key: 'scheduled', label: 'Scheduled' },
            { key: 'completed', label: 'Concluded' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === tab.key
                  ? 'bg-white text-sky-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Meetings List */}
      <div className="space-y-4">
        {filteredMeetings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
            No meetings matched your search criteria.
          </div>
        ) : (
          filteredMeetings.map((mtg) => (
            <div
              key={mtg.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 hover:border-sky-300 transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-slate-900">{mtg.title}</h3>
                    <StatusPill status={mtg.status} type="meeting" />
                  </div>
                  <p className="text-xs text-slate-600 max-w-2xl">{mtg.description}</p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => handleCopyCode(mtg.inviteCode)}
                    className="px-3 py-1.5 text-xs font-mono font-medium bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 flex items-center space-x-1"
                  >
                    {copiedCode === mtg.inviteCode ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>{mtg.inviteCode}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveMeetingId(mtg.id);
                      setActivePage('meeting_analysis');
                    }}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center space-x-1"
                  >
                    <span>View Analysis & Tasks</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Host: <strong className="text-slate-700">{mtg.hostName}</strong></span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{mtg.date} ({mtg.duration})</span>
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-1 rounded bg-sky-50 text-sky-700 font-semibold border border-sky-100">
                    {mtg.actionItemsCount} Action Items Tagged
                  </span>
                  <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-medium">
                    {mtg.decisionsCount} Key Decisions
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
