import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatSemester(semester?: string | null): string {
  if (!semester) return '—';
  const lower = semester.toLowerCase();
  if (lower === 'harmattan') return 'Harmattan (1st)';
  if (lower === 'rain') return 'Rain (2nd)';
  return semester.charAt(0).toUpperCase() + semester.slice(1);
}

export function formatLevel(level?: number | string | null): string {
  if (!level) return '—';
  return `${level} Level`;
}

export function getAssetUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const apiUrl = (import.meta as any).env?.VITE_API_URL || '';
  const origin = apiUrl ? apiUrl.replace(/\/api\/?$/, '') : '';
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

export const CANONICAL_USER_MAP: Record<string, string> = {
  // Real Admin Accounts
  'opeabdullateef12@gmail.com': 'BB-ADMIN-001',
  'd2c331f7-ae9f-4a56-89ea-9114c382dd22': 'BB-ADMIN-001',
  'abdullateefpopoola12@gmail.com': 'BB-ADMIN-002',
  '91e62bbf-7916-4d0b-9612-ec3b05eaeba6': 'BB-ADMIN-002',

  // Real Lecturer Accounts
  'abdullateefpopoola@gmail.com': 'BB-LEC-001',
  'd235dba6-c98f-4e6f-9851-209bdacbdf24': 'BB-LEC-001',
  'abdullateefpopoola1@gmail.com': 'BB-LEC-002',
  '7465da86-26a6-4a82-a058-b1441f26fd9b': 'BB-LEC-002',
  'abdullateefope2007@gmail.com': 'BB-LEC-003',
  'f9cfebad-a5cd-4a29-8b91-cc9d9e680c04': 'BB-LEC-003',

  // Real Student Accounts
  'ibrahimpopoola@gmail.com': 'BB-STU-001',
  '4fdd17ea-9479-4eb2-81c9-f1d75496224f': 'BB-STU-001',
  'shineon816@gmail.com': 'BB-STU-002',
  'c30b6f17-8233-4bae-b725-20034a1a0287': 'BB-STU-002',
  'popoolabisolamorufat@gmail.com': 'BB-STU-003',
  'c32c7d6a-8730-415f-b651-f15d8e467f76': 'BB-STU-003',
  'muhammedpopoola947@gmail.com': 'BB-STU-004',
  '4f1d4fad-8134-4c6b-96dc-5ecfbf0029d6': 'BB-STU-004',
  'kolaisreal2005@gmail.com': 'BB-STU-005',
  'c266b4d5-8692-4bc1-8a9c-8608d8e10691': 'BB-STU-005',
  'kehindeadeyemo701@gmail.com': 'BB-STU-006',
  'f32d7a74-2db0-4c61-8998-aeb231a4c8e3': 'BB-STU-006',
  'opeyemiabdull07@gmail.com': 'BB-STU-007',
  '45a0ec0a-ea56-4620-814f-c3ef83330c10': 'BB-STU-007',
  'adeosunoluwapelumi34@gmail.com': 'BB-STU-008',
  '543c3632-df05-47ab-8631-5a9e315d75ac': 'BB-STU-008',
};

export function formatUserDisplayId(user?: {
  id?: string;
  email?: string | null;
  role?: string | null;
  displayId?: string | null;
  customId?: string | null;
  departmentCode?: string | null;
  departmentName?: string | null;
  username?: string | null;
  matricNumber?: string | null;
} | null): string {
  if (!user) return '—';
  // Strictly prioritize new generic BB- format
  if (user.displayId && user.displayId.startsWith('BB-')) return user.displayId;
  if (user.customId && user.customId.startsWith('BB-')) return user.customId;

  // Check canonical user map by email or ID
  if (user.email && CANONICAL_USER_MAP[user.email.toLowerCase()]) {
    return CANONICAL_USER_MAP[user.email.toLowerCase()];
  }
  if (user.id && CANONICAL_USER_MAP[user.id.toLowerCase()]) {
    return CANONICAL_USER_MAP[user.id.toLowerCase()];
  }

  if (!user.id) return '—';

  const shortHex = user.id.replace(/-/g, '').slice(-4).toUpperCase();
  const role = (user.role || 'LECTURER').toUpperCase();

  if (role === 'LECTURER') {
    return `BB-LEC-${shortHex}`;
  }
  if (
    role === 'SUPER_ADMIN' ||
    role === 'CONTENT_ADMIN' ||
    role === 'SUPPORT_AGENT' ||
    role === 'NOTIFICATION_ADMIN' ||
    role === 'MODERATOR' ||
    role.includes('ADMIN')
  ) {
    return `BB-ADMIN-${shortHex}`;
  }
  if (role === 'STUDENT') {
    if (user.matricNumber) return user.matricNumber;
    return `BB-STU-${shortHex}`;
  }
  return `BB-LEC-${shortHex}`;
}

