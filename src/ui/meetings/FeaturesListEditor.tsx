import React from 'react';
import { Sparkles, User, AlertTriangle, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import type { Member } from '../../types';

export interface FeatureItem {
  memberId?: string;
  name: string;
  category: string;
  topic: string;
  hasPhoto?: boolean;
}

interface FeaturesListEditorProps {
  items: FeatureItem[];
  onChange: (items: FeatureItem[]) => void;
  members: Member[];
}

export const FeaturesListEditor: React.FC<FeaturesListEditorProps> = ({
  items,
  onChange,
  members,
}) => {
  const handleMemberChange = (index: number, memberId: string) => {
    const updated = [...items];
    const member = members.find((m) => m.id === memberId);
    if (member) {
      updated[index] = {
        ...updated[index],
        memberId: member.id,
        name: member.title ? `${member.title} ${member.name}` : member.name,
        category: member.category,
        hasPhoto: Boolean(member.photoBlob),
      };
    } else {
      updated[index] = {
        ...updated[index],
        memberId: undefined,
        name: '',
        category: '',
        hasPhoto: false,
      };
    }
    onChange(updated);
  };

  const handleTopicChange = (index: number, topic: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], topic };
    onChange(updated);
  };

  const handleAddSlot = () => {
    onChange([
      ...items,
      {
        name: '',
        category: '',
        topic: '8-Minute Presentation',
        hasPhoto: false,
      },
    ]);
  };

  const handleRemoveSlot = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs" id="section-features">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-sm">
              Feature Presentation of the Day (#features)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Default loaded from Speaker Schedule. You can override speaker assignments or presentation topics.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddSlot}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <Plus className="w-3.5 h-3.5 text-slate-500" />
          <span>Add Speaker Slot</span>
        </button>
      </div>

      {items.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-xs">No feature presenters assigned for this meeting date.</p>
          <button
            type="button"
            onClick={handleAddSlot}
            className="mt-2 text-xs text-red-600 font-semibold hover:underline"
          >
            + Add Speaker
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const member = members.find((m) => m.id === item.memberId);
            const hasPhoto = member?.photoBlob !== undefined || item.hasPhoto;

            return (
              <div
                key={index}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-800 flex items-center space-x-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px]">
                      {index + 1}
                    </span>
                    <span>Feature Speaker {index + 1}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(index)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                    title="Remove slot"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Select Member (Speaker Schedule)
                    </label>
                    <select
                      value={item.memberId || ''}
                      onChange={(e) => handleMemberChange(index, e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                    >
                      <option value="">-- Choose Member --</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.category || m.company})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Presentation Topic
                    </label>
                    <input
                      type="text"
                      value={item.topic}
                      onChange={(e) => handleTopicChange(index, e.target.value)}
                      placeholder="e.g. Audit Excellence &amp; Tax Strategy"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Photo status */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center space-x-2">
                    {hasPhoto ? (
                      <span className="inline-flex items-center space-x-1 text-emerald-700 text-[11px] font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Round photo ready for feature slide</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px] font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Profile photo missing (needed for round frame)</span>
                      </span>
                    )}
                  </div>

                  {member && (
                    <span className="text-[11px] text-slate-500">
                      {member.category} • {member.company}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
