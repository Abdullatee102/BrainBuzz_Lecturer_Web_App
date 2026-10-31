export type UserRole =
  | 'STUDENT'
  | 'LECTURER'
  | 'SUPER_ADMIN'
  | 'CONTENT_ADMIN'
  | 'SUPPORT_AGENT'
  | 'NOTIFICATION_ADMIN'
  | 'MODERATOR';

export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DISABLED';

export type AssignmentStatus = 'ACTIVE' | 'REVOKED' | 'INACTIVE';

export interface LecturerUser {
  id: string;
  fullName: string;
  email: string;
  username?: string | null;
  role: 'LECTURER';
  status: AccountStatus;
  facultyId?: string | null;
  departmentId?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LecturerLoginResponse {
  status: 'success' | 'fail' | 'error';
  message: string;
  tokens: AuthTokens;
  user: LecturerUser;
}

export interface LecturerProfileResponse {
  status: 'success' | 'fail' | 'error';
  user: LecturerUser;
}

export interface RecentAssignment {
  assignmentId: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  level: number;
  semester: string;
  academicSession: string;
  assignedAt: string;
}

export interface LecturerDashboardData {
  lecturer: {
    id: string;
    fullName: string;
    email: string | null;
    username: string | null;
    facultyName: string | null;
    departmentName: string | null;
  };
  metrics: {
    assignedCoursesCount: number;
    activeSessionsCount: number;
    activeSessions: string[];
  };
  recentAssignments: RecentAssignment[];
}

export interface LecturerDashboardResponse {
  status: 'success' | 'fail' | 'error';
  data: LecturerDashboardData;
}

export interface CourseMetrics {
  totalQuestions: number;
  cbtQuestions: number;
  theoryQuestions: number;
}

export interface AssignedCourseItem {
  assignmentId: string;
  academicSession: string;
  assignmentStatus: AssignmentStatus;
  assignedAt: string;
  courseId: string;
  code: string;
  title: string;
  level: number;
  semester: string;
  departmentId: string;
  departmentName: string;
  facultyId: string;
  facultyName: string;
  metrics: CourseMetrics;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AssignedCoursesResponse {
  status: 'success' | 'fail' | 'error';
  data: AssignedCourseItem[];
  pagination: PaginationMeta;
}

export interface CourseDetailsResponse {
  status: 'success' | 'fail' | 'error';
  data: AssignedCourseItem;
}

export interface ApiErrorResponse {
  status: 'fail' | 'error';
  message: string;
  errors?: Array<{
    field?: string;
    message: string;
  }>;
}

export type QuestionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'REVISION_REQUIRED'
  | 'REJECTED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export interface GradingPoint {
  concept: string;
  weight: number;
  aliases?: string[];
  keywords?: string[];
}

export interface QuestionItem {
  id: string;
  courseId: string;
  courseCode?: string;
  courseTitle?: string;
  originOfferingId?: string | null;
  academicSession?: string | null;
  semester?: string | null;
  section?: string | null;
  authorLecturerId?: string | null;
  authorName?: string | null;
  status: QuestionStatus;
  type: 'cbt' | 'theory';
  question: string;
  options?: string[] | null;
  correctAnswer: string;
  gradingPoints?: GradingPoint[];
  explanation?: string | null;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  imageUrl?: string | null;
  currentVersion: number;
  reviewFeedback?: string | null;
  rejectionReason?: string | null;
  reviewedByAdminId?: string | null;
  reviewedAt?: string | null;
  publishedByAdminId?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuestionPayload {
  offeringId?: string;
  courseId?: string;
  type: 'cbt' | 'theory';
  question: string;
  options?: string[];
  correctAnswer: string;
  gradingPoints?: GradingPoint[];
  explanation?: string | null;
  points?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  imageUrl?: string | null;
}

export interface UpdateQuestionPayload {
  type?: 'cbt' | 'theory';
  question?: string;
  options?: string[];
  correctAnswer?: string;
  gradingPoints?: GradingPoint[];
  explanation?: string | null;
  points?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  imageUrl?: string | null;
}
