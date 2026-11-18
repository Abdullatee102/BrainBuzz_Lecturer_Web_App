export interface AcademicPrivilege {
  key: string;
  title: string;
  description: string;
  category: string;
}

export const LECTURER_ACADEMIC_PRIVILEGES: AcademicPrivilege[] = [
  {
    key: 'assessments.authoring',
    title: 'CBT & Theory Assessment Authoring',
    description: 'Design, schedule, and configure official computer-based and theoretical examination papers.',
    category: 'Assessments & Examinations',
  },
  {
    key: 'assessments.live_monitoring',
    title: 'Live Exam Monitoring & Session Security',
    description: 'Supervise ongoing assessments in real-time, monitor session activity, and manage student exam timers.',
    category: 'Assessments & Examinations',
  },
  {
    key: 'assessments.grading',
    title: 'Grading Desk & Gradebook Publishing',
    description: 'Review student essay responses, score theoretical submissions, curve scores, and publish official gradebooks.',
    category: 'Assessments & Examinations',
  },
  {
    key: 'attendance.management',
    title: 'Lecture Attendance Management',
    description: 'Create digital attendance sessions, generate check-in tokens, and track verified lecture attendance.',
    category: 'Classroom & Instruction',
  },
  {
    key: 'materials.distribution',
    title: 'Course Materials & Syllabus Distribution',
    description: 'Upload course lecture slides, syllabi, reading lists, and academic reference materials.',
    category: 'Classroom & Instruction',
  },
  {
    key: 'communications.discussions',
    title: 'Class Announcements & Discussion Moderation',
    description: 'Post timely course notices and moderate academic discussion channels with enrolled students.',
    category: 'Classroom & Instruction',
  },
];

export interface PrivilegeGroup {
  category: string;
  items: AcademicPrivilege[];
}

export function groupLecturerPrivileges(): PrivilegeGroup[] {
  const map = new Map<string, AcademicPrivilege[]>();
  for (const priv of LECTURER_ACADEMIC_PRIVILEGES) {
    const existing = map.get(priv.category) || [];
    existing.push(priv);
    map.set(priv.category, existing);
  }
  const groups: PrivilegeGroup[] = [];
  map.forEach((items, category) => {
    groups.push({ category, items });
  });
  return groups;
}
