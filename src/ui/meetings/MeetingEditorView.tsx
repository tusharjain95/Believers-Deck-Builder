import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Calendar,
  Save,
  Check,
  Upload,
  AlertTriangle,
  ArrowLeft,
  Image as ImageIcon,
  Clock,
  Layers,
  Sparkles,
  Clipboard,
  Copy,
  Download,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import type {
  Meeting,
  TemplateMap,
  Member,
  Role,
  ScheduleEntry,
  LibraryImage,
  ChapterSettings,
  Field,
  GenerationReport,
  GeneratedDeckRecord,
} from '../../types';
import { saveMeeting } from '../../data/meetingsRepo';
import { resolve, type ResolutionResult } from '../../engine/resolve';
import { generate } from '../../engine/generate';
import { getTemplateBlobForVersion } from '../../data/templateRepo';
import { getGeneratedDeck, saveGeneratedDeck, formatByteSize } from '../../data/generatedDeckRepo';
import { triggerFileDownload } from '../../utils/fileDownload';
import { SmartNumberInput } from './SmartNumberInput';
import { PresentersListEditor } from './PresentersListEditor';
import { FeaturesListEditor } from './FeaturesListEditor';
import { RotationListEditor } from './RotationListEditor';
import { FeatureDeckEditor } from './FeatureDeckEditor';
import { GenericListEditor } from './GenericListEditor';
import { ValidationPanel } from './ValidationPanel';
import { GenerationProgressModal } from './GenerationProgressModal';
import { GenerationReportModal } from './GenerationReportModal';
import { SmartEntryModal } from './SmartEntryModal';
import { DeckPlanModal } from './DeckPlanModal';

interface MeetingEditorViewProps {
  meeting: Meeting;
  templateMap: TemplateMap;
  members: Member[];
  roles: Role[];
  schedule: ScheduleEntry[];
  library: LibraryImage[];
  settings: ChapterSettings;
  onBack: () => void;
  onSaved?: () => void;
  onMeetingChange?: (updated: Meeting) => void;
  initialOpenSmartEntry?: boolean;
  initialOpenDeckPlan?: boolean;
}

/**
 * Turns raw field keys into friendly, human-readable labels
 * e.g. "vp.thank_you_for_business" -> "Thank You For Closed Business"
 */
function formatFieldLabel(key: string, name: string): string {
  const customLabels: Record<string, string> = {
    'meeting.date': 'Meeting Date',
    'meeting.number': 'Meeting Number (#)',
    'vp.referrals': 'Referrals Passed This Week',
    'vp.visitors': 'Visitors Welcomed',
    'vp.tyfcb': 'Thank You For Closed Business (TYFCB)',
    'vp.retention_rate': 'Chapter Retention Rate (%)',
    'weekly.events_image': 'Weekly Events Banner Image',
    'weekly.quote': 'Motivational Quote / Thought for the Day',
    'monthly.theme': 'Monthly Chapter Focus / Theme',
    'global.members': 'Total BNI Global Members',
    'global.countries': 'Total Countries Worldwide',
    'india.chapters': 'Total BNI India Chapters',
    'region.chapter_rank': 'Believers Rank in Region',
  };

  if (customLabels[key]) return customLabels[key];

  // Fallback: name to title case
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Memoized preview component for image Blobs to avoid creating new object URLs on every render
 */
const ImagePreview: React.FC<{ blob: Blob; alt: string }> = React.memo(({ blob, alt }) => {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob]);

  if (!url) return null;
  return <img src={url} alt={alt} className="w-full h-full object-contain p-1" />;
});

export const MeetingEditorView: React.FC<MeetingEditorViewProps> = ({
  meeting: initialMeeting,
  templateMap,
  members,
  roles,
  schedule,
  library,
  settings,
  onBack,
  onSaved,
  onMeetingChange,
  initialOpenSmartEntry,
  initialOpenDeckPlan,
}) => {
  const [meeting, setMeeting] = useState<Meeting>(initialMeeting);
  const [lastSaved, setLastSaved] = useState<string>(new Date().toLocaleTimeString('en-IN'));
  const [isAutosaving, setIsAutosaving] = useState(false);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const meetingRef = useRef(meeting);
  meetingRef.current = meeting;

  // Sync state if a different meeting is selected
  useEffect(() => {
    setMeeting(initialMeeting);
  }, [initialMeeting.id]);

  // Flush pending autosave on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
        saveMeeting(meetingRef.current).catch(console.error);
      }
    };
  }, []);

  // Run pure resolver
  const resolutionResult = useMemo<ResolutionResult>(() => {
    return resolve(templateMap, meeting, members, roles, schedule, library, settings);
  }, [templateMap, meeting, members, roles, schedule, library, settings]);

  const errorCount = resolutionResult.issues.filter((i) => i.severity === 'error').length;

  // Generation states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPercent, setGenerationPercent] = useState(0);
  const [generationMessage, setGenerationMessage] = useState('');
  const [generationReport, setGenerationReport] = useState<GenerationReport | null>(null);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [savedDeckRecord, setSavedDeckRecord] = useState<GeneratedDeckRecord | null>(null);
  const [isSmartEntryOpen, setIsSmartEntryOpen] = useState(Boolean(initialOpenSmartEntry));
  const [showDeckPlanModal, setShowDeckPlanModal] = useState(Boolean(initialOpenDeckPlan));

  const handleApplySmartEntry = (
    updatedValues: Record<string, number | string>,
    vacantCategories: string[]
  ) => {
    const newValues = {
      ...meeting.values,
      ...updatedValues,
    };

    const newLists = { ...meeting.lists };
    if (vacantCategories.length > 0) {
      const existingVacant = (meeting.lists['#vacant'] || meeting.lists['vacant'] || []) as Array<Record<string, string>>;
      const existingCategoryNames = new Set(
        existingVacant.map((item) => (item.category || item.name || '').toLowerCase().trim())
      );
      const toAdd = vacantCategories
        .filter((cat) => !existingCategoryNames.has(cat.toLowerCase().trim()))
        .map((cat) => ({ category: cat }));
      newLists['#vacant'] = [...existingVacant, ...toAdd];
    }

    const updatedMeeting: Meeting = {
      ...meeting,
      values: newValues,
      lists: newLists,
    };

    triggerAutosave(updatedMeeting);
  };

  // Check if a saved deck already exists in IndexedDB for this meeting
  useEffect(() => {
    getGeneratedDeck(meeting.id).then((rec) => {
      if (rec) setSavedDeckRecord(rec);
    });
  }, [meeting.id]);

  const handleGenerateDeck = async () => {
    if (errorCount > 0 || !resolutionResult.isValid) return;

    setIsGenerating(true);
    setGenerationPercent(5);
    setGenerationMessage('Loading template presentation archive...');

    try {
      const templateBlob = await getTemplateBlobForVersion(templateMap.version);
      if (!templateBlob) {
        throw new Error(
          'Template file could not be loaded from database. Please verify the template is uploaded.'
        );
      }

      const res = await generate(
        templateBlob,
        templateMap,
        resolutionResult,
        settings,
        meeting.date,
        {
          onProgress: (pct, msg) => {
            setGenerationPercent(pct);
            setGenerationMessage(msg);
          },
        }
      );

      setGenerationReport(res.report);
      setGeneratedBlob(res.blob);

      if (res.blob) {
        // Automatically save to IndexedDB so copy is safely preserved
        try {
          await saveGeneratedDeck(
            meeting.id,
            res.report.meetingDate,
            res.report.filename,
            res.blob
          );
          const savedRec = await getGeneratedDeck(meeting.id);
          if (savedRec) setSavedDeckRecord(savedRec);
        } catch (saveErr) {
          console.error('Failed to auto-save generated deck to IndexedDB:', saveErr);
        }

        // Trigger browser download
        triggerFileDownload(res.blob, res.report.filename);

        // Update meeting status to 'generated' and keep template version
        const updated: Meeting = {
          ...meeting,
          status: 'generated',
          generatedAt: res.report.generatedAt,
        };
        (updated as any).templateVersion = templateMap.version;
        (updated as any).slideCount = res.report.slidesOut;
        await saveMeeting(updated);
        setMeeting(updated);
        onMeetingChange?.(updated);
      }

      setIsGenerating(false);
      setShowReportModal(true);
    } catch (err) {
      console.error('Deck generation failed:', err);
      setIsGenerating(false);
      alert('Deck generation failed: ' + (err as Error).message);
    }
  };

  const handleDownloadAgain = () => {
    if (!generatedBlob || !generationReport) return;
    triggerFileDownload(generatedBlob, generationReport.filename);
  };

  const handleDownloadSavedDeck = () => {
    if (!savedDeckRecord) return;
    triggerFileDownload(savedDeckRecord.blob, savedDeckRecord.filename);
  };

  // Autosave when meeting data changes
  const triggerAutosave = (updated: Meeting) => {
    setMeeting(updated);
    setIsAutosaving(true);
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);

    autosaveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveMeeting(updated);
        setLastSaved(new Date().toLocaleTimeString('en-IN'));
        setIsAutosaving(false);
        onMeetingChange?.(updated);
      } catch (err) {
        console.error('Autosave error:', err);
        setIsAutosaving(false);
      }
    }, 600);
  };

  // Group fields by group name and order by the first slide where they appear
  const groupSections = useMemo(() => {
    const groupsMap = new Map<string, { group: string; fields: Field[]; firstSlide: number; slides: number[] }>();

    for (const field of templateMap.fields) {
      if (field.group === 'lib' || field.kind === 'list') continue; // Handled separately

      const g = field.group;
      const minSlide = Math.min(...field.slides);

      if (!groupsMap.has(g)) {
        groupsMap.set(g, {
          group: g,
          fields: [field],
          firstSlide: minSlide,
          slides: [...field.slides],
        });
      } else {
        const item = groupsMap.get(g)!;
        item.fields.push(field);
        item.firstSlide = Math.min(item.firstSlide, minSlide);
        for (const s of field.slides) {
          if (!item.slides.includes(s)) item.slides.push(s);
        }
      }
    }

    // Sort by first slide appearance
    return Array.from(groupsMap.values()).sort((a, b) => a.firstSlide - b.firstSlide);
  }, [templateMap.fields]);

  const handleValueChange = (key: string, val: any) => {
    const updated = {
      ...meeting,
      values: {
        ...meeting.values,
        [key]: val,
      },
    };
    triggerAutosave(updated);
  };

  const handleImageUpload = (key: string, fileOrBlob: Blob, filename?: string) => {
    const updatedImages = {
      ...((meeting as any).images || {}),
      [key]: {
        blob: fileOrBlob,
        source: 'upload' as const,
        filename,
      },
    };

    // Remove from copiedImageKeys if it was copied
    const updatedCopiedKeys = (meeting.copiedImageKeys || []).filter((k: string) => k !== key);

    const updated = {
      ...meeting,
      images: updatedImages,
      copiedImageKeys: updatedCopiedKeys,
    };
    triggerAutosave(updated);
  };

  const handleImagePaste = (key: string, e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const blob = items[i].getAsFile();
        if (blob) {
          e.preventDefault();
          handleImageUpload(key, blob, 'pasted_image.png');
          break;
        }
      }
    }
  };

  const handleListChange = (listName: string, items: any[]) => {
    const listKey = listName.startsWith('#') ? listName : `#${listName}`;
    const updated = {
      ...meeting,
      lists: {
        ...meeting.lists,
        [listKey]: items,
      },
    };
    triggerAutosave(updated);
  };

  const handleMarkReady = async () => {
    if (!resolutionResult.isValid) return;
    const updated: Meeting = {
      ...meeting,
      status: 'ready',
    };
    await saveMeeting(updated);
    setMeeting(updated);
    onMeetingChange?.(updated);
  };

  const handleScrollToField = (fieldKey?: string, category?: string) => {
    let targetEl: HTMLElement | null = null;
    if (fieldKey) {
      targetEl = document.getElementById(`field-${fieldKey}`);
    }
    if (!targetEl && category) {
      targetEl = document.getElementById(`section-${category.toLowerCase().replace(/\s+/g, '-')}`);
    }

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetEl.classList.add('ring-4', 'ring-red-400');
      setTimeout(() => {
        targetEl?.classList.remove('ring-4', 'ring-red-400');
      }, 2000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
            title="Back to meetings list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Meeting Deck Form: {meeting.date}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase font-mono ${
                  meeting.status === 'ready'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : meeting.status === 'generated'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {meeting.status}
              </span>
            </div>

            <div className="flex items-center space-x-3 text-xs text-slate-500 mt-0.5">
              <span>Deck template: v{templateMap.version} ({templateMap.templateFileName})</span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {isAutosaving ? 'Saving changes...' : `Autosaved at ${lastSaved}`}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Deck Plan Preview Button (Before Generating) */}
          <button
            type="button"
            onClick={() => setShowDeckPlanModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 shadow-2xs transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
            title="Preview ordered slide sequence, clones, removed slides, and values before generating"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Deck Plan</span>
          </button>

          {/* AI Smart Entry Button */}
          <button
            type="button"
            onClick={() => setIsSmartEntryOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-xs transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
            title="Auto-extract VP metrics, weekly numbers, and vacant categories from WhatsApp or screenshots using Gemini AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Smart Entry</span>
          </button>

          {savedDeckRecord && (
            <button
              type="button"
              onClick={handleDownloadSavedDeck}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition flex items-center space-x-1.5 cursor-pointer"
              title={`Download stored browser copy (${formatByteSize(savedDeckRecord.sizeBytes)})`}
            >
              <HardDrive className="w-3.5 h-3.5 text-slate-500" />
              <span>Download Saved Copy</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleMarkReady}
            disabled={!resolutionResult.isValid || meeting.status === 'ready'}
            className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition flex items-center space-x-1.5 ${
              meeting.status === 'ready'
                ? 'bg-emerald-600 text-white cursor-default'
                : resolutionResult.isValid
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>{meeting.status === 'ready' ? 'Ready for Deck Build' : 'Mark Ready'}</span>
          </button>

          {/* Primary "Generate deck" button with disabled tooltip when validation errors > 0 */}
          <div className="relative group">
            <button
              type="button"
              onClick={handleGenerateDeck}
              disabled={errorCount > 0 || !resolutionResult.isValid || isGenerating}
              className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5 ${
                errorCount === 0 && resolutionResult.isValid
                  ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer active:scale-95 shadow-red-600/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/50'
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Generate Deck</span>
                  <Download className="w-3.5 h-3.5 ml-0.5" />
                </>
              )}
            </button>

            {errorCount > 0 && (
              <div className="pointer-events-none absolute top-full right-0 mt-2 hidden group-hover:block z-30 w-56 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-lg text-center leading-tight">
                <span className="font-semibold text-red-300 block mb-0.5">Generation Disabled</span>
                Fix {errorCount} validation error{errorCount === 1 ? '' : 's'} to generate deck.
                <div className="absolute bottom-full right-6 border-4 border-transparent border-b-slate-900" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Main Form Sections (Left) + Sticky Validation Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Sections (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {groupSections.map((groupSec) => {
            const groupTitle =
              groupSec.group === 'meeting'
                ? 'Meeting Setup & Information'
                : groupSec.group === 'vp'
                ? "Vice President's Performance Report"
                : groupSec.group === 'weekly'
                ? 'Weekly Presentations & Announcements'
                : groupSec.group === 'monthly'
                ? 'Monthly Focus & Strategy'
                : groupSec.group === 'global'
                ? 'Global Network Benchmarks'
                : groupSec.group === 'india'
                ? 'National Chapters Statistics'
                : groupSec.group === 'region'
                ? 'Regional Chapter Standing'
                : `${groupSec.group.toUpperCase()} Fields`;

            return (
              <div
                key={groupSec.group}
                id={`section-${groupSec.group}`}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs"
              >
                {/* Section Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{groupTitle}</h3>
                    <p className="text-[11px] text-slate-500">Group: {groupSec.group}</p>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[11px] font-medium border border-slate-200">
                    Slides #{groupSec.slides.sort((a, b) => a - b).join(', #')}
                  </span>
                </div>

                {/* Form Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {groupSec.fields.map((field) => {
                    const label = formatFieldLabel(field.key, field.name);
                    const val = meeting.values[field.key];
                    const isCopiedImage = (meeting.copiedImageKeys || []).includes(field.key);
                    const currentImg =
                      (meeting as any).images?.[field.key]?.blob ||
                      (meeting as any).images?.[field.key];

                    return (
                      <div
                        key={field.key}
                        id={`field-${field.key}`}
                        className={`space-y-1.5 p-3 rounded-xl transition ${
                          field.kind === 'image' ? 'sm:col-span-2 bg-slate-50 border border-slate-200' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <label className="font-semibold text-slate-800">
                            {label}{' '}
                            {!field.optional && <span className="text-red-500">*</span>}
                          </label>

                          <div className="flex items-center space-x-1.5">
                            {field.optional && (
                              <span className="text-[10px] text-slate-400">optional</span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">
                              &#123;&#123;{field.key}&#125;&#125;
                            </span>
                          </div>
                        </div>

                        {/* Input Type Rendering */}
                        {field.kind === 'image' ? (
                          <div
                            tabIndex={0}
                            onPaste={(e) => handleImagePaste(field.key, e)}
                            className="space-y-3 focus:outline-none"
                          >
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                              {/* Preview Box */}
                              <div className="w-full sm:w-48 h-28 rounded-xl bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs relative group">
                                {currentImg ? (
                                  <ImagePreview blob={currentImg} alt={label} />
                                ) : (
                                  <div className="text-center p-3">
                                    <ImageIcon className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                                    <span className="text-[11px] text-slate-400">
                                      No image selected
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Controls */}
                              <div className="flex-1 space-y-2">
                                {isCopiedImage && (
                                  <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                    <Copy className="w-3 h-3" />
                                    <span>Same as last week</span>
                                  </div>
                                )}

                                <p className="text-[11px] text-slate-500">
                                  Drag image, upload, or click here and press{' '}
                                  <kbd className="px-1.5 py-0.5 rounded bg-slate-200 font-mono text-[10px]">
                                    Ctrl+V / ⌘V
                                  </kbd>{' '}
                                  to paste from clipboard.
                                </p>

                                <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-2xs">
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>{currentImg ? 'Replace Image' : 'Upload Image'}</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files.length > 0) {
                                        const file = e.target.files[0];
                                        handleImageUpload(field.key, file, file.name);
                                        e.target.value = '';
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            </div>
                          </div>
                        ) : field.kind === 'number' ||
                          field.formats.some((f) => ['num', 'inr', 'inr_lakh', 'inr_cr', 'pct'].includes(f)) ? (
                          <SmartNumberInput
                            value={typeof val === 'boolean' ? String(val) : val}
                            format={field.formats[0] || 'num'}
                            required={!field.optional}
                            onChange={(newVal) => handleValueChange(field.key, newVal)}
                          />
                        ) : field.kind === 'date' || field.formats.some((f) => f.startsWith('date:')) ? (
                          <input
                            type="date"
                            value={val !== undefined && val !== null ? String(val) : ''}
                            required={!field.optional}
                            onChange={(e) => handleValueChange(field.key, e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-mono bg-white"
                          />
                        ) : field.maxLength && field.maxLength > 80 ? (
                          <textarea
                            rows={2}
                            value={val !== undefined && val !== null ? String(val) : ''}
                            required={!field.optional}
                            onChange={(e) => handleValueChange(field.key, e.target.value)}
                            placeholder={`Enter ${label.toLowerCase()}...`}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none bg-white"
                          />
                        ) : (
                          <input
                            type="text"
                            value={val !== undefined && val !== null ? String(val) : ''}
                            required={!field.optional}
                            onChange={(e) => handleValueChange(field.key, e.target.value)}
                            placeholder={`Enter ${label.toLowerCase()}...`}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none bg-white"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Special Lists: #presenters */}
          {templateMap.lists['presenters'] && (
            <PresentersListEditor
              items={(meeting.lists['#presenters'] || meeting.lists['presenters'] || []) as any}
              onChange={(items) => handleListChange('#presenters', items)}
              members={members}
              roles={roles}
              settings={settings}
            />
          )}

          {/* Special Lists: #features */}
          {templateMap.lists['features'] && (
            <FeaturesListEditor
              items={(meeting.lists['#features'] || meeting.lists['features'] || []) as any}
              onChange={(items) => handleListChange('#features', items)}
              members={members}
            />
          )}

          {/* Special Lists: #rotation */}
          {templateMap.lists['rotation'] && (
            <RotationListEditor
              items={(meeting.lists['#rotation'] || meeting.lists['rotation'] || []) as any}
              onChange={(items) => handleListChange('#rotation', items)}
              meetingDate={meeting.date}
              schedule={schedule}
              members={members}
            />
          )}

          {/* Special Lists: #feature_deck */}
          <FeatureDeckEditor
            items={(meeting.lists['#feature_deck'] || meeting.lists['feature_deck'] || []) as any}
            onChange={(items) => handleListChange('#feature_deck', items)}
          />

          {/* Generic Lists (e.g. #vacant, etc.) */}
          {Object.entries(templateMap.lists)
            .filter(([name]) => !['presenters', 'features', 'rotation', 'feature_deck'].includes(name))
            .map(([name, spec]) => (
              <GenericListEditor
                key={name}
                listSpec={spec}
                items={(meeting.lists[`#${name}`] || meeting.lists[name] || []) as any}
                onChange={(items) => handleListChange(`#${name}`, items)}
              />
            ))}
        </div>

        {/* Validation Panel (Sticky Right 1 col) */}
        <div className="lg:col-span-1">
          <ValidationPanel
            issues={resolutionResult.issues}
            isValid={resolutionResult.isValid}
            status={meeting.status as any}
            onMarkReady={handleMarkReady}
            onScrollToField={handleScrollToField}
            onGenerateDeck={handleGenerateDeck}
            isGenerating={isGenerating}
          />
        </div>
      </div>

      {/* Generation Progress Overlay */}
      <GenerationProgressModal
        isOpen={isGenerating}
        percent={generationPercent}
        message={generationMessage}
      />

      {/* Generation Report Modal */}
      <GenerationReportModal
        isOpen={showReportModal}
        report={generationReport}
        generatedBlob={generatedBlob}
        meetingId={meeting.id}
        onClose={() => {
          setShowReportModal(false);
          // Refresh saved deck record state if it was saved
          getGeneratedDeck(meeting.id).then((rec) => {
            if (rec) setSavedDeckRecord(rec);
          });
        }}
        onDownloadAgain={handleDownloadAgain}
      />

      {/* AI Smart Entry Modal */}
      <SmartEntryModal
        isOpen={isSmartEntryOpen}
        onClose={() => setIsSmartEntryOpen(false)}
        templateMap={templateMap}
        currentValues={meeting.values}
        currentLists={meeting.lists}
        onApply={handleApplySmartEntry}
      />

      {/* Deck Plan Preview Modal (Before Generating) */}
      <DeckPlanModal
        isOpen={showDeckPlanModal}
        onClose={() => setShowDeckPlanModal(false)}
        onProceedToGenerate={handleGenerateDeck}
        templateMap={templateMap}
        resolutionResult={resolutionResult}
        meeting={meeting}
        members={members}
        roles={roles}
        schedule={schedule}
        library={library}
        settings={settings}
        canGenerate={errorCount === 0 && resolutionResult.isValid && !isGenerating}
      />
    </div>
  );
};
