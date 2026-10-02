import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileCheck2,
  AlertTriangle,
  FileBox,
  CheckCircle,
  Download,
  Trash2,
  Sparkles,
  RefreshCw,
  HardDrive,
  Info,
  Calendar,
  Layers,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  MinusCircle,
  Check,
} from 'lucide-react';
import type { TemplateVersion, TemplateMap } from '../types';
import {
  uploadAndProcessTemplate,
  getAllTemplateVersions,
  setActiveTemplateVersion,
  deleteTemplateVersion,
  getTemplateBlob,
  getTemplateMap,
} from '../data/templateRepo';
import { createSampleBniTemplate } from '../engine/sampleTemplate';
import { ConfirmModal } from './ConfirmModal';
import { triggerFileDownload } from '../utils/fileDownload';

interface TemplateUploadProps {
  onTemplateReady: (version: TemplateVersion, templateMap: TemplateMap) => void;
  activeVersion?: TemplateVersion;
  onRefreshVersions: () => void;
}

interface VersionTagDiff {
  versionNum: number;
  prevVersionNum?: number;
  addedTags: string[];
  removedTags: string[];
  totalTags: number;
}

export const TemplateUpload: React.FC<TemplateUploadProps> = ({
  onTemplateReady,
  activeVersion,
  onRefreshVersions,
}) => {
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [versionMaps, setVersionMaps] = useState<Map<number, TemplateMap>>(new Map());
  const [tagDiffs, setTagDiffs] = useState<Map<number, VersionTagDiff>>(new Map());
  const [expandedDiffVer, setExpandedDiffVer] = useState<number | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation
  const [versionToDelete, setVersionToDelete] = useState<{ id: number; version: number } | null>(null);

  const loadVersions = async () => {
    try {
      const list = await getAllTemplateVersions();
      setVersions(list);

      // Load TemplateMap for each version to compute tag differences
      const mapStore = new Map<number, TemplateMap>();
      for (const ver of list) {
        if (ver.id) {
          const tMap = await getTemplateMap(ver.id);
          if (tMap) mapStore.set(ver.version, tMap);
        }
      }
      setVersionMaps(mapStore);

      // Helper to extract all tags from a template map
      const extractTags = (map: TemplateMap): Set<string> => {
        const tagSet = new Set<string>();
        map.fields.forEach((f) => tagSet.add(f.key));
        map.slides.forEach((s) => {
          s.textTags.forEach((t) => tagSet.add(t.key || t.tag));
          s.imageSlots.forEach((slot) => tagSet.add(slot.key || slot.tag));
          s.notesDirectives.forEach((d) => tagSet.add(d.raw));
        });
        return tagSet;
      };

      // Compute tag diffs compared to previous version
      const diffStore = new Map<number, VersionTagDiff>();
      // Sort ascending by version to compare each with its predecessor
      const sortedAsc = [...list].sort((a, b) => a.version - b.version);

      for (let i = 0; i < sortedAsc.length; i++) {
        const current = sortedAsc[i];
        const prev = i > 0 ? sortedAsc[i - 1] : null;

        const currentMap = mapStore.get(current.version);
        const prevMap = prev ? mapStore.get(prev.version) : null;

        if (currentMap) {
          const currentTags = extractTags(currentMap);
          if (prevMap && prev) {
            const prevTags = extractTags(prevMap);
            const added = [...currentTags].filter((t) => !prevTags.has(t)).sort();
            const removed = [...prevTags].filter((t) => !currentTags.has(t)).sort();
            diffStore.set(current.version, {
              versionNum: current.version,
              prevVersionNum: prev.version,
              addedTags: added,
              removedTags: removed,
              totalTags: currentTags.size,
            });
          } else {
            // First version
            diffStore.set(current.version, {
              versionNum: current.version,
              addedTags: [...currentTags].sort(),
              removedTags: [],
              totalTags: currentTags.size,
            });
          }
        }
      }

      setTagDiffs(diffStore);
    } catch (err) {
      console.error('Failed to load template versions and maps:', err);
    }
  };

  useEffect(() => {
    loadVersions();
  }, [activeVersion]);

  const handleFile = async (file: File | Blob, name: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Rule: Accept .pptx only
    const lowerName = name.toLowerCase();
    if (!lowerName.endsWith('.pptx')) {
      setErrorMessage(
        `Upload rejected: "${name}" is not a PowerPoint presentation (.pptx). Please upload a valid .pptx file.`
      );
      return;
    }

    if (file.size === 0) {
      setErrorMessage(
        `Upload rejected: The file "${name}" is empty (0 bytes). Please upload a valid PowerPoint presentation.`
      );
      return;
    }

    setIsProcessing(true);
    setProgressPercent(5);
    setProgressMessage('Initializing PPTX reader...');

    try {
      const result = await uploadAndProcessTemplate(file, name, (percent, msg) => {
        setProgressPercent(percent);
        setProgressMessage(msg);
      });

      setSuccessMessage(
        `Template "${name}" saved as Version ${result.version.version} with ${result.templateMap.slideCount} slides analyzed!`
      );
      await loadVersions();
      onRefreshVersions();
      onTemplateReady(result.version, result.templateMap);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file, file.name);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFile(file, file.name);
      e.target.value = '';
    }
  };

  const handleLoadSample = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsProcessing(true);
    setProgressPercent(10);
    setProgressMessage('Generating sample BNI Believers template...');

    try {
      const sampleBlob = await createSampleBniTemplate();
      const sampleName = 'BNI_Believers_Weekly_Template.pptx';
      const result = await uploadAndProcessTemplate(sampleBlob, sampleName, (percent, msg) => {
        setProgressPercent(percent);
        setProgressMessage(msg);
      });

      setSuccessMessage(
        `BNI Believers sample template loaded successfully (Version ${result.version.version}).`
      );
      await loadVersions();
      onRefreshVersions();
      onTemplateReady(result.version, result.templateMap);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetActive = async (id: number) => {
    try {
      await setActiveTemplateVersion(id);
      await loadVersions();
      onRefreshVersions();
    } catch (err) {
      console.error('Failed to set active version:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!versionToDelete) return;
    try {
      await deleteTemplateVersion(versionToDelete.id);
      await loadVersions();
      onRefreshVersions();
    } catch (err) {
      console.error('Failed to delete version:', err);
    } finally {
      setVersionToDelete(null);
    }
  };

  const handleDownloadOriginal = async (versionId: number, filename: string) => {
    try {
      const blob = await getTemplateBlob(versionId);
      if (!blob) {
        setErrorMessage('File blob not found in IndexedDB.');
        return;
      }
      triggerFileDownload(blob, filename);
    } catch (err) {
      console.error('Failed to download template:', err);
    }
  };

  // Indian Date & Time format helper
  const formatDateIndian = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-IN', {
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Page Title & Chapter Info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Master PowerPoint Template Management
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Upload your chapter's tagged .pptx template. Every upload creates an immutable new version; previous versions are never changed. Meetings preserve the version they were generated with.
          </p>
        </div>

        <button
          onClick={handleLoadSample}
          disabled={isProcessing}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm font-semibold shadow-sm hover:from-red-700 hover:to-rose-700 transition disabled:opacity-50 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Load BNI Believers Starter Template</span>
        </button>
      </div>

      {/* Error & Success Banners */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start space-x-3 shadow-sm animate-in fade-in duration-200">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Upload Error</p>
            <p className="text-sm mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start space-x-3 shadow-sm animate-in fade-in duration-200">
          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Success</p>
            <p className="text-sm mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Upload Box */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-red-500 bg-red-50/50 scale-[1.005]'
            : 'border-slate-300 hover:border-red-400 bg-white hover:bg-slate-50/50'
        } ${isProcessing ? 'pointer-events-none opacity-80' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 mb-4 shadow-inner">
            {isProcessing ? (
              <RefreshCw className="w-8 h-8 animate-spin text-red-600" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          <h3 className="text-lg font-semibold text-slate-800">
            {isProcessing ? 'Analyzing PowerPoint Template...' : 'Upload your chapter template (.pptx)'}
          </h3>

          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Drag & drop your presentation file here or <span className="text-red-600 font-medium underline">browse</span>
          </p>

          <div className="mt-3 flex items-center space-x-2 text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
            <HardDrive className="w-3.5 h-3.5" />
            <span>Supports large decks (120 MB+ with videos/media) • 100% Client-side</span>
          </div>

          {/* Progress Bar */}
          {isProcessing && (
            <div className="w-full mt-6 space-y-2">
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-red-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-600">
                <span className="font-medium">{progressMessage}</span>
                <span>{progressPercent}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rules Notice */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex items-start space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <span>
            <strong>Immutable Versions:</strong> Uploading creates a new version; older versions remain forever unchanged in IndexedDB.
          </span>
        </div>
        <div className="flex items-start space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <span>
            <strong>Version Pinning:</strong> Generated meetings remember the exact template version they were generated with.
          </span>
        </div>
        <div className="flex items-start space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <span>
            <strong>Tag Difference Tracking:</strong> See exactly which tags were added or removed between template iterations.
          </span>
        </div>
      </div>

      {/* Template Version History Table with Tag Comparison Diff (Exact Requirement) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileBox className="w-5 h-5 text-slate-700" />
            <h2 className="font-semibold text-slate-900">Stored Template Versions</h2>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
            {versions.length} {versions.length === 1 ? 'version' : 'versions'} saved
          </span>
        </div>

        {versions.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <FileBox className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">No templates uploaded yet</p>
            <p className="text-xs mt-1">Upload your chapter's .pptx file above or click "Load BNI Believers Starter Template".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Version</th>
                  <th className="px-6 py-3.5">File Name</th>
                  <th className="px-6 py-3.5">Size</th>
                  <th className="px-6 py-3.5">Slides</th>
                  <th className="px-6 py-3.5">Tag Changes vs Prev</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {versions.map((ver) => {
                  const isCurrentActive = ver.isActive;
                  const diff = tagDiffs.get(ver.version);
                  const isExpanded = expandedDiffVer === ver.version;
                  const hasTagChanges = diff && (diff.addedTags.length > 0 || diff.removedTags.length > 0);

                  return (
                    <React.Fragment key={ver.id}>
                      <tr
                        className={`hover:bg-slate-50 transition-colors ${
                          isCurrentActive ? 'bg-red-50/40' : ''
                        }`}
                      >
                        <td className="px-6 py-4 font-mono font-semibold text-slate-900">
                          v{ver.version}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-800 truncate max-w-xs" title={ver.filename}>
                            {ver.filename}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {formatDateIndian(ver.uploadDate)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                          {ver.formattedSize}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          <span className="inline-flex items-center space-x-1">
                            <Layers className="w-3.5 h-3.5 text-slate-400" />
                            <span>{ver.slideCount} slides</span>
                          </span>
                        </td>

                        {/* Tag Diff Column (Exact Requirement) */}
                        <td className="px-6 py-4">
                          {diff ? (
                            diff.prevVersionNum !== undefined ? (
                              <button
                                type="button"
                                onClick={() => setExpandedDiffVer(isExpanded ? null : ver.version)}
                                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                              >
                                {diff.addedTags.length > 0 && (
                                  <span className="text-emerald-700 font-bold">
                                    +{diff.addedTags.length}
                                  </span>
                                )}
                                {diff.removedTags.length > 0 && (
                                  <span className="text-rose-700 font-bold">
                                    -{diff.removedTags.length}
                                  </span>
                                )}
                                {diff.addedTags.length === 0 && diff.removedTags.length === 0 && (
                                  <span className="text-slate-500 font-normal">Same tags</span>
                                )}
                                <span className="text-slate-400 font-normal">vs v{diff.prevVersionNum}</span>
                                {isExpanded ? (
                                  <ChevronDown className="w-3 h-3 text-slate-500" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-slate-500" />
                                )}
                              </button>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                                Base (v1: {diff.totalTags} tags)
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {isCurrentActive ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Active Template
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetActive(ver.id!)}
                              className="text-xs px-2.5 py-1 rounded-md text-slate-600 hover:text-slate-900 border border-slate-300 hover:bg-slate-100 transition cursor-pointer"
                            >
                              Set as Active
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleDownloadOriginal(ver.id!, ver.filename)}
                            title="Download original PPTX bytes"
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setVersionToDelete({ id: ver.id!, version: ver.version })}
                            title="Delete version"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Tag Diff Drawer */}
                      {isExpanded && diff && (
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                          <td colSpan={7} className="px-6 py-4 space-y-3">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-xs text-slate-800">
                                Tag comparison: Version {ver.version} vs Version {diff.prevVersionNum}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                ({diff.totalTags} total tags in v{ver.version})
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Added Tags */}
                              <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-1.5">
                                <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-800">
                                  <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Added Tags ({diff.addedTags.length})</span>
                                </div>
                                {diff.addedTags.length === 0 ? (
                                  <p className="text-[11px] text-slate-400 italic">No new tags introduced in this version.</p>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5 pt-1 max-h-36 overflow-y-auto">
                                    {diff.addedTags.map((t, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300"
                                      >
                                        +{t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Removed Tags */}
                              <div className="p-3 bg-white rounded-xl border border-rose-200 space-y-1.5">
                                <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-800">
                                  <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Removed Tags ({diff.removedTags.length})</span>
                                </div>
                                {diff.removedTags.length === 0 ? (
                                  <p className="text-[11px] text-slate-400 italic">No tags removed from previous version.</p>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5 pt-1 max-h-36 overflow-y-auto">
                                    {diff.removedTags.map((t, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-rose-50 text-rose-800 border border-rose-300"
                                      >
                                        -{t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(versionToDelete)}
        title="Delete Template Version?"
        message={`Are you sure you want to permanently delete template Version ${versionToDelete?.version}? This cannot be undone.`}
        confirmLabel="Delete Version"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setVersionToDelete(null)}
      />
    </div>
  );
};
