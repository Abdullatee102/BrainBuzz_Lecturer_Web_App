import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '../lib/api';
import type { AssignedCoursesResponse } from '../types/api';
import { CourseTable } from '../components/courses/CourseTable';
import { PaginationControl } from '../components/ui/PaginationControl';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Button } from '../components/ui/Button';
import { Search, RotateCcw, X, BookOpen, Layers } from 'lucide-react';

const TAB_LABELS: Record<string, string> = {
  attendance: 'Attendance Sessions',
  assessments: 'Assessments & Examinations',
  questions: 'Question Bank',
  gradebook: 'Gradebook & Moderation',
  materials: 'Course Materials',
  announcements: 'Course Announcements',
  discussions: 'Course Discussions',
};

export const CoursesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentTab = searchParams.get('tab');

  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['assignedCourses', page, debouncedSearch, semesterFilter, sessionFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '10');
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (semesterFilter) params.append('semester', semesterFilter);
      if (sessionFilter) params.append('academicSession', sessionFilter);

      const response = await apiClient.get<AssignedCoursesResponse>(
        `/lecturer/courses?${params.toString()}`
      );
      return response.data;
    },
  });

  const courses = Array.isArray(data?.data)
    ? data.data
    : Array.isArray((data?.data as any)?.courses)
    ? (data?.data as any).courses
    : Array.isArray((data as any)?.courses)
    ? (data as any).courses
    : [];
  const pagination =
    (data?.data as any)?.pagination ||
    data?.pagination ||
    (data as any)?.pagination;

  // Auto-redirect if lecturer has only 1 course and clicked a specific tab
  useEffect(() => {
    if (currentTab && courses.length === 1 && !isLoading) {
      const singleId = courses[0].courseId || courses[0].assignmentId;
      if (singleId) {
        navigate(`/courses/${singleId}?tab=${encodeURIComponent(currentTab)}`, { replace: true });
      }
    }
  }, [currentTab, courses, isLoading, navigate]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSemesterFilter('');
    setSessionFilter('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(searchTerm || semesterFilter || sessionFilter);

  return (
    <div className="space-y-6">
      {/* Contextual Feature Notification when navigating from Sidebar */}
      {currentTab && (
        <div className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                Course Selection: {TAB_LABELS[currentTab] || currentTab}
              </h3>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                Select one of your assigned courses below to access and manage {TAB_LABELS[currentTab] || currentTab}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Assigned Courses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Courses officially allocated to you for teaching and assessment
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="self-start sm:self-auto"
        >
          <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3 transition-colors">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by course code or title..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg pl-10 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Semester Filter */}
        <div className="flex items-center gap-2">
          <select
            value={semesterFilter}
            onChange={(e) => {
              setSemesterFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-lg px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Filter by semester"
          >
            <option value="">All Semesters</option>
            <option value="harmattan">Harmattan (1st Semester)</option>
            <option value="rain">Rain (2nd Semester)</option>
          </select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2.5"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <LoadingSpinner label="Fetching assigned courses from backend..." size="lg" className="py-20" />
      ) : isError ? (
        <ErrorState
          title="Unable to load assigned courses"
          message={getErrorMessage(error)}
          onRetry={() => refetch()}
        />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={hasActiveFilters ? 'No matching courses found' : 'No courses assigned yet'}
          description={
            hasActiveFilters
              ? 'No assigned courses match your current search and filter criteria. Try clearing your filters.'
              : 'Your lecturer account currently has zero active course allocations for this session. Contact your departmental coordinator to verify course allocations.'
          }
          actionLabel={hasActiveFilters ? 'Clear all filters' : undefined}
          onAction={hasActiveFilters ? handleClearFilters : undefined}
        />
      ) : (
        <div className="space-y-4">
          <CourseTable courses={courses} targetTab={currentTab} />

          {pagination && pagination.totalPages > 1 && (
            <PaginationControl
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              limit={pagination.limit}
              onPageChange={(newPage) => setPage(newPage)}
              isLoading={isFetching}
            />
          )}
        </div>
      )}
    </div>
  );
};
