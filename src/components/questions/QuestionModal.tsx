import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import type { QuestionItem, CreateQuestionPayload, UpdateQuestionPayload, GradingPoint } from '../../types/api';

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateQuestionPayload | UpdateQuestionPayload) => Promise<void>;
  initialData?: QuestionItem | null;
  offeringId?: string;
  courseId: string;
}

export const QuestionModal: React.FC<QuestionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  offeringId,
  courseId,
}) => {
  const isEditing = Boolean(initialData);

  const [type, setType] = useState<'cbt' | 'theory'>('cbt');
  const [question, setQuestion] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [points, setPoints] = useState<number>(1);
  const [explanation, setExplanation] = useState('');

  // CBT State
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState<string>('');

  // Theory State
  const [modelAnswer, setModelAnswer] = useState<string>('');
  const [gradingPoints, setGradingPoints] = useState<GradingPoint[]>([
    { concept: '', weight: 1, keywords: [] },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setQuestion(initialData.question || '');
      setDifficulty(initialData.difficulty || 'medium');
      setPoints(initialData.points || 1);
      setExplanation(initialData.explanation || '');

      if (initialData.type === 'cbt') {
        const opts = initialData.options && initialData.options.length >= 2
          ? [...initialData.options]
          : ['', '', '', ''];
        setOptions(opts);
        setCorrectAnswer(initialData.correctAnswer || opts[0] || '');
      } else {
        setModelAnswer(initialData.correctAnswer || '');
        const gps = initialData.gradingPoints && initialData.gradingPoints.length > 0
          ? initialData.gradingPoints
          : [{ concept: '', weight: 1, keywords: [] }];
        setGradingPoints(gps);
      }
    } else {
      // Reset to fresh defaults
      setType('cbt');
      setQuestion('');
      setDifficulty('medium');
      setPoints(1);
      setExplanation('');
      setOptions(['', '', '', '']);
      setCorrectAnswer('');
      setModelAnswer('');
      setGradingPoints([{ concept: '', weight: 1, keywords: [] }]);
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // CBT Option Helpers
  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    const prevVal = updated[index];
    updated[index] = value;
    setOptions(updated);

    if (correctAnswer === prevVal && prevVal !== '') {
      setCorrectAnswer(value);
    }
  };

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const removedVal = options[index];
      const updated = options.filter((_, i) => i !== index);
      setOptions(updated);
      if (correctAnswer === removedVal) {
        setCorrectAnswer(updated[0] || '');
      }
    }
  };

  // Theory Rubric Helpers
  const handleAddGradingPoint = () => {
    setGradingPoints([...gradingPoints, { concept: '', weight: 1, keywords: [] }]);
  };

  const handleGradingPointChange = (
    index: number,
    field: keyof GradingPoint,
    val: any
  ) => {
    const updated = [...gradingPoints];
    updated[index] = { ...updated[index]!, [field]: val };
    setGradingPoints(updated);
  };

  const handleRemoveGradingPoint = (index: number) => {
    if (gradingPoints.length > 1) {
      setGradingPoints(gradingPoints.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!question.trim() || question.trim().length < 5) {
      setError('Question prompt must be at least 5 characters long.');
      return;
    }

    if (type === 'cbt') {
      const validOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
      if (validOptions.length < 2) {
        setError('CBT questions must provide at least 2 non-empty options.');
        return;
      }
      if (!correctAnswer || !validOptions.includes(correctAnswer.trim())) {
        setError('Please designate one of your valid options as the correct answer.');
        return;
      }

      setIsSubmitting(true);
      try {
        await onSave({
          courseId,
          offeringId,
          type: 'cbt',
          question: question.trim(),
          options: validOptions,
          correctAnswer: correctAnswer.trim(),
          points: Number(points) || 1,
          difficulty,
          explanation: explanation.trim() || null,
        });
        onClose();
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Failed to save question draft.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Theory validation
      if (!modelAnswer.trim()) {
        setError('Model / sample answer is required for theory questions.');
        return;
      }

      const validRubrics = gradingPoints.filter((gp) => gp.concept.trim().length > 0);
      if (validRubrics.length === 0) {
        setError('Theory questions require at least one grading rubric point with a concept.');
        return;
      }

      for (let i = 0; i < validRubrics.length; i++) {
        if (!validRubrics[i]!.weight || validRubrics[i]!.weight <= 0) {
          setError(`Grading point #${i + 1} must have a positive weight.`);
          return;
        }
      }

      setIsSubmitting(true);
      try {
        await onSave({
          courseId,
          offeringId,
          type: 'theory',
          question: question.trim(),
          correctAnswer: modelAnswer.trim(),
          gradingPoints: validRubrics.map((gp) => ({
            concept: gp.concept.trim(),
            weight: Number(gp.weight) || 1,
            keywords: gp.keywords || [],
            aliases: gp.keywords || [],
          })),
          points: Number(points) || 5,
          difficulty,
          explanation: explanation.trim() || null,
        });
        onClose();
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Failed to save question draft.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {isEditing ? 'Edit Question Draft' : 'Author Question Draft'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Drafts remain private to you until submitted for departmental approval.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Toggle & Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assessment Format
              </label>
              <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setType('cbt')}
                  className={`py-1.5 rounded-lg transition-all ${
                    type === 'cbt'
                      ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  CBT (Options)
                </button>
                <button
                  type="button"
                  onClick={() => setType('theory')}
                  className={`py-1.5 rounded-lg transition-all ${
                    type === 'theory'
                      ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Theory (Rubric)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 px-3 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Points Weight
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={points}
                onChange={(e) => setPoints(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 px-3 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Question Prompt <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="State the academic question clearly and concisely..."
              className="w-full text-xs sm:text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 p-3 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Format-Specific Content */}
          {type === 'cbt' ? (
            <div className="space-y-3 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Multiple-Choice Options & Correct Answer
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select the green checkmark for the correct answer
                </span>
              </div>

              <div className="space-y-2.5">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrectAnswer(opt.trim())}
                      title="Mark as correct answer"
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        correctAnswer === opt.trim() && opt.trim() !== ''
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 hover:text-emerald-500'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      className="flex-1 text-xs rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 py-1.5 px-3 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {options.length < 6 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 dark:hover:text-indigo-300 mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Option</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Model / Ideal Answer <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={modelAnswer}
                  onChange={(e) => setModelAnswer(e.target.value)}
                  placeholder="Provide the comprehensive model answer..."
                  className="w-full text-xs rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 p-2.5 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Grading Rubric Concepts & Weights
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Used by backend automated evaluation
                  </span>
                </div>

                <div className="space-y-2.5">
                  {gradingPoints.map((gp, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={gp.concept}
                          onChange={(e) => handleGradingPointChange(idx, 'concept', e.target.value)}
                          placeholder="Key concept (e.g., 'lexical analysis')"
                          className="w-full text-xs rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1 px-2.5 focus:bg-white dark:focus:bg-slate-800"
                        />
                      </div>
                      <div className="w-20">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={gp.weight}
                          onChange={(e) =>
                            handleGradingPointChange(idx, 'weight', parseFloat(e.target.value) || 1)
                          }
                          placeholder="Weight"
                          className="w-full text-xs rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1 px-2 text-center focus:bg-white dark:focus:bg-slate-800"
                        />
                      </div>
                      {gradingPoints.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveGradingPoint(idx)}
                          className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddGradingPoint}
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 dark:hover:text-indigo-300 mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Rubric Concept</span>
                </button>
              </div>
            </div>
          )}

          {/* Explanation / Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Explanation / Rationale (Optional)
            </label>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Add academic explanations or references for review and student feedback..."
              className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 p-2.5 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Saving Draft...' : isEditing ? 'Save Changes' : 'Create Draft'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

