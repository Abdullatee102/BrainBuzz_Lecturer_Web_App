import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '../../lib/api';
import type { AssessmentItem, AssessmentType, CreateAssessmentPayload } from '../../types/api';
import { Button } from '../ui/Button';
import { X, Calendar, Clock, AlertCircle, ShieldAlert } from 'lucide-react';

const toLocalDateTimeString = (d: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

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
  const [notificationAudienceType, setNotificationAudienceType] = useState<'ACADEMIC_ENROLLED' | 'PRODUCT_ENTITLED'>('ACADEMIC_ENROLLED');
  const [requiredProductId, setRequiredProductId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch available products for product-specific notifications
  const { data: productsData } = useQuery({
    queryKey: ['availableProductsCatalog'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/payments/products');
        const raw = res.data?.data;
        if (Array.isArray(raw)) return raw;
        if (raw && Array.isArray(raw.products)) return raw.products;
        return [];
      } catch (err) {
        return [];
      }
    },
    staleTime: 1000 * 60 * 10,
  });

  const products: any[] = productsData || [];

  useEffect(() => {
    if (assessmentToEdit) {
      setTitle(assessmentToEdit.title);
      setDescription(assessmentToEdit.description || '');
      setType(assessmentToEdit.type);
      setDurationMinutes(assessmentToEdit.durationMinutes);
      // Format to datetime-local string (YYYY-MM-DDTHH:mm) safely without UTC drift
      try {
        setStartTime(toLocalDateTimeString(new Date(assessmentToEdit.startTime)));
        setEndTime(toLocalDateTimeString(new Date(assessmentToEdit.endTime)));
      } catch (err) {}
      setPassMarks(assessmentToEdit.passMarks ?? '');
      setMaxAttempts(assessmentToEdit.maxAttempts);
      setIsRandomized(assessmentToEdit.isRandomized);
      setAllowLateSubmission(Boolean(assessmentToEdit.allowLateSubmission));
      setNotificationAudienceType(assessmentToEdit.notificationAudienceType || 'ACADEMIC_ENROLLED');
      setRequiredProductId(assessmentToEdit.requiredProductId || '');
    } else {
      // Default to 2 hours in the future
      const now = new Date();
      const defaultStart = new Date(now.getTime() + 2 * 3600 * 1000);
      const defaultEnd = new Date(now.getTime() + 5 * 3600 * 1000);
      setTitle(`${courseCode} Mid-Semester Assessment`);
      setDescription('');
      setType('CBT');
      setDurationMinutes(60);
      setStartTime(toLocalDateTimeString(defaultStart));
      setEndTime(toLocalDateTimeString(defaultEnd));
      setPassMarks('');
      setMaxAttempts(1);
      setIsRandomized(false);
      setAllowLateSubmission(false);
      setNotificationAudienceType('ACADEMIC_ENROLLED');
      setRequiredProductId('');
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
        notificationAudienceType,
        requiredProductId: notificationAudienceType === 'PRODUCT_ENTITLED' ? requiredProductId || null : null,
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {assessmentToEdit ? 'Edit Assessment Draft' : 'Create Academic Assessment'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Course Offering: <span className="font-semibold text-slate-700 dark:text-slate-300">{courseCode}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Assessment Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., CSC201 Mid-Semester CBT Assessment"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Instructions / Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide instructions for students regarding permitted materials, timing, etc."
              className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assessment Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AssessmentType)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800"
              >
                <option value="CBT">CBT (Computer-Based Test)</option>
                <option value="THEORY">Theory (Rubric Evaluated)</option>
                <option value="MIXED">Mixed (CBT + Theory)</option>
                <option value="ASSIGNMENT">Continuous Assignment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Start Time (WAT / Local) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Closing Deadline (WAT / Local) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Pass Marks (Optional)
              </label>
              <input
                type="number"
                min={0}
                value={passMarks}
                onChange={(e) => setPassMarks(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 15"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Max Allowed Attempts
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800"
              />
            </div>
          </div>

          {/* Notification & Assessment Audience */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assessment Target Audience & Notification Scope
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label
                  className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    notificationAudienceType === 'ACADEMIC_ENROLLED'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="notificationAudience"
                    value="ACADEMIC_ENROLLED"
                    checked={notificationAudienceType === 'ACADEMIC_ENROLLED'}
                    onChange={() => setNotificationAudienceType('ACADEMIC_ENROLLED')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>All Enrolled Students (Standard)</span>
                </label>

                <label
                  className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    notificationAudienceType === 'PRODUCT_ENTITLED'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="notificationAudience"
                    value="PRODUCT_ENTITLED"
                    checked={notificationAudienceType === 'PRODUCT_ENTITLED'}
                    onChange={() => setNotificationAudienceType('PRODUCT_ENTITLED')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Product-Specific (Premium Pass)</span>
                </label>
              </div>
            </div>

            {notificationAudienceType === 'PRODUCT_ENTITLED' && (
              <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-2">
                <label className="block text-xs font-semibold text-amber-900 dark:text-amber-200">
                  Select Required Active Product Entitlement:
                </label>
                <select
                  value={requiredProductId}
                  onChange={(e) => setRequiredProductId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Select Active Learning Pass / Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} (₦{(p.amount / 100).toLocaleString()})
                    </option>
                  ))}
                  <option value="SEMESTER_PASS_HARMATTAN_2026">Brain Buzz Semester Pass (Harmattan 2026/2027)</option>
                  <option value="SEMESTER_PASS_RAIN_2026">Brain Buzz Semester Pass (Rain 2026/2027)</option>
                </select>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Only enrolled students holding an active verified entitlement for this product will receive scheduled assessment notifications and be permitted to participate.
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={isRandomized}
                onChange={(e) => setIsRandomized(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span>Randomize question sequence for each student attempt</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={allowLateSubmission}
                onChange={(e) => setAllowLateSubmission(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span>Allow late submissions (marks penalty applied in grading)</span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
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

