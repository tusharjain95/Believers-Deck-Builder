import React from 'react';
import { ListOrdered, Plus, Trash2, ArrowUp, ArrowDown, Layers } from 'lucide-react';
import type { ListSpec } from '../../types';

interface GenericListEditorProps {
  listSpec: ListSpec;
  items: Array<Record<string, string>>;
  onChange: (items: Array<Record<string, string>>) => void;
}

export const GenericListEditor: React.FC<GenericListEditorProps> = ({
  listSpec,
  items,
  onChange,
}) => {
  const fields = listSpec.itemFields.length > 0 ? listSpec.itemFields : ['value'];
  const per = listSpec.perValue || 1;
  const slideCount = items.length === 0 ? 0 : Math.ceil(items.length / per);

  const handleFieldChange = (rowIndex: number, field: string, val: string) => {
    const updated = [...items];
    updated[rowIndex] = { ...updated[rowIndex], [field]: val };
    onChange(updated);
  };

  const handleAddRow = () => {
    const newRow: Record<string, string> = {};
    fields.forEach((f) => (newRow[f] = ''));
    onChange([...items, newRow]);
  };

  const handleDeleteRow = (rowIndex: number) => {
    const updated = items.filter((_, i) => i !== rowIndex);
    onChange(updated);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;

    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    onChange(updated);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs" id={`section-list-${listSpec.name}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <ListOrdered className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              List: #{listSpec.name}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {items.length} items
            </span>
            {listSpec.perValue && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                <Layers className="w-3 h-3" />
                <span>per={listSpec.perValue}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dynamic repeat list. Will create{' '}
            <strong className="text-slate-800 font-semibold font-mono">
              {slideCount} slide{slideCount === 1 ? '' : 's'}
            </strong>{' '}
            in generated deck.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddRow}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Item</span>
        </button>
      </div>

      {items.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-xs">No items in #{listSpec.name}.</p>
          <button
            type="button"
            onClick={handleAddRow}
            className="mt-2 text-xs text-indigo-600 font-semibold hover:underline"
          >
            + Add First Row
          </button>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="px-3 py-2 w-12 text-center">#</th>
                {fields.map((f) => (
                  <th key={f} className="px-3 py-2 capitalize font-mono">
                    {f.replace(/_/g, ' ')}
                  </th>
                ))}
                <th className="px-3 py-2 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2 text-center font-mono text-slate-400 font-bold">
                    {rIdx + 1}
                  </td>
                  {fields.map((f) => (
                    <td key={f} className="px-3 py-2">
                      <input
                        type="text"
                        value={row[f] || ''}
                        onChange={(e) => handleFieldChange(rIdx, f, e.target.value)}
                        placeholder={`Enter ${f.replace(/_/g, ' ')}...`}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleMove(rIdx, 'up')}
                      disabled={rIdx === 0}
                      className="p-1 rounded text-slate-400 hover:text-slate-800 disabled:opacity-20 hover:bg-slate-200"
                      title="Move up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(rIdx, 'down')}
                      disabled={rIdx === items.length - 1}
                      className="p-1 rounded text-slate-400 hover:text-slate-800 disabled:opacity-20 hover:bg-slate-200"
                      title="Move down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRow(rIdx)}
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title="Delete row"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
