import React from 'react';
import { ListOrdered, Type, Image as ImageIcon, Layers, Repeat } from 'lucide-react';
import type { ListSpec } from '../types';

interface ListsOverviewProps {
  lists: Record<string, ListSpec>;
  onSelectSlide?: (slideNum: number) => void;
}

export const ListsOverview: React.FC<ListsOverviewProps> = ({ lists, onSelectSlide }) => {
  const listEntries = Object.values(lists);

  if (listEntries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
        <ListOrdered className="w-10 h-10 mx-auto text-slate-300 mb-2" />
        <p className="text-sm font-medium">No dynamic lists detected in this template.</p>
        <p className="text-xs mt-1">
          Dynamic lists use tags like <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">{'{{#rotation.1.speaker}}'}</code> and directives like <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">@repeat rotation per=2</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900 text-base">Dynamic Lists &amp; Repeat Slots</h3>
        <p className="text-xs text-slate-500">
          Lists automatically repeat slides or fill rotation presenter cards based on chapter rosters
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {listEntries.map((spec) => (
          <div
            key={spec.name}
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-mono text-xs font-bold flex items-center justify-center">
                  #
                </span>
                <span className="font-bold text-slate-800 text-sm">{spec.name}</span>
              </div>

              {spec.perValue !== undefined ? (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <Repeat className="w-3 h-3" />
                  <span>per={spec.perValue}</span>
                </span>
              ) : (
                <span className="text-xs text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded">
                  No @repeat per directive
                </span>
              )}
            </div>

            {/* Slots Found */}
            <div className="text-xs text-slate-600">
              <span className="font-medium text-slate-700">Slots mapped on template: </span>
              {spec.slotsFound.length > 0 ? (
                <span className="font-mono text-indigo-700 font-semibold">
                  [{spec.slotsFound.join(', ')}] ({spec.slotsFound.length} slot{spec.slotsFound.length > 1 ? 's' : ''})
                </span>
              ) : (
                <span className="text-slate-400 italic">None</span>
              )}
            </div>

            {/* Text item fields */}
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                <Type className="w-3 h-3 text-blue-600" />
                <span>Text Subfields ({spec.itemFields.length}):</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {spec.itemFields.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">None</span>
                ) : (
                  spec.itemFields.map((f) => (
                    <span
                      key={f}
                      className="px-2 py-0.5 rounded bg-white text-slate-700 font-mono text-[11px] border border-slate-200"
                    >
                      {f}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Image item fields */}
            {spec.imageItemFields.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                  <ImageIcon className="w-3 h-3 text-purple-600" />
                  <span>Image Subfields ({spec.imageItemFields.length}):</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {spec.imageItemFields.map((f) => (
                    <span
                      key={f}
                      className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-mono text-[11px] border border-purple-200"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Slides appeared */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Appears on slides:</span>
              <div className="flex items-center space-x-1">
                {spec.slides.map((sNum) => (
                  <button
                    key={sNum}
                    onClick={() => onSelectSlide?.(sNum)}
                    className="px-1.5 py-0.5 rounded bg-white hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-medium border border-slate-200 transition"
                  >
                    #{sNum}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
