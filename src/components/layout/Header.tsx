import React from 'react';
import { Menu, LogOut, GraduationCap, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 text-slate-500 rounded-lg lg:hidden hover:bg-slate-100 hover:text-slate-700 focus:outline-none"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
            <span>Academic Portal</span>
          </div>
          <span className="text-xs text-slate-400 hidden md:inline">|</span>
          <span className="text-xs font-medium text-slate-500 hidden md:inline">
            Brain Buzz Educational Platform
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {user?.status && (
          <Badge
            variant={user.status === 'ACTIVE' ? 'success' : 'danger'}
            size="sm"
            className="hidden sm:inline-flex"
          >
            <ShieldCheck className="w-3 h-3 mr-1" />
            {user.status}
          </Badge>
        )}

        <div className="text-right hidden sm:block">
          <p className="text-xs font-semibold text-slate-900 leading-tight">
            {user?.fullName || 'Academic Staff'}
          </p>
          <p className="text-[11px] text-slate-500 leading-tight">
            {user?.email || 'Lecturer'}
          </p>
        </div>

        <button
          onClick={() => logout()}
          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
          title="Sign Out"
          aria-label="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
