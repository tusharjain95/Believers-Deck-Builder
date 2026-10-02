import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, User, Play, ChevronRight, Check } from 'lucide-react';
import type { ScheduleEntry, Member, ChapterSettings } from '../types';
import {
  getAllSchedule,
  saveScheduleEntry,
  deleteScheduleEntry,
  calculateNextMeetingDate,
  getSchedule,
} from '../data/scheduleRepo';
import { getAllMembers } from '../data/membersRepo';
import { getChapterSettings } from '../data/settingsRepo';
import { ConfirmModal } from './ConfirmModal';

export const ScheduleView: React.FC = () => {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [settings, setSettings] = useState<ChapterSettings | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<{ id: string; date: string } | null>(null);

  // Test getSchedule tool state
  const [testFromDate, setTestFromDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [testWeeks, setTestWeeks] = useState<number>(4);
  const [consecutivePreview, setConsecutivePreview] = useState<ScheduleEntry[] | null>(null);

  const loadData = async () => {
    try {
      const [allSchedule, allMembers, chapterSettings] = await Promise.all([
        getAllSchedule(),
        getAllMembers(),
        getChapterSettings(),
      ]);
      setSchedule(allSchedule);
      setMembers(allMembers);
      setSettings(chapterSettings);
    } catch (err) {
      console.error('Failed to load schedule data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSpeakerChange = async (
    id: string,
    slot: 'speaker1Id' | 'speaker2Id',
    memberId: string
  ) => {
    const entry = schedule.find((s) => s.id === id);
    if (!entry) return;
    const updated = {
      ...entry,
      [slot]: memberId || undefined,
    };
    await saveScheduleEntry(updated);
    await loadData();
  };

  const handleAddNextWeek = async () => {
    const existingDates = schedule.map((s) => s.date);
    const nextDate = calculateNextMeetingDate(
      existingDates,
      settings?.meetingWeekday || 'Wednesday'
    );

    const newEntry: ScheduleEntry = {
      id: `sched_${nextDate}`,
      date: nextDate,
    };

    await saveScheduleEntry(newEntry);
    await loadData();
  };

  const handleDelete = (id: string, date: string) => {
    setEntryToDelete({ id, date });
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    try {
      await deleteScheduleEntry(entryToDelete.id);
      await loadData();
    } catch (err) {
      console.error('Failed deleting schedule entry:', err);
    } finally {
      setEntryToDelete(null);
    }
  };

  const handleRunGetSchedule = async () => {
    const res = await getSchedule(testFromDate, testWeeks);
    setConsecutivePreview(res);
  };

  const formatScheduleDate = (dateStr: string) => {
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

  const getMemberName = (id?: string) => {
    if (!id) return null;
    const m = members.find((x) => x.id === id);
    return m ? `${m.name} (${m.category || m.company})` : id;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-red-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Speaker Rotation Schedule
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
              {schedule.length} meetings
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Meeting dates on {settings?.meetingWeekday || 'Wednesday'}s with Speaker 1 &amp; Speaker 2 assignments.
          </p>
        </div>

        <button
          onClick={handleAddNextWeek}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Next Week ({settings?.meetingWeekday || 'Wednesday'})</span>
        </button>
      </div>

      {/* Schedule Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {schedule.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No scheduled meetings yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Click "Add Next Week" or import schedule from your Excel workbook.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="px-5 py-3">Meeting Date</th>
                  <th className="px-5 py-3">Feature Speaker 1</th>
                  <th className="px-5 py-3">Feature Speaker 2</th>
                  <th className="px-5 py-3">Notes</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedule.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">
                        {formatScheduleDate(entry.date)}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">{entry.date}</div>
                    </td>

                    <td className="px-5 py-3.5">
                      <select
                        value={entry.speaker1Id || ''}
                        onChange={(e) => handleSpeakerChange(entry.id, 'speaker1Id', e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 max-w-xs w-full"
                      >
                        <option value="">-- Choose Speaker 1 --</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.category})
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-5 py-3.5">
                      <select
                        value={entry.speaker2Id || ''}
                        onChange={(e) => handleSpeakerChange(entry.id, 'speaker2Id', e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 max-w-xs w-full"
                      >
                        <option value="">-- Choose Speaker 2 --</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.category})
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate">
                      {entry.notes || '-'}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(entry.id, entry.date)}
                        title="Delete schedule row"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
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

      {/* Test getSchedule(fromDate, weeks) Panel */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 space-y-4 shadow-sm">
        <div>
          <h3 className="font-semibold text-sm flex items-center space-x-2">
            <Play className="w-4 h-4 text-emerald-400" />
            <span>Deterministic Resolver: getSchedule(fromDate, weeks)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Returns consecutive rotation entries for slide list slots (e.g. &#123;&#123;#rotation.1.speaker&#125;&#125;, &#123;&#123;#rotation.2.speaker&#125;&#125;).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 text-xs">
          <div className="w-full sm:w-auto">
            <label className="block text-[11px] text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={testFromDate}
              onChange={(e) => setTestFromDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-white font-mono text-xs focus:outline-none"
            />
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-[11px] text-slate-400 mb-1">Weeks Count</label>
            <input
              type="number"
              min={1}
              max={12}
              value={testWeeks}
              onChange={(e) => setTestWeeks(parseInt(e.target.value, 10) || 1)}
              className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-white font-mono text-xs focus:outline-none w-24"
            />
          </div>

          <div className="w-full sm:w-auto sm:self-end">
            <button
              onClick={handleRunGetSchedule}
              className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition"
            >
              Get Schedule
            </button>
          </div>
        </div>

        {consecutivePreview !== null && (
          <div className="space-y-2 pt-2 border-t border-slate-800">
            {consecutivePreview.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No consecutive schedule entries found on or after {testFromDate}.
              </p>
            ) : (
              consecutivePreview.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-slate-850 border border-slate-800 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded bg-slate-800 text-emerald-400 font-bold flex items-center justify-center text-[11px]">
                      W{idx + 1}
                    </span>
                    <span className="text-white font-bold">{item.date}</span>
                  </div>

                  <div className="flex items-center space-x-4 text-slate-300">
                    <div>
                      <span className="text-slate-500 mr-1">Speaker 1:</span>
                      <span className="text-emerald-300 font-semibold">
                        {getMemberName(item.speaker1Id) || 'Unassigned'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 mr-1">Speaker 2:</span>
                      <span className="text-cyan-300 font-semibold">
                        {getMemberName(item.speaker2Id) || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={Boolean(entryToDelete)}
        title="Remove Speaker Slot?"
        message={`Are you sure you want to remove the speaker schedule for meeting date ${entryToDelete?.date}?`}
        confirmLabel="Remove Slot"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setEntryToDelete(null)}
      />
    </div>
  );
};
