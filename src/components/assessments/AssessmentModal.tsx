import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '../../lib/api';
import type { AssessmentItem, AssessmentType, CreateAssessmentPayload } from '../../types/api';
import { Button } from '../ui/Button';
import { X, Calendar, Clock, AlertCircle, ShieldAlert } from 'lucide-react';

interface AssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  offeringId: string;
  courseId: string;
  courseCode: string;
  assessmentToEdit?: AssessmentItem | null;
}

export const AssessmentModal: React.FC<AssessmentModalProps> = ({
  isOpen,
  onClose,
  offeringId,
  courseId,
  courseCode,
  assessmentToEdit,
}) => {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<AssessmentType>('CBT');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [passMarks, setPassMarks] = useState<number | ''>('');
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [isRandomized, setIsRandomized] = useState(false);
  const [allowLateSubmission, setAllowLateSubmission] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (assessmentToEdit) {
      setTitle(assessmentToEdit.title);
      setDescription(assessmentToEdit.description || '');
      setType(assessmentToEdit.type);
      setDurationMinutes(assessmentToEdit.durationMinutes);
      // Format to datetime-local string (YYYY-MM-DDTHH:mm)
      try {
        setStartTime(new Date(assessmentToEdit.startTime).toISOString().slice(0, 16));
        setEndTime(new Date(assessmentToEdit.endTime).toISOString().slice(0, 16));
      } catch (err) {}
      setPassMarks(assessmentToEdit.passMarks ?? '');
      setMaxAttempts(assessmentToEdit.maxAttempts);
      setIsRandomized(assessmentToEdit.isRandomized);
      setAllowLateSubmission(Boolean(assessmentToEdit.allowLateSubmission));
    } else {
      // Default to 2 hours in the future
      const now = new Date();
      const defaultStart = new Date(now.getTime() + 2 * 3600 * 1000);
      const defaultEnd = new Date(now.getTime() + 5 * 3600 * 1000);
      setTitle(`${courseCode} Mid-Semester Assessment`);
      setDescription('');
      setType('CBT');
      setDurationMinutes(60);
      setStartTime(defaultStart.toISOString().slice(0, 16));
      setEndTime(defaultEnd.toISOString().slice(0, 16));
      setPassMarks('');
      setMaxAttempts(1);
      setIsRandomized(false);
      setAllowLateSubmission(false);
    }
    setErrorMessage(null);
  }, [assessmentToEdit, courseCode, isOpen]);

  const mutation = useMutation({
    mutationFn: async () => {
      const startISO = new Date(startTime).toISOString();
      const endISO = new Date(endTime).toISOString();

      const payload: CreateAssessmentPayload = {
        title: title.trim(),
        description: description.trim() || null,
        type,
        durationMinutes: Number(durationMinutes),
        startTime: startISO,
        endTime: endISO,
        passMarks: passMarks !== '' ? Number(passMarks) : null,
        maxAttempts: Number(maxAttempts) || 1,
        isRandomized,
        allowLateSubmission,
      };

      if (assessmentToEdit) {
        const res = await apiClient.put(`/lecturer/assessments/${assessmentToEdit.id}`, payload);
        return res.data;
      } else {
        const res = await apiClient.post(`/lecturer/offerings/${offeringId}/assessments`, payload);
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offeringAssessments', offeringId] });
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(getErrorMessage(err));
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();

    if (isNaN(startMs) || isNaN(endMs)) {
      setErrorMessage('Please provide valid start and end dates.');
      return;
    }

    if (endMs <= startMs) {
      setErrorMessage('End time must be strictly after start time.');
      return;
    }

    const windowMinutes = (endMs - startMs) / (60 * 1000);
    if (windowMinutes < Number(durationMinutes)) {
      setErrorMessage(
        `Availability window (${Math.round(windowMinutes)} mins) cannot be shorter than attempt duration (${durationMinutes} mins).`
      );
      return;
    }

    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {assessmentToEdit ? 'Edit Assessment Draft' : 'Create Academic Assessment'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Course Offering: <span className="font-semibold text-slate-700">{courseCode}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assessment Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., CSC201 Mid-Semester CBT Assessment"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Instructions / Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide instructions for students regarding permitted materials, timing, etc."
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assessment Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AssessmentType)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="CBT">CBT (Computer-Based Test)</option>
                <option value="THEORY">Theory (Rubric Evaluated)</option>
                <option value="MIXED">Mixed (CBT + Theory)</option>
                <option value="ASSIGNMENT">Continuous Assignment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Attempt Duration (Minutes) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min={5}
                  max={480}
                  required
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Time (WAT / Local) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Closing Deadline (WAT / Local) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pass Marks (Optional)
              </label>
              <input
                type="number"
                min={0}
                value={passMarks}
                onChange={(e) => setPassMarks(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 15"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Allowed Attempts
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={isRandomized}
                onChange={(e) => setIsRandomized(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span>Randomize question sequence for each student attempt</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={allowLateSubmission}
                onChange={(e) => setAllowLateSubmission(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span>Allow late submissions (marks penalty applied in grading)</span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={mutation.isPending}>
              {assessmentToEdit ? 'Save Changes' : 'Create Draft Assessment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

