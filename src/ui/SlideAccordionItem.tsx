import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  EyeOff,
  Image as ImageIcon,
  Type,
  FileText,
  AlertTriangle,
  Info,
  Copy,
  Check,
  Split,
  Maximize2,
} from 'lucide-react';
import type { SlideInfo, TagRunSpan, ImageSlotInfo, DirectiveInfo } from '../types';

interface SlideAccordionItemProps {
  slide: SlideInfo;
  isOpen: boolean;
  onToggle: () => void;
}

export const SlideAccordionItem: React.FC<SlideAccordionItemProps> = ({
  slide,
  isOpen,
  onToggle,
}) => {
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const handleCopy = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1500);
  };

  const totalTags = slide.textTags.length + slide.imageSlots.length;
  const hasWarnings = slide.warnings.length > 0;
  const splitRunsCount = slide.textTags.filter((t) => t.runCount > 1).length;

  return (
    <div className={`border rounded-xl transition-all duration-200 overflow-hidden ${
      isOpen ? 'border-slate-300 bg-white shadow-sm ring-1 ring-slate-200' : 'border-slate-200 bg-white hover:border-slate-300'
    }`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 focus:outline-none"
      >
        <div className="flex items-center space-x-3.5 flex-wrap gap-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center shadow-xs">
              #{slide.slideNumber}
            </span>
            <span className="font-semibold text-slate-800 text-sm">
              Slide {slide.slideNumber}
            </span>
          </div>

          {slide.isHidden ? (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
              <EyeOff className="w-3 h-3" />
              <span>Hidden (show="0")</span>
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
              Visible
            </span>
          )}

          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            {slide.slidePath}
          </span>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {/* Tag Counts */}
          <div className="flex items-center space-x-2 text-xs">
            {slide.textTags.length > 0 && (
              <span className="flex items-center space-x-1 px-2 py-1 rounded bg-blue-50 text-blue-700 font-medium border border-blue-200">
                <Type className="w-3 h-3" />
                <span>{slide.textTags.length} text</span>
              </span>
            )}
            {slide.imageSlots.length > 0 && (
              <span className="flex items-center space-x-1 px-2 py-1 rounded bg-purple-50 text-purple-700 font-medium border border-purple-200">
                <ImageIcon className="w-3 h-3" />
                <span>{slide.imageSlots.length} img</span>
              </span>
            )}
            {slide.notesDirectives.length > 0 && (
              <span className="flex items-center space-x-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                <FileText className="w-3 h-3" />
                <span>{slide.notesDirectives.length} directive</span>
              </span>
            )}
            {hasWarnings && (
              <span className="flex items-center space-x-1 px-2 py-1 rounded bg-amber-50 text-amber-700 font-medium border border-amber-300">
                <AlertTriangle className="w-3 h-3" />
                <span>{slide.warnings.length}</span>
              </span>
            )}
          </div>

          <div className="text-slate-400">
            {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </div>
        </div>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-6">
          {/* Slide Warnings */}
          {hasWarnings && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-800 flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Slide Warnings ({slide.warnings.length})</span>
              </h4>
              <div className="space-y-1.5">
                {slide.warnings.map((w) => (
                  <div
                    key={w.id}
                    className={`p-3 rounded-lg text-xs border ${
                      w.severity === 'error'
                        ? 'bg-red-50 border-red-200 text-red-800'
                        : w.severity === 'warning'
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold uppercase tracking-wide font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/80">
                            {w.code}
                          </span>
                          {w.tag && <span className="font-mono font-medium">{w.tag}</span>}
                        </div>
                        <p className="mt-1 leading-relaxed">{w.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Text Tags Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                <Type className="w-3.5 h-3.5 text-blue-600" />
                <span>Text Tags ({slide.textTags.length})</span>
              </h4>
              {splitRunsCount > 0 && (
                <span className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <Split className="w-3 h-3" />
                  <span>{splitRunsCount} tag(s) span multiple &lt;a:r&gt; runs</span>
                </span>
              )}
            </div>

            {slide.textTags.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No text replacement tags found on this slide.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {slide.textTags.map((tagSpan, idx) => (
                  <div
                    key={`${tagSpan.tag}-${idx}`}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2 hover:bg-slate-100/70 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="font-mono text-xs font-semibold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs inline-block">
                          {tagSpan.tag}
                        </span>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Key: <span className="font-semibold text-slate-700">{tagSpan.key}</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleCopy(tagSpan.tag, e)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-white transition shrink-0"
                        title="Copy tag"
                      >
                        {copiedTag === tagSpan.tag ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Metadata & Formats */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                        Group: {tagSpan.group}
                      </span>

                      {tagSpan.formats.map((fmt) => (
                        <span
                          key={fmt}
                          className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-medium border border-blue-200"
                        >
                          {fmt}
                        </span>
                      ))}

                      {tagSpan.runCount > 1 ? (
                        <span
                          className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium border border-amber-300 flex items-center space-x-1"
                          title={`Split across ${tagSpan.runCount} <a:r> runs in paragraph #${tagSpan.paragraphIndex}`}
                        >
                          <Split className="w-2.5 h-2.5" />
                          <span>Spans {tagSpan.runCount} runs</span>
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-500">
                          1 run
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Image Slots Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
              <span>Picture / Image Slots ({slide.imageSlots.length})</span>
            </h4>

            {slide.imageSlots.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No picture replacement slots on this slide.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {slide.imageSlots.map((slot) => (
                  <div
                    key={slot.shapeId || slot.shapeName}
                    className="p-3 rounded-lg bg-purple-50/50 border border-purple-200 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="font-mono text-xs font-semibold text-purple-900 bg-white px-2 py-0.5 rounded border border-purple-200 shadow-2xs inline-block">
                          {slot.shapeName}
                        </span>
                        <div className="text-[11px] text-purple-700">
                          Type:{' '}
                          <span className="font-semibold">
                            {slot.group === 'lib'
                              ? 'Slide-Library Image'
                              : slot.group.startsWith('#')
                              ? 'List Picture Slot'
                              : 'Form Weekly Image'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleCopy(slot.shapeName, e)}
                        className="p-1 rounded text-purple-400 hover:text-purple-700 hover:bg-white transition shrink-0"
                        title="Copy image slot tag"
                      >
                        {copiedTag === slot.shapeName ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Frame Dimensions & Formats */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 pt-1">
                      <span className="flex items-center space-x-1 bg-white px-2 py-0.5 rounded border border-slate-200 font-mono">
                        <Maximize2 className="w-3 h-3 text-slate-400" />
                        <span>
                          {slot.widthPx} × {slot.heightPx} px ({slot.aspectRatio}:1)
                        </span>
                      </span>

                      {slot.formats.includes('contain') ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium border border-emerald-200">
                          contain (no cropping)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-medium">
                          centre-crop fill
                        </span>
                      )}

                      <span className="text-slate-400 font-mono text-[10px]">
                        cx: {slot.cx.toLocaleString()} cy: {slot.cy.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Speaker Notes & Directives Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Speaker Notes Directives ({slide.notesDirectives.length})</span>
            </h4>

            {slide.notesDirectives.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                {slide.notesRawText ? 'Notes present, but no @directives found.' : 'No speaker notes on this slide.'}
              </p>
            ) : (
              <div className="space-y-2">
                {slide.notesDirectives.map((dir, dIdx) => (
                  <div
                    key={dIdx}
                    className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 font-mono flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-200/80 font-bold text-emerald-950">
                        @{dir.name}
                      </span>
                      <span className="font-semibold text-emerald-900">{dir.target}</span>
                      {Object.entries(dir.args)
                        .filter(([k]) => k !== 'list' && k !== 'true')
                        .map(([k, v]) => (
                          <span
                            key={k}
                            className="bg-white/90 px-1.5 py-0.5 rounded border border-emerald-300 text-slate-700 font-mono text-[11px]"
                          >
                            {k}={v}
                          </span>
                        ))}
                    </div>
                    <span className="text-[11px] text-emerald-600">Line {dir.lineNumber}</span>
                  </div>
                ))}
              </div>
            )}

            {slide.notesRawText && (
              <div className="mt-2 p-2.5 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">
                <span className="text-slate-400 font-semibold block mb-1">Speaker Notes:</span>
                {slide.notesRawText}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
