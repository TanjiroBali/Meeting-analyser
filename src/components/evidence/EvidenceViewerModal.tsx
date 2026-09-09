import React from 'react';
import type { Assignment } from '../../types';
import { X, ExternalLink, CheckCircle2, FileCheck, Calendar, User, ShieldCheck } from 'lucide-react';
import { StatusPill } from '../common/StatusPill';

interface EvidenceViewerModalProps {
  assignment: Assignment;
  isHost: boolean;
  onClose: () => void;
  onApprove?: (assignmentId: string) => void;
}

export const EvidenceViewerModal: React.FC<EvidenceViewerModalProps> = ({
  assignment,
  isHost,
  onClose,
  onApprove,
}) => {
  const evidence = assignment.evidenceSubmitted;

  if (!evidence) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-sky-50/70 border-b border-sky-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Work Evidence Details</h3>
              <p className="text-xs text-sky-700">Verified artifact for meeting deliverable</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          {/* Status Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Status</span>
            <StatusPill status={assignment.status} />
          </div>

          {/* Task Info */}
          <div>
            <span className="text-xs font-semibold text-sky-700 uppercase tracking-wider">Assignment</span>
            <h4 className="text-base font-bold text-slate-900 mt-0.5">{assignment.title}</h4>
            <p className="text-xs text-slate-600 mt-1">{assignment.description}</p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-slate-500">Assignee</p>
                <p className="font-semibold text-slate-800">{assignment.assigneeName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-slate-500">Submitted At</p>
                <p className="font-semibold text-slate-800">{evidence.submittedAt}</p>
              </div>
            </div>
          </div>

          {/* Evidence Link Card */}
          <div className="p-4 bg-sky-50/50 rounded-xl border border-sky-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-bold text-sky-900 uppercase">Submitted Artifact</span>
              </div>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                {evidence.type}
              </span>
            </div>

            <p className="text-sm font-bold text-slate-900">{evidence.title}</p>

            <a
              href={evidence.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-sky-700 hover:text-sky-900 underline underline-offset-2 break-all"
            >
              <span>{evidence.url}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>

            {evidence.notes && (
              <div className="pt-2 border-t border-sky-200/60 mt-2 text-xs text-slate-700">
                <p className="font-semibold text-slate-800 mb-0.5">Notes:</p>
                <p className="whitespace-pre-wrap text-slate-600 bg-white/70 p-2.5 rounded-lg border border-sky-100">
                  {evidence.notes}
                </p>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Close
            </button>
            {isHost && assignment.status === 'submitted' && onApprove && (
              <button
                onClick={() => {
                  onApprove(assignment.id);
                  onClose();
                }}
                className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Evidence & Complete</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
