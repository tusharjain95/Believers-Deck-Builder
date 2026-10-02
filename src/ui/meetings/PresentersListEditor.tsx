import React, { useState } from 'react';
import {
  Users,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Check,
  Search,
} from 'lucide-react';
import type { Member, Role, ChapterSettings } from '../../types';
import { buildDefaultPresentersList } from '../../data/meetingsRepo';
import { ConfirmModal } from '../ConfirmModal';

export interface PresenterItem {
  memberId: string;
  name: string;
  category: string;
  company: string;
  hasCard: boolean;
  roleKey?: string;
  included?: boolean;
}

interface PresentersListEditorProps {
  items: PresenterItem[];
  onChange: (items: PresenterItem[]) => void;
  members: Member[];
  roles: Role[];
  settings: ChapterSettings;
}

export const PresentersListEditor: React.FC<PresentersListEditorProps> = ({
  items,
  onChange,
  members,
  roles,
  settings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Active members without a card warning
  const activeMembersWithoutCard = members.filter((m) => m.active && !m.cardBlob);

  const handleToggleInclude = (index: number) => {
    const updated = [...items];
    const isCurrentlyIncluded = updated[index].included !== false;
    updated[index] = {
      ...updated[index],
      included: !isCurrentlyIncluded,
    };
    onChange(updated);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    onChange(updated);
  };

  const handleConfirmReset = () => {
    const defaultList = buildDefaultPresentersList(
      members,
      roles,
      settings.presentLastRoleOrder
    );
    onChange(defaultList.map((p) => ({ ...p, included: true })));
    setShowResetConfirm(false);
  };

  const includedCount = items.filter((p) => p.included !== false).length;

  const filteredIndexedItems = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.company.toLowerCase().includes(q)
      );
    });

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs" id="section-presenters">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Presenters Rotation Order (#presenters)
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              {includedCount} presenting
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Checklist of attending members. Reorder to adjust sequence on presentation slides.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleResetOrder}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Order</span>
          </button>
        </div>
      </div>

      {/* Warning for active members without cards */}
      {activeMembersWithoutCard.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold block">
              {activeMembersWithoutCard.length} active member(s) missing a 16:9 presentation card:
            </span>
            <div className="flex flex-wrap gap-1 mt-1 font-mono text-[10px]">
              {activeMembersWithoutCard.map((m) => (
                <span key={m.id} className="bg-white/80 px-1.5 py-0.5 rounded border border-amber-300">
                  {m.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search Filter */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search presenter..."
            className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
          />
        </div>

        <span className="text-[11px] text-slate-400">
          Tip: Untick absentees to skip their slide.
        </span>
      </div>

      {/* Presenters List Items */}
      <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
        {filteredIndexedItems.map(({ item, index }) => {
          const isIncluded = item.included !== false;

          return (
            <div
              key={item.memberId || index}
              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                isIncluded
                  ? 'bg-slate-50/70 border-slate-200 text-slate-900'
                  : 'bg-slate-100/50 border-slate-200 text-slate-400 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={isIncluded}
                  onChange={() => handleToggleInclude(index)}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                />

                <span className="w-5 text-right font-mono text-slate-400 text-[11px]">
                  {index + 1}.
                </span>

                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-semibold">{item.name}</span>
                    {item.roleKey && (
                      <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-800 text-[10px] font-medium uppercase font-mono">
                        {item.roleKey.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {item.category} {item.company ? `• ${item.company}` : ''}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {item.hasCard ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    Card OK
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 flex items-center space-x-1">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    <span>No Card</span>
                  </span>
                )}

                <div className="flex items-center space-x-0.5 border-l border-slate-200 pl-2">
                  <button
                    type="button"
                    onClick={() => handleMove(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-200"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, 'down')}
                    disabled={index === items.length - 1}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-200"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
