import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Layers, CheckCircle2 } from 'lucide-react';
import type { AssignedCourseItem } from '../../types/api';
import { formatSemester, formatLevel, formatDate } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface CourseTableProps {
  courses: AssignedCourseItem[];
}

export const CourseTable: React.FC<CourseTableProps> = ({ courses }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Desktop & Tablet Table View */}
      <div
        tabIndex={0}
        role="region"
        aria-label="Assigned courses directory"
        className="hidden md:block overflow-x-auto"
      >
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500 sticky top-0 z-10">
              <th scope="col" className="py-3.5 px-4 font-semibold">Course</th>
              <th scope="col" className="py-3.5 px-4 font-semibold">Department & Faculty</th>
              <th scope="col" className="py-3.5 px-4 font-semibold">Session & Term</th>
              <th scope="col" className="py-3.5 px-4 font-semibold text-center">Questions (CBT / Theory)</th>
              <th scope="col" className="py-3.5 px-4 font-semibold text-center">Status</th>
              <th scope="col" className="py-3.5 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {courses.map((course) => (
              <tr
                key={course.assignmentId || course.courseId}
                className="hover:bg-slate-50/60 transition-colors group"
              >
                {/* Course Code & Title */}
                <th scope="row" className="py-4 px-4 font-normal">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {course.code}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {formatLevel(course.level)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 font-normal max-w-xs truncate">
                        {course.title}
                      </p>
                    </div>
                  </div>
                </th>

                {/* Department & Faculty */}
                <td className="py-4 px-4 text-xs text-slate-600">
                  <p className="font-medium text-slate-800">{course.departmentName || '—'}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{course.facultyName || '—'}</p>
                </td>

                {/* Session & Semester */}
                <td className="py-4 px-4 text-xs text-slate-600">
                  <p className="font-medium text-slate-800">{course.academicSession || '—'}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{formatSemester(course.semester)}</p>
                </td>

                {/* Question Counts */}
                <td className="py-4 px-4 text-center">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                    <span className="font-bold text-slate-900">{course.metrics?.totalQuestions ?? 0}</span>
                    <span className="text-slate-400">total</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-indigo-600 font-semibold">{course.metrics?.cbtQuestions ?? 0} CBT</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-amber-600 font-semibold">{course.metrics?.theoryQuestions ?? 0} Theory</span>
                  </div>
                </td>

                {/* Status */}
                <td className="py-4 px-4 text-center">
                  <Badge
                    variant={course.assignmentStatus === 'ACTIVE' ? 'success' : 'warning'}
                    size="sm"
                  >
                    {course.assignmentStatus || 'ACTIVE'}
                  </Badge>
                </td>

                {/* Action */}
                <td className="py-4 px-4 text-right">
                  <Link to={`/courses/${course.courseId}`}>
                    <Button variant="outline" size="sm" className="group-hover:border-indigo-300">
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Card View */}
      <div className="md:hidden divide-y divide-slate-100">
        {courses.map((course) => (
          <div key={course.assignmentId || course.courseId} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">{course.code}</span>
                  <Badge variant="purple" size="sm">{formatLevel(course.level)}</Badge>
                </div>
                <h4 className="text-xs font-medium text-slate-700 mt-1">{course.title}</h4>
              </div>
              <Badge
                variant={course.assignmentStatus === 'ACTIVE' ? 'success' : 'warning'}
                size="sm"
              >
                {course.assignmentStatus || 'ACTIVE'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Department</span>
                <span className="text-slate-800 font-medium truncate block">{course.departmentName || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Session</span>
                <span className="text-slate-800 font-medium truncate block">
                  {course.academicSession} ({formatSemester(course.semester)})
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                <span className="font-semibold text-slate-800">{course.metrics?.totalQuestions ?? 0}</span> questions
                <span className="text-slate-400 ml-1">
                  ({course.metrics?.cbtQuestions ?? 0} CBT, {course.metrics?.theoryQuestions ?? 0} Theory)
                </span>
              </div>

              <Link to={`/courses/${course.courseId}`}>
                <Button variant="outline" size="sm">
                  <span>Details</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
