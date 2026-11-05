import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient, getErrorMessage } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Eye, EyeOff, Lock, Mail, AlertCircle, ShieldCheck, GraduationCap, X, KeyRound } from 'lucide-react';
import type { LecturerLoginResponse } from '../types/api';

declare global {
  interface Window {
    google?: any;
  }
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showGoogleDevModal, setShowGoogleDevModal] = useState(false);
  const [customToken, setCustomToken] = useState('');
  const [error, setError] = useState<string | null>(() => {
    if (searchParams.get('expired')) {
      return 'Your lecturer session has expired. Please sign in again.';
    }
    return null;
  });

  const handleGoogleSuccess = async (idToken: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.post<LecturerLoginResponse>('/lecturer/auth/google', {
        idToken: idToken.trim(),
      });

      const { tokens, user } = response.data;

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
      setShowGoogleDevModal(false);
    }
  };

  useEffect(() => {
    const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const scriptId = 'google-gsi-client';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google?.accounts?.id) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (res: any) => {
              if (res.credential) {
                handleGoogleSuccess(res.credential);
              }
            },
          });
        }
      };
      document.body.appendChild(script);
    }
  }, []);

  const handleGoogleClick = () => {
    const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
    if (clientId && window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setShowGoogleDevModal(true);
        }
      });
    } else {
      setShowGoogleDevModal(true);
    }
  };

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

        {/* Google Sign-in Button */}
        <button
          type="button"
          onClick={handleGoogleClick}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-semibold text-sm shadow-md shadow-black/20 border border-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700/60" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-800/90 px-3 text-slate-400 font-semibold tracking-wider">
              Or with academic credentials
            </span>
          </div>
        </div>

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
            Institutional Google Workspace accounts or verified faculty credentials only.
          </p>
        </div>
      </div>

      {/* Google Token Dev/Fallback Modal */}
      {showGoogleDevModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2 text-white font-semibold text-base">
                <KeyRound className="w-5 h-5 text-indigo-400" />
                <span>Google Sign-In Token</span>
              </div>
              <button
                onClick={() => setShowGoogleDevModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              When Google Identity Services (GIS) client ID is configured, One-Tap sign-in triggers automatically.
              For local development or testing, you may paste a Google ID token or test token.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Google ID Token / Test Token
                </label>
                <textarea
                  rows={3}
                  value={customToken}
                  onChange={(e) => setCustomToken(e.target.value)}
                  placeholder="test-google-token:lecturer@university.edu.ng:Dr.+Jane:https://..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleDevModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isLoading}
                  disabled={!customToken.trim()}
                  onClick={() => handleGoogleSuccess(customToken)}
                >
                  Authenticate Token
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
