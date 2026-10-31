import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogOut, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const UnauthorizedPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-900 items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/60 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-800/60 text-rose-400 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-white">
          Unauthorized Access (403)
        </h1>

        <p className="text-xs text-rose-400 mt-1 font-semibold uppercase tracking-wider">
          Lecturer Role Required
        </p>

        <p className="text-xs text-slate-300 mt-3 leading-relaxed">
          The authenticated account ({user?.email || 'user'}) does not have an active{' '}
          <code className="text-indigo-400 font-mono font-semibold">LECTURER</code> role. Student accounts and administrative staff cannot access the lecturer dashboard.
        </p>

        <div className="mt-8 pt-6 border-t border-slate-700/60 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="danger"
            size="md"
            onClick={() => logout()}
            className="w-full sm:w-auto"
          >
            <LogOut className="w-4 h-4 mr-1.5" />
            <span>Sign Out & Switch Account</span>
          </Button>

          <Link to="/login" className="w-full sm:w-auto">
            <Button variant="outline" size="md" className="w-full bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span>Back to Login</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
