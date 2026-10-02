import React from 'react';
import { Presentation, Type, Image as ImageIcon, BookOpen, ListOrdered, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { TemplateMap } from '../types';

interface SummaryCardsProps {
  templateMap: TemplateMap;
  onFilterClick?: (filterType: string) => void;
  activeFilter?: string;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  templateMap,
  onFilterClick,
  activeFilter,
}) => {
  const { summary, hiddenSlideCount } = templateMap;

  const cards = [
    {
      id: 'slides',
      title: 'Total Slides',
      value: summary.totalSlides,
      subtitle: hiddenSlideCount > 0 ? `${hiddenSlideCount} hidden (show="0")` : 'All visible',
      icon: Presentation,
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
    },
    {
      id: 'text_fields',
      title: 'Text Fields',
      value: summary.textFieldsCount,
      subtitle: 'Form & report data',
      icon: Type,
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
    },
    {
      id: 'image_slots',
      title: 'Image Slots',
      value: summary.imageSlotsCount,
      subtitle: 'Photos & banners',
      icon: ImageIcon,
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
    },
    {
      id: 'library_images',
      title: 'Library Images',
      value: summary.libraryImagesCount,
      subtitle: 'lib.* reusable assets',
      icon: BookOpen,
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
    },
    {
      id: 'lists',
      title: 'Dynamic Lists',
      value: summary.listsCount,
      subtitle: 'Speakers & rotations',
      icon: ListOrdered,
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
    },
    {
      id: 'warnings',
      title: 'Warnings / Notices',
      value: templateMap.warnings.length,
      subtitle:
        summary.errorCount > 0
          ? `${summary.errorCount} error${summary.errorCount > 1 ? 's' : ''}`
          : templateMap.warnings.length === 0
          ? 'Template is clean'
          : `${templateMap.warnings.length} items to check`,
      icon: templateMap.warnings.length === 0 ? CheckCircle2 : AlertTriangle,
      bg: summary.errorCount > 0 ? 'bg-red-50' : templateMap.warnings.length > 0 ? 'bg-amber-50' : 'bg-slate-50',
      text: summary.errorCount > 0 ? 'text-red-700' : templateMap.warnings.length > 0 ? 'text-amber-700' : 'text-slate-600',
      border: summary.errorCount > 0 ? 'border-red-200' : templateMap.warnings.length > 0 ? 'border-amber-200' : 'border-slate-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        const isSelected = activeFilter === c.id;

        return (
          <button
            key={c.id}
            onClick={() => onFilterClick?.(c.id)}
            className={`text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
              c.border
            } ${c.bg} ${
              isSelected ? 'ring-2 ring-slate-900 shadow-md scale-[1.02]' : 'hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {c.title}
              </span>
              <Icon className={`w-4 h-4 ${c.text}`} />
            </div>

            <div className="mt-2 flex items-baseline space-x-1">
              <span className={`text-2xl font-bold font-mono tracking-tight ${c.text}`}>
                {c.value}
              </span>
            </div>

            <p className="mt-1 text-[11px] text-slate-500 truncate" title={c.subtitle}>
              {c.subtitle}
            </p>
          </button>
        );
      })}
    </div>
  );
};
