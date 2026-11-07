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

export function formatUserDisplayId(user?: {
  id?: string;
  role?: string | null;
  departmentCode?: string | null;
  departmentName?: string | null;
  username?: string | null;
  matricNumber?: string | null;
  customId?: string | null;
} | null): string {
  if (!user) return '—';
  if (user.customId) return user.customId;
  if (!user.id) return '—';

  const shortHex = user.id.replace(/-/g, '').slice(-4).toUpperCase();
  const dept = (user.departmentCode || (user.departmentName ? user.departmentName.slice(0, 3) : 'GEN')).toUpperCase();

  if (user.role === 'LECTURER' || !user.role) {
    return `LECTURER-${dept}-${shortHex}`;
  }
  if (user.role === 'STUDENT') {
    if (user.matricNumber) return user.matricNumber;
    if (user.username && /^\d{5,9}$/.test(user.username)) return user.username;
    return `STUDENT-${dept}-${shortHex}`;
  }
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || (user.role && user.role.includes('ADMIN'))) {
    return `ADMIN-${shortHex}`;
  }
  return `USER-${shortHex}`;
}

