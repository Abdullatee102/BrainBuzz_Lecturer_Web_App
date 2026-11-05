import React, { useState } from 'react';
import {
  X,
  Printer,
  FileText,
  ShieldAlert,
  Download,
  RefreshCw,
  Calendar,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { apiClient, getErrorMessage } from '../../lib/api';
import type { Question } from '../../types/api';

interface PrintablePaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  offeringId: string;
  courseCode: string;
  courseTitle: string;
  questions: Question[];
}

export const PrintablePaperModal: React.FC<PrintablePaperModalProps> = ({
  isOpen,
  onClose,
  offeringId,
  courseCode,
  courseTitle,
  questions,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => questions.map((q) => q.id));
  const [examinationTitle, setExaminationTitle] = useState('FIRST SEMESTER EXAMINATION');
  const [academicSession, setAcademicSession] = useState('2025/2026 SESSION');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [instructions, setInstructions] = useState(
    'Answer all questions in the spaces provided. Write your details legibly on the cover. Unauthorized electronic devices are strictly prohibited.'
  );
  const [withAnswerKey, setWithAnswerKey] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleSelectAll = () => {
    if (selectedIds.length === questions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(questions.map((q) => q.id));
    }
  };

  const handleToggleQuestion = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleGeneratePdf = async () => {
    if (selectedIds.length === 0) {
      setErrorMsg('Please select at least one question to include in the paper.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const response = await apiClient.post(
        `/lecturer/questions/offerings/${offeringId}/paper-pdf`,
        {
          questionIds: selectedIds,
          config: {
            courseCode,
            courseTitle,
            examinationTitle,
            academicSession,
            durationMinutes,
            instructions,
            withAnswerKey,
          },
        },
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = withAnswerKey
        ? `${courseCode}_Marking_Guide.pdf`
        : `${courseCode}_Question_Paper.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      onClose();
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Generate Printable Question Paper
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {courseCode} — {courseTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Configuration Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Examination Title
              </label>
              <input
                type="text"
                value={examinationTitle}
                onChange={(e) => setExaminationTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Academic Session
              </label>
              <input
                type="text"
                value={academicSession}
                onChange={(e) => setAcademicSession(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Instructions to Candidates
            </label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="w-36">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Duration (Minutes)
              </label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                min={15}
                max={360}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Document Type Selector */}
            <div className="flex-1 pt-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={withAnswerKey}
                  onChange={(e) => setWithAnswerKey(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Generate Lecturer Marking Guide (Includes Answers & Rubric)</span>
              </label>
              {withAnswerKey ? (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                  Caution: Marking guides contain confidential answer keys. Do not distribute to candidates.
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Default: Standard physical examination paper with lined answer spaces for theory.
                </p>
              )}
            </div>
          </div>

          {/* Question Selection List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Select Questions ({selectedIds.length} of {questions.length} selected)
              </span>
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {selectedIds.length === questions.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {questions.map((q, idx) => {
                const checked = selectedIds.includes(q.id);
                return (
                  <label
                    key={q.id}
                    className="flex items-start gap-3 p-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleQuestion(q.id)}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-mono text-slate-400">#{idx + 1}</span>
                        <Badge variant={q.type === 'cbt' ? 'info' : 'purple'} size="sm">
                          {q.type.toUpperCase()}
                        </Badge>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {q.points || 1} mark{(q.points || 1) !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {q.question}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleGeneratePdf}
            disabled={isGenerating || selectedIds.length === 0}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                <span>Generating Academic PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                <span>Download {withAnswerKey ? 'Marking Guide' : 'Question Paper'} (.pdf)</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

