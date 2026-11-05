import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Download,
  AlertTriangle,
  FileCode,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { apiClient, getErrorMessage } from '../../lib/api';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courseId: string;
  offeringId?: string;
  courseCode: string;
}

interface ParsedImportRow {
  rowIndex: number;
  type: 'cbt' | 'theory';
  question: string;
  options?: string[];
  correctAnswer: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  isValid: boolean;
  errors: string[];
  isDuplicateInFile?: boolean;
  isDuplicateInBank?: boolean;
}

interface ImportSummary {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  canImport: boolean;
  rows: ParsedImportRow[];
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  courseId,
  offeringId,
  courseCode,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [allowPartial, setAllowPartial] = useState(true);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ count: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const targetOfferingId = offeringId || courseId;

  // 1. Download Excel Template (.xlsx)
  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const response = await apiClient.get('/lecturer/questions/template', {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Brain_Buzz_Questions_Template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Failed to download template: ${getErrorMessage(err)}`);
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // 2. Select File and Validate with Backend
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImportSummary(null);
    setImportResult(null);
    setImportError(null);

    await validateFile(file);
  };

  const validateFile = async (file: File) => {
    setIsValidating(true);
    setImportError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<{ status: string; data: ImportSummary }>(
        `/lecturer/questions/offerings/${targetOfferingId}/bulk-import`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      setImportSummary(response.data.data);
    } catch (err: any) {
      setImportError(getErrorMessage(err));
    } finally {
      setIsValidating(false);
    }
  };

  // 3. Confirm and Import
  const handleConfirmImport = async () => {
    if (!selectedFile || !importSummary) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await apiClient.post<{ status: string; data: { importedCount: number } }>(
        `/lecturer/questions/offerings/${targetOfferingId}/bulk-import?confirm=true&allowPartial=${allowPartial}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      const count = response.data.data.importedCount || 0;
      setImportResult({ count });
      onSuccess();
    } catch (err: any) {
      setImportError(getErrorMessage(err));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Bulk Question Import ({courseCode})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload questions via Excel workbook (.xlsx), CSV, or JSON
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isImporting}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Download Template Banner */}
          <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                Need the official question workbook?
              </h3>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-0.5">
                Download the pre-formatted Excel template with sample CBT & Theory rows and instructions.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              disabled={isDownloadingTemplate}
              className="text-xs bg-white dark:bg-slate-800 shadow-sm flex-shrink-0"
            >
              {isDownloadingTemplate ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 mr-1.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Download .xlsx Template</span>
                </>
              )}
            </Button>
          </div>

          {/* Step 2: Upload Area */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Select Question File (.xlsx, .csv, .json)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-indigo-500 dark:hover:border-indigo-400 cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 transition-colors"
            >
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {selectedFile ? selectedFile.name : 'Click to browse or drop workbook here'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Supported formats: Microsoft Excel (.xlsx), CSV, JSON
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Loading validation */}
          {isValidating && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Parsing workbook and validating questions on server...</span>
            </div>
          )}

          {/* Error Banner */}
          {importError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Validation Error</p>
                <p className="mt-0.5">{importError}</p>
              </div>
            </div>
          )}

          {/* Validation & Preview Summary */}
          {importSummary && (
            <div className="space-y-4">
              {/* Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Rows</span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-0.5 block">
                    {importSummary.totalRows}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">Valid Questions</span>
                  <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5 block">
                    {importSummary.validCount}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                  <span className="text-[10px] uppercase font-bold text-rose-600 block">Invalid Rows</span>
                  <span className="text-sm font-extrabold text-rose-700 dark:text-rose-300 mt-0.5 block">
                    {importSummary.invalidCount}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                  <span className="text-[10px] uppercase font-bold text-amber-600 block">Duplicates</span>
                  <span className="text-sm font-extrabold text-amber-700 dark:text-amber-300 mt-0.5 block">
                    {importSummary.duplicateCount}
                  </span>
                </div>
              </div>

              {/* Partial Import Toggle if errors exist */}
              {importSummary.invalidCount > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="text-amber-900 dark:text-amber-300 font-medium">
                      Some rows contain errors. Would you like to import only the valid rows?
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-amber-900 dark:text-amber-200">
                    <input
                      type="checkbox"
                      checked={allowPartial}
                      onChange={(e) => setAllowPartial(e.target.checked)}
                      className="rounded border-amber-400 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Allow partial import</span>
                  </label>
                </div>
              )}

              {/* Rows Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold sticky top-0">
                    <tr>
                      <th className="py-2 px-3 w-10 text-center">#</th>
                      <th className="py-2 px-3 w-16">Type</th>
                      <th className="py-2 px-3">Question Prompt</th>
                      <th className="py-2 px-3 w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {importSummary.rows.map((row) => (
                      <tr
                        key={row.rowIndex}
                        className={
                          row.isValid
                            ? 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                            : 'bg-rose-50/30 dark:bg-rose-950/20'
                        }
                      >
                        <td className="py-2 px-3 text-center font-mono text-slate-400">
                          {row.rowIndex}
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant={row.type === 'cbt' ? 'info' : 'purple'} size="sm">
                            {row.type.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-md">
                            {row.question}
                          </div>
                          {row.errors.length > 0 && (
                            <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 space-y-0.5">
                              {row.errors.map((err, idx) => (
                                <div key={idx}>• {err}</div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {row.isValid ? (
                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Valid</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 text-[11px] font-semibold">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Invalid</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Complete Notification */}
          {importResult && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Import Completed Successfully!</p>
                <p className="mt-0.5">
                  {importResult.count} questions added to the question bank as DRAFT.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isImporting}>
            Cancel
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirmImport}
            disabled={
              !importSummary ||
              isImporting ||
              (!allowPartial && importSummary.invalidCount > 0) ||
              importSummary.validCount === 0 ||
              Boolean(importResult)
            }
          >
            {isImporting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                <span>Importing to Bank...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                <span>
                  Confirm Import (
                  {allowPartial ? importSummary?.validCount || 0 : importSummary?.totalRows || 0}{' '}
                  Questions)
                </span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
