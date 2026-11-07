import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage, isForbiddenError, isNotFoundError } from '../lib/api';
import type { AssessmentGradebookData, AssessmentGradebookRow } from '../types/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorState } from '../components/ui/ErrorState';
import { formatUserDisplayId } from '../lib/utils';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  Edit3,
  FileText,
  Filter,
  Flag,
  HelpCircle,
  History,
  Lock,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export const AssessmentGradebookPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const queryClient = useQueryClient();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  // Moderation Modal state
  const [moderatingGrade, setModeratingGrade] = useState<AssessmentGradebookRow | null>(null);
  const [newScore, setNewScore] = useState<string>('');
  const [moderationNotes, setModerationNotes] = useState('');
  const [isFlaggedForReview, setIsFlaggedForReview] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [moderationReason, setModerationReason] = useState('');
  const [moderationError, setModerationError] = useState<string | null>(null);

  // Approval Modal state
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Success Feedback state
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Fetch Assessment Gradebook
  const { data, isLoading, isError, error, refetch } = useQuery<{
    status: string;
    data: AssessmentGradebookData;
  }>({
    queryKey: ['assessmentGradebook', assessmentId, page, search, selectedStatus],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit: 50 };
      if (search.trim()) params.search = search.trim();
      if (selectedStatus !== 'ALL') params.status = selectedStatus;

      const res = await apiClient.get<{ status: string; data: AssessmentGradebookData }>(
        `/lecturer/assessments/${assessmentId}/gradebook`,
        { params }
      );
      return res.data;
    },
    enabled: !!assessmentId,
  });

  const gradebook = data?.data;

  // Moderation Mutation
  const moderateMutation = useMutation({
    mutationFn: async ({
      gradeId,
      payload,
    }: {
      gradeId: string;
      payload: {
        newScore?: number;
        isFlaggedForReview?: boolean;
        flagReason?: string;
        moderationNotes?: string;
        reason: string;
      };
    }) => {
      await apiClient.post(
        `/lecturer/assessments/${assessmentId}/grades/${gradeId}/moderate`,
        payload
      );
    },
    onSuccess: () => {
      setModeratingGrade(null);
      setModerationError(null);
      setActionSuccessMessage('Student grade moderated and recorded in audit log successfully.');
      queryClient.invalidateQueries({ queryKey: ['assessmentGradebook', assessmentId] });
    },
    onError: (err: any) => {
      setModerationError(getErrorMessage(err));
    },
  });

  // Submit for Approval Mutation
  const submitApprovalMutation = useMutation({
    mutationFn: async (reason?: string) => {
      await apiClient.post(
        `/lecturer/assessments/${assessmentId}/submit-for-approval`,
        reason ? { overrideIncompleteReason: reason } : {}
      );
    },
    onSuccess: () => {
      setIsApprovalModalOpen(false);
      setApprovalError(null);
      setActionSuccessMessage(
        'Results submitted for administrative approval. The administration will verify and publish results.'
      );
      queryClient.invalidateQueries({ queryKey: ['assessmentGradebook', assessmentId] });
      queryClient.invalidateQueries({ queryKey: ['offeringAssessments'] });
    },
    onError: (err: any) => {
      setApprovalError(getErrorMessage(err));
    },
  });

  const handleOpenModeration = (row: AssessmentGradebookRow) => {
    setModeratingGrade(row);
    setNewScore(String(row.totalScore));
    setModerationNotes(row.moderationNotes || '');
    setIsFlaggedForReview(row.isFlaggedForReview);
    setFlagReason(row.flagReason || '');
    setModerationReason('');
    setModerationError(null);
  };

  const handleModerateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moderatingGrade) return;

    if (!moderationReason.trim() || moderationReason.trim().length < 3) {
      setModerationError('A clear audit reason (minimum 3 characters) is required for moderation.');
      return;
    }

    const parsedScore = Number(newScore);
    if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > moderatingGrade.maxPossibleScore) {
      setModerationError(`Score must be between 0 and maximum possible marks (${moderatingGrade.maxPossibleScore}).`);
      return;
    }

    moderateMutation.mutate({
      gradeId: moderatingGrade.id,
      payload: {
        newScore: parsedScore,
        isFlaggedForReview,
        flagReason: isFlaggedForReview ? flagReason.trim() : undefined,
        moderationNotes: moderationNotes.trim() || undefined,
        reason: moderationReason.trim(),
      },
    });
  };

  const getPublicationBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <Badge variant="success" size="sm">RESULTS PUBLISHED</Badge>;
      case 'APPROVED':
        return <Badge variant="purple" size="sm">APPROVED FOR PUBLICATION</Badge>;
      case 'SUBMITTED_FOR_APPROVAL':
        return <Badge variant="warning" size="sm">PENDING ADMIN APPROVAL</Badge>;
      case 'REJECTED':
        return <Badge variant="danger" size="sm">SUBMISSION RETURNED</Badge>;
      default:
        return <Badge variant="default" size="sm">GRADING IN PROGRESS</Badge>;
    }
  };

  if (isLoading) {
    return <LoadingSpinner label="Loading assessment gradebook & moderation workspace..." size="lg" className="py-24" />;
  }

  if (isError && isForbiddenError(error)) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white border border-rose-200 rounded-2xl p-8 text-center shadow-sm">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Access Denied (403 Forbidden)</h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-2">
          You are not authorized to access this assessment gradebook. Access is restricted to assigned course lecturers.
        </p>
        <div className="mt-6">
          <Link to="/courses">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span>Return to Courses</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isError || !gradebook) {
    return (
      <div className="space-y-4">
        <Link to="/courses">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span>Back</span>
          </Button>
        </Link>
        <ErrorState
          title="Failed to load gradebook"
          message={getErrorMessage(error)}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const { assessment, grades, stats, auditLogs } = gradebook;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link to={`/courses/${assessment.courseId}`}>
          <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span>Back to {assessment.courseCode}</span>
          </Button>
        </Link>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <Link to={`/assessments/${assessment.id}/grading`}>
            <Button variant="outline" size="sm" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
              <Award className="w-3.5 h-3.5 mr-1.5" />
              <span>Grading Desk</span>
            </Button>
          </Link>

          {assessment.resultsPublicationStatus !== 'PUBLISHED' &&
            assessment.resultsPublicationStatus !== 'SUBMITTED_FOR_APPROVAL' &&
            assessment.resultsPublicationStatus !== 'APPROVED' && (
              <Button
                variant="primary"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => {
                  setApprovalError(null);
                  setOverrideReason('');
                  setIsApprovalModalOpen(true);
                }}
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                <span>Submit for Publication Approval</span>
              </Button>
            )}
        </div>
      </div>

      {/* Action Notification Ribbon */}
      {actionSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Rejection Warning Banner if Returned */}
      {assessment.resultsPublicationStatus === 'REJECTED' && assessment.resultsRejectionReason && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start gap-3 text-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-rose-900">Publication Request Returned by Administrator</p>
            <p className="mt-1 text-slate-700 leading-relaxed">
              <span className="font-semibold text-rose-800">Reason:</span> {assessment.resultsRejectionReason}
            </p>
            <p className="mt-2 text-rose-600">
              Please review the flagged evaluations or theory marks below, moderate as necessary, and re-submit for approval.
            </p>
          </div>
        </div>
      )}

      {/* Assessment Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-bold text-lg text-slate-900">{assessment.courseCode}</span>
              <span className="text-slate-400">•</span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{assessment.title}</h1>
              {getPublicationBadge(assessment.resultsPublicationStatus)}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              {assessment.courseTitle} • {assessment.departmentName || 'Academic Department'} • {assessment.academicSession} ({assessment.semester})
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600 border-t lg:border-t-0 pt-3 lg:pt-0">
            <div>
              <span className="block font-semibold text-slate-500">Max Possible</span>
              <span className="text-base font-bold text-slate-900">{assessment.totalMarks} pts</span>
            </div>
            {assessment.passMarks !== null && (
              <div>
                <span className="block font-semibold text-slate-500">Pass Mark</span>
                <span className="text-base font-bold text-emerald-600">{assessment.passMarks} pts</span>
              </div>
            )}
            <div>
              <span className="block font-semibold text-slate-500">Delivery Type</span>
              <Badge variant="default" size="sm">{assessment.type}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Cohort Telemetry Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Submissions</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{stats.totalSubmissions}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Auto-Graded</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{stats.autoGradedCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Pending Theory</p>
            <p className={`text-xl font-bold mt-1 ${stats.needsTheoryCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
              {stats.needsTheoryCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Average Score</p>
            <p className="text-xl font-bold text-indigo-600 mt-1">{stats.averageScore} pts</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Pass Rate</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{stats.passRate}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Flagged Reviews</p>
            <p className={`text-xl font-bold mt-1 ${stats.flaggedCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
              {stats.flaggedCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gradebook Roster Section */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle>Grading Roster & Moderation Table</CardTitle>
            <CardDescription>
              Review question scores, adjust moderated marks, and verify class completion
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student or matric..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="NEEDS_THEORY_GRADING">Pending Theory</option>
              <option value="AUTO_GRADED">Auto-Graded</option>
              <option value="MODERATED">Moderated</option>
              <option value="FLAGGED">Flagged for Review</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {grades.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium">No matching student submissions found.</p>
              <p className="mt-1">Try adjusting your search terms or filter selection.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Matric / ID</th>
                  <th className="py-3 px-4 text-center">CBT</th>
                  <th className="py-3 px-4 text-center">Theory</th>
                  <th className="py-3 px-4 text-center">Total Score</th>
                  <th className="py-3 px-4 text-center">Percentage</th>
                  <th className="py-3 px-4 text-center">Result</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grades.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div>
                        <span>{row.studentName}</span>
                        <span className="block text-[11px] text-slate-400 font-normal">{row.studentEmail}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {row.matricNumber || formatUserDisplayId({ id: row.studentId, role: 'STUDENT' })}
                    </td>

                    <td className="py-3 px-4 text-center font-medium text-slate-700">
                      {row.cbtScore}
                    </td>

                    <td className="py-3 px-4 text-center font-medium text-slate-700">
                      {row.status === 'NEEDS_THEORY_GRADING' ? (
                        <span className="text-amber-600 font-bold">Pending</span>
                      ) : (
                        row.theoryScore
                      )}
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-slate-900">
                      {row.totalScore} / {row.maxPossibleScore}
                    </td>

                    <td className="py-3 px-4 text-center font-semibold text-slate-800">
                      {row.percentage}%
                    </td>

                    <td className="py-3 px-4 text-center">
                      {row.isPassing === null ? (
                        <span className="text-slate-400">—</span>
                      ) : row.isPassing ? (
                        <Badge variant="success" size="sm">PASS</Badge>
                      ) : (
                        <Badge variant="danger" size="sm">FAIL</Badge>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Badge
                          variant={
                            row.status === 'COMPLETED' || row.status === 'AUTO_GRADED'
                              ? 'success'
                              : row.status === 'NEEDS_THEORY_GRADING'
                              ? 'warning'
                              : 'default'
                          }
                          size="sm"
                        >
                          {row.status.replace(/_/g, ' ')}
                        </Badge>
                        {row.isModerated && (
                          <span className="text-[10px] font-semibold text-indigo-600 flex items-center gap-0.5">
                            <ShieldCheck className="w-3 h-3" /> Moderated
                          </span>
                        )}
                        {row.isFlaggedForReview && (
                          <span className="text-[10px] font-bold text-rose-600 flex items-center gap-0.5" title={row.flagReason || 'Flagged for review'}>
                            <Flag className="w-3 h-3" /> Flagged
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        onClick={() => handleOpenModeration(row)}
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                        Moderate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Moderation Drawer / Modal */}
      {moderatingGrade && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Moderate Assessment Grade</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Student: {moderatingGrade.studentName} ({moderatingGrade.matricNumber})
                </p>
              </div>
              <button
                onClick={() => setModeratingGrade(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {moderationError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{moderationError}</span>
              </div>
            )}

            <form onSubmit={handleModerateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <div>
                  <span className="block text-slate-400 font-semibold uppercase text-[10px]">CBT Score</span>
                  <span className="font-bold text-slate-900 text-sm">{moderatingGrade.cbtScore} pts</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-semibold uppercase text-[10px]">Theory Score</span>
                  <span className="font-bold text-slate-900 text-sm">{moderatingGrade.theoryScore} pts</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-semibold uppercase text-[10px]">Current Total</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {moderatingGrade.totalScore} / {moderatingGrade.maxPossibleScore}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400 font-semibold uppercase text-[10px]">Percentage</span>
                  <span className="font-bold text-indigo-600 text-sm">{moderatingGrade.percentage}%</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Adjusted Total Score (Max {moderatingGrade.maxPossibleScore})
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max={moderatingGrade.maxPossibleScore}
                  value={newScore}
                  onChange={(e) => setNewScore(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Moderator Notes (Internal Staff Documentation)
                </label>
                <textarea
                  rows={2}
                  value={moderationNotes}
                  onChange={(e) => setModerationNotes(e.target.value)}
                  placeholder="Record qualitative remarks on this adjustment..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFlaggedForReview}
                    onChange={(e) => setIsFlaggedForReview(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                  />
                  <span>Flag this grade for departmental or external review</span>
                </label>

                {isFlaggedForReview && (
                  <input
                    type="text"
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    placeholder="Specify reason for review flag..."
                    className="w-full px-3 py-1.5 border border-rose-300 bg-rose-50/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs"
                    required
                  />
                )}
              </div>

              <div className="border-t border-slate-100 pt-3">
                <label className="block font-semibold text-slate-800 mb-1">
                  Mandatory Audit Reason <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  placeholder="Why is this grade being adjusted? (Recorded in audit trail)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModeratingGrade(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={moderateMutation.isPending}
                >
                  {moderateMutation.isPending ? 'Recording...' : 'Save Moderated Grade'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval Confirmation Modal */}
      {isApprovalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Submit Results for Approval</h3>
                <p className="text-xs text-slate-500">Official Institutional Verification</p>
              </div>
            </div>

            {approvalError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg">
                {approvalError}
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed">
              Submitting results locks the assessment evaluation roster and notifies the examination office for publication sign-off.
            </p>

            {stats.needsTheoryCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg space-y-2">
                <p className="font-bold">Notice: {stats.needsTheoryCount} submission(s) pending theory grading</p>
                <p>
                  To proceed without evaluating these submissions, an explicit institutional override reason is required.
                </p>
                <textarea
                  rows={2}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="State reason for partial submission..."
                  className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-xs"
                  required
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsApprovalModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={submitApprovalMutation.isPending}
                onClick={() => submitApprovalMutation.mutate(overrideReason || undefined)}
              >
                {submitApprovalMutation.isPending ? 'Submitting...' : 'Confirm Submission'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Historical Audit Trail Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            <CardTitle>Assessment Moderation & Lifecycle Audit History</CardTitle>
          </div>
          <CardDescription>
            Traceable log of all automatic evaluations, manual rubric gradings, moderation adjustments, and approvals
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {auditLogs.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              No audit log entries recorded for this assessment yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-start justify-between gap-3 hover:bg-slate-50/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="purple" size="sm">{log.action.replace(/_/g, ' ')}</Badge>
                      <span className="font-semibold text-slate-800">{log.actorFullName || log.actorRole}</span>
                      <span className="text-[11px] text-slate-400">({log.actorRole})</span>
                    </div>
                    {log.reason && (
                      <p className="text-slate-600">
                        <span className="font-semibold text-slate-700">Reason:</span> {log.reason}
                      </p>
                    )}
                    {log.previousScore !== null && log.newScore !== null && (
                      <p className="text-slate-500 font-mono text-[11px]">
                        Score Adjustment: {log.previousScore} pts → {log.newScore} pts
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
