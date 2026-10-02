import React from 'react';
import { RefreshCw, CheckCircle2, Circle, Layers, FileText, Image as ImageIcon, Archive } from 'lucide-react';

interface GenerationProgressModalProps {
  isOpen: boolean;
  percent: number;
  message: string;
}

export const GenerationProgressModal: React.FC<GenerationProgressModalProps> = ({
  isOpen,
  percent,
  message,
}) => {
  if (!isOpen) return null;

  const steps = [
    { label: 'Preparing: Evaluating conditional slides (@if)', threshold: 10, icon: Layers },
    { label: 'Repeating slides (@repeat)', threshold: 25, icon: Layers },
    { label: 'Replacing text values & formats', threshold: 45, icon: FileText },
    { label: 'Processing images (cover / contain)', threshold: 60, icon: ImageIcon },
    { label: 'Packaging zip (STORE media, DEFLATE XML)', threshold: 85, icon: Archive },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl mx-auto flex items-center justify-center border border-red-100 shadow-inner">
            <RefreshCw className="w-7 h-7 animate-spin" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Generating BNI Presentation Deck
          </h3>
          <p className="text-xs text-slate-500">
            Transforming template copy with XML injection and media processing...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-700 truncate max-w-[80%]">{message}</span>
            <span className="text-red-600 font-mono">{percent}%</span>
          </div>

          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <div
              className="h-full bg-linear-to-r from-red-600 to-rose-500 rounded-full transition-all duration-300 shadow-xs"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Step Checklist */}
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
          {steps.map((st, i) => {
            const isCompleted = percent >= (steps[i + 1]?.threshold || 100);
            const isCurrent = percent >= st.threshold && !isCompleted;
            const IconComponent = st.icon;

            return (
              <div
                key={st.label}
                className={`flex items-center space-x-2.5 text-xs transition-colors ${
                  isCompleted
                    ? 'text-slate-800'
                    : isCurrent
                    ? 'text-red-700 font-semibold'
                    : 'text-slate-400'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : isCurrent ? (
                  <RefreshCw className="w-4 h-4 text-red-600 animate-spin shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                )}
                <span className="truncate">{st.label}</span>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <p className="text-[11px] text-center text-slate-400 leading-relaxed">
          Please keep this browser tab open. Processing large templates with embedded media runs locally inside your browser using pure OpenXML manipulation.
        </p>
      </div>
    </div>
  );
};
