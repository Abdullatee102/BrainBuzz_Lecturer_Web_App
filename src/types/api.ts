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
  offeringId?: string;
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

// =====================================================
// ASSESSMENTS (BB-07F.4)
// =====================================================

export type AssessmentType = 'CBT' | 'THEORY' | 'MIXED' | 'ASSIGNMENT';
export type AssessmentStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'ARCHIVED';

export interface AssessmentItem {
  id: string;
  offeringId: string;
  courseId: string;
  courseCode?: string;
  courseTitle?: string;
  academicSession?: string;
  semester?: string;
  creatorLecturerId: string;
  creatorName?: string | null;
  title: string;
  description?: string | null;
  type: AssessmentType;
  status: AssessmentStatus;
  operationalStatus?: string;
  totalMarks: number;
  passMarks?: number | null;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  maxAttempts: number;
  isRandomized: boolean;
  allowLateSubmission?: boolean;
  lateSubmissionDeadline?: string | null;
  resultReleasePolicy: string;
  publishedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  questionCount?: number;
  questions?: Array<{
    id: string;
    questionId: string;
    orderIndex: number;
    allocatedMarks: number;
    type: string;
    question: string;
    options?: string[] | null;
    correctAnswer?: string;
    gradingPoints?: GradingPoint[];
    explanation?: string | null;
  }>;
}

export interface CreateAssessmentPayload {
  title: string;
  description?: string | null;
  type: AssessmentType;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  passMarks?: number | null;
  maxAttempts?: number;
  isRandomized?: boolean;
  allowLateSubmission?: boolean;
  lateSubmissionDeadline?: string | null;
  resultReleasePolicy?: string;
}

export interface UpdateAssessmentPayload {
  title?: string;
  description?: string | null;
  type?: AssessmentType;
  durationMinutes?: number;
  startTime?: string;
  endTime?: string;
  passMarks?: number | null;
  maxAttempts?: number;
  isRandomized?: boolean;
  allowLateSubmission?: boolean;
  lateSubmissionDeadline?: string | null;
}

// =====================================================
// ASSESSMENT LIVE MONITORING (BB-07F.5)
// =====================================================

export interface AssessmentMonitorStats {
  totalEligibleStudents: number;
  startedCount: number;
  activeOnlineCount: number;
  disconnectedCount: number;
  submittedCount: number;
  timedOutCount: number;
  unstartedCount: number;
}

export interface AssessmentRosterAttempt {
  id: string;
  attemptNumber: number;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'TIMED_OUT' | 'CANCELLED';
  startedAt: string;
  submittedAt?: string | null;
  expiresAt: string;
  lastHeartbeatAt: string;
  isLate: boolean;
  remainingSeconds: number;
  elapsedMinutes: number;
  answeredCount: number;
  totalQuestionsCount: number;
  connectionStatus: 'NOT_STARTED' | 'ONLINE' | 'DISCONNECTED' | 'COMPLETED';
}

export interface AssessmentRosterItem {
  studentId: string;
  fullName: string;
  email: string;
  username: string | null;
  attempt: AssessmentRosterAttempt | null;
}

export interface AssessmentMonitorEvent {
  id: string;
  attemptId: string;
  eventType: string;
  eventData: any;
  serverTimestamp: string;
  studentName: string;
}

export interface AssessmentMonitorData {
  assessment: AssessmentItem;
  stats: AssessmentMonitorStats;
  roster: AssessmentRosterItem[];
  recentEvents: AssessmentMonitorEvent[];
}

// =====================================================
// ASSESSMENT FORMAL GRADING & RUBRIC EVALUATION (BB-07F.6)
// =====================================================

export type GradingStatus =
  | 'PENDING_GRADING'
  | 'AUTO_GRADED'
  | 'NEEDS_THEORY_GRADING'
  | 'PARTIALLY_GRADED'
  | 'COMPLETED'
  | 'FAILED';

export interface RubricScoreItem {
  concept: string;
  maxWeight: number;
  awardedWeight: number;
  comment?: string;
}

export interface AttemptGradeSummary {
  id: string;
  cbtScore: number;
  theoryScore: number;
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  isPassing: boolean | null;
  status: GradingStatus;
  cbtGradedAt?: string | null;
  theoryGradedAt?: string | null;
  finalGradedAt?: string | null;
}

export interface LecturerGradingRosterItem {
  attemptId: string;
  attemptNumber: number;
  status: 'SUBMITTED' | 'TIMED_OUT';
  startedAt: string;
  submittedAt: string | null;
  isLate: boolean;
  student: {
    id: string;
    fullName: string;
    email: string;
    username: string | null;
  };
  grade: AttemptGradeSummary | null;
}

export interface LecturerGradingOverviewData {
  assessment: {
    id: string;
    offeringId: string;
    courseId: string;
    title: string;
    type: string;
    status: string;
    totalMarks: number;
    passMarks: number | null;
    startTime: string;
    endTime: string;
  };
  stats: {
    totalSubmitted: number;
    autoGradedCount: number;
    needsTheoryCount: number;
    partiallyGradedCount: number;
    completedCount: number;
    averageScore: number | null;
  };
  roster: LecturerGradingRosterItem[];
}

export interface QuestionGradingDetail {
  assessmentQuestionId: string;
  questionId: string;
  orderIndex: number;
  allocatedMarks: number;
  type: string;
  question: string;
  options: string[] | null;
  correctAnswer: string;
  explanation?: string | null;
  gradingPoints: Array<{ concept: string; weight: number; aliases?: string[] }>;
  studentAnswer: string | null;
  savedAt: string | null;
  grade: {
    id: string;
    maxMarks: number;
    awardedMarks: number;
    isCorrect: boolean | null;
    gradingMethod: string;
    rubricScores: RubricScoreItem[] | null;
    feedback: string | null;
    gradedBy: string | null;
    gradedAt: string;
  } | null;
}

export interface GradingAuditLogItem {
  id: string;
  actorId: string | null;
  actorRole: string;
  action: string;
  previousScore: number | null;
  newScore: number;
  reason: string | null;
  createdAt: string;
  actorFullName: string | null;
}

export interface AttemptGradingDeskData {
  assessment: {
    id: string;
    title: string;
    type: string;
    totalMarks: number;
    passMarks: number | null;
  };
  attempt: {
    id: string;
    attemptNumber: number;
    status: string;
    startedAt: string;
    submittedAt: string | null;
    isLate: boolean;
    student: {
      id: string;
      fullName: string;
      email: string;
      username: string | null;
    };
  };
  grade: AttemptGradeSummary | null;
  questions: QuestionGradingDetail[];
  auditLogs: GradingAuditLogItem[];
}


