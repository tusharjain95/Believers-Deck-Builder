import React from 'react';
import { Calendar, RotateCcw, AlertTriangle, CheckCircle2, Plus } from 'lucide-react';
import type { ScheduleEntry, Member } from '../../types';
import { buildDefaultRotationList } from '../../data/meetingsRepo';

export interface RotationItem {
  date: string;
  speaker_1: string;
  speaker_2: string;
  notes?: string;
}

interface RotationListEditorProps {
  items: RotationItem[];
  onChange: (items: RotationItem[]) => void;
  meetingDate: string;
  schedule: ScheduleEntry[];
  members: Member[];
}

export const RotationListEditor: React.FC<RotationListEditorProps> = ({
  items,
  onChange,
  meetingDate,
  schedule,
  members,
}) => {
  const handleReloadFromSchedule = () => {
    const defaultRotation = buildDefaultRotationList(meetingDate, schedule, members);
    onChange(defaultRotation);
  };

  const handleSpeakerChange = (
    index: number,
    field: 'speaker_1' | 'speaker_2',
    val: string
  ) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  };

  const isLessThan6 = items.length < 6;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs" id="section-rotation">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Upcoming Speaker Rotation (#rotation)
            </h3>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                isLessThan6
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {items.length} / 6 meetings
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Populates rotation slide slots (&#123;&#123;#rotation.N.speaker_1&#125;&#125;).
          </p>
        </div>

        <button
          type="button"
          onClick={handleReloadFromSchedule}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh from Schedule</span>
        </button>
      </div>

      {isLessThan6 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold block">
              Fewer than 6 meetings in speaker schedule ({items.length} found).
            </span>
            <span className="text-[11px] text-amber-800 block mt-0.5">
              The presentation template recommends 6 consecutive rotation entries. Add more dates in Speaker Schedule.
            </span>
          </div>
        </div>
      )}

      {/* Rotation Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
            <tr>
              <th className="px-4 py-2.5">Slot</th>
              <th className="px-4 py-2.5">Meeting Date</th>
              <th className="px-4 py-2.5">Speaker 1</th>
              <th className="px-4 py-2.5">Speaker 2</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-mono font-bold text-slate-400">
                  #{idx + 1}
                </td>
                <td className="px-4 py-2 font-mono font-medium text-slate-900">
                  {row.date}
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={row.speaker_1}
                    onChange={(e) =>
                      handleSpeakerChange(idx, 'speaker_1', e.target.value)
                    }
                    placeholder="Speaker 1 name"
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={row.speaker_2}
                    onChange={(e) =>
                      handleSpeakerChange(idx, 'speaker_2', e.target.value)
                    }
                    placeholder="Speaker 2 name"
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
