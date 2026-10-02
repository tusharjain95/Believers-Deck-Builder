import React, { useState } from 'react';
import {
  Presentation,
  Layers,
  FileText,
  AlertTriangle,
  Download,
  Search,
  Maximize2,
  Minimize2,
  ListOrdered,
  BookOpen,
  Filter,
} from 'lucide-react';
import type { TemplateMap } from '../types';
import { SummaryCards } from './SummaryCards';
import { SlideAccordionItem } from './SlideAccordionItem';
import { DeDuplicatedFieldsList } from './DeDuplicatedFieldsList';
import { ListsOverview } from './ListsOverview';
import { WarningsList } from './WarningsList';
import { RawJsonViewer } from './RawJsonViewer';

interface TemplateMapViewerProps {
  templateMap: TemplateMap;
  onUploadNewVersion: () => void;
}

export const TemplateMapViewer: React.FC<TemplateMapViewerProps> = ({
  templateMap,
  onUploadNewVersion,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'slides' | 'fields' | 'lists' | 'warnings' | 'json'>('slides');
  const [openSlideIds, setOpenSlideIds] = useState<Set<number>>(new Set([1])); // Slide 1 open by default
  const [slideSearch, setSlideSearch] = useState('');
  const [selectedSlideFilter, setSelectedSlideFilter] = useState<'all' | 'visible' | 'hidden' | 'with_warnings' | 'with_images'>('all');

  const toggleSlide = (slideNum: number) => {
    setOpenSlideIds((prev) => {
      const next = new Set(prev);
      if (next.has(slideNum)) {
        next.delete(slideNum);
      } else {
        next.add(slideNum);
      }
      return next;
    });
  };

  const expandAllSlides = () => {
    setOpenSlideIds(new Set(templateMap.slides.map((s) => s.slideNumber)));
  };

  const collapseAllSlides = () => {
    setOpenSlideIds(new Set());
  };

  const handleJumpToSlide = (slideNum: number) => {
    setActiveSubTab('slides');
    setOpenSlideIds((prev) => new Set(prev).add(slideNum));
    // Scroll to slide element
    setTimeout(() => {
      const el = document.getElementById(`slide-${slideNum}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleSummaryCardFilter = (filterType: string) => {
    switch (filterType) {
      case 'slides':
        setActiveSubTab('slides');
        setSelectedSlideFilter('all');
        break;
      case 'text_fields':
        setActiveSubTab('fields');
        break;
      case 'image_slots':
        setActiveSubTab('slides');
        setSelectedSlideFilter('with_images');
        break;
      case 'library_images':
        setActiveSubTab('fields');
        break;
      case 'lists':
        setActiveSubTab('lists');
        break;
      case 'warnings':
        setActiveSubTab('warnings');
        break;
    }
  };

  // Filter slides
  const filteredSlides = templateMap.slides.filter((slide) => {
    // Search query
    const query = slideSearch.toLowerCase().trim();
    if (query !== '') {
      const matchesNum = String(slide.slideNumber) === query || `slide ${slide.slideNumber}`.includes(query);
      const matchesTag = slide.textTags.some((t) => t.tag.toLowerCase().includes(query) || t.key.toLowerCase().includes(query));
      const matchesImg = slide.imageSlots.some((s) => s.shapeName.toLowerCase().includes(query));
      const matchesNotes = slide.notesDirectives.some((d) => d.raw.toLowerCase().includes(query));
      if (!matchesNum && !matchesTag && !matchesImg && !matchesNotes) {
        return false;
      }
    }

    // Secondary filter
    if (selectedSlideFilter === 'hidden') return slide.isHidden;
    if (selectedSlideFilter === 'visible') return !slide.isHidden;
    if (selectedSlideFilter === 'with_warnings') return slide.warnings.length > 0;
    if (selectedSlideFilter === 'with_images') return slide.imageSlots.length > 0;

    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Template Map Explorer
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
              Version {templateMap.version}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Source deck: <span className="font-semibold text-slate-700">{templateMap.templateFileName}</span> • Analyzed on {new Date(templateMap.analyzedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveSubTab('json')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export TemplateMap.json</span>
          </button>
          <button
            onClick={onUploadNewVersion}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition shadow-xs"
          >
            <span>Upload New Version</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards
        templateMap={templateMap}
        onFilterClick={handleSummaryCardFilter}
        activeFilter={activeSubTab}
      />

      {/* Sub Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveSubTab('slides')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeSubTab === 'slides'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Presentation className="w-4 h-4" />
            <span>Slides Order ({templateMap.slides.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('fields')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeSubTab === 'fields'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Fields Registry ({templateMap.fields.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('lists')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeSubTab === 'lists'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span>Lists ({Object.keys(templateMap.lists).length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('warnings')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeSubTab === 'warnings'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Warnings ({templateMap.warnings.length})</span>
          </button>
        </div>

        {activeSubTab === 'slides' && (
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={expandAllSlides}
              className="text-xs px-2.5 py-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition flex items-center space-x-1"
              title="Expand all slide accordions"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Expand All</span>
            </button>
            <button
              onClick={collapseAllSlides}
              className="text-xs px-2.5 py-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition flex items-center space-x-1"
              title="Collapse all slide accordions"
            >
              <Minimize2 className="w-3 h-3" />
              <span>Collapse All</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {activeSubTab === 'slides' && (
        <div className="space-y-4">
          {/* Slide Filter and Search Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2 overflow-x-auto text-xs">
              <span className="text-slate-400 font-medium">Show:</span>
              {[
                { id: 'all', label: 'All Slides' },
                { id: 'visible', label: 'Visible Only' },
                { id: 'hidden', label: 'Hidden Only' },
                { id: 'with_images', label: 'Has Image Slots' },
                { id: 'with_warnings', label: 'Has Warnings' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedSlideFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded-full font-medium transition ${
                    selectedSlideFilter === f.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={slideSearch}
                onChange={(e) => setSlideSearch(e.target.value)}
                placeholder="Filter by slide # or tag..."
                className="w-full pl-9 pr-4 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Slide Accordion List */}
          <div className="space-y-3">
            {filteredSlides.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                <Presentation className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium">No slides match your current filter.</p>
              </div>
            ) : (
              filteredSlides.map((slide) => (
                <div key={slide.slideNumber} id={`slide-${slide.slideNumber}`}>
                  <SlideAccordionItem
                    slide={slide}
                    isOpen={openSlideIds.has(slide.slideNumber)}
                    onToggle={() => toggleSlide(slide.slideNumber)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'fields' && (
        <DeDuplicatedFieldsList
          fields={templateMap.fields}
          onSelectSlide={handleJumpToSlide}
        />
      )}

      {activeSubTab === 'lists' && (
        <ListsOverview
          lists={templateMap.lists}
          onSelectSlide={handleJumpToSlide}
        />
      )}

      {activeSubTab === 'warnings' && (
        <WarningsList
          warnings={templateMap.warnings}
          onSelectSlide={handleJumpToSlide}
        />
      )}

      {activeSubTab === 'json' && (
        <RawJsonViewer templateMap={templateMap} />
      )}
    </div>
  );
};
