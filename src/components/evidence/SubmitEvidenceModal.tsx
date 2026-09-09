import React, { useState } from 'react';
import type { Assignment } from '../../types';
import { X, Link2, FileCheck, GitPullRequest, Palette, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface SubmitEvidenceModalProps {
  assignment: Assignment;
  onClose: () => void;
  onSubmit: (assignmentId: string, evidenceData: { title: string; url: string; notes: string; type: 'link' | 'document' | 'pr' | 'design' }) => void;
}

export const SubmitEvidenceModal: React.FC<SubmitEvidenceModalProps> = ({
  assignment,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [evidenceType, setEvidenceType] = useState<'link' | 'document' | 'pr' | 'design'>('pr');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title for the evidence.');
      return;
    }
    if (!url.trim()) {
      setError('Please enter a valid URL link as evidence proof.');
      return;
    }

    onSubmit(assignment.id, {
      title,
      url,
      notes,
      type: evidenceType,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-sky-50/70 border-b border-sky-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Submit Work Evidence</h3>
              <p className="text-xs text-sky-700">Proof of completion for meeting deliverables</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Assignment Info Context Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Task:</span>
              <span className="text-slate-500">{assignment.meetingTitle}</span>
            </div>
            <p className="text-sm font-bold text-slate-900">{assignment.title}</p>
            <div className="pt-1.5 border-t border-slate-200 text-sky-800 flex items-start space-x-1.5">
              <AlertCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <span>
                <strong className="font-semibold">Required Proof:</strong> {assignment.evidenceRequired}
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          {/* Evidence Type Selectors */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Evidence Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { type: 'pr', label: 'GitHub PR', icon: GitPullRequest },
                { type: 'design', label: 'Design', icon: Palette },
                { type: 'document', label: 'Doc File', icon: FileText },
                { type: 'link', label: 'Web Link', icon: Link2 },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = evidenceType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setEvidenceType(item.type as any)}
                    className={`p-2.5 rounded-xl border text-center text-xs font-medium transition-all flex flex-col items-center space-y-1.5 ${
                      isSelected
                        ? 'bg-sky-50 border-sky-600 text-sky-700 font-semibold ring-1 ring-sky-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Evidence Title / Label *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Pull Request #142 - Auth PKCE implementation"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              required
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Resource URL / Link *
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/org/repo/pull/142"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Implementation Notes & Verification Summary
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Brief explanation of work done, test verification logs, or instructions for review..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Submit Evidence</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
