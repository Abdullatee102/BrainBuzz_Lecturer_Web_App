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
  customId?: string | null;
  fullName: string;
  email: string;
  username?: string | null;
  role: 'LECTURER';
  status: AccountStatus;
  facultyId?: string | null;
  departmentId?: string | null;
  facultyName?: string | null;
  departmentName?: string | null;
  phoneNumber?: string | null;
  bio?: string | null;
  photoURL?: string | null;
}

export type Question = QuestionItem;

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
  notificationAudienceType?: 'ACADEMIC_ENROLLED' | 'PRODUCT_ENTITLED';
  requiredProductId?: string | null;
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
  notificationAudienceType?: 'ACADEMIC_ENROLLED' | 'PRODUCT_ENTITLED';
  requiredProductId?: string | null;
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
  notificationAudienceType?: 'ACADEMIC_ENROLLED' | 'PRODUCT_ENTITLED';
  requiredProductId?: string | null;
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

// =====================================================
// GRADEBOOK, MODERATION & PUBLICATION (BB-07F.7)
// =====================================================

export type ResultsPublicationStatus =
  | 'GRADING_IN_PROGRESS'
  | 'SUBMITTED_FOR_APPROVAL'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'REJECTED';

export interface OfferingGradebookStudentItem {
  student: {
    studentId: string;
    fullName: string;
    username: string;
    email: string;
    matricNumber: string;
  };
  assessments: Array<{
    assessmentId: string;
    assessmentTitle: string;
    totalMarks: number;
    passMarks: number | null;
    resultsPublicationStatus: ResultsPublicationStatus;
    isSubmitted: boolean;
    gradeId: string | null;
    attemptId: string | null;
    totalScore: number | null;
    maxPossibleScore: number;
    percentage: number | null;
    isPassing: boolean | null;
    gradingStatus: string;
    isModerated: boolean;
    isFlaggedForReview: boolean;
  }>;
  averagePercentage: number | null;
}

export interface OfferingGradebookData {
  offering: {
    offeringId: string;
    courseId: string;
    code: string;
    title: string;
    level: number;
    academicSession: string;
    semester: string;
    departmentName: string | null;
    facultyName: string | null;
  };
  assessments: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    totalMarks: number;
    passMarks: number | null;
    resultsPublicationStatus: ResultsPublicationStatus;
    resultsPublishedAt: string | null;
  }>;
  students: OfferingGradebookStudentItem[];
  summary: {
    totalEnrolledStudents: number;
    totalAssessments: number;
    totalEvaluatedGrades: number;
    cohortAveragePercentage: number;
    cohortPassRate: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AssessmentGradebookRow {
  id: string;
  attemptId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  matricNumber: string;
  cbtScore: number;
  theoryScore: number;
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  isPassing: boolean | null;
  status: string;
  isModerated: boolean;
  moderatedBy: string | null;
  moderatedAt: string | null;
  moderationNotes: string | null;
  isFlaggedForReview: boolean;
  flagReason: string | null;
  finalGradedAt: string | null;
  attemptSubmittedAt: string | null;
}

export interface AssessmentGradebookData {
  assessment: {
    id: string;
    offeringId: string;
    courseId: string;
    creatorLecturerId: string;
    title: string;
    description: string | null;
    type: string;
    status: string;
    totalMarks: number;
    passMarks: number | null;
    durationMinutes: number;
    startTime: string;
    endTime: string;
    resultReleasePolicy: string;
    resultsPublicationStatus: ResultsPublicationStatus;
    resultsSubmittedAt: string | null;
    resultsSubmittedBy: string | null;
    resultsApprovedAt: string | null;
    resultsApprovedBy: string | null;
    resultsRejectedAt: string | null;
    resultsRejectedBy: string | null;
    resultsRejectionReason: string | null;
    resultsPublishedAt: string | null;
    resultsPublishedBy: string | null;
    courseCode: string;
    courseTitle: string;
    level: number;
    academicSession: string;
    semester: string;
    departmentName: string | null;
  };
  grades: AssessmentGradebookRow[];
  stats: {
    totalSubmissions: number;
    autoGradedCount: number;
    needsTheoryCount: number;
    completedCount: number;
    partiallyGradedCount: number;
    moderatedCount: number;
    flaggedCount: number;
    passCount: number;
    failCount: number;
    averageScore: number;
    passRate: number;
    isReadyForApproval: boolean;
  };
  auditLogs: GradingAuditLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// =====================================================
// ATTENDANCE MANAGEMENT TYPES (BB-07G)
// =====================================================

export type AttendanceSessionType = 'LECTURE' | 'LAB' | 'TUTORIAL' | 'SEMINAR' | 'PRACTICAL';
export type AttendanceSessionStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';
export type AttendanceRecordStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface AttendanceSessionItem {
  id: string;
  offeringId: string;
  title: string;
  sessionType: AttendanceSessionType;
  sessionDate: string;
  startTime: string | null;
  endTime: string | null;
  status: AttendanceSessionStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  stats: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
  };
}

export interface AttendanceRosterStudent {
  studentId: string;
  fullName: string;
  username: string | null;
  email: string | null;
  level: number | null;
  departmentName: string | null;
  isMarked: boolean;
  recordId: string | null;
  status: AttendanceRecordStatus | null;
  remarks: string | null;
  markedAt: string | null;
  updatedAt: string | null;
}

export interface AttendanceSessionDetailsResponse {
  session: {
    id: string;
    offeringId: string;
    title: string;
    sessionType: AttendanceSessionType;
    sessionDate: string;
    startTime: string | null;
    endTime: string | null;
    status: AttendanceSessionStatus;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    courseCode: string;
    courseTitle: string;
    academicSession: string;
    semester: string;
  };
  stats: {
    enrolledTotal: number;
    markedTotal: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
  roster: AttendanceRosterStudent[];
}

export interface StudentAttendanceSummaryItem {
  studentId: string;
  fullName: string;
  username: string | null;
  email: string | null;
  level: number | null;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendedCount: number;
  totalSessions: number;
  attendancePercentage: number;
}

export interface OfferingAttendanceSummaryResponse {
  offering: {
    id: string;
    code: string;
    title: string;
    level: number;
    academicSession: string;
    semester: string;
    departmentName: string | null;
  };
  metrics: {
    totalSessions: number;
    enrolledStudentsCount: number;
    overallAttendanceRate: number;
    averageAttendedPerSession: number;
  };
  students: StudentAttendanceSummaryItem[];
}

export interface AttendanceAuditLogItem {
  id: string;
  recordId: string;
  sessionId: string;
  previousStatus: AttendanceRecordStatus;
  newStatus: AttendanceRecordStatus;
  reason: string;
  performedBy: string;
  createdAt: string;
}

export interface StudentAttendanceHistoryResponse {
  student: {
    id: string;
    fullName: string;
    username: string | null;
    email: string | null;
    level: number | null;
  };
  records: Array<{
    recordId: string;
    sessionId: string;
    sessionTitle: string;
    sessionType: AttendanceSessionType;
    sessionDate: string;
    startTime: string | null;
    endTime: string | null;
    status: AttendanceRecordStatus;
    remarks: string | null;
    markedAt: string;
    updatedAt: string;
  }>;
  auditLogs: AttendanceAuditLogItem[];
}

// =====================================================
// COURSE MATERIALS & LEARNING RESOURCES (BB-07H)
// =====================================================

export type CourseMaterialCategory =
  | 'LECTURE_NOTE'
  | 'SYLLABUS'
  | 'SLIDE'
  | 'ASSIGNMENT_BRIEF'
  | 'LAB_MANUAL'
  | 'READING'
  | 'OTHER';

export type CourseMaterialStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface CourseMaterialItem {
  id: string;
  offeringId: string;
  uploadedBy: string;
  title: string;
  description: string | null;
  category: CourseMaterialCategory;
  status: CourseMaterialStatus;
  originalFileName: string;
  fileSizeBytes: number;
  mimeType: string;
  downloadCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  uploaderName?: string;
}

export interface OfferingMaterialsResponse {
  materials: CourseMaterialItem[];
  stats: {
    total: number;
    published: number;
    draft: number;
    archived: number;
    totalDownloads: number;
  };
}

// =====================================================
// COURSE ANNOUNCEMENTS & DISCUSSIONS ENGINE (BB-07I)
// =====================================================

export type AnnouncementPriority = 'NORMAL' | 'IMPORTANT' | 'URGENT';
export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface CourseAnnouncementItem {
  id: string;
  offeringId: string;
  lecturerId: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  };
}

export interface OfferingAnnouncementsResponse {
  offering: {
    id: string;
    academicSession: string;
    semester: string;
    courseCode: string;
    courseTitle: string;
  };
  announcements: CourseAnnouncementItem[];
  metrics: {
    total: number;
    published: number;
    draft: number;
    archived: number;
    urgent: number;
  };
}

export interface CourseDiscussionReplyItem {
  id: string;
  discussionId: string;
  authorRole: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    role: string;
  };
}

export interface CourseDiscussionItem {
  id: string;
  offeringId: string;
  announcementId?: string | null;
  title: string;
  content: string;
  authorRole: string;
  isPinned: boolean;
  isLocked: boolean;
  replyCount: number;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
    role: string;
  };
}

export interface OfferingDiscussionsResponse {
  offering: {
    id: string;
    code: string;
    title: string;
    academicSession: string;
    semester: string;
  };
  discussions: CourseDiscussionItem[];
}

export interface DiscussionDetailsResponse {
  discussion: CourseDiscussionItem;
  replies: CourseDiscussionReplyItem[];
}




