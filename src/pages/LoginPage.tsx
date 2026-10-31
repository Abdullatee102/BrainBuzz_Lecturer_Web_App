import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient, getErrorMessage } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Eye, EyeOff, Lock, Mail, AlertCircle, ShieldCheck, GraduationCap } from 'lucide-react';
import type { LecturerLoginResponse } from '../types/api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    if (searchParams.get('expired')) {
      return 'Your lecturer session has expired. Please sign in again.';
    }
    return null;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide your university email (or username) and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<LecturerLoginResponse>('/lecturer/login', {
        email: email.trim(),
        password,
      });

      const { tokens, user } = response.data;

      // Defensive verification: ensure account is an active LECTURER
      if (user.role !== 'LECTURER') {
        setError('Access denied. This portal is restricted to authorized university lecturers.');
        return;
      }

      if (user.status !== 'ACTIVE') {
        setError(`Access denied. Your lecturer account status is ${user.status.toLowerCase()}.`);
        return;
      }

      if (tokens?.accessToken && user) {
        login(tokens, user);
        const from = searchParams.get('from') || '/dashboard';
        navigate(from, { replace: true });
      } else {
        setError('Unexpected authentication response from backend.');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-900 items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/60 p-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white font-extrabold text-2xl shadow-lg shadow-indigo-500/30 mb-4">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Brain Buzz</h1>
          <p className="text-xs text-indigo-400 mt-1 font-semibold uppercase tracking-wider">
            Lecturer Web Dashboard
          </p>
          <p className="text-xs text-slate-400 mt-1 font-normal">
            Sign in to access your assigned academic courses
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 p-3.5 mb-6 text-sm text-rose-200 bg-rose-950/60 border border-rose-800/60 rounded-xl"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
            <span className="flex-1 text-xs leading-relaxed">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="lecturer-email"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              Academic Email or Username
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="lecturer-email"
                type="text"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="lecturer@university.edu.ng"
                className="w-full bg-slate-900/80 border border-slate-700 text-slate-100 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-500"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="lecturer-password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="lecturer-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-900/80 border border-slate-700 text-slate-100 rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              className="w-full py-2.5 font-semibold text-sm shadow-indigo-600/30"
            >
              Sign In to Lecturer Dashboard
            </Button>
          </div>
        </form>

        {/* Security & Pilot Notice */}
        <div className="mt-8 pt-4 border-t border-slate-700/60 flex flex-col items-center gap-1.5 text-slate-400 text-xs text-center">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Authorized Faculty Authentication</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Non-administrative academic access. Student accounts are prohibited.
          </p>
        </div>
      </div>
    </div>
  );
};
