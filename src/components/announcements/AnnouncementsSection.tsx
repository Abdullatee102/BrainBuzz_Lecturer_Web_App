import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '../../lib/api';
import type {
  CourseAnnouncementItem,
  OfferingAnnouncementsResponse,
  AnnouncementPriority,
  AnnouncementStatus,
} from '../../types/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorState } from '../ui/ErrorState';
import {
  Megaphone,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  ExternalLink,
  X,
  Send,
  Eye,
  Filter,
} from 'lucide-react';

interface AnnouncementsSectionProps {
  offeringId: string;
  courseCode: string;
  courseTitle: string;
}

export const AnnouncementsSection: React.FC<AnnouncementsSectionProps> = ({
  offeringId,
  courseCode,
  courseTitle,
}) => {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<CourseAnnouncementItem | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPriority, setFormPriority] = useState<AnnouncementPriority>('NORMAL');
  const [formStatus, setFormStatus] = useState<AnnouncementStatus>('PUBLISHED');
  const [formAttachmentUrl, setFormAttachmentUrl] = useState('');
  const [formAttachmentName, setFormAttachmentName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 1. Fetch announcements
  const { data, isLoading, error, refetch } = useQuery<{
    status: string;
    data: OfferingAnnouncementsResponse;
  }>({
    queryKey: ['offeringAnnouncements', offeringId, statusFilter, priorityFilter],
    queryFn: async () => {
      const res = await apiClient.get(`/lecturer/offerings/${offeringId}/announcements`, {
        params: {
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
        },
      });
      return res.data;
    },
  });

  const announcements = data?.data?.announcements || [];
  const metrics = data?.data?.metrics || { total: 0, published: 0, draft: 0, archived: 0, urgent: 0 };

  // 2. Open Modal for Create or Edit
  const openCreateModal = () => {
    setEditingAnnouncement(null);
    setFormTitle('');
    setFormContent('');
    setFormPriority('NORMAL');
    setFormStatus('PUBLISHED');
    setFormAttachmentUrl('');
    setFormAttachmentName('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (a: CourseAnnouncementItem) => {
    setEditingAnnouncement(a);
    setFormTitle(a.title);
    setFormContent(a.content);
    setFormPriority(a.priority);
    setFormStatus(a.status);
    setFormAttachmentUrl(a.attachmentUrl || '');
    setFormAttachmentName(a.attachmentName || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  // 3. Create or Update Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        title: formTitle.trim(),
        content: formContent.trim(),
        priority: formPriority,
        status: formStatus,
        attachmentUrl: formAttachmentUrl.trim() || null,
        attachmentName: formAttachmentName.trim() || null,
      };

      if (editingAnnouncement) {
        const res = await apiClient.patch(
          `/lecturer/offerings/${offeringId}/announcements/${editingAnnouncement.id}`,
          payload
        );
        return res.data;
      } else {
        const res = await apiClient.post(
          `/lecturer/offerings/${offeringId}/announcements`,
          payload
        );
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offeringAnnouncements', offeringId] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      setFormError(getErrorMessage(err));
    },
  });

  // 4. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      const res = await apiClient.delete(
        `/lecturer/offerings/${offeringId}/announcements/${announcementId}`
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offeringAnnouncements', offeringId] });
      setDeleteConfirmId(null);
    },
  });

  const getPriorityBadge = (priority: AnnouncementPriority) => {
    if (priority === 'URGENT') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          <Flame className="w-3 h-3 text-rose-600" /> URGENT
        </span>
      );
    }
    if (priority === 'IMPORTANT') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-600" /> IMPORTANT
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
        NORMAL
      </span>
    );
  };

  const getStatusBadge = (status: AnnouncementStatus) => {
    if (status === 'PUBLISHED') {
      return <Badge variant="success">PUBLISHED</Badge>;
    }
    if (status === 'DRAFT') {
      return <Badge variant="warning">DRAFT</Badge>;
    }
    return <Badge variant="default">ARCHIVED</Badge>;
  };

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load announcements"
        message={getErrorMessage(error)}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-white border border-slate-200/80 shadow-sm">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Notices</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{metrics.total}</div>
        </Card>

        <Card className="p-4 bg-emerald-50/50 border border-emerald-100 shadow-sm">
          <div className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Active Published</div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">{metrics.published}</div>
        </Card>

        <Card className="p-4 bg-amber-50/50 border border-amber-100 shadow-sm">
          <div className="text-xs font-medium text-amber-700 uppercase tracking-wider">Drafts</div>
          <div className="text-2xl font-bold text-amber-800 mt-1">{metrics.draft}</div>
        </Card>

        <Card className="p-4 bg-rose-50/50 border border-rose-100 shadow-sm">
          <div className="text-xs font-medium text-rose-700 uppercase tracking-wider">Urgent / Alerts</div>
          <div className="text-2xl font-bold text-rose-800 mt-1">{metrics.urgent}</div>
        </Card>
      </div>

      {/* Action and Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Filter:
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Priorities</option>
            <option value="NORMAL">Normal</option>
            <option value="IMPORTANT">Important</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={openCreateModal}
          className="self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Post Announcement
        </Button>
      </div>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
          <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">No Announcements Posted</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Keep students enrolled in {courseCode} updated with class announcements, exam alerts, and deadline notices.
          </p>
          <Button variant="primary" size="sm" onClick={openCreateModal} className="mt-4">
            <Plus className="w-4 h-4 mr-1.5" /> Create First Announcement
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card
              key={a.id}
              className={`p-4 sm:p-5 transition-shadow hover:shadow-sm border ${
                a.priority === 'URGENT'
                  ? 'border-rose-200 bg-rose-50/10'
                  : a.priority === 'IMPORTANT'
                  ? 'border-amber-200 bg-amber-50/10'
                  : 'border-slate-200/90 bg-white'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 mb-2.5">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{a.title}</h3>
                    {getPriorityBadge(a.priority)}
                    {getStatusBadge(a.status)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>By {a.author?.fullName || 'Lecturer'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(a.publishedAt || a.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-start">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(a)}
                    className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteConfirmId(a.id)}
                    className="h-8 px-2.5 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Announcement Body */}
              <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed mb-3">
                {a.content}
              </p>

              {/* Attachment link if present */}
              {a.attachmentUrl && (
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <a
                    href={a.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {a.attachmentName || 'View Attached Resource'}
                  </a>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                {editingAnnouncement ? 'Edit Announcement' : 'Post New Announcement'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <div className="space-y-4 text-xs mt-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Midterm Test Rescheduled to Room 302"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Notice Content *</label>
                <textarea
                  rows={4}
                  placeholder="Provide detailed information for enrolled students..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="IMPORTANT">Important (High Visibility)</option>
                    <option value="URGENT">Urgent (Immediate Push Alert)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Publish Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="PUBLISHED">Published (Notify Students)</option>
                    <option value="DRAFT">Draft (Save for Later)</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Attachment Link (Optional)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or resource URL"
                  value={formAttachmentUrl}
                  onChange={(e) => setFormAttachmentUrl(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {formAttachmentUrl && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Attachment Display Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Revised Syllabus Document"
                    value={formAttachmentName}
                    onChange={(e) => setFormAttachmentName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={!formTitle.trim() || !formContent.trim() || saveMutation.isPending}
              >
                <Send className="w-4 h-4 mr-1.5" />
                {editingAnnouncement ? 'Save Changes' : formStatus === 'PUBLISHED' ? 'Publish Notice' : 'Save Draft'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Delete Announcement?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              This notice will be permanently deleted from the course offering.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                disabled={deleteMutation.isPending}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

