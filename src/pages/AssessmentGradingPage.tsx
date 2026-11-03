import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage, isForbiddenError } from '../lib/api';
import type {
  LecturerGradingOverviewData,
  LecturerGradingRosterItem,
  AttemptGradingDeskData,
  RubricScoreItem,
} from '../types/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  Award,
  Sparkles,
  BookOpen,
  FileCheck,
  AlertCircle,
  X,
  History,
  HelpCircle,
  Check,
  RotateCcw,
} from 'lucide-react';

export const AssessmentGradingPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  // Evaluation Form State for Active Attempt
  const [questionMarks, setQuestionMarks] = useState<Record<string, number>>({});
  const [questionFeedbacks, setQuestionFeedbacks] = useState<Record<string, string>>({});
  const [gradingReason, setGradingReason] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, any>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  // 1. Fetch Assessment Grading Overview
  const {
    data: overviewData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['assessmentGradingOverview', assessmentId],
    queryFn: async () => {
      if (!assessmentId) throw new Error('Assessment ID is required');
      const res = await apiClient.get<{ status: string; data: LecturerGradingOverviewData }>(
        `/lecturer/assessments/${assessmentId}/grading`
      );
      return res.data.data;
    },
  });

  // 2. Fetch Single Attempt Grading Desk Data
  const {
    data: attemptDeskData,
    isLoading: isAttemptLoading,
    error: attemptError,
  } = useQuery({
    queryKey: ['attemptGradingDesk', assessmentId, selectedAttemptId],
    queryFn: async () => {
      if (!assessmentId || !selectedAttemptId) return null;
      const res = await apiClient.get<{ status: string; data: AttemptGradingDeskData }>(
        `/lecturer/assessments/${assessmentId}/attempts/${selectedAttemptId}/grading`
      );
      return res.data.data;
    },
    enabled: !!selectedAttemptId,
  });

  // Populate local form state when attempt desk data loads
  React.useEffect(() => {
    if (attemptDeskData?.questions) {
      const marksMap: Record<string, number> = {};
      const feedbackMap: Record<string, string> = {};
      for (const q of attemptDeskData.questions) {
        if (q.type === 'theory' && q.grade) {
          marksMap[q.assessmentQuestionId] = q.grade.awardedMarks;
          if (q.grade.feedback) {
            feedbackMap[q.assessmentQuestionId] = q.grade.feedback;
          }
        }
      }
      setQuestionMarks(marksMap);
      setQuestionFeedbacks(feedbackMap);
      setGradingReason('');
      setActionSuccess(null);
      setActionError(null);
      setAiSuggestions({});
    }
  }, [attemptDeskData]);

  // 3. Mutation: Save Theory Grades
  const saveGradesMutation = useMutation({
    mutationFn: async () => {
      if (!assessmentId || !selectedAttemptId || !attemptDeskData) return;

      const theoryQuestions = attemptDeskData.questions.filter((q) => q.type === 'theory');
      const payloadGrades = theoryQuestions.map((q) => {
        const marks = questionMarks[q.assessmentQuestionId] ?? 0;
        return {
          assessmentQuestionId: q.assessmentQuestionId,
          awardedMarks: marks,
          feedback: questionFeedbacks[q.assessmentQuestionId] || undefined,
        };
      });

      await apiClient.post(
        `/lecturer/assessments/${assessmentId}/attempts/${selectedAttemptId}/grade-theory`,
        {
          questionGrades: payloadGrades,
          reason: gradingReason.trim() || undefined,
        }
      );
    },
    onSuccess: () => {
      setActionSuccess('Theory evaluation saved successfully. Grade recalculated and audit log recorded.');
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['assessmentGradingOverview', assessmentId] });
      queryClient.invalidateQueries({ queryKey: ['attemptGradingDesk', assessmentId, selectedAttemptId] });
    },
    onError: (err: any) => {
      setActionError(getErrorMessage(err));
      setActionSuccess(null);
    },
  });

  // 4. Mutation: Fetch AI Rubric Suggestion
  const fetchAiAssist = async (assessmentQuestionId: string) => {
    if (!assessmentId || !selectedAttemptId) return;
    setAiLoading((prev) => ({ ...prev, [assessmentQuestionId]: true }));
    try {
      const res = await apiClient.post<{ status: string; data: any }>(
        `/lecturer/assessments/${assessmentId}/attempts/${selectedAttemptId}/questions/${assessmentQuestionId}/ai-assist`
      );
      setAiSuggestions((prev) => ({ ...prev, [assessmentQuestionId]: res.data.data }));
    } catch (err: any) {
      alert(`AI Suggestion error: ${getErrorMessage(err)}`);
    } finally {
      setAiLoading((prev) => ({ ...prev, [assessmentQuestionId]: false }));
    }
  };

  if (isLoading) {
    return <LoadingSpinner label="Loading assessment grading desk..." size="lg" className="py-24" />;
  }

  if (isError && isForbiddenError(error)) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white border border-rose-200 rounded-2xl p-8 text-center shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Denied (403 Forbidden)</h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
          You are not actively assigned to this course offering. Formal grading is restricted to authorized academic staff.
        </p>
        <div className="mt-6">
          <Link to="/courses">
            <Button variant="outline" size="md">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Assigned Courses
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isError || !overviewData) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Failed to Load Grading Workspace</h2>
        <p className="text-xs text-slate-600 mt-1">{getErrorMessage(error)}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const { assessment, stats, roster } = overviewData;

  // Filter roster
  const filteredRoster = roster.filter((item) => {
    const nameMatch =
      item.student.fullName.toLowerCase().includes(search.toLowerCase()) ||
      item.student.email.toLowerCase().includes(search.toLowerCase()) ||
      (item.student.username && item.student.username.toLowerCase().includes(search.toLowerCase()));

    if (!nameMatch) return false;

    if (statusFilter === 'ALL') return true;
    const gStatus = item.grade?.status || 'PENDING_GRADING';
    return gStatus === statusFilter;
  });

  const getGradingStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'AUTO_GRADED':
        return <Badge variant="info">Auto-Graded (CBT)</Badge>;
      case 'NEEDS_THEORY_GRADING':
        return <Badge variant="warning">Needs Theory Grading</Badge>;
      case 'PARTIALLY_GRADED':
        return <Badge variant="purple">Partially Graded</Badge>;
      default:
        return <Badge variant="default">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/courses" className="hover:text-indigo-600 transition-colors">
              Courses
            </Link>
            <span>/</span>
            <span>Assessments</span>
            <span>/</span>
            <span className="text-slate-700 font-medium">Formal Grading Desk</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{assessment.title}</h1>
            <Badge variant="purple">{assessment.type}</Badge>
            <Badge variant="default">Total Marks: {assessment.totalMarks}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/assessments/${assessment.id}/monitor`}>
            <Button variant="outline" size="sm">
              <Clock className="w-4 h-4 mr-1.5 text-slate-500" />
              Live Monitor
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RotateCcw className={`w-4 h-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4 border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Submissions</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalSubmitted}</p>
        </Card>
        <Card className="p-4 border-slate-200">
          <p className="text-[11px] font-semibold text-sky-600 uppercase tracking-wider">Auto-Graded</p>
          <p className="text-2xl font-bold text-sky-700 mt-1">{stats.autoGradedCount}</p>
        </Card>
        <Card className="p-4 border-slate-200">
          <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Needs Theory</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stats.needsTheoryCount}</p>
        </Card>
        <Card className="p-4 border-slate-200">
          <p className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">Partial</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">{stats.partiallyGradedCount}</p>
        </Card>
        <Card className="p-4 border-slate-200">
          <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.completedCount}</p>
        </Card>
        <Card className="p-4 border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Avg Score</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {stats.averageScore !== null ? `${stats.averageScore}` : '—'}
          </p>
        </Card>
      </div>

      {/* Roster Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search students by name, email, or matric number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Grading States</option>
            <option value="NEEDS_THEORY_GRADING">Needs Theory Grading</option>
            <option value="PARTIALLY_GRADED">Partially Graded</option>
            <option value="AUTO_GRADED">Auto-Graded (CBT)</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Submissions Roster */}
      <Card className="border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Attempt</th>
                <th className="py-3 px-4">Submitted At</th>
                <th className="py-3 px-4">CBT Score</th>
                <th className="py-3 px-4">Theory Score</th>
                <th className="py-3 px-4">Total Score</th>
                <th className="py-3 px-4">Grading Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    No student submissions matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRoster.map((item) => {
                  const g = item.grade;
                  const gStatus = g?.status || 'PENDING_GRADING';

                  return (
                    <tr key={item.attemptId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div>{item.student.fullName}</div>
                        <div className="text-[11px] text-slate-400 font-normal">
                          {item.student.username ? `${item.student.username} • ` : ''}
                          {item.student.email}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        Attempt #{item.attemptNumber}
                        {item.isLate && <span className="ml-1.5 text-[10px] text-amber-600 font-medium">(Late)</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {item.submittedAt
                          ? new Date(item.submittedAt).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: 'short',
                            })
                          : '—'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {g ? `${g.cbtScore}` : '—'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {g ? `${g.theoryScore}` : '—'}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {g ? `${g.totalScore} / ${g.maxPossibleScore}` : '—'}
                      </td>
                      <td className="py-3 px-4">{getGradingStatusBadge(gStatus)}</td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant={gStatus === 'NEEDS_THEORY_GRADING' ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedAttemptId(item.attemptId)}
                        >
                          <BookOpen className="w-3.5 h-3.5 mr-1" />
                          {gStatus === 'NEEDS_THEORY_GRADING' ? 'Grade Theory' : 'View / Edit'}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Attempt Evaluation Desk Modal / Drawer */}
      {selectedAttemptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  Grading Desk: {attemptDeskData?.attempt.student.fullName || 'Student Attempt'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {attemptDeskData?.attempt.student.username ? `${attemptDeskData.attempt.student.username} • ` : ''}
                  {attemptDeskData?.attempt.student.email} • Attempt #{attemptDeskData?.attempt.attemptNumber}
                  {attemptDeskData?.attempt.isLate && ' (Late submission)'}
                </p>
              </div>
              <button
                onClick={() => setSelectedAttemptId(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {isAttemptLoading ? (
                <LoadingSpinner label="Loading attempt questions and rubrics..." size="md" className="py-12" />
              ) : attemptError ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {getErrorMessage(attemptError)}
                </div>
              ) : attemptDeskData ? (
                <>
                  {/* Current Score Ribbon */}
                  <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-[10px] font-semibold text-indigo-600 uppercase">CBT Score</p>
                        <p className="text-lg font-bold text-slate-900">{attemptDeskData.grade?.cbtScore ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-indigo-600 uppercase">Theory Score</p>
                        <p className="text-lg font-bold text-slate-900">{attemptDeskData.grade?.theoryScore ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-indigo-600 uppercase">Total Marks</p>
                        <p className="text-lg font-extrabold text-indigo-900">
                          {attemptDeskData.grade?.totalScore ?? 0} / {attemptDeskData.grade?.maxPossibleScore ?? 0}
                        </p>
                      </div>
                    </div>
                    <div>{getGradingStatusBadge(attemptDeskData.grade?.status || 'PENDING_GRADING')}</div>
                  </div>

                  {actionSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{actionSuccess}</span>
                    </div>
                  )}

                  {actionError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  {/* Questions List */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-indigo-600" />
                      Examination Responses & Rubric Evaluation
                    </h4>

                    {attemptDeskData.questions.map((q, idx) => {
                      const isTheory = q.type === 'theory';
                      const currentAwarded = questionMarks[q.assessmentQuestionId] ?? (q.grade?.awardedMarks || 0);
                      const currentFeedback = questionFeedbacks[q.assessmentQuestionId] ?? (q.grade?.feedback || '');
                      const suggestion = aiSuggestions[q.assessmentQuestionId];

                      return (
                        <div
                          key={q.assessmentQuestionId}
                          className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 hover:border-slate-300 transition-colors"
                        >
                          {/* Question Top Header */}
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-800">Question {idx + 1}</span>
                              <Badge variant={isTheory ? 'purple' : 'info'} size="sm">
                                {q.type.toUpperCase()}
                              </Badge>
                              <span className="text-[11px] text-slate-500 font-medium">
                                ({q.allocatedMarks} mark{q.allocatedMarks !== 1 ? 's' : ''})
                              </span>
                            </div>
                            <div>
                              {isTheory ? (
                                <Badge variant={q.grade?.gradedBy ? 'success' : 'warning'} size="sm">
                                  {q.grade?.gradedBy ? 'Evaluated' : 'Needs Evaluation'}
                                </Badge>
                              ) : (
                                <Badge variant={q.grade?.isCorrect ? 'success' : 'danger'} size="sm">
                                  {q.grade?.isCorrect ? 'Correct' : 'Incorrect'} ({q.grade?.awardedMarks ?? 0}m)
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Question Prompt */}
                          <p className="text-xs font-medium text-slate-800 whitespace-pre-wrap">{q.question}</p>

                          {/* Student's Answer */}
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                              Student&apos;s Submitted Response:
                            </span>
                            {q.studentAnswer && q.studentAnswer.trim() ? (
                              <p className="text-xs text-slate-900 whitespace-pre-wrap font-mono">
                                {q.studentAnswer}
                              </p>
                            ) : (
                              <p className="text-xs text-slate-400 italic">No response submitted for this question.</p>
                            )}
                          </div>

                          {/* Authoritative Model Answer & Explanation */}
                          <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/70 text-xs">
                            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-0.5">
                              Model Answer / Solution Key:
                            </span>
                            <p className="text-amber-950 font-medium">{q.correctAnswer}</p>
                            {q.explanation && (
                              <p className="text-[11px] text-amber-800/90 mt-1 italic">{q.explanation}</p>
                            )}
                          </div>

                          {/* Theory Rubric Section */}
                          {isTheory && (
                            <div className="space-y-3 pt-2 border-t border-slate-100">
                              {/* Rubric Criteria Table */}
                              {q.gradingPoints && q.gradingPoints.length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[11px] font-semibold text-slate-700 block">
                                    Scoring Rubric Criteria:
                                  </span>
                                  <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                                    <table className="w-full text-left">
                                      <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-semibold border-b border-slate-200">
                                        <tr>
                                          <th className="py-1.5 px-3">Criterion / Core Concept</th>
                                          <th className="py-1.5 px-3">Aliases / Keywords</th>
                                          <th className="py-1.5 px-3 text-right">Max Weight</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {q.gradingPoints.map((pt, pIdx) => (
                                          <tr key={pIdx}>
                                            <td className="py-1.5 px-3 font-medium text-slate-800">{pt.concept}</td>
                                            <td className="py-1.5 px-3 text-slate-500 text-[11px]">
                                              {pt.aliases && pt.aliases.length > 0 ? pt.aliases.join(', ') : '—'}
                                            </td>
                                            <td className="py-1.5 px-3 text-right font-semibold text-slate-700">
                                              {pt.weight}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* AI Assistance Preview */}
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={aiLoading[q.assessmentQuestionId]}
                                  onClick={() => fetchAiAssist(q.assessmentQuestionId)}
                                  className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                >
                                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                                  {aiLoading[q.assessmentQuestionId] ? 'Analyzing with AI...' : 'AI Rubric Assistant'}
                                </Button>
                              </div>

                              {suggestion && (
                                <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-lg text-xs space-y-1 text-purple-950">
                                  <div className="flex items-center justify-between font-bold text-[11px] text-purple-800">
                                    <span>AI Suggested Score: {suggestion.suggestedScore} / {suggestion.allocatedMarks}</span>
                                    <span className="text-[10px] font-normal uppercase">(Provisional Suggestion Only)</span>
                                  </div>
                                  <div className="text-[11px]">
                                    <strong>Matched Concepts:</strong>{' '}
                                    {suggestion.matchedConcepts?.length ? suggestion.matchedConcepts.join(', ') : 'None'}
                                  </div>
                                  <div className="text-[11px]">
                                    <strong>Missing Concepts:</strong>{' '}
                                    {suggestion.missingConcepts?.length ? suggestion.missingConcepts.join(', ') : 'None'}
                                  </div>
                                  <p className="text-[11px] italic text-purple-800">{suggestion.suggestedFeedback}</p>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-purple-700 hover:bg-purple-100/80 text-[11px] h-6 px-2"
                                    onClick={() => {
                                      setQuestionMarks((prev) => ({
                                        ...prev,
                                        [q.assessmentQuestionId]: suggestion.suggestedScore,
                                      }));
                                      if (suggestion.suggestedFeedback) {
                                        setQuestionFeedbacks((prev) => ({
                                          ...prev,
                                          [q.assessmentQuestionId]: suggestion.suggestedFeedback,
                                        }));
                                      }
                                    }}
                                  >
                                    Adopt AI Suggestion
                                  </Button>
                                </div>
                              )}

                              {/* Lecturer Score Input & Feedback */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    Awarded Marks (Max: {q.allocatedMarks})
                                  </label>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max={q.allocatedMarks}
                                    value={currentAwarded}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setQuestionMarks((prev) => ({
                                        ...prev,
                                        [q.assessmentQuestionId]: val,
                                      }));
                                    }}
                                    className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>

                                <div className="sm:col-span-2">
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    Qualitative Feedback for Student
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Add constructive notes or pointers..."
                                    value={currentFeedback}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setQuestionFeedbacks((prev) => ({
                                        ...prev,
                                        [q.assessmentQuestionId]: val,
                                      }));
                                    }}
                                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Audit Trail Section */}
                  {attemptDeskData.auditLogs && attemptDeskData.auditLogs.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-slate-200">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <History className="w-4 h-4 text-slate-500" />
                        Grading Audit History
                      </h4>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {attemptDeskData.auditLogs.map((log) => (
                          <div
                            key={log.id}
                            className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center justify-between"
                          >
                            <div>
                              <span className="font-semibold text-slate-800">{log.action}: </span>
                              <span>
                                {log.previousScore !== null ? `${log.previousScore} -> ` : ''}
                                <strong>{log.newScore}</strong> marks
                              </span>
                              {log.reason && <span className="text-slate-500"> ({log.reason})</span>}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {log.actorFullName ? `${log.actorFullName} • ` : ''}
                              {new Date(log.createdAt).toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: 'short',
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Re-evaluation reason input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reason for Grading or Score Adjustment (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Regular theory marking session or Rubric re-check"
                      value={gradingReason}
                      onChange={(e) => setGradingReason(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setSelectedAttemptId(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={saveGradesMutation.isPending || isAttemptLoading}
                onClick={() => saveGradesMutation.mutate()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Check className="w-4 h-4 mr-1.5" />
                {saveGradesMutation.isPending ? 'Saving Evaluation...' : 'Save Theory Evaluation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

