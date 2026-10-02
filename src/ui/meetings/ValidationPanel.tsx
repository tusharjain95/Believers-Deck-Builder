import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Check,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Download,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import type { ResolutionIssue } from '../../engine/resolve';

interface ValidationPanelProps {
  issues: ResolutionIssue[];
  isValid: boolean;
  status: 'draft' | 'ready' | 'generated';
  onMarkReady: () => void;
  onScrollToField: (fieldKey?: string, category?: string) => void;
  onGenerateDeck?: () => void;
  isGenerating?: boolean;
}

const CHECKLIST_CATEGORIES: Array<{
  id: ResolutionIssue['category'];
  label: string;
}> = [
  { id: 'Meeting', label: 'Meeting Details' },
  { id: 'VP Report', label: 'VP Report' },
  { id: 'Weekly Report', label: 'Weekly Report' },
  { id: 'Statistics', label: 'Statistics' },
  { id: 'Presenters', label: 'Presenters Order' },
  { id: 'Feature', label: 'Feature Presentation' },
  { id: 'Rotation', label: 'Rotation Schedule' },
  { id: 'Images', label: 'Slide Images' },
];

export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  issues,
  isValid,
  status,
  onMarkReady,
  onScrollToField,
  onGenerateDeck,
  isGenerating,
}) => {
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm sticky top-20">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Meeting Deck Readiness</h3>
          <p className="text-[11px] text-slate-500">Live validation against template schema</p>
        </div>

        <div>
          {errorCount === 0 ? (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Ready for Deck</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errorCount} error{errorCount === 1 ? '' : 's'}</span>
            </span>
          )}
        </div>
      </div>

      {/* Category Checklist */}
      <div className="space-y-1.5 text-xs">
        {CHECKLIST_CATEGORIES.map((cat) => {
          const catIssues = issues.filter((i) => i.category === cat.id);
          const catErrors = catIssues.filter((i) => i.severity === 'error').length;
          const catWarnings = catIssues.filter((i) => i.severity === 'warning').length;

          const isClean = catIssues.length === 0;

          return (
            <div
              key={cat.id}
              className={`p-2 rounded-xl border transition flex items-center justify-between ${
                isClean
                  ? 'bg-slate-50/60 border-slate-200 text-slate-700'
                  : catErrors > 0
                  ? 'bg-red-50/50 border-red-200 text-red-900'
                  : 'bg-amber-50/50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                {isClean ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : catErrors > 0 ? (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span className="font-medium">{cat.label}</span>
              </div>

              <div>
                {isClean ? (
                  <span className="text-[10px] text-emerald-700 font-semibold uppercase">
                    Pass
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const first = catIssues[0];
                      onScrollToField(first?.fieldKey, cat.id);
                    }}
                    className="inline-flex items-center space-x-1 text-[11px] font-semibold text-slate-800 hover:text-red-600 underline"
                  >
                    <span>
                      {catErrors > 0 ? `${catErrors} error` : `${catWarnings} notice`}
                    </span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Issues list if any */}
      {issues.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-slate-100 max-h-48 overflow-y-auto pr-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
            Click issue to jump to field:
          </span>
          {issues.map((iss) => (
            <button
              key={iss.id}
              type="button"
              onClick={() => onScrollToField(iss.fieldKey, iss.category)}
              className={`w-full text-left p-2 rounded-lg text-[11px] border transition cursor-pointer flex items-start space-x-2 ${
                iss.severity === 'error'
                  ? 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100/70'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/70'
              }`}
            >
              {iss.severity === 'error' ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">{iss.message}</span>
            </button>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        {/* Generate Deck Button (Enabled ONLY when errorCount === 0) */}
        <div className="relative group">
          <button
            type="button"
            onClick={onGenerateDeck}
            disabled={!isValid || errorCount > 0 || isGenerating}
            className={`w-full inline-flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-xs font-bold shadow-sm transition ${
              isGenerating
                ? 'bg-red-400 text-white cursor-wait'
                : isValid && errorCount === 0
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30 cursor-pointer active:scale-[0.99]'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/60'
            }`}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Building Deck Copy...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Generate Deck</span>
                <Download className="w-4 h-4 ml-0.5" />
              </>
            )}
          </button>

          {/* Tooltip explaining disabled reason when errorCount > 0 */}
          {errorCount > 0 && (
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 w-64 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-lg text-center leading-tight">
              <span className="font-semibold text-red-300 block mb-0.5">Generation Locked</span>
              Cannot generate presentation: resolve all {errorCount} validation error{errorCount === 1 ? '' : 's'} first.
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
            </div>
          )}
        </div>

        {/* Mark Ready Button */}
        <button
          type="button"
          onClick={onMarkReady}
          disabled={!isValid || status === 'ready'}
          className={`w-full inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition ${
            status === 'ready'
              ? 'bg-emerald-600 text-white cursor-default'
              : isValid
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {status === 'ready' ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Marked as Ready</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Mark Ready for Presentation</span>
            </>
          )}
        </button>

        {!isValid && (
          <p className="text-[10px] text-center text-slate-400">
            Fix the {errorCount} error{errorCount === 1 ? '' : 's'} above to unlock deck generation.
          </p>
        )}
      </div>
    </div>
  );
};
