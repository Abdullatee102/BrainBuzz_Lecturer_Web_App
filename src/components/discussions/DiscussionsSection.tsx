import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '../../lib/api';
import type {
  CourseDiscussionItem,
  CourseDiscussionReplyItem,
  OfferingDiscussionsResponse,
  DiscussionDetailsResponse,
} from '../../types/api';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorState } from '../ui/ErrorState';
import {
  MessageSquare,
  Plus,
  Pin,
  Lock,
  Unlock,
  Trash2,
  Clock,
  User,
  Send,
  X,
  MessageCircle,
  AlertCircle,
} from 'lucide-react';

interface DiscussionsSectionProps {
  offeringId: string;
  courseCode: string;
  courseTitle: string;
}

export const DiscussionsSection: React.FC<DiscussionsSectionProps> = ({
  offeringId,
  courseCode,
  courseTitle,
}) => {
  const queryClient = useQueryClient();

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [threadTitle, setThreadTitle] = useState('');
  const [threadContent, setThreadContent] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Reply Form State inside active thread
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);

  // 1. Fetch discussion threads
  const { data, isLoading, error, refetch } = useQuery<{
    status: string;
    data: OfferingDiscussionsResponse;
  }>({
    queryKey: ['offeringDiscussions', offeringId],
    queryFn: async () => {
      const res = await apiClient.get(`/lecturer/offerings/${offeringId}/discussions`);
      return res.data;
    },
  });

  const discussions = data?.data?.discussions || [];

  // 2. Fetch active thread details and replies
  const {
    data: threadData,
    isLoading: isThreadLoading,
    refetch: refetchThread,
  } = useQuery<{
    status: string;
    data: DiscussionDetailsResponse;
  }>({
    queryKey: ['discussionDetails', offeringId, activeThreadId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/lecturer/offerings/${offeringId}/discussions/${activeThreadId}`
      );
      return res.data;
    },
    enabled: !!activeThreadId,
  });

  const activeDiscussion = threadData?.data?.discussion;
  const activeReplies = threadData?.data?.replies || [];

  // 3. Create discussion mutation
  const createThreadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/lecturer/offerings/${offeringId}/discussions`, {
        title: threadTitle.trim(),
        content: threadContent.trim(),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offeringDiscussions', offeringId] });
      setIsCreateModalOpen(false);
      setThreadTitle('');
      setThreadContent('');
      setCreateError(null);
    },
    onError: (err: any) => {
      setCreateError(getErrorMessage(err));
    },
  });

  // 4. Post reply mutation
  const replyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(
        `/lecturer/offerings/${offeringId}/discussions/${activeThreadId}/replies`,
        {
          content: replyText.trim(),
        }
      );
      return res.data;
    },
    onSuccess: () => {
      setReplyText('');
      setReplyError(null);
      refetchThread();
      queryClient.invalidateQueries({ queryKey: ['offeringDiscussions', offeringId] });
    },
    onError: (err: any) => {
      setReplyError(getErrorMessage(err));
    },
  });

  // 5. Moderate thread (pin / lock)
  const moderateMutation = useMutation({
    mutationFn: async ({
      discussionId,
      isPinned,
      isLocked,
    }: {
      discussionId: string;
      isPinned?: boolean;
      isLocked?: boolean;
    }) => {
      const res = await apiClient.patch(
        `/lecturer/offerings/${offeringId}/discussions/${discussionId}/moderate`,
        { isPinned, isLocked }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offeringDiscussions', offeringId] });
      if (activeThreadId) {
        refetchThread();
      }
    },
  });

  // 6. Delete thread
  const deleteThreadMutation = useMutation({
    mutationFn: async (discussionId: string) => {
      const res = await apiClient.delete(
        `/lecturer/offerings/${offeringId}/discussions/${discussionId}`
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offeringDiscussions', offeringId] });
      if (activeThreadId) {
        setActiveThreadId(null);
      }
    },
  });

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
        title="Failed to load course discussions"
        message={getErrorMessage(error)}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            Class Discussions & Q&A
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Engage with students, answer academic questions, and moderate class topics
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setCreateError(null);
            setIsCreateModalOpen(true);
          }}
          className="self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Start New Discussion
        </Button>
      </div>

      {/* Discussion Threads List */}
      {discussions.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">No Discussions Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Start a discussion topic for {courseCode} to encourage class engagement and collaboration.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Start First Topic
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {discussions.map((d) => (
            <Card
              key={d.id}
              className={`p-4 sm:p-5 transition-shadow hover:shadow-sm border cursor-pointer ${
                d.isPinned
                  ? 'border-indigo-200 bg-indigo-50/20'
                  : 'border-slate-200/90 bg-white hover:border-slate-300'
              }`}
              onClick={() => setActiveThreadId(d.id)}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {d.isPinned && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                        <Pin className="w-3 h-3 text-indigo-600" /> PINNED
                      </span>
                    )}
                    {d.isLocked && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                        <Lock className="w-3 h-3 text-amber-600" /> LOCKED
                      </span>
                    )}
                    <h3 className="text-sm font-bold text-slate-900">{d.title}</h3>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{d.author?.fullName}</span>
                    <Badge variant={d.authorRole === 'LECTURER' ? 'purple' : 'default'} size="sm">
                      {d.authorRole}
                    </Badge>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Active {new Date(d.lastActivityAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-start">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
                    <MessageCircle className="w-3.5 h-3.5 text-slate-500" />
                    {d.replyCount} {d.replyCount === 1 ? 'reply' : 'replies'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{d.content}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Thread Details & Replies Modal */}
      {activeThreadId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto max-h-[90vh] flex flex-col">
            {/* Thread Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="pr-2">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {activeDiscussion?.isPinned && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                      <Pin className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> PINNED
                    </span>
                  )}
                  {activeDiscussion?.isLocked && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded">
                      <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" /> LOCKED
                    </span>
                  )}
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{activeDiscussion?.title}</h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Posted by <strong className="text-slate-800 dark:text-slate-200">{activeDiscussion?.author?.fullName}</strong></span>
                  <Badge variant={activeDiscussion?.authorRole === 'LECTURER' ? 'purple' : 'default'} size="sm">
                    {activeDiscussion?.authorRole}
                  </Badge>
                  <span>•</span>
                  <span>{activeDiscussion && new Date(activeDiscussion.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <button
                onClick={() => setActiveThreadId(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Moderation Action Toolbar */}
            {activeDiscussion && (
              <div className="py-2.5 px-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Lecturer Moderation:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() =>
                      moderateMutation.mutate({
                        discussionId: activeDiscussion.id,
                        isPinned: !activeDiscussion.isPinned,
                      })
                    }
                  >
                    <Pin className="w-3 h-3 mr-1" />
                    {activeDiscussion.isPinned ? 'Unpin' : 'Pin to Top'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() =>
                      moderateMutation.mutate({
                        discussionId: activeDiscussion.id,
                        isLocked: !activeDiscussion.isLocked,
                      })
                    }
                  >
                    {activeDiscussion.isLocked ? (
                      <>
                        <Unlock className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" /> Unlock
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 mr-1 text-amber-600 dark:text-amber-400" /> Lock
                      </>
                    )}
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => deleteThreadMutation.mutate(activeDiscussion.id)}
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            )}

            {/* Topic Main Content */}
            <div className="py-4 border-b border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
              {activeDiscussion?.content}
            </div>

            {/* Replies List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Replies ({activeReplies.length})
              </h4>

              {isThreadLoading ? (
                <div className="py-6 flex justify-center">
                  <LoadingSpinner size="md" />
                </div>
              ) : activeReplies.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  No replies yet. Be the first to reply!
                </div>
              ) : (
                activeReplies.map((r) => (
                  <div
                    key={r.id}
                    className={`p-3 rounded-xl border text-xs leading-relaxed ${
                      r.authorRole === 'LECTURER'
                        ? 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900/50 text-purple-950 dark:text-purple-200'
                        : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{r.author?.fullName}</span>
                        <Badge variant={r.authorRole === 'LECTURER' ? 'purple' : 'default'} size="sm">
                          {r.authorRole}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="whitespace-pre-line">{r.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Reply Input or Locked Notice */}
            {activeDiscussion?.isLocked ? (
              <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <span>This discussion topic is locked. New replies are disabled.</span>
              </div>
            ) : (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                {replyError && (
                  <div className="mb-2 p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-lg">
                    {replyError}
                  </div>
                )}
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    placeholder="Write a response as lecturer..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    className="self-end h-9 px-3"
                    onClick={() => replyMutation.mutate()}
                    disabled={!replyText.trim() || replyMutation.isPending}
                  >
                    <Send className="w-4 h-4 mr-1" /> Reply
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Start New Discussion Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Start Discussion Topic
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-lg">
                {createError}
              </div>
            )}

            <div className="space-y-4 text-xs mt-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Topic Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Week 4 Lab Discussion & Common Questions"
                  value={threadTitle}
                  onChange={(e) => setThreadTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Prompt / Description *</label>
                <textarea
                  rows={4}
                  placeholder="Share details, discussion prompts, or problem statements for class discussion..."
                  value={threadContent}
                  onChange={(e) => setThreadContent(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => createThreadMutation.mutate()}
                disabled={!threadTitle.trim() || !threadContent.trim() || createThreadMutation.isPending}
              >
                <Send className="w-4 h-4 mr-1.5" /> Start Topic
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

