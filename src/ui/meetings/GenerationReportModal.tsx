import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Download,
  HardDrive,
  Clock,
  Layers,
  FileCheck2,
  Image as ImageIcon,
  X,
  AlertCircle,
  Database,
  Check,
} from 'lucide-react';
import type { GenerationReport } from '../../types';
import {
  saveGeneratedDeck,
  getGeneratedDeck,
  checkStorageQuota,
  formatByteSize,
  type StorageEstimateResult,
} from '../../data/generatedDeckRepo';
import { triggerFileDownload } from '../../utils/fileDownload';

interface GenerationReportModalProps {
  isOpen: boolean;
  report: GenerationReport | null;
  generatedBlob: Blob | null;
  meetingId: string;
  onClose: () => void;
  onDownloadAgain: () => void;
}

export const GenerationReportModal: React.FC<GenerationReportModalProps> = ({
  isOpen,
  report,
  generatedBlob,
  meetingId,
  onClose,
  onDownloadAgain,
}) => {
  const [isSavedToBrowser, setIsSavedToBrowser] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [storageInfo, setStorageInfo] = useState<StorageEstimateResult | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'warnings' | 'errors'>('summary');

  useEffect(() => {
    if (isOpen) {
      checkStorageQuota().then(setStorageInfo);
      setIsSavedToBrowser(false);
    }
  }, [isOpen]);

  if (!isOpen || !report) return null;

  const isLargeDeck = (report.outputSizeBytes || 0) > 40 * 1024 * 1024; // > 40 MB
  const durationSec = (report.durationMs / 1000).toFixed(1);
  const hasErrors = report.errors && report.errors.length > 0;
  const hasWarnings = report.warnings && report.warnings.length > 0;

  const handleSaveToBrowser = async () => {
    if (!generatedBlob) return;
    setIsSaving(true);
    try {
      await saveGeneratedDeck(
        meetingId,
        report.meetingDate,
        report.filename,
        generatedBlob
      );
      setIsSavedToBrowser(true);
      // Refresh storage estimate
      const updatedStorage = await checkStorageQuota();
      setStorageInfo(updatedStorage);
    } catch (err) {
      console.error('Failed to save generated deck in IndexedDB:', err);
      alert('Failed to save generated deck to browser storage: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                hasErrors
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200'
              }`}
            >
              {hasErrors ? (
                <AlertCircle className="w-6 h-6" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {hasErrors ? 'Deck Generation Encountered Errors' : 'Weekly Deck Generated Successfully!'}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {report.filename} • {formatByteSize(report.outputSizeBytes)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher if warnings/errors */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'summary'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Generation Summary
          </button>

          {hasWarnings && (
            <button
              type="button"
              onClick={() => setActiveTab('warnings')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                activeTab === 'warnings'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Warnings ({report.warnings.length})</span>
            </button>
          )}

          {hasErrors && (
            <button
              type="button"
              onClick={() => setActiveTab('errors')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                activeTab === 'errors'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-red-700 bg-red-50 hover:bg-red-100'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Errors ({report.errors.length})</span>
            </button>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeTab === 'summary' && (
            <div className="space-y-4">
              {/* Metric Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Slides Out */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center space-y-0.5">
                  <div className="flex items-center justify-center space-x-1 text-slate-500 text-[11px] font-semibold">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Final Slides</span>
                  </div>
                  <div className="text-xl font-bold text-slate-900 font-mono">
                    {report.slidesOut}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    +{report.slidesCloned} cloned, -{report.slidesRemoved} removed
                  </div>
                </div>

                {/* Text Replacements */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center space-y-0.5">
                  <div className="flex items-center justify-center space-x-1 text-slate-500 text-[11px] font-semibold">
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Text Tags</span>
                  </div>
                  <div className="text-xl font-bold text-slate-900 font-mono">
                    {report.tagsReplaced}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Substituted & formatted
                  </div>
                </div>

                {/* Image Replacements */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center space-y-0.5">
                  <div className="flex items-center justify-center space-x-1 text-slate-500 text-[11px] font-semibold">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Images Placed</span>
                  </div>
                  <div className="text-xl font-bold text-slate-900 font-mono">
                    {report.imagesReplaced}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Cover / contain canvas
                  </div>
                </div>

                {/* Duration */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center space-y-0.5">
                  <div className="flex items-center justify-center space-x-1 text-slate-500 text-[11px] font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Build Time</span>
                  </div>
                  <div className="text-xl font-bold text-slate-900 font-mono">
                    {durationSec}s
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Pure in-browser engine
                  </div>
                </div>
              </div>

              {/* Details List */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs space-y-2">
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Template Version:</span>
                  <span className="font-semibold text-slate-800">Version {report.templateVersion}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Meeting Date:</span>
                  <span className="font-semibold text-slate-800">{report.meetingDate}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Output Archive Compression:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    STORE media (video/images) • DEFLATE XML
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 font-medium">Output File Size:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {formatByteSize(report.outputSizeBytes)} ({report.outputSizeBytes.toLocaleString('en-IN')} bytes)
                  </span>
                </div>
              </div>

              {/* Storage Warning if large deck */}
              {isLargeDeck && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">Large Presentation Archive ({formatByteSize(report.outputSizeBytes)})</p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      This deck contains embedded high-resolution media (e.g. video). Your file has already downloaded to your system. Saving a copy inside browser IndexedDB will occupy {formatByteSize(report.outputSizeBytes)} of local browser storage.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'warnings' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 mb-2">
                The deck was generated successfully with the following warnings:
              </p>
              {report.warnings.map((w, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>{w.slideNumber ? `Slide #${w.slideNumber}` : 'General Notice'}</span>
                    </span>
                    {w.tag && <span className="font-mono text-[10px] text-amber-700">{w.tag}</span>}
                  </div>
                  <p className="text-amber-800 leading-snug">{w.message}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'errors' && (
            <div className="space-y-2">
              <p className="text-xs text-red-600 font-semibold mb-2">
                Unresolved issues prevented deck completion:
              </p>
              {report.errors.map((err, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-1"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                      <span>{err.slideNumber ? `Slide #${err.slideNumber}` : 'Critical Issue'}</span>
                    </span>
                    {err.tag && <span className="font-mono text-[10px] text-red-700">{err.tag}</span>}
                  </div>
                  <p className="text-red-800 leading-snug">{err.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Save Copy to Browser */}
          <div className="w-full sm:w-auto flex items-center space-x-2">
            {isSavedToBrowser ? (
              <span className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Saved to Browser (IndexedDB)</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleSaveToBrowser}
                disabled={isSaving || !generatedBlob}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition disabled:opacity-50"
              >
                <Database className="w-3.5 h-3.5 text-slate-500" />
                <span>{isSaving ? 'Saving to Browser...' : 'Save copy to browser'}</span>
              </button>
            )}

            {storageInfo && storageInfo.formattedUsage !== 'Unknown' && (
              <span className="text-[10px] text-slate-400 hidden sm:inline" title="Browser IndexedDB quota usage">
                Storage: {storageInfo.formattedUsage} used
              </span>
            )}
          </div>

          {/* Download & Close */}
          <div className="w-full sm:w-auto flex items-center justify-end space-x-2">
            {generatedBlob && (
              <button
                type="button"
                onClick={onDownloadAgain}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Again</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
