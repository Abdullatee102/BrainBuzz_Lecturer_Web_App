import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '../../lib/api';
import type { OfferingGradebookData } from '../../types/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorState } from '../ui/ErrorState';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  FileText,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';

interface OfferingGradebookSectionProps {
  offeringId: string;
  courseCode: string;
  courseTitle: string;
}

export const OfferingGradebookSection: React.FC<OfferingGradebookSectionProps> = ({
  offeringId,
  courseCode,
  courseTitle,
}) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useQuery<{
    status: string;
    data: OfferingGradebookData;
  }>({
    queryKey: ['offeringGradebook', offeringId, page, search],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit: 50 };
      if (search.trim()) params.search = search.trim();

      const res = await apiClient.get<{ status: string; data: OfferingGradebookData }>(
        `/lecturer/offerings/${offeringId}/gradebook`,
        { params }
      );
      return res.data;
    },
    enabled: !!offeringId,
  });

  if (isLoading) {
    return <LoadingSpinner label="Loading course offering gradebook..." size="md" className="py-12" />;
  }

  if (isError || !data?.data) {
    return (
      <ErrorState
        title="Failed to load course gradebook"
        message={getErrorMessage(error)}
        onRetry={() => refetch()}
      />
    );
  }

  const { offering, assessments, students, summary, pagination } = data.data;

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-slate-400">Enrolled Students</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{summary.totalEnrolledStudents}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-slate-400">Total Assessments</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{summary.totalAssessments}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-slate-400">Cohort Average</p>
              <p className="text-xl font-bold text-emerald-600 mt-0.5">{summary.cohortAveragePercentage}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-slate-400">Pass Rate</p>
              <p className="text-xl font-bold text-amber-600 mt-0.5">{summary.cohortPassRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gradebook Matrix Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle>Course Cohort Gradebook</CardTitle>
            <CardDescription>
              Cumulative performance across all active assessments for {offering.academicSession} ({offering.semester})
            </CardDescription>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by student name or matric..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {students.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-600">No enrolled students found.</p>
              <p className="mt-1">Students will appear here once registered for this offering.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 min-w-[200px]">Student Name</th>
                  <th className="py-3 px-4">Matric / ID</th>
                  {assessments.map((a) => (
                    <th key={a.id} className="py-3 px-4 text-center min-w-[120px]">
                      <div>
                        <span className="font-bold text-slate-800 block truncate" title={a.title}>
                          {a.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          Max: {a.totalMarks} pts
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-4 text-center font-bold text-slate-900 bg-indigo-50/50">
                    Cohort Avg
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map(({ student, assessments: studentAssessments, averagePercentage }) => (
                  <tr key={student.studentId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div>
                        <span>{student.fullName}</span>
                        <span className="block text-[11px] text-slate-400 font-normal">
                          {student.email}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-700">
                      {student.matricNumber || '—'}
                    </td>

                    {studentAssessments.map((sa) => (
                      <td key={sa.assessmentId} className="py-3 px-4 text-center">
                        {!sa.isSubmitted ? (
                          <span className="text-slate-300">—</span>
                        ) : sa.totalScore !== null ? (
                          <div>
                            <span className="font-bold text-slate-800 block">
                              {sa.totalScore} / {sa.maxPossibleScore}
                            </span>
                            <span className="text-[10px] font-semibold text-indigo-600 block">
                              {sa.percentage}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-amber-600 font-semibold text-[11px]">
                            {sa.gradingStatus.replace(/_/g, ' ')}
                          </span>
                        )}
                      </td>
                    ))}

                    <td className="py-3 px-4 text-center font-bold text-slate-900 bg-indigo-50/30">
                      {averagePercentage !== null ? (
                        <span className="text-indigo-700 font-bold">{averagePercentage}%</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

