import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '../../lib/api';
import type {
  AttendanceSessionItem,
  OfferingAttendanceSummaryResponse,
  AttendanceSessionType,
  AttendanceSessionStatus,
  StudentAttendanceSummaryItem,
  StudentAttendanceHistoryResponse,
} from '../../types/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorState } from '../ui/ErrorState';
import {
  CalendarCheck,
  Plus,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  Search,
  BookOpen,
  History,
  X,
  XCircle,
  UserCheck,
  Percent,
} from 'lucide-react';
import { TakeAttendanceModal } from './TakeAttendanceModal';

interface AttendanceSectionProps {
  offeringId: string;
  courseCode: string;
  courseTitle: string;
}

export const AttendanceSection: React.FC<AttendanceSectionProps> = ({
  offeringId,
  courseCode,
  courseTitle,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'sessions' | 'students'>('sessions');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState<string>('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedStudentHistoryId, setSelectedStudentHistoryId] = useState<string | null>(null);

  // New session form state
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<AttendanceSessionType>('LECTURE');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('11:00');
  const [newNotes, setNewNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch offering summary
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useQuery<{ status: string; data: OfferingAttendanceSummaryResponse }>({
    queryKey: ['offeringAttendanceSummary', offeringId],
    queryFn: async () => {
      const res = await apiClient.get(`/lecturer/offerings/${offeringId}/attendance/summary`);
      return res.data;
    },
    enabled: !!offeringId,
  });

  // Fetch sessions list
  const {
    data: sessionsData,
    isLoading: isSessionsLoading,
    isError: isSessionsError,
    error: sessionsError,
    refetch: refetchSessions,
  } = useQuery<{
    status: string;
    data: {
      sessions: AttendanceSessionItem[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    };
  }>({
    queryKey: ['offeringAttendanceSessions', offeringId, statusFilter],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 50 };
      if (statusFilter) params.status = statusFilter;
      const res = await apiClient.get(`/lecturer/offerings/${offeringId}/attendance/sessions`, {
        params,
      });
      return res.data;
    },
    enabled: !!offeringId,
  });

  // Student history query
  const { data: studentHistoryData, isLoading: isHistoryLoading } = useQuery<{
    status: string;
    data: StudentAttendanceHistoryResponse;
  }>({
    queryKey: ['studentAttendanceHistory', offeringId, selectedStudentHistoryId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/lecturer/offerings/${offeringId}/attendance/students/${selectedStudentHistoryId}/history`
      );
      return res.data;
    },
    enabled: !!offeringId && !!selectedStudentHistoryId,
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: newTitle.trim(),
        sessionType: newType,
        sessionDate: newDate,
        startTime: newStartTime.trim() || undefined,
        endTime: newEndTime.trim() || undefined,
        notes: newNotes.trim() || undefined,
      };
      const res = await apiClient.post(
        `/lecturer/offerings/${offeringId}/attendance/sessions`,
        payload
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offeringAttendanceSessions', offeringId] });
      queryClient.invalidateQueries({ queryKey: ['offeringAttendanceSummary', offeringId] });
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewNotes('');
      setFormError(null);
    },
    onError: (err) => {
      setFormError(getErrorMessage(err));
    },
  });

  // Update session status mutation (Close / Cancel)
  const updateSessionMutation = useMutation({
    mutationFn: async ({
      sessionId,
      status,
    }: {
      sessionId: string;
      status: AttendanceSessionStatus;
    }) => {
      const res = await apiClient.patch(
        `/lecturer/offerings/${offeringId}/attendance/sessions/${sessionId}`,
        { status }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offeringAttendanceSessions', offeringId] });
      queryClient.invalidateQueries({ queryKey: ['offeringAttendanceSummary', offeringId] });
    },
  });

  const metrics = summaryData?.data?.metrics;
  const sessions = sessionsData?.data?.sessions || [];
  const students = summaryData?.data?.students || [];

  const filteredStudents = students.filter(
    (st) =>
      st.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (st.username && st.username.toLowerCase().includes(studentSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            <span>Attendance Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Class attendance records, roster tracking, and participation analytics for {courseCode}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setFormError(null);
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Attendance Session</span>
        </Button>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Sessions Held
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {isSummaryLoading ? '...' : metrics?.totalSessions ?? 0}
              </p>
              <p className="text-[10px] text-slate-500">Active recorded sessions</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Enrolled Students
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {isSummaryLoading ? '...' : metrics?.enrolledStudentsCount ?? 0}
              </p>
              <p className="text-[10px] text-slate-500">Active course roster</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Cohort Attendance
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {isSummaryLoading ? '...' : `${metrics?.overallAttendanceRate ?? 0}%`}
              </p>
              <p className="text-[10px] text-slate-500">Overall class attendance</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Avg Present/Session
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {isSummaryLoading ? '...' : metrics?.averageAttendedPerSession ?? 0}
              </p>
              <p className="text-[10px] text-slate-500">Students attended</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`pb-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'sessions'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Attendance Sessions ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`pb-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'students'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Student Roster & Summary ({students.length})
          </button>
        </div>

        {activeTab === 'sessions' && (
          <div className="flex items-center gap-2 pb-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab: Attendance Sessions */}
      {activeTab === 'sessions' && (
        <>
          {isSessionsLoading ? (
            <LoadingSpinner label="Loading attendance sessions..." size="md" className="py-12" />
          ) : isSessionsError ? (
            <ErrorState
              title="Failed to load attendance sessions"
              message={getErrorMessage(sessionsError)}
              onRetry={() => refetchSessions()}
            />
          ) : sessions.length === 0 ? (
            <div className="text-center py-14 bg-white border border-dashed border-slate-200 rounded-2xl">
              <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No attendance sessions recorded</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Create a session for your lecture, laboratory, or tutorial class to take attendance.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span>Create First Session</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {sessions.map((session) => {
                const totalMarked = session.stats?.total || 0;
                const presentCount = (session.stats?.present || 0) + (session.stats?.late || 0);
                const rate = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;

                return (
                  <Card key={session.id} className="hover:border-slate-300 transition-colors">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{session.title}</span>
                          <Badge variant="purple" size="sm">
                            {session.sessionType}
                          </Badge>
                          <Badge
                            variant={
                              session.status === 'OPEN'
                                ? 'success'
                                : session.status === 'CLOSED'
                                ? 'default'
                                : 'danger'
                            }
                            size="sm"
                          >
                            {session.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>
                            Date: {new Date(session.sessionDate).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          {(session.startTime || session.endTime) && (
                            <span>
                              Time: {session.startTime || ''}
                              {session.endTime ? ` - ${session.endTime}` : ''}
                            </span>
                          )}
                          {session.notes && (
                            <span className="italic text-slate-400 truncate max-w-xs">
                              Note: {session.notes}
                            </span>
                          )}
                        </div>

                        {/* Breakdown Pills */}
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium border border-emerald-100">
                            Present: {session.stats?.present || 0}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium border border-amber-100">
                            Late: {session.stats?.late || 0}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-medium border border-indigo-100">
                            Excused: {session.stats?.excused || 0}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-medium border border-rose-100">
                            Absent: {session.stats?.absent || 0}
                          </span>
                          {totalMarked > 0 && (
                            <span className="text-[11px] text-slate-400 font-medium ml-1">
                              • {rate}% Turnout ({totalMarked} marked)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setActiveSessionId(session.id)}
                          className="flex items-center gap-1.5"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>{session.status === 'OPEN' ? 'Take Attendance' : 'View Roster'}</span>
                        </Button>

                        {session.status === 'OPEN' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updateSessionMutation.isPending}
                            onClick={() =>
                              updateSessionMutation.mutate({
                                sessionId: session.id,
                                status: 'CLOSED',
                              })
                            }
                          >
                            Close
                          </Button>
                        )}

                        {session.status !== 'CANCELLED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            disabled={updateSessionMutation.isPending}
                            onClick={() => {
                              if (window.confirm('Are you sure you want to cancel this session?')) {
                                updateSessionMutation.mutate({
                                  sessionId: session.id,
                                  status: 'CANCELLED',
                                });
                              }
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab: Student Roster & Summary */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search students by name or matriculation..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <p className="text-xs text-slate-500">
              Showing {filteredStudents.length} of {students.length} students
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Level</th>
                    <th className="py-3 px-4 text-center">Present</th>
                    <th className="py-3 px-4 text-center">Late</th>
                    <th className="py-3 px-4 text-center">Excused</th>
                    <th className="py-3 px-4 text-center">Absent</th>
                    <th className="py-3 px-4 text-center">Attended / Total</th>
                    <th className="py-3 px-4 text-right">Attendance Rate</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                        No students found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st) => (
                      <tr key={st.studentId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-900">
                          <div>{st.fullName}</div>
                          <div className="text-[11px] text-slate-400">
                            {st.username || st.email || 'No matric/email'}
                          </div>
                        </td>
                        <td className="py-3 px-4">{st.level ? `${st.level}L` : '—'}</td>
                        <td className="py-3 px-4 text-center font-semibold text-emerald-600">
                          {st.presentCount}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-amber-600">
                          {st.lateCount}
                        </td>
                        <td className="py-3 px-4 text-center text-indigo-600">
                          {st.excusedCount}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-rose-600">
                          {st.absentCount}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          {st.attendedCount} / {st.totalSessions}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <span
                              className={`font-bold ${
                                st.attendancePercentage >= 75
                                  ? 'text-emerald-600'
                                  : st.attendancePercentage >= 50
                                  ? 'text-amber-600'
                                  : 'text-rose-600'
                              }`}
                            >
                              {st.attendancePercentage}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedStudentHistoryId(st.studentId)}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            <History className="w-3.5 h-3.5 mr-1" />
                            <span>History</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Attendance Session */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-indigo-600" />
                <span>Create Attendance Session</span>
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createSessionMutation.mutate();
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Session Title / Topic <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Week 4: Concurrency & Threads"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Session Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as AttendanceSessionType)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="LECTURE">Lecture</option>
                    <option value="LAB">Lab</option>
                    <option value="TUTORIAL">Tutorial</option>
                    <option value="SEMINAR">Seminar</option>
                    <option value="PRACTICAL">Practical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Session Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Session Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context or location (e.g. Lab 204)"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={createSessionMutation.isPending || !newTitle.trim()}
                >
                  {createSessionMutation.isPending ? 'Creating...' : 'Create Session'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Take Attendance / View Roster */}
      {activeSessionId && (
        <TakeAttendanceModal
          offeringId={offeringId}
          sessionId={activeSessionId}
          onClose={() => {
            setActiveSessionId(null);
            refetchSessions();
            refetchSummary();
          }}
        />
      )}

      {/* Modal: Student History */}
      {selectedStudentHistoryId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  <span>Student Attendance History</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {studentHistoryData?.data?.student?.fullName} (
                  {studentHistoryData?.data?.student?.username || 'No matric'})
                </p>
              </div>
              <button
                onClick={() => setSelectedStudentHistoryId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-3 flex-1">
              {isHistoryLoading ? (
                <LoadingSpinner label="Loading student history..." size="md" className="py-8" />
              ) : !studentHistoryData?.data?.records?.length ? (
                <p className="text-center py-6 text-xs text-slate-400 italic">
                  No attendance records logged for this student.
                </p>
              ) : (
                studentHistoryData.data.records.map((rec) => (
                  <div
                    key={rec.recordId}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{rec.sessionTitle}</p>
                      <p className="text-[11px] text-slate-500">
                        {new Date(rec.sessionDate).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        • {rec.sessionType}
                      </p>
                      {rec.remarks && (
                        <p className="text-[11px] italic text-slate-400 mt-0.5">
                          Remarks: {rec.remarks}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={
                        rec.status === 'PRESENT'
                          ? 'success'
                          : rec.status === 'LATE'
                          ? 'warning'
                          : rec.status === 'EXCUSED'
                          ? 'purple'
                          : 'danger'
                      }
                      size="sm"
                    >
                      {rec.status}
                    </Badge>
                  </div>
                ))
              )}

              {/* Audit Corrections for this student */}
              {studentHistoryData?.data?.auditLogs && studentHistoryData.data.auditLogs.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Correction Audit History
                  </h4>
                  <div className="space-y-2">
                    {studentHistoryData.data.auditLogs.map((audit) => (
                      <div
                        key={audit.id}
                        className="p-2.5 bg-amber-50/50 border border-amber-200/60 rounded-lg text-xs"
                      >
                        <p className="font-semibold text-slate-800">
                          Changed: {audit.previousStatus} → {audit.newStatus}
                        </p>
                        <p className="text-[11px] text-slate-600 mt-0.5">Reason: {audit.reason}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          By: {audit.performedBy} on {new Date(audit.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStudentHistoryId(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

