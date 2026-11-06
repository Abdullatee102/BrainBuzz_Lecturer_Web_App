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
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
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
      {/* Welcome & Profile Summary Section - Fully responsive */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xl sm:text-2xl flex-shrink-0 shadow-xs">
              <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Welcome, {lecturer?.fullName || 'Academic Staff'}
                </h1>
                <Badge variant="success" size="sm">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Authorized Faculty
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {lecturer?.departmentName || 'Academic Department'} •{' '}
                {lecturer?.facultyName || 'Faculty'}
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400 dark:text-slate-500 flex-wrap">
                <span>Academic ID: {lecturer?.username || lecturer?.id?.slice(0, 8)}</span>
                <span>•</span>
                <span className="truncate">{lecturer?.email}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link to="/courses" className="w-full sm:w-auto">
              <Button variant="primary" size="md" className="w-full sm:w-auto">
                <BookOpen className="w-4 h-4 mr-2" />
                <span>View Assigned Courses</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Card 1: Assigned Courses Count */}
        <Card>
          <CardContent className="flex items-center gap-4 p-4 sm:p-6">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Assigned Courses
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {metrics?.assignedCoursesCount ?? 0}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Active course allocations this session
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Active Academic Sessions */}
        <Card>
          <CardContent className="flex items-center gap-4 p-4 sm:p-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Academic Sessions
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {metrics?.activeSessionsCount ?? 0}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[200px]">
                {metrics?.activeSessions && metrics.activeSessions.length > 0
                  ? metrics.activeSessions.join(', ')
                  : 'No active session'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Departmental Affiliation */}
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardContent className="flex items-center gap-4 p-4 sm:p-6">
            <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0">
              <Building className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Department Affiliation
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                {lecturer?.departmentName || 'Not Assigned'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
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
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentAssignments.map((assignment) => (
                <div
                  key={assignment.assignmentId || assignment.courseId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      {assignment.courseCode?.slice(0, 3) || 'CRS'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                          {assignment.courseCode}
                        </span>
                        <Badge variant="purple" size="sm">
                          {formatLevel(assignment.level)}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium truncate">
                        {assignment.courseTitle}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 dark:text-slate-500 flex-wrap">
                        <span>Session: {assignment.academicSession}</span>
                        <span>•</span>
                        <span>{formatSemester(assignment.semester)}</span>
                        <span>•</span>
                        <span>Assigned: {formatDate(assignment.assignedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full sm:w-auto flex justify-end">
                    <Link to={`/courses/${assignment.courseId || (assignment as any).id}`} className="w-full sm:w-auto">
                      <Button variant="outline" size="sm" className="w-full sm:w-auto">
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
