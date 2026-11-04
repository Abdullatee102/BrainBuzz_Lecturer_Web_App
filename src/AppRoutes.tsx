import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { LecturerLayout } from './components/layout/LecturerLayout';
import { DashboardPage } from './pages/DashboardPage';
import { CoursesPage } from './pages/CoursesPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { AssessmentMonitorPage } from './pages/AssessmentMonitorPage';
import { AssessmentGradingPage } from './pages/AssessmentGradingPage';
import { AssessmentGradebookPage } from './pages/AssessmentGradebookPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected Lecturer portal routes */}
      <Route element={<LecturerLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="/assessments/:assessmentId/monitor" element={<AssessmentMonitorPage />} />
        <Route path="/assessments/:assessmentId/grading" element={<AssessmentGradingPage />} />
        <Route path="/assessments/:assessmentId/gradebook" element={<AssessmentGradebookPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
