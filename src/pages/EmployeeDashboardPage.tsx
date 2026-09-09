import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Assignment } from '../types';
import { StatusPill } from '../components/common/StatusPill';
import { SubmitEvidenceModal } from '../components/evidence/SubmitEvidenceModal';
import { EvidenceViewerModal } from '../components/evidence/EvidenceViewerModal';
import {
  Clock,
  FileCheck,
  CheckCircle2,
  Video,
  Upload,
  ExternalLink,
  Calendar,
  LogIn,
  AlertCircle,
} from 'lucide-react';

export const EmployeeDashboardPage: React.FC = () => {
  const {
    currentUser,
    assignments,
    meetings,
    setActivePage,
    setActiveMeetingId,
    updateAssignmentStatus,
  } = useApp();

  const [selectedTaskForSubmit, setSelectedTaskForSubmit] = useState<Assignment | null>(null);
  const [selectedTaskForView, setSelectedTaskForView] = useState<Assignment | null>(null);

  const myAssignments = assignments.filter(
    (a) => a.assigneeId === currentUser?.id || currentUser?.role === 'employee'
  );

  const todoTasks = myAssignments.filter((a) => a.status === 'todo' || a.status === 'in_progress');
  const submittedTasks = myAssignments.filter((a) => a.status === 'submitted');
  const approvedTasks = myAssignments.filter((a) => a.status === 'approved');

  const handleEvidenceSubmitted = (
    assignmentId: string,
    evidenceData: { title: string; url: string; notes: string; type: 'link' | 'document' | 'pr' | 'design' }
  ) => {
    updateAssignmentStatus(assignmentId, 'submitted', {
      assignmentId,
      ...evidenceData,
    });
    setSelectedTaskForSubmit(null);
  };

  const upcomingMeetings = meetings.filter((m) => m.status !== 'completed');

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Employee Header */}
      <div className="bg-gradient-to-r from-sky-700 via-sky-800 to-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-sky-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            <span>Employee Work Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {currentUser?.name || 'Alex'}
          </h1>
          <p className="mt-1 text-sm text-sky-100 max-w-xl">
            Track your action items assigned during team meetings and submit verifiable evidence to complete deliverables.
          </p>
        </div>

        <button
          onClick={() => setActivePage('join_meeting')}
          className="px-4 py-2.5 bg-white text-sky-700 hover:bg-sky-50 font-bold rounded-xl text-sm shadow-xs transition-all flex items-center space-x-1.5 active:scale-[0.98]"
        >
          <LogIn className="w-4 h-4" />
          <span>Join Meeting Room</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-sky-200 bg-sky-50/20 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-sky-800">Pending Action Items</p>
            <p className="text-2xl font-extrabold text-sky-900 mt-1">{todoTasks.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Evidence Under Review</p>
            <p className="text-2xl font-extrabold text-amber-900 mt-1">{submittedTasks.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Approved & Completed</p>
            <p className="text-2xl font-extrabold text-emerald-900 mt-1">{approvedTasks.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">My Work Assignments</h2>
                <p className="text-xs text-slate-500">
                  Deliverables assigned to you from meeting transcripts
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {myAssignments.map((asg) => (
                <div
                  key={asg.id}
                  className="p-5 hover:bg-slate-50/80 transition-colors space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-base font-bold text-slate-900">{asg.title}</span>
                        <StatusPill priority={asg.priority} type="priority" />
                      </div>
                      <p className="text-xs text-slate-600">{asg.description}</p>
                    </div>
                    <StatusPill status={asg.status} />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs flex flex-wrap items-center justify-between gap-2 text-slate-600">
                    <div>
                      <span>Meeting: <strong className="text-slate-800">{asg.meetingTitle}</strong></span>
                    </div>
                    <div>
                      <span>Deadline: <strong className="text-slate-800 font-mono">{asg.deadline}</strong></span>
                    </div>
                    <div>
                      <span>Assigner: <strong className="text-slate-800">{asg.assignerName}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 text-xs text-sky-800 bg-sky-50/70 p-2.5 rounded-lg border border-sky-100">
                    <AlertCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <span>
                      <strong className="font-semibold">Required Proof:</strong> {asg.evidenceRequired}
                    </span>
                  </div>

                  <div className="pt-1 flex items-center justify-end space-x-2">
                    {asg.evidenceSubmitted ? (
                      <button
                        onClick={() => setSelectedTaskForView(asg)}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors flex items-center space-x-1"
                      >
                        <span>View Submitted Evidence</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedTaskForSubmit(asg)}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center space-x-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Submit Work Evidence</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-sky-600" />
                <span>My Upcoming Meetings</span>
              </h3>
            </div>

            <div className="space-y-3">
              {upcomingMeetings.map((mtg) => (
                <div
                  key={mtg.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 truncate max-w-[160px]">
                      {mtg.title}
                    </span>
                    <StatusPill status={mtg.status} type="meeting" />
                  </div>
                  <p className="text-slate-500">{mtg.date} at {mtg.time}</p>
                  <button
                    onClick={() => {
                      setActiveMeetingId(mtg.id);
                      setActivePage('meeting_room');
                    }}
                    className="w-full mt-1 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Join Room</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedTaskForSubmit && (
        <SubmitEvidenceModal
          assignment={selectedTaskForSubmit}
          onClose={() => setSelectedTaskForSubmit(null)}
          onSubmit={handleEvidenceSubmitted}
        />
      )}

      {selectedTaskForView && (
        <EvidenceViewerModal
          assignment={selectedTaskForView}
          isHost={false}
          onClose={() => setSelectedTaskForView(null)}
        />
      )}
    </div>
  );
};
