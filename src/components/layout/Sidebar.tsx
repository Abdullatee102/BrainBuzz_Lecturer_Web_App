import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard,
  BookOpen,
  CalendarCheck2,
  CalendarClock,
  HelpCircle,
  FileSpreadsheet,
  FolderOpen,
  Megaphone,
  MessagesSquare,
  Settings,
  LogOut,
  X,
  GraduationCap,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { resolvedTheme, theme, setTheme } = useTheme();
  const location = useLocation();

  const mainNav = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Assigned Courses', to: '/courses', icon: BookOpen },
  ];

  const academicNav = [
    { name: 'Attendance', to: '/courses?tab=attendance', icon: CalendarCheck2 },
    { name: 'Assessments', to: '/courses?tab=assessments', icon: CalendarClock },
    { name: 'Question Bank', to: '/courses?tab=questions', icon: HelpCircle },
    { name: 'Gradebook', to: '/courses?tab=gradebook', icon: FileSpreadsheet },
    { name: 'Course Materials', to: '/courses?tab=materials', icon: FolderOpen },
    { name: 'Announcements', to: '/courses?tab=announcements', icon: Megaphone },
    { name: 'Discussions', to: '/courses?tab=discussions', icon: MessagesSquare },
  ];

  const accountNav = [
    { name: 'Settings', to: '/settings', icon: Settings },
  ];

  const isNavActive = (to: string) => {
    if (to.includes('?tab=')) {
      const tabParam = new URLSearchParams(to.split('?')[1]).get('tab');
      const currentTab = new URLSearchParams(location.search).get('tab');
      return location.pathname === '/courses' && currentTab === tabParam;
    }
    return location.pathname === to && !location.search.includes('tab=');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 dark:bg-slate-950 text-slate-100 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto border-r border-slate-800 dark:border-slate-800/80',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand & Portal Identity */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 text-white font-extrabold text-lg shadow-md shadow-indigo-600/30">
              B
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">
                Brain Buzz
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-400 block -mt-0.5">
                Lecturer Portal
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden hover:bg-slate-800 focus:outline-none"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Academic Role Indicator */}
        <div className="px-5 py-2.5 border-b border-slate-800/80 bg-slate-900/50 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
            Faculty Portal
          </span>
          <Badge variant="purple" size="sm">
            Active
          </Badge>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto" aria-label="Lecturer navigation">
          {/* Main Group */}
          <div>
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Main
            </span>
            <div className="space-y-0.5">
              {mainNav.map((item) => {
                const active = isNavActive(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => onClose()}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                      active
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    )}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Academic Management Group */}
          <div>
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Academic Management
            </span>
            <div className="space-y-0.5">
              {academicNav.map((item) => {
                const active = isNavActive(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => onClose()}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                      active
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    )}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Account Group */}
          <div>
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Account
            </span>
            <div className="space-y-0.5">
              {accountNav.map((item) => {
                const active = isNavActive(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => onClose()}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                      active
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    )}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Lecturer Profile Summary, Quick Theme & Logout */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.fullName?.charAt(0) || 'L'
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.fullName || 'Lecturer'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user?.email || '—'}
                </p>
              </div>
            </div>

            {/* Quick theme toggle */}
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-300" />
              )}
            </button>
          </div>

          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-slate-800"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
