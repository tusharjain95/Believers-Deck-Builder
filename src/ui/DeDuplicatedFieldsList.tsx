import React, { useState, useMemo } from 'react';
import { Search, Filter, Copy, Check, Type, Hash, Calendar, Image as ImageIcon, BookOpen, Layers } from 'lucide-react';
import type { Field, FieldKind } from '../types';

interface DeDuplicatedFieldsListProps {
  fields: Field[];
  onSelectSlide?: (slideNum: number) => void;
}

export const DeDuplicatedFieldsList: React.FC<DeDuplicatedFieldsListProps> = ({
  fields,
  onSelectSlide,
}) => {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedKind, setSelectedKind] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Collect unique groups
  const groups = useMemo(() => {
    const set = new Set<string>();
    fields.forEach((f) => set.add(f.group));
    return Array.from(set).sort();
  }, [fields]);

  const filteredFields = useMemo(() => {
    return fields.filter((field) => {
      const matchesSearch =
        search.trim() === '' ||
        field.key.toLowerCase().includes(search.toLowerCase()) ||
        field.rawTag.toLowerCase().includes(search.toLowerCase());

      const matchesGroup = selectedGroup === 'all' || field.group === selectedGroup;
      const matchesKind = selectedKind === 'all' || field.kind === selectedKind;

      return matchesSearch && matchesGroup && matchesKind;
    });
  }, [fields, search, selectedGroup, selectedKind]);

  const handleCopy = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedKey(tag);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const getKindBadge = (kind: FieldKind) => {
    switch (kind) {
      case 'number':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
            <Hash className="w-3 h-3" />
            <span>number</span>
          </span>
        );
      case 'date':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-100 text-cyan-800 border border-cyan-200">
            <Calendar className="w-3 h-3" />
            <span>date</span>
          </span>
        );
      case 'image':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-100 text-purple-800 border border-purple-200">
            <ImageIcon className="w-3 h-3" />
            <span>image</span>
          </span>
        );
      case 'library_image':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
            <BookOpen className="w-3 h-3" />
            <span>library_image</span>
          </span>
        );
      case 'list':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Layers className="w-3 h-3" />
            <span>list</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
            <Type className="w-3 h-3" />
            <span>text</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-900 text-base">De-duplicated Field Registry</h3>
          <p className="text-xs text-slate-500">
            {filteredFields.length} of {fields.length} unique template parameters mapped
          </p>
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search key, tag..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
        <span className="text-slate-400 font-medium flex items-center space-x-1 mr-1">
          <Filter className="w-3.5 h-3.5" />
          <span>Group:</span>
        </span>
        <button
          onClick={() => setSelectedGroup('all')}
          className={`px-2.5 py-1 rounded-full font-medium transition ${
            selectedGroup === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Groups
        </button>
        {groups.map((grp) => (
          <button
            key={grp}
            onClick={() => setSelectedGroup(grp)}
            className={`px-2.5 py-1 rounded-full font-medium transition ${
              selectedGroup === grp
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {grp}
          </button>
        ))}

        <div className="w-px h-4 bg-slate-200 mx-1 hidden sm:block"></div>

        <span className="text-slate-400 font-medium">Kind:</span>
        {['all', 'text', 'number', 'date', 'image', 'library_image', 'list'].map((k) => (
          <button
            key={k}
            onClick={() => setSelectedKind(k)}
            className={`px-2.5 py-1 rounded-full font-medium capitalize transition ${
              selectedKind === k
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {k === 'all' ? 'All Kinds' : k.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
            <tr>
              <th className="px-4 py-3">Field Key</th>
              <th className="px-4 py-3">Group</th>
              <th className="px-4 py-3">Kind</th>
              <th className="px-4 py-3">Formats &amp; Constraints</th>
              <th className="px-4 py-3">Slides Used</th>
              <th className="px-4 py-3 text-right">Raw Tag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-normal">
            {filteredFields.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                  No fields match the current filters.
                </td>
              </tr>
            ) : (
              filteredFields.map((field) => (
                <tr key={field.key} className="hover:bg-slate-50/70 transition">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                    {field.key}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
                      {field.group}
                    </span>
                  </td>
                  <td className="px-4 py-3">{getKindBadge(field.kind)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      {field.formats.length === 0 && !field.optional && field.maxLength === null && (
                        <span className="text-slate-400 italic">standard</span>
                      )}
                      {field.formats.map((fmt) => (
                        <span
                          key={fmt}
                          className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[10px]"
                        >
                          {fmt}
                        </span>
                      ))}
                      {field.optional && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
                          optional
                        </span>
                      )}
                      {field.maxLength !== null && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-mono text-[10px]">
                          max:{field.maxLength}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      {field.slides.map((sNum) => (
                        <button
                          key={sNum}
                          onClick={() => onSelectSlide?.(sNum)}
                          className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-medium transition cursor-pointer"
                          title={`Jump to Slide ${sNum}`}
                        >
                          #{sNum}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleCopy(field.rawTag)}
                      className="inline-flex items-center space-x-1 font-mono text-[11px] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-700 transition"
                      title="Copy full tag"
                    >
                      {copiedKey === field.rawTag ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[120px]">{field.rawTag}</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
