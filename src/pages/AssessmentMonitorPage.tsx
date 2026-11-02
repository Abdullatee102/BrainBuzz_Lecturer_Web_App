import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage, isForbiddenError, isNotFoundError } from '../lib/api';
import type { AssessmentMonitorData, AssessmentRosterItem } from '../types/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorState } from '../components/ui/ErrorState';
import {
  ArrowLeft,
  Activity,
  Users,
  Wifi,
  WifiOff,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Search,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Send,
  Radio,
  FileQuestion,
  History,
  X,
} from 'lucide-react';

export const AssessmentMonitorPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [forceSubmitTarget, setForceSubmitTarget] = useState<AssessmentRosterItem | null>(null);
  const [forceSubmitReason, setForceSubmitReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Poll live data every 5 seconds
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['assessmentMonitor', assessmentId],
    queryFn: async () => {
      if (!assessmentId) throw new Error('Assessment ID required');
      const res = await apiClient.get<{ status: string; data: AssessmentMonitorData }>(
        `/lecturer/assessments/${assessmentId}/monitor`
      );
      return res.data.data;
    },
    refetchInterval: 5000, // 5s safe polling fallback
  });

  // Force-submit mutation
  const forceSubmitMutation = useMutation({
    mutationFn: async ({ attemptId, reason }: { attemptId: string; reason: string }) => {
      await apiClient.post(
        `/lecturer/assessments/${assessmentId}/attempts/${attemptId}/force-submit`,
        { reason }
      );
    },
    onSuccess: () => {
      setActionSuccess('Student attempt has been force-submitted and recorded in audit log.');
      setActionError(null);
      setForceSubmitTarget(null);
      setForceSubmitReason('');
      queryClient.invalidateQueries({ queryKey: ['assessmentMonitor', assessmentId] });
    },
    onError: (err: any) => {
      setActionError(getErrorMessage(err));
      setActionSuccess(null);
    },
  });

  if (isLoading) {
    return <LoadingSpinner label="Connecting to live examination monitor..." size="lg" className="py-24" />;
  }

  if (isError && isForbiddenError(error)) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white border border-rose-200 rounded-2xl p-8 text-center shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Denied (403 Forbidden)</h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
          You are not actively assigned to this course offering. Live examination monitoring is restricted to assigned academic staff.
        </p>
        <div className="mt-6">
          <Link to="/courses">
            <Button variant="outline" size="md">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span>Return to Assigned Courses</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isError && isNotFoundError(error)) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Assessment Not Found</h2>
        <div className="mt-6">
          <Link to="/courses">
            <Button variant="outline" size="md">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span>Back to Courses</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { assessment, stats, roster, recentEvents } = data;

  const filteredRoster = roster.filter((item) => {
    const matchesSearch =
      item.fullName.toLowerCase().includes(search.toLowerCase()) ||
      item.email.toLowerCase().includes(search.toLowerCase()) ||
      (item.username && item.username.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'NOT_STARTED') return !item.attempt;
    if (statusFilter === 'ONLINE') return item.attempt?.connectionStatus === 'ONLINE';
    if (statusFilter === 'DISCONNECTED') return item.attempt?.connectionStatus === 'DISCONNECTED';
    if (statusFilter === 'SUBMITTED') return item.attempt?.status === 'SUBMITTED';
    if (statusFilter === 'TIMED_OUT') return item.attempt?.status === 'TIMED_OUT';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to={`/courses/${assessment.courseId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span>Back to Course</span>
            </Button>
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-slate-700">Live Monitor Active</span>
            <span className="text-[11px] text-slate-400">(Refreshes every 5s)</span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Refresh Now</span>
        </Button>
      </div>

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {assessment.courseCode}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{assessment.title}</h1>
              <Badge variant="purple" size="sm">{assessment.type}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {assessment.courseTitle} • {assessment.academicSession} ({assessment.semester} Semester)
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600 border-t md:border-t-0 pt-3 md:pt-0">
            <div>
              <span className="block text-[11px] uppercase text-slate-400 font-semibold">Duration</span>
              <span className="font-bold text-slate-800">{assessment.durationMinutes} minutes</span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <span className="block text-[11px] uppercase text-slate-400 font-semibold">Total Marks</span>
              <span className="font-bold text-slate-800">{assessment.totalMarks} marks</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Banners */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-emerald-800 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 font-bold">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between text-rose-800 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-600 font-bold">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Real-time KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Eligible</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalEligibleStudents}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Enrolled students</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Started</span>
              <Activity className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.startedCount}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{stats.unstartedCount} unstarted</p>
          </CardContent>
        </Card>

        <Card className="border border-emerald-200 bg-emerald-50/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Online</span>
              <Wifi className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.activeOnlineCount}</p>
            <p className="text-[10px] text-emerald-600/80 mt-0.5">Active heartbeats</p>
          </CardContent>
        </Card>

        <Card className="border border-amber-200 bg-amber-50/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Disconnected</span>
              <WifiOff className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-700 mt-1">{stats.disconnectedCount}</p>
            <p className="text-[10px] text-amber-600/80 mt-0.5">App bg or network</p>
          </CardContent>
        </Card>

        <Card className="border border-blue-200 bg-blue-50/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">Submitted</span>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-700 mt-1">{stats.submittedCount}</p>
            <p className="text-[10px] text-blue-600/80 mt-0.5">Completed exam</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Timed Out</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-700 mt-1">{stats.timedOutCount}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Auto-finalized</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Roster & Live Stream Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Student Roster (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Student Examination Roster ({filteredRoster.length})
              </h2>

              {/* Status Filter Badges */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                {(['ALL', 'ONLINE', 'DISCONNECTED', 'SUBMITTED', 'NOT_STARTED'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      statusFilter === filter
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filter === 'ALL' ? 'All' : filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student name, email, or matric number..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Progress</th>
                    <th className="py-2.5 px-3">Time Left</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRoster.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                        No students match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRoster.map((item) => {
                      const att = item.attempt;
                      return (
                        <tr key={item.studentId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-900 block truncate max-w-[160px]">
                              {item.fullName}
                            </span>
                            <span className="text-[11px] text-slate-400 block font-mono">
                              {item.username || item.email}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            {!att ? (
                              <Badge variant="default" size="sm">NOT STARTED</Badge>
                            ) : att.status === 'SUBMITTED' ? (
                              <Badge variant="info" size="sm">SUBMITTED</Badge>
                            ) : att.status === 'TIMED_OUT' ? (
                              <Badge variant="default" size="sm">TIMED OUT</Badge>
                            ) : att.connectionStatus === 'ONLINE' ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                Online
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800" title="Application disconnected or network dip; does not mean cheating.">
                                <WifiOff className="w-3 h-3 text-amber-600" />
                                Disconnected
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            {att ? (
                              <div className="space-y-1 w-28">
                                <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                                  <span>{att.answeredCount}/{att.totalQuestionsCount}</span>
                                  <span>
                                    {att.totalQuestionsCount > 0
                                      ? Math.round((att.answeredCount / att.totalQuestionsCount) * 100)
                                      : 0}
                                    %
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-indigo-600 rounded-full transition-all"
                                    style={{
                                      width: `${
                                        att.totalQuestionsCount > 0
                                          ? (att.answeredCount / att.totalQuestionsCount) * 100
                                          : 0
                                      }%`,
                                    }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            {att && att.status === 'IN_PROGRESS' ? (
                              <span className="font-mono text-xs font-semibold text-slate-700">
                                {Math.floor(att.remainingSeconds / 60)}m {att.remainingSeconds % 60}s
                              </span>
                            ) : att && att.submittedAt ? (
                              <span className="text-[11px] text-slate-400">
                                {new Date(att.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right">
                            {att && att.status === 'IN_PROGRESS' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-[11px] py-1 px-2 h-auto"
                                onClick={() => {
                                  setForceSubmitTarget(item);
                                  setForceSubmitReason('');
                                }}
                              >
                                Force Submit
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Live Examination Events Stream (1 col) */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              Live Examination Activity Stream
            </h3>
            <p className="text-[11px] text-slate-500">
              Audit trail of student starts, answer saves, heartbeats, and submissions.
            </p>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {recentEvents.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400 italic">No events logged yet.</p>
              ) : (
                recentEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{evt.studentName}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(evt.serverTimestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                        {evt.eventType}
                      </span>
                      {evt.eventData?.reason && (
                        <span className="text-[11px] text-slate-500 truncate">{evt.eventData.reason}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Force Submit Modal */}
      {forceSubmitTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-rose-600 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              Emergency Force-Submit Attempt
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              You are about to force-submit the ongoing examination for{' '}
              <strong>{forceSubmitTarget.fullName}</strong>. Their currently saved answers will be locked,
              and this emergency action will be recorded in the official audit log.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mandatory Reason for Force-Submission
              </label>
              <textarea
                rows={3}
                value={forceSubmitReason}
                onChange={(e) => setForceSubmitReason(e.target.value)}
                placeholder="e.g., Student left examination hall, verbal walkout, or verified incident..."
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:border-rose-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setForceSubmitTarget(null);
                  setForceSubmitReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={forceSubmitMutation.isPending || !forceSubmitReason.trim()}
                onClick={() => {
                  if (forceSubmitTarget.attempt) {
                    forceSubmitMutation.mutate({
                      attemptId: forceSubmitTarget.attempt.id,
                      reason: forceSubmitReason.trim(),
                    });
                  }
                }}
              >
                {forceSubmitMutation.isPending ? 'Submitting...' : 'Confirm Force-Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

