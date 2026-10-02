import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Upload,
  History,
  RotateCcw,
  Check,
  X,
  Image as ImageIcon,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { LibraryImage, TemplateMap } from '../types';
import {
  getAllLibraryImages,
  replaceLibraryImage,
  restoreLibraryVersion,
} from '../data/libraryRepo';
import { ConfirmModal } from './ConfirmModal';

interface SlideLibraryViewProps {
  activeTemplateMap?: TemplateMap | null;
}

export const SlideLibraryView: React.FC<SlideLibraryViewProps> = ({ activeTemplateMap }) => {
  const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([]);
  const [replacingKey, setReplacingKey] = useState<string | null>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [expandedHistoryKey, setExpandedHistoryKey] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState<{ key: string; index: number } | null>(null);

  const loadLibrary = async () => {
    try {
      const items = await getAllLibraryImages();
      setLibraryImages(items);
    } catch (err) {
      console.error('Failed to load slide library:', err);
    }
  };

  useEffect(() => {
    loadLibrary();
  }, []);

  const handleSelectFileToReplace = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setReplacingKey(key);
      setNewImageFile(file);
      const url = URL.createObjectURL(file);
      setNewImagePreview(url);
      e.target.value = '';
    }
  };

  const handleConfirmReplace = async () => {
    if (!replacingKey || !newImageFile) return;
    setIsProcessing(true);
    try {
      await replaceLibraryImage(replacingKey, newImageFile, newImageFile.name);
      setReplacingKey(null);
      setNewImageFile(null);
      if (newImagePreview) URL.revokeObjectURL(newImagePreview);
      setNewImagePreview(null);
      await loadLibrary();
    } catch (err) {
      console.error('Failed to replace library image:', err);
      alert('Failed to replace library image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreVersion = (key: string, versionIndex: number) => {
    setVersionToRestore({ key, index: versionIndex });
  };

  const handleConfirmRestore = async () => {
    if (!versionToRestore) return;
    try {
      await restoreLibraryVersion(versionToRestore.key, versionToRestore.index);
      await loadLibrary();
    } catch (err) {
      console.error('Failed to restore version:', err);
    } finally {
      setVersionToRestore(null);
    }
  };

  const formatDateIndian = (isoString?: string) => {
    if (!isoString) return 'Not yet updated';
    try {
      return new Date(isoString).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  // Compile all library keys from template and db
  const templateLibKeys = activeTemplateMap?.libraryImages || [];
  const allKeys = Array.from(
    new Set([...templateLibKeys, ...libraryImages.map((l) => l.key)])
  ).sort();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-red-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Slide Library Image Slots
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
              {allKeys.length} slots
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            One card per <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">lib.*</code> slot in the active template. Auto-seeded from template media with version history.
          </p>
        </div>
      </div>

      {allKeys.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-700">No library image slots found</p>
          <p className="text-xs text-slate-500 mt-1">
            Upload a PowerPoint template containing picture shapes named <code className="bg-slate-100 px-1 rounded font-mono">{'{{lib.XYZ}}'}</code> (e.g. {'{{lib.white_lion}}'}).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allKeys.map((key) => {
            const item = libraryImages.find((l) => l.key === key);
            // Look up slide number from template if not in DB
            const slideInfo = activeTemplateMap?.slides.find((s) =>
              s.imageSlots.some((slot) => slot.key === key)
            );
            const slideNum = item?.slideNumber || slideInfo?.slideNumber;

            const isHistoryOpen = expandedHistoryKey === key;

            return (
              <div
                key={key}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Image Preview Container */}
                  <div className="relative w-full h-48 bg-slate-100 flex items-center justify-center border-b border-slate-200 overflow-hidden group">
                    {item?.currentBlob ? (
                      <img
                        src={URL.createObjectURL(item.currentBlob)}
                        alt={key}
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <ImageIcon className="w-10 h-10 mx-auto text-slate-300 mb-1" />
                        <span className="text-xs text-slate-400">No media seeded yet</span>
                      </div>
                    )}

                    {/* Overlay button */}
                    <label className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                      <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/90 text-slate-900 font-semibold text-xs shadow-md">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Replace Image</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleSelectFileToReplace(key, e)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {key}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-800 capitalize mt-1">
                          {item?.name || key.replace(/^lib\./, '').replace(/_/g, ' ')}
                        </h4>
                      </div>

                      {slideNum && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-red-50 text-red-700 border border-red-200 shrink-0">
                          Slide #{slideNum}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Updated: {formatDateIndian(item?.lastUpdated)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <label className="inline-flex items-center space-x-1 font-semibold text-red-600 hover:text-red-700 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload New</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleSelectFileToReplace(key, e)}
                      className="hidden"
                    />
                  </label>

                  {item && item.versions.length > 1 && (
                    <button
                      onClick={() =>
                        setExpandedHistoryKey(isHistoryOpen ? null : key)
                      }
                      className="inline-flex items-center space-x-1 text-slate-500 hover:text-slate-800 font-medium"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>{item.versions.length} versions</span>
                    </button>
                  )}
                </div>

                {/* Version History Accordion */}
                {isHistoryOpen && item && item.versions.length > 1 && (
                  <div className="p-3 bg-slate-100 border-t border-slate-200 space-y-2 text-xs">
                    <span className="font-semibold text-slate-700 block text-[11px] uppercase tracking-wider">
                      Previous Versions
                    </span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {item.versions.map((ver, vIdx) => (
                        <div
                          key={vIdx}
                          className="flex items-center justify-between p-2 rounded bg-white border border-slate-200"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[10px] text-slate-400">
                              v{item.versions.length - vIdx}
                            </span>
                            <span className="text-[11px] text-slate-600 font-mono truncate max-w-[120px]">
                              {formatDateIndian(ver.date)}
                            </span>
                          </div>

                          {vIdx === 0 ? (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              Current
                            </span>
                          ) : (
                            <button
                              onClick={() => handleRestoreVersion(key, vIdx)}
                              className="inline-flex items-center space-x-1 text-[11px] text-slate-700 hover:text-red-600 hover:bg-slate-100 px-1.5 py-0.5 rounded transition"
                              title="Restore this version"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restore</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Replace Image Preview Modal */}
      {replacingKey && newImageFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">
                Confirm Replace: {replacingKey}
              </h3>
              <button
                onClick={() => {
                  setReplacingKey(null);
                  setNewImageFile(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="w-full h-56 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                {newImagePreview && (
                  <img
                    src={newImagePreview}
                    alt="Preview"
                    className="w-full h-full object-contain p-2"
                  />
                )}
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <p>
                  <strong>File:</strong> {newImageFile.name} ({(newImageFile.size / 1024).toFixed(1)} KB)
                </p>
                <p className="text-slate-500">
                  The current image will be preserved in the version history, allowing one-click restore anytime.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setReplacingKey(null);
                    setNewImageFile(null);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReplace}
                  disabled={isProcessing}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>{isProcessing ? 'Saving...' : 'Confirm & Save'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restore confirmation modal */}
      <ConfirmModal
        isOpen={Boolean(versionToRestore)}
        title="Restore Library Version?"
        message={`Are you sure you want to restore a previous image version for "${versionToRestore?.key}"? Current image will become an archive version.`}
        confirmLabel="Restore Version"
        confirmVariant="warning"
        onConfirm={handleConfirmRestore}
        onCancel={() => setVersionToRestore(null)}
      />
    </div>
  );
};
