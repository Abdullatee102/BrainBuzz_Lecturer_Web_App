import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '../../lib/api';
import type { QuestionItem } from '../../types/api';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { X, Search, Check, AlertCircle } from 'lucide-react';

interface QuestionPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessmentId: string;
  courseId: string;
  courseCode: string;
  alreadyAssigned?: Array<{
    questionId: string;
    allocatedMarks: number;
    orderIndex: number;
  }>;
}

export const QuestionPickerModal: React.FC<QuestionPickerModalProps> = ({
  isOpen,
  onClose,
  assessmentId,
  courseId,
  courseCode,
  alreadyAssigned = [],
}) => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedMap, setSelectedMap] = useState<Map<string, { allocatedMarks: number; orderIndex: number }>>(
    new Map()
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const prevOpenRef = useRef(false);
  const prevAssessmentIdRef = useRef<string | null>(null);

  // Initialize or reset selections only when modal transitions from closed -> open or assessment changes
  useEffect(() => {
    if (isOpen && (!prevOpenRef.current || prevAssessmentIdRef.current !== assessmentId)) {
      const map = new Map<string, { allocatedMarks: number; orderIndex: number }>();
      if (alreadyAssigned && alreadyAssigned.length > 0) {
        alreadyAssigned.forEach((q, idx) => {
          map.set(q.questionId, {
            allocatedMarks: q.allocatedMarks || 1,
            orderIndex: q.orderIndex ?? idx,
          });
        });
      }
      setSelectedMap(map);
      setErrorMessage(null);
      setSearch('');
    }
    prevOpenRef.current = isOpen;
    prevAssessmentIdRef.current = assessmentId;
  }, [isOpen, assessmentId]); // Deliberately omit alreadyAssigned to prevent array reference re-triggers

  // Fetch all questions for this course
  const { data, isLoading, error } = useQuery<{
    status: string;
    data: { questions: QuestionItem[] };
  }>({
    queryKey: ['lecturerCourseQuestions', courseId],
    queryFn: async () => {
      const res = await apiClient.get('/lecturer/questions', {
        params: { courseId, limit: 100 },
      });
      return res.data;
    },
    enabled: isOpen && !!courseId,
  });

  const allQuestions: QuestionItem[] = data?.data?.questions || [];

  const filteredQuestions = allQuestions.filter((q) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return q.question.toLowerCase().includes(s) || q.type.toLowerCase().includes(s);
  });

  const toggleSelect = (q: QuestionItem) => {
    const next = new Map(selectedMap);
    if (next.has(q.id)) {
      next.delete(q.id);
    } else {
      next.set(q.id, { allocatedMarks: q.points || 1, orderIndex: next.size });
    }
    setSelectedMap(next);
  };

  const handleSelectAll = () => {
    const allFilteredSelected =
      filteredQuestions.length > 0 && filteredQuestions.every((q) => selectedMap.has(q.id));

    const next = new Map(selectedMap);
    if (allFilteredSelected) {
      filteredQuestions.forEach((q) => next.delete(q.id));
    } else {
      filteredQuestions.forEach((q, idx) => {
        if (!next.has(q.id)) {
          next.set(q.id, { allocatedMarks: q.points || 1, orderIndex: next.size + idx });
        }
      });
    }
    setSelectedMap(next);
  };

  const updateMarks = (questionId: string, marks: number) => {
    const next = new Map(selectedMap);
    const existing = next.get(questionId);
    if (existing) {
      next.set(questionId, { ...existing, allocatedMarks: Math.max(0.5, marks) });
      setSelectedMap(next);
    }
  };

  const assignMutation = useMutation({
    mutationFn: async () => {
      const questions = Array.from(selectedMap.entries()).map(([qId, val], idx) => ({
        questionId: qId,
        orderIndex: idx,
        allocatedMarks: val.allocatedMarks,
      }));

      const res = await apiClient.post(`/lecturer/assessments/${assessmentId}/questions`, {
        questions,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessmentDetails', assessmentId] });
      queryClient.invalidateQueries({ queryKey: ['offeringAssessments'] });
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(getErrorMessage(err));
    },
  });

  if (!isOpen) return null;

  const isAllFilteredSelected =
    filteredQuestions.length > 0 && filteredQuestions.every((q) => selectedMap.has(q.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Assemble Assessment Question Paper</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select questions from the approved question bank for {courseCode}
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

        {/* Search & Counter Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search question text or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {filteredQuestions.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer"
              >
                {isAllFilteredSelected ? 'Deselect All' : 'Select All'}
              </button>
            )}
            <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
              Selected: <span className="font-bold">{selectedMap.size}</span> questions
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isLoading ? (
            <LoadingSpinner label="Loading course questions..." className="py-12" />
          ) : error ? (
            <div className="p-8 text-center text-rose-600 dark:text-rose-400 text-xs">
              Failed to load question bank items. Please retry.
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              No questions found matching your search.
            </div>
          ) : (
            filteredQuestions.map((q) => {
              const isSelected = selectedMap.has(q.id);
              const selectedData = selectedMap.get(q.id);

              return (
                <div
                  key={q.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => toggleSelect(q)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      toggleSelect(q);
                    }
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer select-none touch-manipulation active:scale-[0.99] ${
                    isSelected
                      ? 'border-indigo-500 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(q)}
                    className="sr-only"
                    aria-label={`Select question: ${q.question}`}
                  />
                  <div className="flex items-start gap-3">
                    {/* Visual Checkbox Indicator */}
                    <div
                      aria-hidden="true"
                      className={`mt-0.5 w-6 h-6 rounded-md border flex items-center justify-center transition-all flex-shrink-0 pointer-events-none ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant={q.type === 'cbt' ? 'info' : 'warning'} size="sm">
                          {q.type.toUpperCase()}
                        </Badge>
                        <Badge variant="default" size="sm">
                          {q.difficulty}
                        </Badge>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">Default: {q.points} pts</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
                        {q.question}
                      </p>
                      {q.options && q.options.length > 0 && (
                        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                          {q.options.map((opt, i) => (
                            <span key={i} className="inline-block mr-3">
                              <strong className="text-slate-600 dark:text-slate-300">{String.fromCharCode(65 + i)}:</strong> {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors pointer-events-none ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Pick'}
                      </span>

                      {isSelected && (
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Marks:</label>
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            max="100"
                            value={selectedData?.allocatedMarks || 1}
                            onChange={(e) => updateMarks(q.id, parseFloat(e.target.value) || 1)}
                            className="w-14 px-1.5 py-0.5 text-xs border border-indigo-300 dark:border-indigo-600 rounded-lg bg-white dark:bg-slate-800 text-center font-bold text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Total Allocated Questions: <strong className="text-slate-800 dark:text-slate-100">{selectedMap.size}</strong>
          </span>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={onClose} disabled={assignMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => assignMutation.mutate()}
              isLoading={assignMutation.isPending}
              disabled={selectedMap.size === 0}
            >
              Save Question Paper
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
