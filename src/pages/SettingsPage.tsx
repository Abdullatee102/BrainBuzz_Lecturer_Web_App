import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme, type Theme } from '../context/ThemeContext';
import { apiClient, getErrorMessage } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { getAssetUrl } from '../lib/utils';
import {
  User,
  Mail,
  GraduationCap,
  Building,
  KeyRound,
  Shield,
  Upload,
  Trash2,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, login } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Profile Form State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.photoURL || null);
  const [avatarError, setAvatarError] = useState(false);

  const effectiveAvatarUrl = !avatarError
    ? avatarPreview
      ? avatarPreview.startsWith('data:')
        ? avatarPreview
        : getAssetUrl(avatarPreview)
      : getAssetUrl(user?.photoURL)
    : null;

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Avatar Upload State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Profile Update Handler
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);
    setIsUpdatingProfile(true);

    try {
      const res = await apiClient.patch<{ status: string; message: string; user: any }>(
        '/lecturer/auth/profile',
        {
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim() || null,
          bio: bio.trim() || null,
        }
      );

      setProfileSuccess('Profile updated successfully!');
      // Update local storage user if returned
      if (res.data?.user) {
        const stored = localStorage.getItem('brainbuzz_lecturer_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          localStorage.setItem(
            'brainbuzz_lecturer_user',
            JSON.stringify({ ...parsed, ...res.data.user })
          );
        }
      }
    } catch (err: any) {
      setProfileError(getErrorMessage(err));
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Avatar Upload Handler
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setProfileError('Invalid image type. Please select a JPEG, PNG, or WEBP photo.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setProfileError('File exceeds 2MB size limit. Please choose a smaller photo.');
      return;
    }

    // Local preview immediately
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarError(false);
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploadingAvatar(true);
    setProfileError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient.post<{ status: string; message: string; photoURL: string }>(
        '/lecturer/auth/profile/avatar',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setProfileSuccess('Profile picture updated successfully!');
      setAvatarError(false);
      setAvatarPreview(res.data.photoURL);

      const stored = localStorage.getItem('brainbuzz_lecturer_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.setItem(
          'brainbuzz_lecturer_user',
          JSON.stringify({ ...parsed, photoURL: res.data.photoURL })
        );
      }
    } catch (err: any) {
      setProfileError(getErrorMessage(err));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Avatar Remove Handler
  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    setProfileError(null);

    try {
      await apiClient.delete('/lecturer/auth/profile/avatar');
      setAvatarError(false);
      setAvatarPreview(null);
      setProfileSuccess('Profile picture removed.');

      const stored = localStorage.getItem('brainbuzz_lecturer_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.setItem(
          'brainbuzz_lecturer_user',
          JSON.stringify({ ...parsed, photoURL: null })
        );
      }
    } catch (err: any) {
      setProfileError(getErrorMessage(err));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Password Change Handler
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsChangingPassword(true);

    try {
      await apiClient.patch('/lecturer/auth/password', {
        currentPassword,
        newPassword,
      });

      setPasswordSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(getErrorMessage(err));
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your academic profile, credentials, security, and interface appearance.
        </p>
      </div>

      {/* 1. Profile Overview & Picture */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Lecturer Profile & Affiliation
          </h2>
        </div>

        {/* Avatar & Identifiers */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative group">
            <div className="w-20 h-20 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 border-2 border-indigo-200 dark:border-indigo-800 flex items-center justify-center overflow-hidden shadow-inner">
              {effectiveAvatarUrl ? (
                <img
                  src={effectiveAvatarUrl}
                  alt={user?.fullName || 'Avatar'}
                  className="w-full h-full object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {user?.fullName?.charAt(0) || 'L'}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-lg bg-indigo-600 text-white shadow hover:bg-indigo-700 transition-colors"
              title="Upload new picture"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarFileChange}
              className="hidden"
            />
          </div>

          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                {user?.fullName || 'Faculty Member'}
              </h3>
              <Badge variant="purple" size="sm">
                LECTURER
              </Badge>
              <Badge variant="success" size="sm">
                ACTIVE
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
              <Mail className="w-3.5 h-3.5" />
              <span>{user?.email}</span>
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="text-xs h-8"
              >
                <Upload className="w-3 h-3 mr-1.5" />
                <span>Upload Photo</span>
              </Button>
              {avatarPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  disabled={isUploadingAvatar}
                  className="text-xs h-8 text-rose-600 hover:text-rose-700 dark:text-rose-400"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  <span>Remove</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Institutional Affiliation (Protected View) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider block">
              Faculty Affiliation
            </span>
            <span className="font-medium text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-indigo-500" />
              {user?.facultyName || 'Faculty of Computing & Informatics'}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider block">
              Department Affiliation
            </span>
            <span className="font-medium text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
              {user?.departmentName || 'Department of Computer Science'}
            </span>
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleProfileSubmit} className="space-y-4 pt-2">
          {profileSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Academic Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+234..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Academic Bio / Research Specialization
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Distributed Systems, Human-Computer Interaction, Machine Learning..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" size="sm" type="submit" disabled={isUpdatingProfile}>
              {isUpdatingProfile ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Profile Changes</span>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* 2. Appearance & Theme Settings */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <Sun className="w-5 h-5 text-amber-500" />
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Appearance & Theme
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize the visual palette. Settings are preserved across browser sessions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Light Theme */}
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between h-28 ${
              theme === 'light'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <Sun className={`w-5 h-5 ${theme === 'light' ? 'text-indigo-600' : 'text-slate-400'}`} />
              {theme === 'light' && (
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Light Mode</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Clean, crisp daylight layout</p>
            </div>
          </button>

          {/* Dark Theme */}
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between h-28 ${
              theme === 'dark'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <Moon className={`w-5 h-5 ${theme === 'dark' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              {theme === 'dark' && (
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Dark Mode</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Comfortable low-glare dark styling</p>
            </div>
          </button>

          {/* System Default */}
          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between h-28 ${
              theme === 'system'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <Laptop className={`w-5 h-5 ${theme === 'system' ? 'text-indigo-600' : 'text-slate-400'}`} />
              {theme === 'system' && (
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">System Default</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Syncs with OS (Currently {resolvedTheme})
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 3. Password & Security */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <KeyRound className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Password & Security
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Update your account password or review institutional login credentials.
            </p>
          </div>
        </div>

        {passwordSuccess && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              required
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type new password"
              required
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="pt-2">
            <Button variant="primary" size="sm" type="submit" disabled={isChangingPassword}>
              {isChangingPassword ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

