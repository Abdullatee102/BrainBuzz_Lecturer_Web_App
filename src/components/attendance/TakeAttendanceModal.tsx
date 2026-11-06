import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '../../lib/api';
import type {
  AttendanceSessionDetailsResponse,
  AttendanceRecordStatus,
} from '../../types/api';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorState } from '../ui/ErrorState';
import {
  X,
  UserCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  Save,
  Search,
  History,
} from 'lucide-react';

interface TakeAttendanceModalProps {
  offeringId: string;
  sessionId: string;
  onClose: () => void;
}

interface LocalRecordState {
  status: AttendanceRecordStatus;
  remarks: string;
  recordId: string | null;
  isMarkedInitially: boolean;
  initialStatus: AttendanceRecordStatus | null;
}

export const TakeAttendanceModal: React.FC<TakeAttendanceModalProps> = ({
  offeringId,
  sessionId,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [recordsState, setRecordsState] = useState<Record<string, LocalRecordState>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Correction dialog state
  const [correctionTarget, setCorrectionTarget] = useState<{
    studentId: string;
    studentName: string;
    recordId: string;
    newStatus: AttendanceRecordStatus;
    remarks: string;
  } | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  // Fetch session details and roster
  const { data, isLoading, isError, error, refetch } = useQuery<{
    status: string;
    data: AttendanceSessionDetailsResponse;
  }>({
    queryKey: ['attendanceSessionDetails', offeringId, sessionId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/lecturer/offerings/${offeringId}/attendance/sessions/${sessionId}`
      );
      return res.data;
    },
    enabled: !!offeringId && !!sessionId,
  });

  // Populate local records state when data arrives
  useEffect(() => {
    if (data?.data?.roster) {
      const initial: Record<string, LocalRecordState> = {};
      for (const st of data.data.roster) {
        initial[st.studentId] = {
          status: st.status || 'PRESENT',
          remarks: st.remarks || '',
          recordId: st.recordId,
          isMarkedInitially: st.isMarked,
          initialStatus: st.status,
        };
      }
      setRecordsState(initial);
    }
  }, [data]);

  // Batch record mutation
  const batchRecordMutation = useMutation({
    mutationFn: async () => {
      if (!data?.data?.roster) return;
      const records = data.data.roster.map((st) => {
        const local = recordsState[st.studentId] || {
          status: 'PRESENT',
          remarks: '',
        };
        return {
          studentId: st.studentId,
          status: local.status,
          remarks: local.remarks.trim() || undefined,
        };
      });

      const res = await apiClient.post(
        `/lecturer/offerings/${offeringId}/attendance/sessions/${sessionId}/records`,
        { records }
      );
      return res.data;
    },
    onSuccess: (resData) => {
      setSaveSuccessMsg('Attendance roll call saved successfully.');
      setSaveErrorMsg(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['offeringAttendanceSessions', offeringId] });
      queryClient.invalidateQueries({ queryKey: ['offeringAttendanceSummary', offeringId] });
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    },
    onError: (err) => {
      setSaveErrorMsg(getErrorMessage(err));
      setSaveSuccessMsg(null);
    },
  });

  // Correction mutation for individual already-saved record
  const correctRecordMutation = useMutation({
    mutationFn: async () => {
      if (!correctionTarget) return;
      const res = await apiClient.patch(
        `/lecturer/offerings/${offeringId}/attendance/sessions/${sessionId}/records/${correctionTarget.recordId}`,
        {
          status: correctionTarget.newStatus,
          remarks: correctionTarget.remarks.trim() || undefined,
          reason: correctionReason.trim(),
        }
      );
      return res.data;
    },
    onSuccess: () => {
      if (correctionTarget) {
        setRecordsState((prev) => ({
          ...prev,
          [correctionTarget.studentId]: {
            ...prev[correctionTarget.studentId],
            status: correctionTarget.newStatus,
            remarks: correctionTarget.remarks,
            initialStatus: correctionTarget.newStatus,
          },
        }));
      }
      setCorrectionTarget(null);
      setCorrectionReason('');
      setCorrectionError(null);
      setSaveSuccessMsg('Attendance correction saved with audit log.');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['offeringAttendanceSessions', offeringId] });
      queryClient.invalidateQueries({ queryKey: ['offeringAttendanceSummary', offeringId] });
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    },
    onError: (err) => {
      setCorrectionError(getErrorMessage(err));
    },
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
          <LoadingSpinner label="Loading session roster..." size="lg" />
        </div>
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
          <ErrorState
            title="Failed to load session roster"
            message={getErrorMessage(error)}
            onRetry={() => refetch()}
          />
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { session, stats, roster } = data.data;

  const handleStatusChange = (
    studentId: string,
    studentName: string,
    newStatus: AttendanceRecordStatus
  ) => {
    const current = recordsState[studentId];
    // If the record was already saved on server and we change its status, prompt for correction reason
    if (current?.isMarkedInitially && current.initialStatus !== newStatus && current.recordId) {
      setCorrectionTarget({
        studentId,
        studentName,
        recordId: current.recordId,
        newStatus,
        remarks: current.remarks,
      });
      setCorrectionReason('');
      setCorrectionError(null);
      return;
    }

    setRecordsState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status: newStatus,
      },
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setRecordsState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  const markAll = (status: AttendanceRecordStatus) => {
    setRecordsState((prev) => {
      const updated = { ...prev };
      for (const st of roster) {
        // Only mark if not already saved to prevent accidental un-audited mass alterations
        if (!updated[st.studentId]?.isMarkedInitially) {
          updated[st.studentId] = {
            ...updated[st.studentId],
            status,
          };
        }
      }
      return updated;
    });
  };

  const filteredRoster = roster.filter(
    (st) =>
      st.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (st.username && st.username.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">{session.title}</h3>
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
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Date: {new Date(session.sessionDate).toLocaleDateString()} • {session.courseCode} ({session.academicSession} - {session.semester})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action / Banner Bar */}
        <div className="px-5 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Quick Bulk Actions:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAll('PRESENT')}
              className="text-xs py-1 h-7 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              All Unmarked Present
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAll('ABSENT')}
              className="text-xs py-1 h-7 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              All Unmarked Absent
            </Button>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Notifications */}
        {saveSuccessMsg && (
          <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
        {saveErrorMsg && (
          <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{saveErrorMsg}</span>
          </div>
        )}

        {/* Roster Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Student</th>
                <th className="py-2.5 px-3">Attendance Status</th>
                <th className="py-2.5 px-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400 dark:text-slate-500 italic">
                    No students found matching your search.
                  </td>
                </tr>
              ) : (
                filteredRoster.map((st) => {
                  const state = recordsState[st.studentId] || {
                    status: 'PRESENT',
                    remarks: '',
                    isMarkedInitially: false,
                  };
                  return (
                    <tr key={st.studentId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{st.fullName}</div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">
                          {st.username || st.email || 'No matric'} {st.level ? `• ${st.level}L` : ''}
                        </div>
                      </td>

                      {/* Status Selector Pills */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(['PRESENT', 'LATE', 'EXCUSED', 'ABSENT'] as AttendanceRecordStatus[]).map(
                            (statusOpt) => {
                              const isSelected = state.status === statusOpt;
                              const variantStyles =
                                statusOpt === 'PRESENT'
                                  ? isSelected
                                    ? 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-sm'
                                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                                  : statusOpt === 'LATE'
                                  ? isSelected
                                    ? 'bg-amber-600 text-white font-bold border-amber-600 shadow-sm'
                                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                                  : statusOpt === 'EXCUSED'
                                  ? isSelected
                                    ? 'bg-indigo-600 text-white font-bold border-indigo-600 shadow-sm'
                                    : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
                                  : isSelected
                                  ? 'bg-rose-600 text-white font-bold border-rose-600 shadow-sm'
                                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40';

                              return (
                                <button
                                  key={statusOpt}
                                  type="button"
                                  onClick={() =>
                                    handleStatusChange(st.studentId, st.fullName, statusOpt)
                                  }
                                  className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all ${variantStyles}`}
                                >
                                  {statusOpt}
                                </button>
                              );
                            }
                          )}
                          {state.isMarkedInitially && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 italic ml-1">
                              (Saved)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Remarks */}
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          placeholder="Optional notes..."
                          value={state.remarks}
                          onChange={(e) => handleRemarksChange(st.studentId, e.target.value)}
                          className="w-full text-xs px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Total Students: <span className="font-semibold text-slate-900 dark:text-slate-100">{roster.length}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => batchRecordMutation.mutate()}
              disabled={batchRecordMutation.isPending || roster.length === 0}
              className="flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{batchRecordMutation.isPending ? 'Saving...' : 'Save Attendance Roll Call'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Modal: Mandatory Correction Reason */}
      {correctionTarget && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <History className="w-4 h-4 text-amber-600" />
                <span>Attendance Correction Justification</span>
              </h4>
              <button
                onClick={() => setCorrectionTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {correctionError && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{correctionError}</span>
              </div>
            )}

            <div className="mt-3 space-y-3 text-xs">
              <p className="text-slate-600">
                You are updating the saved attendance status for{' '}
                <span className="font-semibold text-slate-900">
                  {correctionTarget.studentName}
                </span>{' '}
                to <span className="font-bold text-indigo-600">{correctionTarget.newStatus}</span>.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Correction Reason <span className="text-rose-500">* (min 5 chars)</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Student arrived late with medical excuse; verified by lecturer."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCorrectionTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={correctRecordMutation.isPending || correctionReason.trim().length < 5}
                  onClick={() => correctRecordMutation.mutate()}
                >
                  {correctRecordMutation.isPending ? 'Saving...' : 'Confirm Correction'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

