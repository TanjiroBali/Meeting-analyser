import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { UserAvatar } from '../components/common/UserAvatar';
import type { User, Meeting } from '../types';
import {
  Plus,
  Trash2,
  ArrowLeft,
  Zap,
  Copy,
  Check,
  Share2,
  Video,
  CheckCircle2,
} from 'lucide-react';

export const CreateMeetingPage: React.FC = () => {
  const { createMeeting, setActiveMeetingId, setActivePage, currentUser } = useApp();

  const [dbUsers, setDbUsers] = useState<User[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('2026-09-09');
  const [time, setTime] = useState('10:00 AM');
  const [duration, setDuration] = useState('45 mins');
  const [agendas, setAgendas] = useState<string[]>([
    'Review architecture & API endpoints',
    'Assign action items & evidence submission guidelines',
  ]);
  const [newAgendaInput, setNewAgendaInput] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [createdMeeting, setCreatedMeeting] = useState<Meeting | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await api.getUsers();
        if (res.users) {
          setDbUsers(res.users);
        }
      } catch (err) {
        console.warn('Could not fetch users list:', err);
      }
    }
    fetchUsers();
  }, []);

  const handleAddAgenda = () => {
    if (newAgendaInput.trim()) {
      setAgendas([...agendas, newAgendaInput.trim()]);
      setNewAgendaInput('');
    }
  };

  const handleRemoveAgenda = (index: number) => {
    setAgendas(agendas.filter((_, i) => i !== index));
  };

  const toggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyInviteText = (meeting: Meeting) => {
    const inviteText = `Join my meeting "${meeting.title}" on Anymit!\nMeeting Code: ${meeting.inviteCode}\nHosted by: ${meeting.hostName}`;
    navigator.clipboard.writeText(inviteText);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleStartInstant = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const meetingTitle = title.trim() || 'Instant Team Sync';
      const participants = dbUsers
        .filter((u) => selectedUserIds.includes(u.id))
        .map((u) => ({ id: u.id, name: u.name, avatar: u.avatar, role: u.title }));

      const created = await createMeeting({
        title: meetingTitle,
        description: description || 'Live interactive discussion and action item capture.',
        date: new Date().toISOString().split('T')[0],
        time: 'Now',
        duration,
        status: 'live',
        agenda: agendas.length > 0 ? agendas : ['Action item capture sync'],
        participants,
      });

      if (created) {
        setCreatedMeeting(created);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create meeting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a meeting title.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const participants = dbUsers
        .filter((u: User) => selectedUserIds.includes(u.id))
        .map((u: User) => ({ id: u.id, name: u.name, avatar: u.avatar, role: u.title }));

      const created = await createMeeting({
        title,
        description,
        date,
        time,
        duration,
        status: 'scheduled',
        agenda: agendas,
        participants,
      });

      if (created) {
        setCreatedMeeting(created);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create meeting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
        <button
          onClick={() => setActivePage('host_dashboard')}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Create & Schedule Meeting</h1>
          <p className="text-xs text-slate-500">
            Set up agenda topics, invite team members, and prepare action item capture.
          </p>
        </div>
      </div>

      <form className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1">
              Meeting Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4 Platform Architecture & API Review"
              className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1">
              Meeting Description & Key Deliverables
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief outline of topics to cover and work items expected..."
              className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1">
              Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1">
              Start Time
            </label>
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="10:00 AM"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1">
              Estimated Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="30 mins">30 mins</option>
              <option value="45 mins">45 mins</option>
              <option value="60 mins">60 mins</option>
              <option value="90 mins">90 mins</option>
            </select>
          </div>
        </div>

        <div className="pt-2 space-y-3">
          <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider">
            Agenda Topics & Key Focus Items
          </label>
          <div className="space-y-2">
            {agendas.map((agendaItem, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs font-medium text-slate-800"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <span>{agendaItem}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAgenda(idx)}
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newAgendaInput}
              onChange={(e) => setNewAgendaInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddAgenda();
                }
              }}
              placeholder="Add another agenda item..."
              className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="button"
              onClick={handleAddAgenda}
              className="px-3.5 py-2 bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold rounded-xl text-xs border border-sky-200 transition-colors flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Topic</span>
            </button>
          </div>
        </div>

        <div className="pt-2 space-y-3">
          <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider">
            Invite Team Members (Assignees)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {dbUsers.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No other registered team members in database yet. Additional users will appear here when they register.
              </p>
            ) : (
              dbUsers
                .filter((u) => u.id !== currentUser?.id)
                .map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleUser(u.id)}
                      className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center space-x-3 ${
                        isSelected
                          ? 'bg-sky-50 border-sky-600 text-sky-900 ring-1 ring-sky-600'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <UserAvatar name={u.name} avatar={u.avatar} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold truncate">{u.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{u.title || u.role}</p>
                      </div>
                    </button>
                  );
                })
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {errorMsg}
          </div>
        )}

        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSchedule}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm rounded-xl transition-colors disabled:opacity-50"
          >
            Save & Schedule for Later
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleStartInstant}
            className="w-full sm:w-auto px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 active:scale-[0.99] disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            <span>{isSubmitting ? 'Generating Meeting Code...' : 'Start Instant Meeting Now'}</span>
          </button>
        </div>
      </form>

      {/* Meeting Created Success Modal displaying Unique Code */}
      {createdMeeting && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-10 h-10 stroke-[2.2]" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">Meeting Created Successfully!</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Share this unique meeting joining code with team members so they can enter the room.
              </p>
            </div>

            <div className="p-5 bg-gradient-to-br from-slate-900 to-sky-950 rounded-2xl text-white text-center space-y-3 shadow-inner border border-slate-800">
              <span className="text-[11px] uppercase tracking-widest font-bold text-sky-400">
                Unique Meeting Joining Code
              </span>
              <div className="text-4xl font-extrabold tracking-widest font-mono text-white py-1">
                {createdMeeting.inviteCode}
              </div>
              <p className="text-[11px] text-slate-400">
                Saved in PostgreSQL database for meeting "{createdMeeting.title}"
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleCopyCode(createdMeeting.inviteCode)}
                className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                  copiedCode
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Code Copied!' : 'Copy Code Only'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyInviteText(createdMeeting)}
                className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                  copiedInvite
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200'
                }`}
              >
                {copiedInvite ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedInvite ? 'Invite Copied!' : 'Copy Full Invite'}</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between space-x-3">
              <button
                type="button"
                onClick={() => {
                  setCreatedMeeting(null);
                  setActivePage('host_dashboard');
                }}
                className="py-2.5 px-4 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Return to Dashboard
              </button>

              <button
                type="button"
                onClick={() => {
                  const mId = createdMeeting.id;
                  setCreatedMeeting(null);
                  setActiveMeetingId(mId);
                  setActivePage('meeting_room');
                }}
                className="py-3 px-6 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-2 transition-all"
              >
                <Video className="w-4 h-4" />
                <span>Enter Meeting Room Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
