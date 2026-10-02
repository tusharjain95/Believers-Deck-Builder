import React, { useState, useEffect } from 'react';
import {
  History,
  Calendar,
  Layers,
  Download,
  RotateCw,
  Copy,
  Trash2,
  FileCheck2,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Search,
  ExternalLink,
  Edit2,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import type {
  Meeting,
  TemplateVersion,
  TemplateMap,
  Member,
  Role,
  ScheduleEntry,
  LibraryImage,
  ChapterSettings,
  GeneratedDeckRecord,
} from '../types';
import {
  getAllMeetings,
  saveMeeting,
  deleteMeeting,
  createNewMeeting,
} from '../data/meetingsRepo';
import {
  getAllTemplateVersions,
  getTemplateMap,
  getTemplateBlobForVersion,
} from '../data/templateRepo';
import { getGeneratedDeck, saveGeneratedDeck } from '../data/generatedDeckRepo';
import { resolve } from '../engine/resolve';
import { generate } from '../engine/generate';
import { triggerFileDownload } from '../utils/fileDownload';
import { ConfirmModal } from './ConfirmModal';
import { calculateNextMeetingDate } from '../data/scheduleRepo';

interface HistoryViewProps {
  onOpenMeeting: (meeting: Meeting) => void;
  members: Member[];
  roles: Role[];
  schedule: ScheduleEntry[];
  library: LibraryImage[];
  settings: ChapterSettings;
  activeTemplateMap: TemplateMap | null;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  onOpenMeeting,
  members,
  roles,
  schedule,
  library,
  settings,
  activeTemplateMap,
}) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [templateVersions, setTemplateVersions] = useState<TemplateVersion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'generated' | 'draft' | 'ready'>('all');
  const [storedDeckIds, setStoredDeckIds] = useState<Set<string>>(new Set());

  // Delete modal state
  const [meetingToDelete, setMeetingToDelete] = useState<{ id: string; date: string } | null>(null);

  // Regeneration state
  const [regeneratingMeetingId, setRegeneratingMeetingId] = useState<string | null>(null);
  const [regenProgress, setRegenProgress] = useState<{ percent: number; message: string }>({
    percent: 0,
    message: '',
  });
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    try {
      const [allMeetings, allVersions] = await Promise.all([
        getAllMeetings(),
        getAllTemplateVersions(),
      ]);
      setMeetings(allMeetings);
      setTemplateVersions(allVersions);

      // Check which meetings have decks stored in IndexedDB
      const storedSet = new Set<string>();
      for (const m of allMeetings) {
        const deck = await getGeneratedDeck(m.id);
        if (deck) storedSet.add(m.id);
      }
      setStoredDeckIds(storedSet);
    } catch (err) {
      console.error('Failed loading history data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatMeetingDate = (dateStr: string) => {
    try {
      const d = new Date(`${dateStr}T12:00:00Z`);
      return d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // 1. Download if still stored
  const handleDownloadDeck = async (meeting: Meeting) => {
    try {
      const rec = await getGeneratedDeck(meeting.id);
      if (rec && rec.blob) {
        triggerFileDownload(rec.blob, rec.filename);
        setFeedbackMessage({
          type: 'success',
          text: `Downloaded stored deck "${rec.filename}" from browser storage.`,
        });
      } else {
        setFeedbackMessage({
          type: 'error',
          text: `No stored deck found for meeting ${meeting.date}. Click "Regenerate" to rebuild from the saved values snapshot.`,
        });
      }
    } catch (err) {
      console.error('Failed downloading stored deck:', err);
      setFeedbackMessage({
        type: 'error',
        text: 'Failed downloading presentation deck from browser storage.',
      });
    }
  };

  // 2. Regenerate from saved values snapshot
  const handleRegenerate = async (meeting: Meeting) => {
    setRegeneratingMeetingId(meeting.id);
    setFeedbackMessage(null);
    setRegenProgress({ percent: 10, message: 'Loading template and snapshot values...' });

    try {
      // Find template for this meeting (or active version)
      const targetVersionNum = (meeting as any).templateVersion || activeTemplateMap?.version;
      const targetVersion = templateVersions.find((v) => v.version === targetVersionNum) || templateVersions[0];

      if (!targetVersion || !targetVersion.id) {
        throw new Error('Template version for this meeting is not found in database.');
      }

      const [targetMap, targetBlob] = await Promise.all([
        getTemplateMap(targetVersion.id),
        getTemplateBlobForVersion(targetVersion.version),
      ]);

      if (!targetMap || !targetBlob) {
        throw new Error(`Unable to load PowerPoint template file for version v${targetVersion.version}.`);
      }

      setRegenProgress({ percent: 30, message: 'Resolving saved values and member cards...' });

      // Run resolution with the meeting's saved snapshot values and lists
      const resolutionResult = resolve(
        targetMap,
        meeting,
        members,
        roles,
        schedule,
        library,
        settings
      );

      setRegenProgress({ percent: 50, message: 'Building PowerPoint XML presentation...' });

      const genResult = await generate(
        targetBlob,
        targetMap,
        resolutionResult,
        settings,
        meeting.date,
        {
          onProgress: (pct, msg) => {
            setRegenProgress({ percent: pct, message: msg });
          },
        }
      );

      if (!genResult.blob) {
        throw new Error('Presentation generation did not produce a valid file.');
      }

      // Automatically save to IndexedDB
      await saveGeneratedDeck(
        meeting.id,
        genResult.report.meetingDate,
        genResult.report.filename,
        genResult.blob
      );

      // Trigger download
      triggerFileDownload(genResult.blob, genResult.report.filename);

      // Update meeting record with generatedAt and slideCount
      const updatedMeeting: Meeting = {
        ...meeting,
        status: 'generated',
        generatedAt: genResult.report.generatedAt,
        values: meeting.values,
      };
      (updatedMeeting as any).templateVersion = targetVersion.version;
      (updatedMeeting as any).slideCount = genResult.report.slidesOut;

      await saveMeeting(updatedMeeting);
      await loadData();

      setFeedbackMessage({
        type: 'success',
        text: `Regenerated "${genResult.report.filename}" (${genResult.report.slidesOut} slides) from snapshot and saved copy!`,
      });
    } catch (err: any) {
      console.error('Regeneration error:', err);
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to regenerate deck.',
      });
    } finally {
      setRegeneratingMeetingId(null);
    }
  };

  // 3. Duplicate as next meeting
  const handleDuplicateAsNext = async (sourceMeeting: Meeting) => {
    try {
      const allDates = meetings.map((m) => m.date);
      const nextDate = calculateNextMeetingDate(
        allDates,
        settings.meetingWeekday || 'Wednesday'
      );

      // Apply carry-forward rules from sourceMeeting:
      // Blank number fields in groups "vp" and "weekly"
      const newValues: Record<string, string | number | boolean> = {};
      for (const [key, val] of Object.entries(sourceMeeting.values)) {
        const lower = key.toLowerCase();
        const isVpOrWeeklyNumber =
          (lower.startsWith('vp.') || lower.startsWith('weekly.')) &&
          typeof val === 'number';

        if (!isVpOrWeeklyNumber) {
          newValues[key] = val;
        }
      }

      newValues['meeting.date'] = nextDate;
      const prevNum = Number(sourceMeeting.values['meeting.number']);
      if (!isNaN(prevNum) && prevNum > 0) {
        newValues['meeting.number'] = prevNum + 1;
      }

      // Copy images
      const newImages = { ...(sourceMeeting.images || {}) };
      const copiedImageKeys = Object.keys(newImages);

      // Copy lists (generic lists like #vacant)
      const newLists = { ...(sourceMeeting.lists || {}) };

      const newMeeting: Meeting = {
        id: `meeting_${nextDate}`,
        date: nextDate,
        status: 'draft',
        values: newValues,
        lists: newLists,
        images: newImages,
        copiedFromMeetingId: sourceMeeting.id,
        copiedImageKeys,
        updatedAt: new Date().toISOString(),
      };
      (newMeeting as any).templateVersion = (sourceMeeting as any).templateVersion || activeTemplateMap?.version || 1;

      await saveMeeting(newMeeting);
      await loadData();
      onOpenMeeting(newMeeting);
    } catch (err: any) {
      console.error('Failed duplicating meeting:', err);
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to duplicate meeting as next.',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!meetingToDelete) return;
    try {
      await deleteMeeting(meetingToDelete.id);
      await loadData();
      setFeedbackMessage({
        type: 'success',
        text: `Deleted meeting for ${meetingToDelete.date}.`,
      });
    } catch (err: any) {
      console.error('Delete meeting error:', err);
    } finally {
      setMeetingToDelete(null);
    }
  };

  const filteredMeetings = meetings.filter((m) => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDate = m.date.includes(q);
      const matchNum = String(m.values['meeting.number'] || '').includes(q);
      return matchDate || matchNum;
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-md shadow-red-900/20">
            <History className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900">Meeting Deck History</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                {meetings.length} past decks
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review past chapter meetings, regenerate decks from saved snapshots, download stored copies, or duplicate as next meeting.
            </p>
          </div>
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-2xs ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 text-xs overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            All Meetings ({meetings.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('generated')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === 'generated'
                ? 'bg-blue-600 text-white'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            Generated ({meetings.filter((m) => m.status === 'generated').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ready')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === 'ready'
                ? 'bg-emerald-600 text-white'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            Ready ({meetings.filter((m) => m.status === 'ready').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('draft')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === 'draft'
                ? 'bg-amber-600 text-white'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            Drafts ({meetings.filter((m) => m.status === 'draft').length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by date (YYYY-MM-DD) or #..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {filteredMeetings.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <History className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No meeting history records found</p>
            <p className="text-xs text-slate-500">
              When weekly meetings are initialized and generated, their snapshots and generated decks appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Meeting Date</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Template Ver</th>
                  <th className="px-5 py-3.5">Slide Count</th>
                  <th className="px-5 py-3.5">Stored in Browser</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMeetings.map((m) => {
                  const isStored = storedDeckIds.has(m.id);
                  const isRegenerating = regeneratingMeetingId === m.id;
                  const verNum = (m as any).templateVersion || 1;
                  const slideCount = (m as any).slideCount || (m.status === 'generated' ? '114+' : '-');

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-50/80 transition"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => onOpenMeeting(m)}
                            className="font-semibold text-slate-900 text-sm hover:text-red-600 transition text-left cursor-pointer"
                          >
                            {formatMeetingDate(m.date)}
                          </button>
                          {m.values['meeting.number'] && (
                            <span className="font-mono text-[11px] text-slate-400">
                              #{m.values['meeting.number']}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{m.date}</div>
                      </td>

                      <td className="px-5 py-4">
                        {m.status === 'generated' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                            <FileCheck2 className="w-3 h-3" />
                            <span>Generated</span>
                          </span>
                        ) : m.status === 'ready' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Ready</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>Draft</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-slate-100 text-slate-700">
                          v{verNum}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center space-x-1 text-slate-600">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          <span>{slideCount} {typeof slideCount === 'number' ? 'slides' : ''}</span>
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {isStored ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <HardDrive className="w-3 h-3 text-emerald-600" />
                            <span>Available</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Not stored</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* Download if still stored */}
                        {isStored && (
                          <button
                            type="button"
                            onClick={() => handleDownloadDeck(m)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold transition"
                            title="Download stored PPTX deck from browser"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </button>
                        )}

                        {/* Regenerate from snapshot */}
                        <button
                          type="button"
                          onClick={() => handleRegenerate(m)}
                          disabled={isRegenerating}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition disabled:opacity-50"
                          title="Regenerate presentation from saved values snapshot"
                        >
                          {isRegenerating ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-red-600" />
                          ) : (
                            <RotateCw className="w-3 h-3" />
                          )}
                          <span>{isRegenerating ? 'Building...' : 'Regenerate'}</span>
                        </button>

                        {/* Duplicate as next meeting */}
                        <button
                          type="button"
                          onClick={() => handleDuplicateAsNext(m)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-semibold transition"
                          title="Duplicate this meeting's stats & theme as next weekly meeting"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Duplicate as Next</span>
                        </button>

                        {/* Edit Form */}
                        <button
                          type="button"
                          onClick={() => onOpenMeeting(m)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                          title="Open meeting editor form"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => setMeetingToDelete({ id: m.id, date: m.date })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete meeting snapshot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={Boolean(meetingToDelete)}
        title="Delete Meeting Snapshot?"
        message={`Are you sure you want to permanently delete the meeting record for ${meetingToDelete?.date}? Any stored presentation deck for this meeting will also be removed.`}
        confirmLabel="Delete Meeting"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setMeetingToDelete(null)}
      />
    </div>
  );
};
