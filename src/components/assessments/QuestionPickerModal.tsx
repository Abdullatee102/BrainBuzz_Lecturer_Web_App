import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '../../lib/api';
import type { QuestionItem } from '../../types/api';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { X, Search, Check, AlertCircle, HelpCircle } from 'lucide-react';

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

  useEffect(() => {
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
  }, [alreadyAssigned, isOpen]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Assemble Assessment Question Paper</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select questions from the approved question bank for {courseCode}
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

        {/* Search & Counter Bar */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search question text or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
          <div className="text-xs font-semibold text-slate-600 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 whitespace-nowrap">
            Selected: <span className="font-bold">{selectedMap.size}</span> questions
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isLoading ? (
            <LoadingSpinner label="Loading course questions..." className="py-12" />
          ) : error ? (
            <div className="p-8 text-center text-rose-600 text-xs">
              Failed to load question bank items. Please retry.
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No questions found matching your search.
            </div>
          ) : (
            filteredQuestions.map((q) => {
              const isSelected = selectedMap.has(q.id);
              const selectedData = selectedMap.get(q.id);

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-indigo-300 bg-indigo-50/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(q)}
                      className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant={q.type === 'cbt' ? 'info' : 'warning'} size="sm">
                          {q.type.toUpperCase()}
                        </Badge>
                        <Badge variant="default" size="sm">
                          {q.difficulty}
                        </Badge>
                        <span className="text-[11px] text-slate-400">Default: {q.points} pts</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                        {q.question}
                      </p>
                      {q.options && q.options.length > 0 && (
                        <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                          {q.options.map((opt, i) => (
                            <span key={i} className="inline-block mr-3">
                              <strong className="text-slate-600">{String.fromCharCode(65 + i)}:</strong> {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-2 flex-shrink-0 self-center">
                        <label className="text-[11px] font-semibold text-slate-600">Marks:</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="100"
                          value={selectedData?.allocatedMarks || 1}
                          onChange={(e) => updateMarks(q.id, parseFloat(e.target.value) || 1)}
                          className="w-16 px-2 py-1 text-xs border border-indigo-300 rounded-lg bg-white text-center font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <span className="text-xs text-slate-500">
            Total Allocated Questions: <strong className="text-slate-800">{selectedMap.size}</strong>
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

