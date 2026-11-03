import React, { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  FileCode,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { apiClient, getErrorMessage } from '../../lib/api';
import type { CreateQuestionPayload } from '../../types/api';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courseId: string;
  offeringId?: string;
  courseCode: string;
}

interface ParsedQuestion {
  rowIndex: number;
  type: 'cbt' | 'theory';
  question: string;
  options?: string[];
  correctAnswer: string;
  gradingPoints?: { concept: string; weight: number; keywords?: string[] }[];
  explanation?: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  isValid: boolean;
  validationError?: string;
}

const SAMPLE_CSV = `type,question,options,correctAnswer,points,difficulty,explanation
cbt,"What is the primary function of an Operating System?","Manage hardware resources|Compile programs|Design websites|Generate graphics",Manage hardware resources,2,medium,"The OS serves as an intermediary between user applications and system hardware."
cbt,"Which data structure operates on a FIFO basis?","Queue|Stack|Tree|Graph",Queue,1,easy,"FIFO stands for First-In, First-Out, characteristic of Queues."
theory,"Explain the difference between concurrency and parallelism.","",Concurrency is dealing with multiple tasks concurrently while parallelism is executing them simultaneously on multiple cores.,5,hard,"Concurrency is about structure, parallelism is about execution."`;

const SAMPLE_JSON = `[
  {
    "type": "cbt",
    "question": "What is the primary function of an Operating System?",
    "options": [
      "Manage hardware resources",
      "Compile programs",
      "Design websites",
      "Generate graphics"
    ],
    "correctAnswer": "Manage hardware resources",
    "points": 2,
    "difficulty": "medium",
    "explanation": "The OS manages hardware and system resources."
  },
  {
    "type": "theory",
    "question": "Explain the difference between concurrency and parallelism.",
    "correctAnswer": "Concurrency is dealing with multiple things at once; parallelism is doing multiple things at once.",
    "gradingPoints": [
      { "concept": "Definition of concurrency (handling multiple tasks)", "weight": 2.5 },
      { "concept": "Definition of parallelism (simultaneous execution on hardware)", "weight": 2.5 }
    ],
    "points": 5,
    "difficulty": "hard",
    "explanation": "Concurrency is about structure; parallelism is about execution."
  }
]`;

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  courseId,
  offeringId,
  courseCode,
}) => {
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [inputText, setInputText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [isParsed, setIsParsed] = useState(false);
  const [copiedSample, setCopiedSample] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  if (!isOpen) return null;

  const handleCopySample = () => {
    const text = format === 'csv' ? SAMPLE_CSV : SAMPLE_JSON;
    navigator.clipboard.writeText(text);
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputText(content || '');
      setIsParsed(false);
      setParsedQuestions([]);
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleParse = () => {
    setImportResult(null);
    if (!inputText.trim()) {
      setParsedQuestions([]);
      setIsParsed(true);
      return;
    }

    const items: ParsedQuestion[] = [];

    if (format === 'json') {
      try {
        const rawJson = JSON.parse(inputText);
        if (!Array.isArray(rawJson)) {
          alert('JSON must be an array of question objects.');
          return;
        }

        rawJson.forEach((item: any, idx: number) => {
          const type = (item.type || 'cbt').toLowerCase() === 'theory' ? 'theory' : 'cbt';
          const question = String(item.question || '').trim();
          const correctAnswer = String(item.correctAnswer || '').trim();
          const points = Number(item.points) > 0 ? Number(item.points) : 1;
          const diff = ['easy', 'medium', 'hard'].includes(item.difficulty)
            ? item.difficulty
            : 'medium';
          const explanation = item.explanation ? String(item.explanation).trim() : undefined;

          let isValid = true;
          let validationError: string | undefined;

          if (!question) {
            isValid = false;
            validationError = 'Question text is required.';
          } else if (type === 'cbt') {
            const opts = Array.isArray(item.options) ? item.options.map((o: any) => String(o).trim()) : [];
            if (opts.length < 2) {
              isValid = false;
              validationError = 'CBT requires at least 2 options.';
            } else if (!correctAnswer) {
              isValid = false;
              validationError = 'Correct answer is required.';
            } else if (!opts.some((opt: string) => opt.toLowerCase() === correctAnswer.toLowerCase())) {
              isValid = false;
              validationError = 'Correct answer must match one of the options.';
            }
          } else if (type === 'theory') {
            if (!correctAnswer) {
              isValid = false;
              validationError = 'Model answer is required for theory questions.';
            }
          }

          items.push({
            rowIndex: idx + 1,
            type,
            question,
            options: type === 'cbt' ? item.options : undefined,
            correctAnswer,
            gradingPoints: type === 'theory' ? item.gradingPoints : undefined,
            explanation,
            points,
            difficulty: diff,
            isValid,
            validationError,
          });
        });
      } catch (err: any) {
        alert(`Failed to parse JSON: ${err.message}`);
        return;
      }
    } else {
      // CSV parser
      const lines = inputText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length <= 1) {
        alert('CSV must contain a header row and at least one question row.');
        return;
      }

      const rows = lines.slice(1);
      rows.forEach((line, idx) => {
        const cols = parseCsvLine(line);
        // format: type, question, options (pipe-separated), correctAnswer, points, difficulty, explanation
        const rawType = (cols[0] || 'cbt').toLowerCase();
        const type: 'cbt' | 'theory' = rawType === 'theory' ? 'theory' : 'cbt';
        const question = (cols[1] || '').trim();
        const rawOptions = (cols[2] || '').trim();
        const correctAnswer = (cols[3] || '').trim();
        const points = Number(cols[4]) > 0 ? Number(cols[4]) : 1;
        const diff = ['easy', 'medium', 'hard'].includes(cols[5]?.toLowerCase() || '')
          ? (cols[5].toLowerCase() as any)
          : 'medium';
        const explanation = cols[6]?.trim() || undefined;

        let isValid = true;
        let validationError: string | undefined;

        if (!question) {
          isValid = false;
          validationError = 'Question text is required.';
        } else if (type === 'cbt') {
          const options = rawOptions ? rawOptions.split('|').map((o) => o.trim()).filter(Boolean) : [];
          if (options.length < 2) {
            isValid = false;
            validationError = 'CBT requires at least 2 pipe-separated options (e.g. Opt1|Opt2).';
          } else if (!correctAnswer) {
            isValid = false;
            validationError = 'Correct answer is required.';
          } else if (!options.some((opt) => opt.toLowerCase() === correctAnswer.toLowerCase())) {
            isValid = false;
            validationError = 'Correct answer must match one of the pipe-separated options.';
          }
        } else if (type === 'theory') {
          if (!correctAnswer) {
            isValid = false;
            validationError = 'Model answer is required for theory.';
          }
        }

        const options = type === 'cbt' ? rawOptions.split('|').map((o) => o.trim()).filter(Boolean) : undefined;

        items.push({
          rowIndex: idx + 1,
          type,
          question,
          options,
          correctAnswer,
          points,
          difficulty: diff,
          explanation,
          isValid,
          validationError,
        });
      });
    }

    setParsedQuestions(items);
    setIsParsed(true);
  };

  const handleStartImport = async () => {
    const validQuestions = parsedQuestions.filter((q) => q.isValid);
    if (validQuestions.length === 0) {
      alert('No valid questions to import.');
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: validQuestions.length });
    const errors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < validQuestions.length; i++) {
      const q = validQuestions[i]!;
      setImportProgress({ current: i + 1, total: validQuestions.length });

      try {
        const payload: CreateQuestionPayload = {
          courseId,
          offeringId,
          type: q.type,
          question: q.question,
          options: q.type === 'cbt' ? q.options : undefined,
          correctAnswer: q.correctAnswer,
          gradingPoints: q.type === 'theory' ? (q.gradingPoints as any) : undefined,
          points: q.points,
          difficulty: q.difficulty,
          explanation: q.explanation,
        };

        await apiClient.post('/lecturer/questions', payload);
        successCount++;
      } catch (err: any) {
        errors.push(`Row ${q.rowIndex} (${q.question.slice(0, 30)}...): ${getErrorMessage(err)}`);
      }
    }

    setIsImporting(false);
    setImportResult({
      success: successCount,
      failed: errors.length,
      errors,
    });

    if (successCount > 0) {
      onSuccess();
    }
  };

  const validCount = parsedQuestions.filter((q) => q.isValid).length;
  const invalidCount = parsedQuestions.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-600" />
              <span>Bulk Import Questions — {courseCode}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste or upload questions in CSV or JSON format for batch authoring.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isImporting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Format Selection & Helper */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setFormat('csv');
                  setIsParsed(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  format === 'csv'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>CSV Format</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormat('json');
                  setIsParsed(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  format === 'json'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>JSON Format</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopySample} className="text-xs h-8">
                {copiedSample ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
                    <span>Copied Sample</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    <span>Copy Sample {format.toUpperCase()}</span>
                  </>
                )}
              </Button>

              <label className="cursor-pointer">
                <input
                  type="file"
                  accept={format === 'csv' ? '.csv,text/csv' : '.json,application/json'}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm">
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  <span>Upload File</span>
                </span>
              </label>
            </div>
          </div>

          {/* Raw Text Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Data Input ({format.toUpperCase()})
            </label>
            <textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setIsParsed(false);
              }}
              placeholder={
                format === 'csv'
                  ? `type,question,options,correctAnswer,points,difficulty,explanation\ncbt,"Sample question?","OptA|OptB|OptC|OptD",OptA,1,easy,"Explanation here"`
                  : `[\n  {\n    "type": "cbt",\n    "question": "Sample question?",\n    "options": ["OptA", "OptB"],\n    "correctAnswer": "OptA"\n  }\n]`
              }
              rows={7}
              className="w-full font-mono text-xs p-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/50"
            />
          </div>

          {/* Parse Button */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handleParse}
              disabled={!inputText.trim() || isImporting}
              className="text-xs h-8"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              <span>Validate & Preview Questions</span>
            </Button>

            {isParsed && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
                  {validCount} Valid
                </span>
                {invalidCount > 0 && (
                  <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full font-medium">
                    {invalidCount} Invalid
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Validation / Preview Table */}
          {isParsed && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Preview & Validation ({parsedQuestions.length} Questions)
              </h3>
              {parsedQuestions.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  No questions parsed. Check your format and try again.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-semibold sticky top-0">
                      <tr>
                        <th className="py-2 px-3 w-12 text-center">#</th>
                        <th className="py-2 px-3 w-20">Type</th>
                        <th className="py-2 px-3">Question Prompt</th>
                        <th className="py-2 px-3 w-24">Diff / Pts</th>
                        <th className="py-2 px-3 w-32">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedQuestions.map((q) => (
                        <tr
                          key={q.rowIndex}
                          className={q.isValid ? 'hover:bg-slate-50/50' : 'bg-rose-50/40'}
                        >
                          <td className="py-2 px-3 text-center font-mono text-slate-400">
                            {q.rowIndex}
                          </td>
                          <td className="py-2 px-3">
                            <Badge variant={q.type === 'cbt' ? 'info' : 'purple'}>
                              {q.type.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-medium text-slate-900 truncate max-w-md">
                              {q.question}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate max-w-md">
                              Ans: {q.correctAnswer}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-slate-500 text-[11px]">
                            {q.difficulty} • {q.points} pt
                          </td>
                          <td className="py-2 px-3">
                            {q.isValid ? (
                              <div className="flex items-center gap-1 text-emerald-700 text-[11px] font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Valid</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-rose-700 text-[11px] font-semibold" title={q.validationError}>
                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">{q.validationError}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Import Results Notification */}
          {importResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                importResult.failed === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                {importResult.failed === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                )}
                <span>
                  Import Complete: {importResult.success} successfully added as DRAFT
                  {importResult.failed > 0 && `, ${importResult.failed} failed.`}
                </span>
              </div>
              {importResult.errors.length > 0 && (
                <div className="mt-2 space-y-1 text-rose-800 text-[11px] max-h-24 overflow-y-auto">
                  {importResult.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50/80">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isImporting}>
            Cancel
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleStartImport}
            disabled={!isParsed || validCount === 0 || isImporting}
          >
            {isImporting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                <span>
                  Importing ({importProgress?.current}/{importProgress?.total})...
                </span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                <span>Import {validCount} Valid Question{validCount !== 1 ? 's' : ''}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

