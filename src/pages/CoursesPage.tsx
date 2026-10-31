import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '../lib/api';
import type { AssignedCoursesResponse } from '../types/api';
import { CourseTable } from '../components/courses/CourseTable';
import { PaginationControl } from '../components/ui/PaginationControl';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Button } from '../components/ui/Button';
import { Search, Filter, BookOpen, RotateCcw, X } from 'lucide-react';

export const CoursesPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');

  // Debounce search input
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1); // reset to page 1 on new search
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

  const courses = data?.data || [];
  const pagination = data?.pagination;

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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Assigned Courses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
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
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by course code or title..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg pl-10 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
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
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
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
              className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 px-2.5"
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
          <CourseTable courses={courses} />

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
