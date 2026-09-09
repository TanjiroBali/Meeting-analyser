import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { UserAvatar } from '../components/common/UserAvatar';
import type { AssignmentPriority, TranscriptItem } from '../types';
import {
  FileText,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Plus,
  Trash2,
  Search,
} from 'lucide-react';

interface EditableAssignment {
  id: string;
  title: string;
  description: string;
  assigneeName: string;
  assigneeId: string;
  assigneeAvatar: string;
  deadline: string;
  priority: AssignmentPriority;
  evidenceRequired: string;
}

export const MeetingAnalysisPage: React.FC = () => {
  const { meetings, assignments, activeMeetingId, setActivePage, addAssignment, hostEditAssignment, refreshAssignments, currentUser } = useApp();

  const currentMeeting = meetings.find((m) => m.id === activeMeetingId || (m.inviteCode && m.inviteCode === activeMeetingId)) || meetings[0];

  const [editableAssignments, setEditableAssignments] = useState<EditableAssignment[]>([]);
  const [realTranscripts, setRealTranscripts] = useState<TranscriptItem[]>([]);
  const [searchTranscript, setSearchTranscript] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Load real assignments for current meeting & handle auto-polling
  useEffect(() => {
    let intervalId: any = null;
    let pollCount = 0;

    async function loadData() {
      await refreshAssignments();
      if (currentMeeting?.id) {
        try {
          const res = await api.getTranscripts(currentMeeting.id);
          if (res.transcripts) {
            const formatted: TranscriptItem[] = res.transcripts.map((t: any) => ({
              id: t.id,
              speaker: t.speaker,
              timestamp: t.timestamp || new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              text: t.text,
            }));
            setRealTranscripts(formatted);

            // If transcripts exist but no assignments yet, show processing & poll for Gemini results
            if (formatted.length > 0) {
              setIsAnalyzing(true);
              intervalId = setInterval(async () => {
                pollCount++;
                await refreshAssignments();
                if (pollCount >= 5) {
                  clearInterval(intervalId);
                  setIsAnalyzing(false);
                }
              }, 2000);
            }
          }
        } catch (err) {
          console.warn('Error fetching meeting analysis data:', err);
        }
      }
    }

    loadData();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentMeeting?.id]);

  useEffect(() => {
    if (currentMeeting) {
      const existing = assignments
        .filter((a) => a.meetingId === currentMeeting.id)
        .map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description || 'Extracted work deliverable',
          assigneeName: a.assigneeName || 'Unassigned',
          assigneeId: a.assigneeId || '',
          assigneeAvatar: a.assigneeAvatar || '',
          deadline: a.deadline || 'TBD',
          priority: a.priority || 'medium',
          evidenceRequired: a.evidenceRequired || 'Submitted proof link',
        }));
      setEditableAssignments(existing);
      if (existing.length > 0) {
        setIsAnalyzing(false);
      }
    }
  }, [currentMeeting?.id, assignments]);

  const handleUpdateAssignment = async (id: string, field: keyof EditableAssignment, value: string) => {
    setEditableAssignments((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );

    if (!id.startsWith('asg-temp-') && currentUser?.role === 'host') {
      await hostEditAssignment(id, { [field]: value });
    }
  };

  const handleRemoveAssignment = (id: string) => {
    setEditableAssignments((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddNewTask = () => {
    setEditableAssignments((prev) => [
      ...prev,
      {
        id: `asg-temp-${Date.now()}`,
        title: 'New Action Deliverable',
        description: 'Detail of work requirement discussed during meeting.',
        assigneeName: currentUser?.name || 'Unassigned',
        assigneeId: currentUser?.id || '',
        assigneeAvatar: '',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'medium',
        evidenceRequired: 'Submitted implementation link or documentation',
      },
    ]);
  };

  const handlePublishAssignments = async () => {
    if (!currentMeeting) return;
    for (const asg of editableAssignments) {
      if (asg.id.startsWith('asg-temp-')) {
        await addAssignment({
          meetingId: currentMeeting.id,
          meetingTitle: currentMeeting.title,
          title: asg.title,
          description: asg.description,
          assigneeId: asg.assigneeId,
          assigneeName: asg.assigneeName,
          assigneeAvatar: asg.assigneeAvatar,
          assignerId: currentUser?.id || 'usr-1',
          assignerName: currentUser?.name || 'Host',
          deadline: asg.deadline,
          priority: asg.priority,
          status: 'todo',
          evidenceRequired: asg.evidenceRequired,
        });
      }
    }

    setIsPublished(true);
    setTimeout(() => {
      setActivePage(currentUser?.role === 'host' ? 'host_dashboard' : 'employee_dashboard');
    }, 1500);
  };

  const filteredTranscript = realTranscripts.filter((t) =>
    t.text.toLowerCase().includes(searchTranscript.toLowerCase()) ||
    t.speaker.toLowerCase().includes(searchTranscript.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActivePage(currentUser?.role === 'host' ? 'host_dashboard' : 'employee_dashboard')}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 uppercase tracking-wider">
                Gemini AI Summary & Extraction
              </span>
              {currentMeeting?.inviteCode && (
                <span className="text-xs font-mono font-semibold text-slate-500">
                  Code: {currentMeeting.inviteCode}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
              {currentMeeting?.title || 'Meeting Discussion Analysis'}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {currentUser?.role === 'host' && (
            <button
              onClick={handlePublishAssignments}
              disabled={isPublished}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center space-x-1.5 active:scale-[0.98] disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isPublished ? 'Assignments Saved!' : 'Confirm & Save Assignments'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column: Gemini Extracted Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-sky-600" />
                <h2 className="text-base font-bold text-slate-900">Extracted Work Deliverables & Proof Guidelines</h2>
              </div>
              {currentUser?.role === 'host' && (
                <button
                  onClick={handleAddNewTask}
                  className="px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold text-xs rounded-lg border border-sky-200 transition-colors flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Deliverable</span>
                </button>
              )}
            </div>

            {isAnalyzing && (
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 flex items-center space-x-3 animate-pulse">
                <Sparkles className="w-5 h-5 text-sky-600 animate-spin shrink-0" />
                <div className="text-xs">
                  <p className="font-bold">Analyzing transcript with Gemini AI...</p>
                  <p className="text-sky-700">Extracting tasks, assigned employees, deadlines & evidence quotes. Results will display automatically.</p>
                </div>
              </div>
            )}

            {editableAssignments.length === 0 && !isAnalyzing ? (
              <div className="py-10 text-center text-xs text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <p className="font-bold text-slate-700">No action deliverables extracted</p>
                <p className="mt-1 text-slate-400">
                  No explicit tasks or work items were detected in the meeting discussion.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {editableAssignments.map((asg, index) => (
                  <div
                    key={asg.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3 relative group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-[10px]">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={asg.title}
                          onChange={(e) => handleUpdateAssignment(asg.id, 'title', e.target.value)}
                          className="font-bold text-sm text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none w-full"
                          readOnly={currentUser?.role !== 'host'}
                        />
                      </div>
                      {currentUser?.role === 'host' && (
                        <button
                          onClick={() => handleRemoveAssignment(asg.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="Remove Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <textarea
                      rows={2}
                      value={asg.description}
                      onChange={(e) => handleUpdateAssignment(asg.id, 'description', e.target.value)}
                      className="w-full text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
                      readOnly={currentUser?.role !== 'host'}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                      <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-slate-200">
                        <UserAvatar name={asg.assigneeName} avatar={asg.assigneeAvatar} size="xs" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Assigned To</p>
                          <input
                            type="text"
                            value={asg.assigneeName}
                            onChange={(e) => handleUpdateAssignment(asg.id, 'assigneeName', e.target.value)}
                            className="font-bold text-xs text-slate-800 bg-transparent border-none focus:outline-none w-full"
                            readOnly={currentUser?.role !== 'host'}
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-slate-200">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Deadline</p>
                          <input
                            type="text"
                            value={asg.deadline}
                            onChange={(e) => handleUpdateAssignment(asg.id, 'deadline', e.target.value)}
                            className="font-bold text-xs text-slate-800 bg-transparent border-none focus:outline-none w-full"
                            readOnly={currentUser?.role !== 'host'}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Real Recorded Transcript Viewer */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-sky-600" />
                <span>Recorded Transcript</span>
              </h3>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {realTranscripts.length} lines
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTranscript}
                onChange={(e) => setSearchTranscript(e.target.value)}
                placeholder="Search transcript text..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 text-xs">
              {filteredTranscript.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">
                  No transcript lines recorded for this meeting.
                </p>
              ) : (
                filteredTranscript.map((t) => (
                  <div key={t.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800">{t.speaker}</span>
                      <span className="text-slate-400">{t.timestamp}</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{t.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
