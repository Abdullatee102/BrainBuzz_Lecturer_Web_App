import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '../../lib/api';
import type { QuestionItem, QuestionStatus, CreateQuestionPayload, UpdateQuestionPayload } from '../../types/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { QuestionModal } from './QuestionModal';
import { BulkImportModal } from './BulkImportModal';
import { PrintablePaperModal } from './PrintablePaperModal';
import {
  FileQuestion,
  Plus,
  Send,
  Undo2,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  XCircle,
  HelpCircle,
  Eye,
  Upload,
  Printer,
} from 'lucide-react';

interface QuestionBankSectionProps {
  courseId: string;
  offeringId?: string;
  courseCode: string;
  courseTitle: string;
}

export const QuestionBankSection: React.FC<QuestionBankSectionProps> = ({
  courseId,
  offeringId,
  courseCode,
  courseTitle,
}) => {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isPrintPaperOpen, setIsPrintPaperOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch Lecturer Questions
  const {
    data: questionsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['lecturerQuestions', courseId, offeringId],
    queryFn: async () => {
      const params: Record<string, any> = { courseId, limit: 100 };
      if (offeringId) params.offeringId = offeringId;

      const response = await apiClient.get<{
        status: string;
        data: { questions?: QuestionItem[]; total?: number } | QuestionItem[];
      }>('/lecturer/questions', { params });

      const raw = response.data.data;
      if (Array.isArray(raw)) return raw;
      if (raw && Array.isArray(raw.questions)) return raw.questions;
      return [];
    },
  });

  const questions: QuestionItem[] = questionsData || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: CreateQuestionPayload) => {
      await apiClient.post('/lecturer/questions', payload);
    },
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['lecturerQuestions', courseId, offeringId] });
      queryClient.invalidateQueries({ queryKey: ['assignedCourseDetails', courseId] });
    },
    onError: (err: any) => {
      setActionError(getErrorMessage(err));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateQuestionPayload }) => {
      await apiClient.patch(`/lecturer/questions/${id}`, payload);
    },
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['lecturerQuestions', courseId, offeringId] });
    },
    onError: (err: any) => {
      setActionError(getErrorMessage(err));
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/lecturer/questions/${id}/submit`);
    },
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['lecturerQuestions', courseId, offeringId] });
    },
    onError: (err: any) => {
      setActionError(getErrorMessage(err));
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/lecturer/questions/${id}/withdraw`);
    },
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['lecturerQuestions', courseId, offeringId] });
    },
    onError: (err: any) => {
      setActionError(getErrorMessage(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/lecturer/questions/${id}`);
    },
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['lecturerQuestions', courseId, offeringId] });
      queryClient.invalidateQueries({ queryKey: ['assignedCourseDetails', courseId] });
    },
    onError: (err: any) => {
      setActionError(getErrorMessage(err));
    },
  });

  const handleOpenCreate = () => {
    setEditingQuestion(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (q: QuestionItem) => {
    setEditingQuestion(q);
    setIsModalOpen(true);
  };

  const handleSaveQuestion = async (payload: any) => {
    if (editingQuestion) {
      await updateMutation.mutateAsync({ id: editingQuestion.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  // Filter questions
  const filteredQuestions = questions.filter((q) => {
    if (selectedStatus === 'ALL') return true;
    return q.status === selectedStatus;
  });

  const statusCounts = questions.reduce(
    (acc, q) => {
      acc[q.status] = (acc[q.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const getStatusBadge = (status: QuestionStatus) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="default">Draft</Badge>;
      case 'SUBMITTED':
        return <Badge variant="info">Submitted</Badge>;
      case 'UNDER_REVIEW':
        return <Badge variant="warning">Under Review</Badge>;
      case 'REVISION_REQUIRED':
        return <Badge variant="warning">Revision Required</Badge>;
      case 'APPROVED':
        return <Badge variant="success">Approved</Badge>;
      case 'PUBLISHED':
        return <Badge variant="success">Published</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Course Question Bank & Authoring</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Author, revise, and submit CBT and Theory questions for departmental review and publication.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPrintPaperOpen(true)}
            disabled={questions.length === 0}
            className="text-xs"
          >
            <Printer className="w-4 h-4 mr-1.5 text-slate-600 dark:text-slate-300" />
            <span>Printable Paper</span>
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsBulkImportOpen(true)} className="text-xs">
            <Upload className="w-4 h-4 mr-1.5" />
            <span>Bulk Import</span>
          </Button>

          <Button variant="primary" size="sm" onClick={handleOpenCreate} className="text-xs">
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Author Question Draft</span>
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-800 dark:text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Action Error:</span> {actionError}
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-700">
            &times;
          </button>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-slate-200 dark:border-slate-800">
        {[
          { key: 'ALL', label: 'All Questions', count: questions.length },
          { key: 'DRAFT', label: 'Drafts', count: statusCounts['DRAFT'] || 0 },
          { key: 'SUBMITTED', label: 'Submitted', count: statusCounts['SUBMITTED'] || 0 },
          { key: 'UNDER_REVIEW', label: 'Under Review', count: statusCounts['UNDER_REVIEW'] || 0 },
          {
            key: 'REVISION_REQUIRED',
            label: 'Revision Required',
            count: statusCounts['REVISION_REQUIRED'] || 0,
          },
          { key: 'APPROVED', label: 'Approved', count: statusCounts['APPROVED'] || 0 },
          { key: 'PUBLISHED', label: 'Published', count: statusCounts['PUBLISHED'] || 0 },
          { key: 'REJECTED', label: 'Rejected', count: statusCounts['REJECTED'] || 0 },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedStatus(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg font-medium transition-all ${
              selectedStatus === tab.key
                ? 'border-b-2 border-indigo-600 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300 font-semibold bg-indigo-50/50 dark:bg-indigo-950/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedStatus === tab.key ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Question Cards List */}
      {isLoading ? (
        <LoadingSpinner label="Loading questions..." className="py-12" />
      ) : isError ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center text-xs text-rose-800">
          Failed to load questions. {getErrorMessage(error)}
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8">
          <FileQuestion className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No questions found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {selectedStatus === 'ALL'
              ? 'You have not authored any questions for this course yet. Click "Author Question Draft" above to begin.'
              : `No questions currently in ${selectedStatus.replace('_', ' ')} status.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((q) => {
            const isDraft = q.status === 'DRAFT';
            const isRevision = q.status === 'REVISION_REQUIRED';
            const isRejected = q.status === 'REJECTED';
            const isSubmitted = q.status === 'SUBMITTED';

            return (
              <Card key={q.id} className="overflow-hidden border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                <div className="p-5 space-y-3">
                  {/* Card Header Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-mono">v{q.currentVersion}</span>
                      {getStatusBadge(q.status)}
                      <Badge variant={q.type === 'cbt' ? 'info' : 'purple'}>
                        {q.type.toUpperCase()}
                      </Badge>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        {q.difficulty} • {q.points} pt{q.points !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {(isDraft || isRevision || isRejected) && (
                        <>
                          <Button
                            variant={isRejected ? "outline" : "outline"}
                            size="sm"
                            onClick={() => handleOpenEdit(q)}
                            className="h-7 text-xs px-2.5"
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            <span>{isRejected ? 'Revise & Re-draft' : 'Edit'}</span>
                          </Button>

                          {!isRejected && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => submitMutation.mutate(q.id)}
                              disabled={submitMutation.isPending}
                              className="h-7 text-xs px-2.5"
                            >
                              <Send className="w-3 h-3 mr-1" />
                              <span>Submit</span>
                            </Button>
                          )}

                          {(isDraft || isRejected) && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                if (window.confirm('Delete this question draft permanently?')) {
                                  deleteMutation.mutate(q.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              className="h-7 text-xs px-2"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </>
                      )}

                      {isSubmitted && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => withdrawMutation.mutate(q.id)}
                          disabled={withdrawMutation.isPending}
                          className="h-7 text-xs px-2.5 text-amber-700 hover:bg-amber-50"
                        >
                          <Undo2 className="w-3 h-3 mr-1" />
                          <span>Withdraw</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Feedback / Rejection Alert Boxes */}
                  {q.reviewFeedback && (
                    <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Reviewer Feedback:</span>
                        <p className="mt-0.5 text-slate-700 dark:text-slate-300">{q.reviewFeedback}</p>
                      </div>
                    </div>
                  )}

                  {q.rejectionReason && (
                    <div className="p-3 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-900 dark:text-rose-300 flex items-start gap-2.5">
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Rejection Reason:</span>
                        <p className="mt-0.5 text-slate-700 dark:text-slate-300">{q.rejectionReason}</p>
                      </div>
                    </div>
                  )}

                  {/* Question Prompt */}
                  <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {q.question}
                  </div>

                  {/* Options / Rubrics */}
                  {q.type === 'cbt' && q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, idx) => {
                        const isCorrect = opt.trim() === q.correctAnswer.trim();
                        return (
                          <div
                            key={idx}
                            className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium ${
                              isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold'
                                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                                isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="truncate">{opt}</span>
                            {isCorrect && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ml-auto flex-shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.type === 'theory' && (
                    <div className="space-y-2 pt-1 text-xs">
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">
                          Model Answer
                        </span>
                        <p className="text-slate-800 dark:text-slate-200">{q.correctAnswer}</p>
                      </div>

                      {q.gradingPoints && q.gradingPoints.length > 0 && (
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
                            Grading Rubric
                          </span>
                          <div className="space-y-1">
                            {q.gradingPoints.map((gp, gIdx) => (
                              <div key={gIdx} className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                                <span>• {gp.concept}</span>
                                <span className="font-mono font-medium text-slate-500 dark:text-slate-400">{gp.weight} wt</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Explanation Footer */}
                  {q.explanation && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">Explanation:</span> {q.explanation}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Question Modal */}
      <QuestionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveQuestion}
        initialData={editingQuestion}
        courseId={courseId}
        offeringId={offeringId}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['lecturerQuestions', courseId, offeringId] });
          queryClient.invalidateQueries({ queryKey: ['assignedCourseDetails', courseId] });
        }}
        courseId={courseId}
        offeringId={offeringId}
        courseCode={courseCode}
      />

      {/* Printable Paper Modal */}
      <PrintablePaperModal
        isOpen={isPrintPaperOpen}
        onClose={() => setIsPrintPaperOpen(false)}
        offeringId={offeringId || courseId}
        courseCode={courseCode}
        courseTitle={courseTitle}
        questions={questions as any}
      />
    </div>
  );
};

