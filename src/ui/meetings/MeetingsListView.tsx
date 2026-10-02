import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Presentation,
  Check,
  Download,
  FileCheck2,
} from 'lucide-react';
import type {
  Meeting,
  TemplateMap,
  Member,
  Role,
  ScheduleEntry,
  ChapterSettings,
} from '../../types';
import {
  getAllMeetings,
  deleteMeeting,
  createNewMeeting,
} from '../../data/meetingsRepo';
import { getGeneratedDeck } from '../../data/generatedDeckRepo';
import { ConfirmModal } from '../ConfirmModal';

interface MeetingsListViewProps {
  templateMap: TemplateMap | null;
  settings: ChapterSettings;
  members: Member[];
  roles: Role[];
  schedule: ScheduleEntry[];
  onSelectMeeting: (meeting: Meeting) => void;
}

export const MeetingsListView: React.FC<MeetingsListViewProps> = ({
  templateMap,
  settings,
  members,
  roles,
  schedule,
  onSelectMeeting,
}) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'ready' | 'generated'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<{ id: string; date: string } | null>(null);

  const loadMeetings = async () => {
    try {
      const list = await getAllMeetings();
      setMeetings(list);
    } catch (err) {
      console.error('Failed to load meetings:', err);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, []);

  const handleCreateNew = async () => {
    if (!templateMap) {
      alert('Please upload an active PowerPoint template before creating a meeting.');
      return;
    }

    setIsCreating(true);
    try {
      const newMeeting = await createNewMeeting(
        templateMap,
        settings,
        members,
        roles,
        schedule
      );
      await loadMeetings();
      onSelectMeeting(newMeeting);
    } catch (err) {
      console.error('Failed to create new meeting:', err);
      alert('Failed to initialize new meeting.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownloadDeck = async (meetingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const rec = await getGeneratedDeck(meetingId);
      if (rec) {
        const url = URL.createObjectURL(rec.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = rec.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        alert('No stored deck copy found in browser storage for this meeting. Open the meeting and click "Generate Deck".');
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleDelete = (id: string, date: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMeetingToDelete({ id, date });
  };

  const handleConfirmDelete = async () => {
    if (!meetingToDelete) return;
    try {
      await deleteMeeting(meetingToDelete.id);
      await loadMeetings();
    } catch (err) {
      console.error('Delete meeting error:', err);
    } finally {
      setMeetingToDelete(null);
    }
  };

  const formatMeetingDate = (dateStr: string) => {
    try {
      const d = new Date(`${dateStr}T12:00:00Z`);
      return d.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const filteredMeetings = meetings.filter((m) => {
    if (statusFilter === 'all') return true;
    return m.status === statusFilter;
  });

  const readyCount = meetings.filter((m) => m.status === 'ready').length;
  const draftCount = meetings.filter((m) => m.status === 'draft').length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-red-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Weekly Chapter Meetings
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
              {meetings.length} decks
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Create and edit weekly presentation data. Auto-carries forward stats, monthly theme, and images from previous weeks.
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          disabled={isCreating || !templateMap}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreating ? 'Initializing Meeting...' : 'New Weekly Meeting'}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 text-xs">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg font-medium transition ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white font-semibold'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All Meetings ({meetings.length})
        </button>
        <button
          onClick={() => setStatusFilter('ready')}
          className={`px-3 py-1.5 rounded-lg font-medium transition ${
            statusFilter === 'ready'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
          }`}
        >
          Ready for Deck ({readyCount})
        </button>
        <button
          onClick={() => setStatusFilter('draft')}
          className={`px-3 py-1.5 rounded-lg font-medium transition ${
            statusFilter === 'draft'
              ? 'bg-amber-600 text-white font-semibold'
              : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          Drafts ({draftCount})
        </button>
      </div>

      {/* Meetings List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {filteredMeetings.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Calendar className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No meetings recorded yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click "New Weekly Meeting" to automatically generate the meeting form from your active PowerPoint template.
            </p>
            <div>
              <button
                onClick={handleCreateNew}
                disabled={!templateMap}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Next Weekly Meeting</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Meeting Date</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Meeting #</th>
                  <th className="px-5 py-3.5">Key Performance Metrics</th>
                  <th className="px-5 py-3.5">Last Updated</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMeetings.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => onSelectMeeting(m)}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 text-sm">
                        {formatMeetingDate(m.date)}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">{m.date}</div>
                    </td>

                    <td className="px-5 py-4">
                      {m.status === 'ready' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Ready</span>
                        </span>
                      ) : m.status === 'generated' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                          <span>Generated</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="w-3 h-3" />
                          <span>Draft</span>
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 font-mono font-medium text-slate-700">
                      {m.values['meeting.number'] ? `#${m.values['meeting.number']}` : '-'}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      <div className="flex items-center space-x-3 text-[11px]">
                        {m.values['vp.referrals'] !== undefined && (
                          <span>Referrals: <strong>{String(m.values['vp.referrals'])}</strong></span>
                        )}
                        {m.values['vp.visitors'] !== undefined && (
                          <span>Visitors: <strong>{String(m.values['vp.visitors'])}</strong></span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-400 text-[11px] font-mono">
                      {m.updatedAt ? new Date(m.updatedAt).toLocaleTimeString('en-IN') : '-'}
                    </td>

                    <td className="px-5 py-4 text-right space-x-2">
                      {m.status === 'generated' && (
                        <button
                          onClick={(e) => handleDownloadDeck(m.id, e)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold transition"
                          title="Download stored PPTX deck"
                        >
                          <Download className="w-3 h-3" />
                          <span>PPTX</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMeeting(m);
                        }}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit Form</span>
                      </button>

                      <button
                        onClick={(e) => handleDelete(m.id, m.date, e)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Delete meeting"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={Boolean(meetingToDelete)}
        title="Delete Meeting?"
        message={`Are you sure you want to permanently delete the meeting for ${meetingToDelete?.date}?`}
        confirmLabel="Delete Meeting"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setMeetingToDelete(null)}
      />
    </div>
  );
};
