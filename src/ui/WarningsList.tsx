import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, ShieldCheck, Filter } from 'lucide-react';
import type { TemplateWarning } from '../types';

interface WarningsListProps {
  warnings: TemplateWarning[];
  onSelectSlide?: (slideNum: number) => void;
}

export const WarningsList: React.FC<WarningsListProps> = ({ warnings, onSelectSlide }) => {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  const filteredWarnings = warnings.filter((w) => {
    if (filterSeverity === 'all') return true;
    return w.severity === filterSeverity;
  });

  const errorCount = warnings.filter((w) => w.severity === 'error').length;
  const warningCount = warnings.filter((w) => w.severity === 'warning').length;
  const infoCount = warnings.filter((w) => w.severity === 'info').length;

  if (warnings.length === 0) {
    return (
      <div className="bg-emerald-50/60 rounded-xl border border-emerald-200 p-8 text-center text-emerald-800">
        <ShieldCheck className="w-12 h-12 mx-auto text-emerald-600 mb-2" />
        <h4 className="text-base font-semibold">No Template Warnings or Errors</h4>
        <p className="text-xs text-emerald-600 mt-1 max-w-md mx-auto">
          All tags, picture shape names, run boundaries, and directives strictly comply with the
          OpenXML PowerPoint tag syntax.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900 text-base flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Template Audit &amp; Integrity Log</span>
          </h3>
          <p className="text-xs text-slate-500">
            Fail-loudly policy: every potential issue, split run, format discrepancy, or malformed tag is exposed.
          </p>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center space-x-1 text-xs">
          <button
            onClick={() => setFilterSeverity('all')}
            className={`px-2.5 py-1 rounded-full font-medium transition ${
              filterSeverity === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({warnings.length})
          </button>
          {errorCount > 0 && (
            <button
              onClick={() => setFilterSeverity('error')}
              className={`px-2.5 py-1 rounded-full font-medium transition ${
                filterSeverity === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Errors ({errorCount})
            </button>
          )}
          {warningCount > 0 && (
            <button
              onClick={() => setFilterSeverity('warning')}
              className={`px-2.5 py-1 rounded-full font-medium transition ${
                filterSeverity === 'warning'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Warnings ({warningCount})
            </button>
          )}
          {infoCount > 0 && (
            <button
              onClick={() => setFilterSeverity('info')}
              className={`px-2.5 py-1 rounded-full font-medium transition ${
                filterSeverity === 'info'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Notices ({infoCount})
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {filteredWarnings.map((warn, index) => {
          const isError = warn.severity === 'error';
          const isWarn = warn.severity === 'warning';

          return (
            <div
              key={`${warn.id}-${index}`}
              className={`p-3.5 rounded-xl border text-xs transition-all ${
                isError
                  ? 'bg-red-50/80 border-red-200 text-red-900'
                  : isWarn
                  ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span
                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase tracking-wider ${
                      isError
                        ? 'bg-red-200 text-red-900'
                        : isWarn
                        ? 'bg-amber-200 text-amber-950'
                        : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {isError ? (
                      <AlertCircle className="w-3 h-3 text-red-700" />
                    ) : isWarn ? (
                      <AlertTriangle className="w-3 h-3 text-amber-700" />
                    ) : (
                      <Info className="w-3 h-3 text-blue-700" />
                    )}
                    <span>{warn.code}</span>
                  </span>

                  {warn.slideNumber !== undefined ? (
                    <button
                      onClick={() => onSelectSlide?.(warn.slideNumber!)}
                      className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 font-mono text-[11px] font-semibold text-slate-900 border border-slate-300 transition"
                      title="Jump to this slide"
                    >
                      Slide #{warn.slideNumber}
                    </button>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-white/70 font-mono text-[11px] text-slate-500 border border-slate-200">
                      Master / Layout
                    </span>
                  )}

                  {warn.tag && (
                    <span className="px-2 py-0.5 rounded bg-white font-mono font-medium text-slate-800 border border-slate-200">
                      {warn.tag}
                    </span>
                  )}
                </div>

                <span className="text-[11px] text-slate-400 capitalize font-medium">
                  {warn.severity}
                </span>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-slate-700">
                {warn.message}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
