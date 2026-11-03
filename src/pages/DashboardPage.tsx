import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient, getErrorMessage } from '../lib/api';
import type { LecturerDashboardResponse } from '../types/api';
import { formatSemester, formatLevel, formatDate } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import {
  BookOpen,
  Calendar,
  Building,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Sparkles,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['lecturerDashboard'],
    queryFn: async () => {
      const response = await apiClient.get<LecturerDashboardResponse>('/lecturer/dashboard');
      return response.data.data;
    },
  });

  if (isLoading) {
    return <LoadingSpinner label="Loading lecturer dashboard overview..." size="lg" className="py-24" />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load dashboard overview"
        message={getErrorMessage(error)}
        onRetry={() => refetch()}
        className="my-8"
      />
    );
  }

  const lecturer = data?.lecturer;
  const metrics = data?.metrics;
  const recentAssignments = data?.recentAssignments || [];

  return (
    <div className="space-y-6">
      {/* Welcome & Profile Summary Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-xs">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Welcome, {lecturer?.fullName || 'Academic Staff'}
                </h1>
                <Badge variant="success" size="sm">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Authorized Faculty
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {lecturer?.departmentName || 'Academic Department'} •{' '}
                {lecturer?.facultyName || 'Faculty'}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                <span>Academic ID: {lecturer?.username || lecturer?.id?.slice(0, 8)}</span>
                <span>•</span>
                <span>{lecturer?.email}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Link to="/courses">
              <Button variant="primary" size="md">
                <BookOpen className="w-4 h-4 mr-2" />
                <span>View Assigned Courses</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Overview Metric Cards (Strictly live backend data, no fabricated stats) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Assigned Courses Count */}
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Assigned Courses
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">
                {metrics?.assignedCoursesCount ?? 0}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Active course allocations this session
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Active Academic Sessions */}
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Academic Sessions
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">
                {metrics?.activeSessionsCount ?? 0}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[200px]">
                {metrics?.activeSessions && metrics.activeSessions.length > 0
                  ? metrics.activeSessions.join(', ')
                  : 'No active session'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Departmental Affiliation */}
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
              <Building className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Department Affiliation
              </p>
              <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                {lecturer?.departmentName || 'Not Assigned'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {lecturer?.facultyName || 'Institution'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Assigned Courses Section */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recent Course Assignments</CardTitle>
            <CardDescription>
              Recently allocated courses for teaching and assessment
            </CardDescription>
          </div>
          <Link to="/courses">
            <Button variant="ghost" size="sm">
              <span>View all courses</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="p-0">
          {recentAssignments.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={BookOpen}
                title="No assigned courses found"
                description="You currently have no course offerings assigned to your lecturer profile for this academic session. Your administrator will allocate your departmental courses."
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentAssignments.map((assignment) => (
                <div
                  key={assignment.assignmentId || assignment.courseId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 hover:bg-slate-50/70 transition-colors gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      {assignment.courseCode?.slice(0, 3) || 'CRS'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">
                          {assignment.courseCode}
                        </span>
                        <Badge variant="purple" size="sm">
                          {formatLevel(assignment.level)}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 font-medium">
                        {assignment.courseTitle}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                        <span>Session: {assignment.academicSession}</span>
                        <span>•</span>
                        <span>{formatSemester(assignment.semester)}</span>
                        <span>•</span>
                        <span>Assigned: {formatDate(assignment.assignedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="self-end sm:self-auto">
                    <Link to={`/courses/${assignment.courseId || (assignment as any).id}`}>
                      <Button variant="outline" size="sm">
                        <span>Course Details</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
