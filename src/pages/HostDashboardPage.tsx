import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Assignment } from '../types';
import { StatusPill } from '../components/common/StatusPill';
import { UserAvatar } from '../components/common/UserAvatar';
import { EvidenceViewerModal } from '../components/evidence/EvidenceViewerModal';
import {
  PlusCircle,
  Video,
  CheckSquare,
  Clock,
  ExternalLink,
  Copy,
  Check,
  ChevronRight,
  ArrowUpRight,
  LogIn,
  FileCheck,
} from 'lucide-react';

export const HostDashboardPage: React.FC = () => {
  const {
    currentUser,
    meetings,
    assignments,
    setActivePage,
    setActiveMeetingId,
    updateAssignmentStatus,
  } = useApp();

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedAssignmentForEvidence, setSelectedAssignmentForEvidence] = useState<Assignment | null>(null);

  const liveMeeting = meetings.find((m) => m.status === 'live');
  const upcomingMeetings = meetings.filter((m) => m.status === 'scheduled');
  const pendingEvidenceAssignments = assignments.filter((a) => a.status === 'submitted');

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleApproveEvidence = (assignmentId: string) => {
    updateAssignmentStatus(assignmentId, 'approved');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Welcome Header */}
      <div className="bg-gradient-to-r from-sky-600 via-sky-700 to-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-sky-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Host Management Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {currentUser?.name || 'Sarah'}
          </h1>
          <p className="mt-1 text-sm text-sky-100 max-w-xl">
            Convert your team's live meeting discussions into tracked deliverables with verified evidence proof.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActivePage('create_meeting')}
            className="px-4 py-2.5 bg-white text-sky-700 hover:bg-sky-50 font-bold rounded-xl text-sm shadow-xs transition-all flex items-center space-x-1.5 active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Meeting</span>
          </button>
          <button
            onClick={() => setActivePage('join_meeting')}
            className="px-4 py-2.5 bg-sky-800/80 hover:bg-sky-800 text-white font-medium rounded-xl text-sm border border-sky-500/30 transition-all flex items-center space-x-1.5"
          >
            <LogIn className="w-4 h-4" />
            <span>Join with Code</span>
          </button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Live & Scheduled Meetings</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{meetings.filter(m => m.status !== 'completed').length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Video className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200/80 bg-amber-50/30 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Evidence Pending Review</p>
            <p className="text-2xl font-extrabold text-amber-900 mt-1">{pendingEvidenceAssignments.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Work Assignments</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{assignments.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckSquare className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {liveMeeting && (
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-xs overflow-hidden">
              <div className="bg-emerald-50/80 px-6 py-3 border-b border-emerald-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    Meeting Currently in Progress
                  </span>
                </div>
                <StatusPill status="live" type="meeting" />
              </div>

              <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900">{liveMeeting.title}</h3>
                  <p className="text-xs text-slate-600 max-w-lg">{liveMeeting.description}</p>
                  <div className="pt-2 flex items-center space-x-4 text-xs text-slate-500">
                    <span>Host: <strong className="text-slate-800">{liveMeeting.hostName}</strong></span>
                    <span>Duration: <strong className="text-slate-800">{liveMeeting.duration}</strong></span>
                    <span>Code: <strong className="text-sky-700 font-mono">{liveMeeting.inviteCode}</strong></span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => {
                      setActiveMeetingId(liveMeeting.id);
                      setActivePage('meeting_room');
                    }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
                  >
                    <Video className="w-4 h-4" />
                    <span>Enter Live Room</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Scheduled Upcoming Meetings</h2>
              <button
                onClick={() => setActivePage('create_meeting')}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center space-x-1"
              >
                <span>Schedule New</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {upcomingMeetings.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <p className="font-semibold text-slate-700">No scheduled upcoming meetings</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Click "Create Meeting" above to set up a new meeting session and generate a 4-letter passcode.
                  </p>
                </div>
              ) : (
                upcomingMeetings.map((mtg) => (
                  <div
                    key={mtg.id}
                    className="p-4 rounded-xl border border-slate-200/90 hover:border-sky-300 transition-all bg-slate-50/40 hover:bg-sky-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-900">{mtg.title}</span>
                        <StatusPill status={mtg.status} type="meeting" />
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-slate-500">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{mtg.date} at {mtg.time}</span>
                        </span>
                        <span>({mtg.duration})</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => handleCopyCode(mtg.inviteCode)}
                        className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg flex items-center space-x-1"
                        title="Copy Passcode"
                      >
                        {copiedCode === mtg.inviteCode ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-semibold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Code: {mtg.inviteCode}</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setActiveMeetingId(mtg.id);
                          setActivePage('meeting_room');
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors"
                      >
                        Start Now
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <FileCheck className="w-4 h-4 text-amber-600" />
                <span>Evidence Awaiting Approval</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                {pendingEvidenceAssignments.length}
              </span>
            </div>

            {pendingEvidenceAssignments.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                All submitted evidence has been reviewed.
              </p>
            ) : (
              <div className="space-y-3">
                {pendingEvidenceAssignments.map((asg) => (
                  <div
                    key={asg.id}
                    className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{asg.assigneeName}</span>
                      <StatusPill priority={asg.priority} type="priority" />
                    </div>
                    <p className="font-bold text-slate-900">{asg.title}</p>
                    <button
                      onClick={() => setSelectedAssignmentForEvidence(asg)}
                      className="w-full mt-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg text-xs transition-colors flex items-center justify-center space-x-1"
                    >
                      <span>Review Submitted Evidence</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Active Work Assignments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">Active Work Assignments & Evidence</h2>
            <p className="text-xs text-slate-500">
              Tasks created during meeting discussions with deadline and proof validation status
            </p>
          </div>
          <button
            onClick={() => setActivePage('past_meetings')}
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center space-x-1 self-start sm:self-auto"
          >
            <span>View Meeting Summaries</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Task Title</th>
                <th className="py-3.5 px-4">Assignee</th>
                <th className="py-3.5 px-4">Origin Meeting</th>
                <th className="py-3.5 px-4">Deadline</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Evidence Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500 italic">
                    No work assignments found. Tasks will appear here automatically when live meetings are ended and analyzed by Gemini AI.
                  </td>
                </tr>
              ) : (
                assignments.map((asg) => (
                  <tr key={asg.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      <p className="text-sm font-bold">{asg.title}</p>
                      <p className="text-slate-500 text-[11px] font-normal truncate max-w-xs">{asg.description}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <UserAvatar name={asg.assigneeName} avatar={asg.assigneeAvatar} size="sm" />
                        <span className="font-medium text-slate-800">{asg.assigneeName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-600 max-w-[180px] truncate">{asg.meetingTitle}</td>
                    <td className="py-4 px-4 font-mono font-medium text-slate-700">{asg.deadline}</td>
                    <td className="py-4 px-4">
                      <StatusPill priority={asg.priority} type="priority" />
                    </td>
                    <td className="py-4 px-4">
                      <StatusPill status={asg.status} />
                    </td>
                    <td className="py-4 px-6 text-right">
                      {asg.evidenceSubmitted ? (
                        <button
                          onClick={() => setSelectedAssignmentForEvidence(asg)}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors"
                        >
                          <span>View Proof</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-slate-400 italic">Awaiting Submission</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAssignmentForEvidence && (
        <EvidenceViewerModal
          assignment={selectedAssignmentForEvidence}
          isHost={true}
          onClose={() => setSelectedAssignmentForEvidence(null)}
          onApprove={handleApproveEvidence}
        />
      )}
    </div>
  );
};
