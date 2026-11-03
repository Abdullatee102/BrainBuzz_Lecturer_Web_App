import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '../../lib/api';
import type { AssessmentItem } from '../../types/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { AssessmentModal } from './AssessmentModal';
import { QuestionPickerModal } from './QuestionPickerModal';
import {
  Calendar,
  Clock,
  Plus,
  Send,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  XCircle,
  HelpCircle,
  Layers,
  FileQuestion,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  CalendarClock,
  Sparkles,
  Activity,
  Award,
} from 'lucide-react';

interface AssessmentsSectionProps {
  offeringId: string;
  courseId: string;
  courseCode: string;
  courseTitle?: string;
}

export const AssessmentsSection: React.FC<AssessmentsSectionProps> = ({
  offeringId,
  courseId,
  courseCode,
  courseTitle,
}) => {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<AssessmentItem | null>(null);

  // Question Picker Modal state
  const [questionPickerAssessment, setQuestionPickerAssessment] = useState<AssessmentItem | null>(null);

  // Reschedule & Extend Modals
  const [rescheduleAssessment, setRescheduleAssessment] = useState<AssessmentItem | null>(null);
  const [rescheduleStart, setRescheduleStart] = useState('');
  const [rescheduleEnd, setRescheduleEnd] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  const [extendAssessment, setExtendAssessment] = useState<AssessmentItem | null>(null);
  const [extendEnd, setExtendEnd] = useState('');
  const [extendReason, setExtendReason] = useState('');

  const [cancelAssessment, setCancelAssessment] = useState<AssessmentItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedAssessmentId, setExpandedAssessmentId] = useState<string | null>(null);

  // Fetch assessments for offering
  const {
    data: assessmentsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['offeringAssessments', offeringId],
    queryFn: async () => {
      const response = await apiClient.get<{
        status: string;
        data: AssessmentItem[];
      }>(`/lecturer/offerings/${offeringId}/assessments`);
      return response.data.data || [];
    },
    enabled: !!offeringId,
  });

  const assessments: AssessmentItem[] = assessmentsData || [];

  // Mutations
  const publishMutation = useMutation({
    mutationFn: async (assessmentId: string) => {
      await apiClient.post(`/lecturer/assessments/${assessmentId}/publish`);
    },
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['offeringAssessments', offeringId] });
      queryClient.invalidateQueries({ queryKey: ['assignedCourseDetails', courseId] });
    },
    onError: (err: any) => {
      setActionError(getErrorMessage(err));
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async ({
      id,
      startTime,
      endTime,
      reason,
    }: {
      id: string;
      startTime: string;
      endTime: string;
      reason: string;
    }) => {
      await apiClient.post(`/lecturer/assessments/${id}/reschedule`, {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        reason,
      });
    },
    onSuccess: () => {
      setActionError(null);
      setRescheduleAssessment(null);
      queryClient.invalidateQueries({ queryKey: ['offeringAssessments', offeringId] });
    },
    onError: (err: any) => {
      setActionError(getErrorMessage(err));
    },
  });

  const extendMutation = useMutation({
    mutationFn: async ({
      id,
      endTime,
      reason,
    }: {
      id: string;
      endTime: string;
      reason: string;
    }) => {
      await apiClient.post(`/lecturer/assessments/${id}/extend`, {
        endTime: new Date(endTime).toISOString(),
        reason,
      });
    },
    onSuccess: () => {
      setActionError(null);
      setExtendAssessment(null);
      queryClient.invalidateQueries({ queryKey: ['offeringAssessments', offeringId] });
    },
    onError: (err: any) => {
      setActionError(getErrorMessage(err));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await apiClient.post(`/lecturer/assessments/${id}/cancel`, { reason });
    },
    onSuccess: () => {
      setActionError(null);
      setCancelAssessment(null);
      queryClient.invalidateQueries({ queryKey: ['offeringAssessments', offeringId] });
    },
    onError: (err: any) => {
      setActionError(getErrorMessage(err));
    },
  });

  const filteredAssessments = assessments.filter((a) => {
    if (selectedStatus === 'ALL') return true;
    return a.status === selectedStatus;
  });

  const formatWAT = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-GB', {
        timeZone: 'Africa/Lagos',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WAT';
    } catch {
      return dateStr;
    }
  };

  const getOperationalStatusBadge = (item: AssessmentItem) => {
    if (item.status === 'CANCELLED') {
      return <Badge variant="danger" size="sm">CANCELLED</Badge>;
    }
    if (item.status === 'DRAFT') {
      return <Badge variant="warning" size="sm">DRAFT</Badge>;
    }
    const now = new Date();
    const start = new Date(item.startTime);
    const end = new Date(item.endTime);

    if (now < start) {
      return <Badge variant="info" size="sm">SCHEDULED</Badge>;
    } else if (now >= start && now <= end) {
      return <Badge variant="success" size="sm">OPEN / ACTIVE</Badge>;
    } else {
      return <Badge variant="default" size="sm">CLOSED</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Action error banner */}
      {actionError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
          <div className="flex-1">
            <span className="font-semibold">Action Failed: </span>
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-500 hover:text-rose-700 text-xs font-bold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-indigo-600" />
            Official Academic Assessments
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Author, schedule, and publish official CBT and Theory assessments for this course offering.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditingAssessment(null);
            setIsAssessmentModalOpen(true);
          }}
          className="self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Assessment
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-medium">
        {(['ALL', 'DRAFT', 'PUBLISHED', 'CANCELLED'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setSelectedStatus(st)}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              selectedStatus === st
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {st === 'ALL' ? 'All Assessments' : st}
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200/50 text-slate-700">
              {st === 'ALL'
                ? assessments.length
                : assessments.filter((a) => a.status === st).length}
            </span>
          </button>
        ))}
      </div>

      {/* Assessment List */}
      {isLoading ? (
        <LoadingSpinner label="Loading assessments..." size="md" className="py-12" />
      ) : isError ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center text-rose-800">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-600" />
          <h3 className="font-bold">Failed to load assessments</h3>
          <p className="text-xs text-rose-600 mt-1">{getErrorMessage(error)}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <CalendarClock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800">No assessments found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {selectedStatus === 'ALL'
              ? 'No assessments have been created for this offering yet. Click Create Assessment above to get started.'
              : `No assessments with status "${selectedStatus}" found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAssessments.map((item) => {
            const isExpanded = expandedAssessmentId === item.id;
            const now = new Date();
            const start = new Date(item.startTime);
            const end = new Date(item.endTime);
            const isBeforeStart = now < start;
            const isOpen = now >= start && now <= end;

            return (
              <Card key={item.id} className="border border-slate-200 hover:border-slate-300 transition-colors">
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left Meta */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                        <Badge variant="purple" size="sm">{item.type}</Badge>
                        {getOperationalStatusBadge(item)}
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-[11px] text-slate-500 flex-wrap pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {item.durationMinutes} minutes
                        </span>
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          {item.questionCount ?? (item.questions?.length || 0)} Questions
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          Total Marks: {item.totalMarks}
                          {item.passMarks ? ` (Pass: ${item.passMarks})` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-slate-500 flex-wrap">
                        <span>
                          <strong className="text-slate-700">Window:</strong> {formatWAT(item.startTime)} — {formatWAT(item.endTime)}
                        </span>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 flex-wrap self-start lg:self-center border-t lg:border-t-0 pt-3 lg:pt-0">
                      {/* DRAFT Actions */}
                      {item.status === 'DRAFT' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingAssessment(item);
                              setIsAssessmentModalOpen(true);
                            }}
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1" />
                            Edit
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuestionPickerAssessment(item)}
                          >
                            <FileQuestion className="w-3.5 h-3.5 mr-1" />
                            Questions ({item.questionCount ?? (item.questions?.length || 0)})
                          </Button>

                          <Button
                            variant="primary"
                            size="sm"
                            disabled={publishMutation.isPending}
                            onClick={() => {
                              if (confirm(`Publish "${item.title}"? Question snapshots will be permanently frozen.`)) {
                                publishMutation.mutate(item.id);
                              }
                            }}
                          >
                            <Send className="w-3.5 h-3.5 mr-1" />
                            Publish
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => {
                              setCancelAssessment(item);
                              setCancelReason('');
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Cancel
                          </Button>
                        </>
                      )}

                      {/* PUBLISHED Actions */}
                      {item.status === 'PUBLISHED' && (
                        <>
                          <Link to={`/assessments/${item.id}/grading`}>
                            <Button
                              variant="primary"
                              size="sm"
                              className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                              <Award className="w-3.5 h-3.5 mr-1" />
                              Grading Desk
                            </Button>
                          </Link>

                          <Link to={`/assessments/${item.id}/monitor`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                            >
                              <Activity className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                              Live Monitor
                            </Button>
                          </Link>

                          {isBeforeStart && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRescheduleAssessment(item);
                                try {
                                  setRescheduleStart(new Date(item.startTime).toISOString().slice(0, 16));
                                  setRescheduleEnd(new Date(item.endTime).toISOString().slice(0, 16));
                                } catch {}
                                setRescheduleReason('');
                              }}
                            >
                              <Calendar className="w-3.5 h-3.5 mr-1" />
                              Reschedule
                            </Button>
                          )}

                          {isOpen && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setExtendAssessment(item);
                                try {
                                  setExtendEnd(new Date(item.endTime).toISOString().slice(0, 16));
                                } catch {}
                                setExtendReason('');
                              }}
                            >
                              <Clock className="w-3.5 h-3.5 mr-1" />
                              Extend
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => {
                              setCancelAssessment(item);
                              setCancelReason('');
                            }}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Cancel
                          </Button>
                        </>
                      )}

                      {/* Expand / Details Toggle */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedAssessmentId(isExpanded ? null : item.id)
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details Drawer */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 bg-slate-50/70 -mx-5 -mb-5 p-5 rounded-b-xl">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="font-semibold text-slate-500 block">Assessment ID:</span>
                          <span className="font-mono text-slate-700 break-all">{item.id}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-500 block">Release Policy:</span>
                          <span className="text-slate-800">{item.resultReleasePolicy}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-500 block">Randomized:</span>
                          <span className="text-slate-800">{item.isRandomized ? 'Yes (Questions & Options)' : 'No (Sequential)'}</span>
                        </div>
                      </div>

                      {item.cancellationReason && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                          <strong>Cancellation Reason:</strong> {item.cancellationReason}
                        </div>
                      )}

                      {item.questions && item.questions.length > 0 && (
                        <div className="mt-2">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                            Assigned Questions ({item.questions.length})
                          </h4>
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {item.questions.map((q, idx) => (
                              <div
                                key={q.id || idx}
                                className="bg-white p-3 rounded-lg border border-slate-200 text-xs flex items-start justify-between gap-3 shadow-xs"
                              >
                                <div>
                                  <span className="font-semibold text-slate-900 mr-2">Q{idx + 1}.</span>
                                  <span className="text-slate-700">{q.question}</span>
                                </div>
                                <span className="font-bold text-indigo-600 whitespace-nowrap">
                                  {q.allocatedMarks} marks
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isAssessmentModalOpen && (
        <AssessmentModal
          isOpen={isAssessmentModalOpen}
          onClose={() => {
            setIsAssessmentModalOpen(false);
            setEditingAssessment(null);
          }}
          offeringId={offeringId}
          courseId={courseId}
          courseCode={courseCode}
          assessmentToEdit={editingAssessment}
        />
      )}

      {/* Question Picker Modal */}
      {questionPickerAssessment && (
        <QuestionPickerModal
          isOpen={!!questionPickerAssessment}
          onClose={() => setQuestionPickerAssessment(null)}
          assessmentId={questionPickerAssessment.id}
          courseId={courseId}
          courseCode={courseCode}
          alreadyAssigned={questionPickerAssessment.questions?.map((q) => ({
            questionId: q.questionId,
            allocatedMarks: q.allocatedMarks,
            orderIndex: q.orderIndex,
          }))}
        />
      )}

      {/* Reschedule Modal */}
      {rescheduleAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Reschedule Assessment
            </h3>
            <p className="text-xs text-slate-500">
              Update the availability window for &quot;{rescheduleAssessment.title}&quot;. Enrolled students will receive real-time push notifications.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Start Time</label>
                <input
                  type="datetime-local"
                  value={rescheduleStart}
                  onChange={(e) => setRescheduleStart(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New End Time</label>
                <input
                  type="datetime-local"
                  value={rescheduleEnd}
                  onChange={(e) => setRescheduleEnd(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Rescheduling</label>
                <textarea
                  rows={2}
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g., Timetable adjustment"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setRescheduleAssessment(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={rescheduleMutation.isPending || !rescheduleStart || !rescheduleEnd || !rescheduleReason.trim()}
                onClick={() => {
                  rescheduleMutation.mutate({
                    id: rescheduleAssessment.id,
                    startTime: rescheduleStart,
                    endTime: rescheduleEnd,
                    reason: rescheduleReason,
                  });
                }}
              >
                {rescheduleMutation.isPending ? 'Rescheduling...' : 'Confirm Reschedule'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Deadline Modal */}
      {extendAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              Extend Closing Deadline
            </h3>
            <p className="text-xs text-slate-500">
              Extend the closing time for active assessment &quot;{extendAssessment.title}&quot;.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Closing Time (End Time)</label>
                <input
                  type="datetime-local"
                  value={extendEnd}
                  onChange={(e) => setExtendEnd(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Extension</label>
                <textarea
                  rows={2}
                  value={extendReason}
                  onChange={(e) => setExtendReason(e.target.value)}
                  placeholder="e.g., Extended due to network outage"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setExtendAssessment(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={extendMutation.isPending || !extendEnd || !extendReason.trim()}
                onClick={() => {
                  extendMutation.mutate({
                    id: extendAssessment.id,
                    endTime: extendEnd,
                    reason: extendReason,
                  });
                }}
              >
                {extendMutation.isPending ? 'Extending...' : 'Confirm Extension'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Assessment Modal */}
      {cancelAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-rose-600 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              Cancel Assessment
            </h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to cancel &quot;{cancelAssessment.title}&quot;? This will mark the assessment as cancelled and record an audit log.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cancellation Reason</label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason is required for auditing..."
                className="w-full text-xs border border-slate-300 rounded-lg p-2"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setCancelAssessment(null)}>
                Keep Assessment
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={cancelMutation.isPending || !cancelReason.trim()}
                onClick={() => {
                  cancelMutation.mutate({
                    id: cancelAssessment.id,
                    reason: cancelReason,
                  });
                }}
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

