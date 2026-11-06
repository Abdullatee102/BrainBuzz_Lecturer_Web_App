import React from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient, isForbiddenError, isNotFoundError } from '../lib/api';
import type { CourseDetailsResponse } from '../types/api';
import { formatSemester, formatLevel, formatDateTime } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  ArrowLeft,
  BookOpen,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  FileQuestion,
  CalendarClock,
  Award,
  UserCheck,
  FolderArchive,
  Megaphone,
  MessageSquare,
} from 'lucide-react';
import { QuestionBankSection } from '../components/questions/QuestionBankSection';
import { AssessmentsSection } from '../components/assessments/AssessmentsSection';
import { OfferingGradebookSection } from '../components/courses/OfferingGradebookSection';
import { AttendanceSection } from '../components/attendance/AttendanceSection';
import { MaterialsSection } from '../components/materials/MaterialsSection';
import { AnnouncementsSection } from '../components/announcements/AnnouncementsSection';
import { DiscussionsSection } from '../components/discussions/DiscussionsSection';

const VALID_TABS = [
  'assessments',
  'questions',
  'gradebook',
  'attendance',
  'materials',
  'announcements',
  'discussions',
] as const;

type TabType = typeof VALID_TABS[number];

export const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlTab = searchParams.get('tab') as TabType;
  const activeTab: TabType = VALID_TABS.includes(urlTab) ? urlTab : 'assessments';

  const handleTabChange = (newTab: TabType) => {
    setSearchParams({ tab: newTab });
  };

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['assignedCourseDetails', courseId],
    queryFn: async () => {
      if (!courseId) throw new Error('Course identifier is required.');
      const response = await apiClient.get<CourseDetailsResponse>(
        `/lecturer/courses/${courseId}`
      );
      return response.data.data;
    },
    retry: (failureCount, err) => {
      if (isForbiddenError(err) || isNotFoundError(err)) return false;
      return failureCount < 2;
    },
  });

  if (isLoading) {
    return <LoadingSpinner label="Validating course assignment and loading details..." size="lg" className="py-24" />;
  }

  // Handle 403 Forbidden: Lecturer is not assigned to this course (IDOR defense)
  if (isError && isForbiddenError(error)) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-8 text-center shadow-sm transition-colors">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Access Denied (403 Forbidden)</h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
          You are not assigned to this course offering. Course access requires an active teaching assignment record verified by your university administrator.
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

  // Handle 404 Not Found: Course does not exist
  if (isError && isNotFoundError(error)) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-sm transition-colors">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto mb-4">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Course Not Found (404)</h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
          The requested course offering could not be located in the university academic catalogue.
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

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div>
        <Link to="/courses">
          <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span>Back to Assigned Courses</span>
          </Button>
        </Link>
      </div>

      {/* Hero Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xl sm:text-2xl flex-shrink-0">
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {data.code}
                </h1>
                <Badge variant="purple" size="sm">
                  {formatLevel(data.level)}
                </Badge>
                <Badge
                  variant={data.assignmentStatus === 'ACTIVE' ? 'success' : 'warning'}
                  size="sm"
                >
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  {data.assignmentStatus}
                </Badge>
              </div>
              <h2 className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200 mt-1">
                {data.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {data.departmentName} • {data.facultyName}
              </p>
            </div>
          </div>

          <div className="text-left md:text-right text-xs text-slate-500 dark:text-slate-400 self-start md:self-auto border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-3 md:pt-0">
            <span className="block font-semibold text-slate-700 dark:text-slate-300">Academic Session</span>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 block mt-0.5">
              {data.academicSession}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">
              {formatSemester(data.semester)}
            </span>
          </div>
        </div>
      </div>

      {/* Course Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <Card>
          <CardContent className="flex items-center gap-4 p-4 sm:p-6">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <FileQuestion className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Total Questions
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {data.metrics?.totalQuestions ?? 0}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">In question bank</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4 sm:p-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                CBT Questions
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {data.metrics?.cbtQuestions ?? 0}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Objective / MCQ format</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4 sm:p-6">
            <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Theory Questions
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {data.metrics?.theoryQuestions ?? 0}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Theoretical & subjective</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Assignment Details */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Course Assignment Details</CardTitle>
            <CardDescription>
              Academic allocation parameters and institutional affiliation
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
            <div>
              <dt className="text-[11px] uppercase font-semibold text-slate-400 dark:text-slate-500">Course Allocation</dt>
              <dd className="font-semibold text-slate-800 dark:text-slate-200 mt-1">
                {data.code} ({formatLevel(data.level)})
              </dd>
            </div>

            <div>
              <dt className="text-[11px] uppercase font-semibold text-slate-400 dark:text-slate-500">Academic Term</dt>
              <dd className="text-slate-800 dark:text-slate-200 font-medium mt-1">
                {data.academicSession} • {formatSemester(data.semester)}
              </dd>
            </div>

            <div>
              <dt className="text-[11px] uppercase font-semibold text-slate-400 dark:text-slate-500">Assigned On</dt>
              <dd className="text-slate-800 dark:text-slate-200 font-medium mt-1">
                {formatDateTime(data.assignedAt)}
              </dd>
            </div>

            <div>
              <dt className="text-[11px] uppercase font-semibold text-slate-400 dark:text-slate-500">Department</dt>
              <dd className="text-slate-800 dark:text-slate-200 font-medium mt-1 truncate" title={`${data.departmentName} (${data.facultyName})`}>
                {data.departmentName}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Navigation Tabs (Mobile-responsive Horizontal Scroll) */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none pb-0.5 flex-nowrap transition-colors">
        <button
          onClick={() => handleTabChange('assessments')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap flex-shrink-0 ${
            activeTab === 'assessments'
              ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CalendarClock className="w-4 h-4" />
          <span>Official Assessments</span>
        </button>

        <button
          onClick={() => handleTabChange('questions')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap flex-shrink-0 ${
            activeTab === 'questions'
              ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileQuestion className="w-4 h-4" />
          <span>Question Bank</span>
        </button>

        <button
          onClick={() => handleTabChange('gradebook')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap flex-shrink-0 ${
            activeTab === 'gradebook'
              ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Course Gradebook</span>
        </button>

        <button
          onClick={() => handleTabChange('attendance')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap flex-shrink-0 ${
            activeTab === 'attendance'
              ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Attendance</span>
        </button>

        <button
          onClick={() => handleTabChange('materials')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap flex-shrink-0 ${
            activeTab === 'materials'
              ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FolderArchive className="w-4 h-4" />
          <span>Course Materials</span>
        </button>

        <button
          onClick={() => handleTabChange('announcements')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap flex-shrink-0 ${
            activeTab === 'announcements'
              ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Announcements</span>
        </button>

        <button
          onClick={() => handleTabChange('discussions')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap flex-shrink-0 ${
            activeTab === 'discussions'
              ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Discussions</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'assessments' && (
        <AssessmentsSection
          offeringId={data.offeringId || ''}
          courseId={data.courseId}
          courseCode={data.code}
          courseTitle={data.title}
        />
      )}
      {activeTab === 'questions' && (
        <QuestionBankSection
          courseId={data.courseId}
          offeringId={data.offeringId || ''}
          courseCode={data.code}
          courseTitle={data.title}
        />
      )}
      {activeTab === 'gradebook' && (
        <OfferingGradebookSection
          offeringId={data.offeringId || ''}
          courseCode={data.code}
          courseTitle={data.title}
        />
      )}
      {activeTab === 'attendance' && (
        <AttendanceSection
          offeringId={data.offeringId || ''}
          courseCode={data.code}
          courseTitle={data.title}
        />
      )}
      {activeTab === 'materials' && (
        <MaterialsSection
          offeringId={data.offeringId || ''}
          courseCode={data.code}
          courseTitle={data.title}
        />
      )}
      {activeTab === 'announcements' && (
        <AnnouncementsSection
          offeringId={data.offeringId || ''}
          courseCode={data.code}
          courseTitle={data.title}
        />
      )}
      {activeTab === 'discussions' && (
        <DiscussionsSection
          offeringId={data.offeringId || ''}
          courseCode={data.code}
          courseTitle={data.title}
        />
      )}
    </div>
  );
};
