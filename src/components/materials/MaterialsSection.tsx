import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '../../lib/api';
import type {
  CourseMaterialItem,
  OfferingMaterialsResponse,
  CourseMaterialCategory,
  CourseMaterialStatus,
} from '../../types/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorState } from '../ui/ErrorState';
import {
  BookOpen,
  Plus,
  Download,
  Trash2,
  Edit2,
  UploadCloud,
  FileText,
  File,
  X,
  AlertCircle,
  CheckCircle2,
  Filter,
  Eye,
  Archive,
  FolderArchive,
  Layers,
} from 'lucide-react';

interface MaterialsSectionProps {
  offeringId: string;
  courseCode: string;
  courseTitle: string;
}

const CATEGORIES: { label: string; value: string }[] = [
  { label: 'All Categories', value: '' },
  { label: 'Lecture Notes', value: 'LECTURE_NOTE' },
  { label: 'Syllabus', value: 'SYLLABUS' },
  { label: 'Slides / Presentations', value: 'SLIDE' },
  { label: 'Lab Manuals', value: 'LAB_MANUAL' },
  { label: 'Assignment Briefs', value: 'ASSIGNMENT_BRIEF' },
  { label: 'Readings', value: 'READING' },
  { label: 'Other', value: 'OTHER' },
];

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') {
    return <FileText className="w-5 h-5 text-rose-500" />;
  }
  if (ext === 'doc' || ext === 'docx') {
    return <FileText className="w-5 h-5 text-blue-500" />;
  }
  if (ext === 'ppt' || ext === 'pptx') {
    return <Layers className="w-5 h-5 text-amber-500" />;
  }
  if (ext === 'zip') {
    return <FolderArchive className="w-5 h-5 text-purple-500" />;
  }
  return <File className="w-5 h-5 text-slate-500" />;
}

export const MaterialsSection: React.FC<MaterialsSectionProps> = ({
  offeringId,
  courseCode,
  courseTitle,
}) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState<CourseMaterialCategory>('LECTURE_NOTE');
  const [uploadStatus, setUploadStatus] = useState<CourseMaterialStatus>('PUBLISHED');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Edit modal state
  const [editingMaterial, setEditingMaterial] = useState<CourseMaterialItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<CourseMaterialCategory>('LECTURE_NOTE');
  const [editStatus, setEditStatus] = useState<CourseMaterialStatus>('PUBLISHED');
  const [editError, setEditError] = useState<string | null>(null);

  // Query materials
  const { data, isLoading, isError, error, refetch } = useQuery<{
    status: string;
    data: OfferingMaterialsResponse;
  }>({
    queryKey: ['offeringMaterials', offeringId, selectedCategory, selectedStatus],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (selectedCategory) params.category = selectedCategory;
      if (selectedStatus) params.status = selectedStatus;

      const res = await apiClient.get(`/lecturer/offerings/${offeringId}/materials`, {
        params,
      });
      return res.data;
    },
    enabled: !!offeringId,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile) throw new Error('Please select a file to upload.');
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle.trim());
      if (uploadDescription.trim()) formData.append('description', uploadDescription.trim());
      formData.append('category', uploadCategory);
      formData.append('status', uploadStatus);

      const res = await apiClient.post(
        `/lecturer/offerings/${offeringId}/materials`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offeringMaterials', offeringId] });
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadDescription('');
      setUploadError(null);
    },
    onError: (err) => {
      setUploadError(getErrorMessage(err));
    },
  });

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingMaterial) return;
      const res = await apiClient.patch(
        `/lecturer/offerings/${offeringId}/materials/${editingMaterial.id}`,
        {
          title: editTitle.trim(),
          description: editDescription.trim() || undefined,
          category: editCategory,
          status: editStatus,
        }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offeringMaterials', offeringId] });
      setEditingMaterial(null);
      setEditError(null);
    },
    onError: (err) => {
      setEditError(getErrorMessage(err));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (materialId: string) => {
      const res = await apiClient.delete(
        `/lecturer/offerings/${offeringId}/materials/${materialId}`
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offeringMaterials', offeringId] });
    },
  });

  // Handle download
  const handleDownload = async (material: CourseMaterialItem) => {
    try {
      const response = await apiClient.get(
        `/lecturer/offerings/${offeringId}/materials/${material.id}/download`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', material.originalFileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Download failed: ${getErrorMessage(err)}`);
    }
  };

  const materials = data?.data?.materials || [];
  const stats = data?.data?.stats;

  return (
    <div className="space-y-6">
      {/* Top Banner & Upload Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span>Course Materials & Learning Resources</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Academic handouts, lecture slides, lab manuals, and syllabus files for {courseCode}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setUploadError(null);
            setIsUploadModalOpen(true);
          }}
          className="flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Material</span>
        </Button>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Total Resources
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {isLoading ? '...' : stats?.total ?? 0}
              </p>
              <p className="text-[10px] text-slate-500">Course materials</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Published
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {isLoading ? '...' : stats?.published ?? 0}
              </p>
              <p className="text-[10px] text-slate-500">Visible to students</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Drafts
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {isLoading ? '...' : stats?.draft ?? 0}
              </p>
              <p className="text-[10px] text-slate-500">Preparation mode</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Student Downloads
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {isLoading ? '...' : stats?.totalDownloads ?? 0}
              </p>
              <p className="text-[10px] text-slate-500">Resource accesses</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedCategory === cat.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Materials List */}
      {isLoading ? (
        <LoadingSpinner label="Loading course materials..." size="md" className="py-12" />
      ) : isError ? (
        <ErrorState
          title="Failed to load materials"
          message={getErrorMessage(error)}
          onRetry={() => refetch()}
        />
      ) : materials.length === 0 ? (
        <div className="text-center py-14 bg-white border border-dashed border-slate-200 rounded-2xl">
          <UploadCloud className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No course materials found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Upload lecture notes, presentation slides, syllabus PDFs, or lab manuals for enrolled students.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            className="mt-4"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Upload First Resource</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {materials.map((item) => (
            <Card key={item.id} className="hover:border-slate-300 transition-colors">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {getFileIcon(item.originalFileName)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{item.title}</span>
                      <Badge variant="purple" size="sm">
                        {item.category.replace('_', ' ')}
                      </Badge>
                      <Badge
                        variant={
                          item.status === 'PUBLISHED'
                            ? 'success'
                            : item.status === 'DRAFT'
                            ? 'warning'
                            : 'default'
                        }
                        size="sm"
                      >
                        {item.status}
                      </Badge>
                    </div>

                    {item.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 max-w-2xl">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-0.5">
                      <span className="font-mono text-slate-500 font-medium">
                        {item.originalFileName} ({formatBytes(item.fileSizeBytes)})
                      </span>
                      <span>•</span>
                      <span>
                        Uploaded {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-indigo-600 font-medium">
                        <Download className="w-3 h-3" />
                        {item.downloadCount} downloads
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(item)}
                    className="flex items-center gap-1 text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingMaterial(item);
                      setEditTitle(item.title);
                      setEditDescription(item.description || '');
                      setEditCategory(item.category);
                      setEditStatus(item.status);
                      setEditError(null);
                    }}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Are you sure you want to delete "${item.title}"? The file will be removed permanently.`
                        )
                      ) {
                        deleteMutation.mutate(item.id);
                      }
                    }}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Material Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-indigo-600" />
                <span>Upload Course Material</span>
              </h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                uploadMutation.mutate();
              }}
              className="mt-4 space-y-4"
            >
              {/* File Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  File Resource <span className="text-rose-500">* (Max 25 MB)</span>
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  required
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.jpg,.jpeg,.png,.webp,.zip"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setUploadFile(f);
                      if (!uploadTitle.trim()) {
                        // Default title to base file name without extension
                        const baseName = f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
                        setUploadTitle(baseName);
                      }
                    }
                  }}
                  className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-slate-200 rounded-lg p-1.5 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Supported formats: PDF, DOC, DOCX, PPT, PPTX, TXT, MD, Images, ZIP
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Material Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 4: Database Normalization Slides"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as CourseMaterialCategory)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="LECTURE_NOTE">Lecture Note</option>
                    <option value="SYLLABUS">Syllabus</option>
                    <option value="SLIDE">Slide / Presentation</option>
                    <option value="LAB_MANUAL">Lab Manual</option>
                    <option value="ASSIGNMENT_BRIEF">Assignment Brief</option>
                    <option value="READING">Reading Material</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Publication Status
                  </label>
                  <select
                    value={uploadStatus}
                    onChange={(e) => setUploadStatus(e.target.value as CourseMaterialStatus)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="PUBLISHED">Published (Visible to students)</option>
                    <option value="DRAFT">Draft (Lecturer only)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context or guidance on how students should study this resource..."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUploadModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={uploadMutation.isPending || !uploadFile || !uploadTitle.trim()}
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload & Save'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Material Modal */}
      {editingMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                <span>Edit Resource Details</span>
              </h3>
              <button
                onClick={() => setEditingMaterial(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                editMutation.mutate();
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as CourseMaterialCategory)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="LECTURE_NOTE">Lecture Note</option>
                    <option value="SYLLABUS">Syllabus</option>
                    <option value="SLIDE">Slide / Presentation</option>
                    <option value="LAB_MANUAL">Lab Manual</option>
                    <option value="ASSIGNMENT_BRIEF">Assignment Brief</option>
                    <option value="READING">Reading Material</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as CourseMaterialStatus)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingMaterial(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={editMutation.isPending || !editTitle.trim()}
                >
                  {editMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

