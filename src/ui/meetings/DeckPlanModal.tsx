import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  X,
  Sparkles,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Trash2,
  Copy,
  Image as ImageIcon,
  FileText,
  AlertCircle,
  ArrowRight,
  Info,
} from 'lucide-react';
import type {
  TemplateMap,
  Meeting,
  Member,
  Role,
  ScheduleEntry,
  LibraryImage,
  ChapterSettings,
  ResolutionResult,
} from '../../types';
import { buildDeckPlan, type DeckPlanResult, type PlannedSlide } from '../../engine/deckPlan';

interface DeckPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToGenerate?: () => void;
  templateMap: TemplateMap;
  resolutionResult: ResolutionResult;
  meeting: Meeting;
  members: Member[];
  roles: Role[];
  schedule: ScheduleEntry[];
  library: LibraryImage[];
  settings: ChapterSettings;
  canGenerate: boolean;
}

export const DeckPlanModal: React.FC<DeckPlanModalProps> = ({
  isOpen,
  onClose,
  onProceedToGenerate,
  templateMap,
  resolutionResult,
  meeting,
  members,
  roles,
  schedule,
  library,
  settings,
  canGenerate,
}) => {
  const [filter, setFilter] = useState<'all' | 'cloned' | 'removed' | 'images' | 'text'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate deck plan
  const planResult = useMemo<DeckPlanResult>(() => {
    return buildDeckPlan(
      templateMap,
      resolutionResult,
      meeting,
      members,
      roles,
      schedule,
      library,
      settings
    );
  }, [templateMap, resolutionResult, meeting, members, roles, schedule, library, settings]);

  // Manage image blob URLs safely
  const [blobUrls, setBlobUrls] = useState<Map<Blob, string>>(new Map());

  useEffect(() => {
    const urls = new Map<Blob, string>();
    for (const slide of planResult.slides) {
      for (const slot of slide.imageSlots) {
        if (slot.blob && !urls.has(slot.blob)) {
          try {
            const u = URL.createObjectURL(slot.blob);
            urls.set(slot.blob, u);
          } catch (e) {
            console.error('Failed creating blob URL for deck plan thumbnail:', e);
          }
        }
      }
    }
    setBlobUrls(urls);

    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [planResult]);

  if (!isOpen) return null;

  const filteredSlides = planResult.slides.filter((slide) => {
    // Filter type
    if (filter === 'cloned' && slide.status !== 'cloned') return false;
    if (filter === 'removed' && slide.status !== 'removed') return false;
    if (filter === 'images' && slide.imageSlots.length === 0) return false;
    if (filter === 'text' && slide.textValues.length === 0) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = slide.title.toLowerCase().includes(q);
      const matchDirective = slide.directiveSummary?.toLowerCase().includes(q);
      const matchNum =
        String(slide.outputSlideNumber || '').includes(q) ||
        String(slide.originalSlideNumber).includes(q);
      const matchText = slide.textValues.some(
        (t) => t.tag.toLowerCase().includes(q) || t.resolvedValue.toLowerCase().includes(q)
      );
      const matchImages = slide.imageSlots.some(
        (i) => i.label.toLowerCase().includes(q) || i.tagKey.toLowerCase().includes(q)
      );
      return matchTitle || matchDirective || matchNum || matchText || matchImages;
    }

    return true;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl max-w-5xl w-full h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 space-y-4 shrink-0 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-md shadow-red-900/20">
                <Layers className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-bold text-slate-900">Deck Plan</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                    Content preview • Not a rendering
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ordered sequence of all slides in the generated presentation, with expanded repeats, resolved text, and image slots.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="Close Deck Plan"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Totals at the top (exact requirement) */}
          <div className="p-3.5 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></div>
              <span className="text-sm font-bold text-red-950 font-mono tracking-tight">
                {planResult.totalsSummary}
              </span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-red-900 font-medium">
              <span>{planResult.stats.totalOriginalSlides} in template</span>
              <span>•</span>
              <span className="text-emerald-700 font-semibold">{planResult.stats.totalOutputSlides} in final deck</span>
              {planResult.stats.totalRemovedSlides > 0 && (
                <>
                  <span>•</span>
                  <span className="text-slate-500">{planResult.stats.totalRemovedSlides} removed (@if)</span>
                </>
              )}
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto text-xs pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
                  filter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                All Slides ({planResult.slides.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('cloned')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
                  filter === 'cloned'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                }`}
              >
                Cloned ({planResult.stats.totalClonedSlides})
              </button>
              {planResult.stats.totalRemovedSlides > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter('removed')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
                    filter === 'removed'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                  }`}
                >
                  Removed ({planResult.stats.totalRemovedSlides})
                </button>
              )}
              <button
                type="button"
                onClick={() => setFilter('images')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
                  filter === 'images'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                }`}
              >
                Image Slides
              </button>
              <button
                type="button"
                onClick={() => setFilter('text')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
                  filter === 'text'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                }`}
              >
                Text Slides
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search slide title, tag, value..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Slides Ordered List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
          {filteredSlides.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No slides match your current filter</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing your search query or selecting "All Slides".</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSlides.map((slide, index) => {
                const isRemoved = slide.status === 'removed';
                const isCloned = slide.status === 'cloned';

                return (
                  <div
                    key={`${slide.originalSlideNumber}-${slide.outputSlideNumber || 'rem'}-${index}`}
                    className={`bg-white rounded-xl border p-4 sm:p-5 shadow-2xs transition hover:shadow-xs ${
                      isRemoved
                        ? 'border-rose-200 bg-rose-50/20 opacity-80'
                        : isCloned
                        ? 'border-blue-200 bg-blue-50/10'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Slide Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center space-x-3">
                        {isRemoved ? (
                          <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0">
                            ✕
                          </span>
                        ) : (
                          <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            #{slide.outputSlideNumber}
                          </span>
                        )}

                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold text-slate-900 text-sm">{slide.title}</h3>
                            {isRemoved && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200 uppercase">
                                Removed
                              </span>
                            )}
                            {isCloned && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                                Cloned Repeat
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Template slide #{slide.originalSlideNumber}
                            {slide.directiveSummary && ` • ${slide.directiveSummary}`}
                          </p>
                        </div>
                      </div>

                      {/* Clone item badge */}
                      {slide.cloneInfo && (
                        <div className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                          <span className="font-semibold">
                            Slot {slide.cloneInfo.chunkIndex + 1} of {slide.cloneInfo.totalChunks}:
                          </span>{' '}
                          <span>{slide.cloneInfo.itemSummary}</span>
                        </div>
                      )}
                    </div>

                    {/* Removed Reason Notice */}
                    {isRemoved && slide.removeReason && (
                      <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200/80 text-xs text-rose-800 flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{slide.removeReason}</span>
                      </div>
                    )}

                    {/* Slide Content: Images and Text Values */}
                    {!isRemoved && (
                      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Image Slots Preview */}
                        {slide.imageSlots.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>Image Slots ({slide.imageSlots.length})</span>
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {slide.imageSlots.map((slot, sIdx) => {
                                const previewUrl = slot.blob ? blobUrls.get(slot.blob) : undefined;

                                return (
                                  <div
                                    key={sIdx}
                                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center space-x-3"
                                  >
                                    {previewUrl ? (
                                      <img
                                        src={previewUrl}
                                        alt={slot.label}
                                        className="w-14 h-14 rounded-lg object-contain bg-white border border-slate-200 shadow-2xs shrink-0"
                                      />
                                    ) : (
                                      <div className="w-14 h-14 rounded-lg bg-slate-200 flex flex-col items-center justify-center text-slate-400 shrink-0 text-[10px] text-center p-1">
                                        <ImageIcon className="w-4 h-4 mb-0.5" />
                                        <span>No image</span>
                                      </div>
                                    )}

                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-semibold text-slate-800 truncate" title={slot.label}>
                                        {slot.label}
                                      </p>
                                      <p className="text-[10px] font-mono text-slate-400 truncate" title={slot.tagKey}>
                                        {slot.tagKey}
                                      </p>
                                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-200 text-slate-700">
                                        {slot.sourceType.replace('_', ' ')}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Text Values Preview */}
                        {slide.textValues.length > 0 && (
                          <div className={`space-y-2 ${slide.imageSlots.length === 0 ? 'lg:col-span-2' : ''}`}>
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                              <FileText className="w-3.5 h-3.5" />
                              <span>Values Written ({slide.textValues.length})</span>
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                              {slide.textValues.map((t, tIdx) => (
                                <div
                                  key={tIdx}
                                  className="p-2 rounded-lg border border-slate-200 bg-white flex flex-col justify-between"
                                >
                                  <span className="text-[10px] font-mono text-slate-400 truncate" title={t.tag}>
                                    {t.tag}
                                  </span>
                                  <span
                                    className={`text-xs font-semibold mt-0.5 break-words ${
                                      t.resolvedValue ? 'text-slate-900' : 'text-slate-300 italic'
                                    }`}
                                  >
                                    {t.resolvedValue || '(blank)'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {slide.imageSlots.length === 0 && slide.textValues.length === 0 && (
                          <div className="lg:col-span-2 py-3 px-4 bg-slate-100 rounded-lg text-xs text-slate-500 italic">
                            Static slide (no dynamic text tags or replaced image slots). Layout and theme preserved unchanged.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              All slides will be generated client-side directly into PPTX XML with exact theme, typography, and animation preservation.
            </span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              Close
            </button>
            {onProceedToGenerate && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onProceedToGenerate();
                }}
                disabled={!canGenerate}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition disabled:opacity-50 flex items-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Generate Deck</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
