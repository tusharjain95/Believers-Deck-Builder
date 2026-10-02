import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';
import { renderPdfToJpegs, type RenderedPdfPage } from '../../utils/pdfRender';

export interface DeckSlideItem {
  id: string;
  blob: Blob;
  thumbnailUrl: string;
  name: string;
  sourceType: 'pdf' | 'image';
  pageNumber?: number;
}

interface FeatureDeckEditorProps {
  items: DeckSlideItem[];
  onChange: (items: DeckSlideItem[]) => void;
}

export const FeatureDeckEditor: React.FC<FeatureDeckEditorProps> = ({
  items,
  onChange,
}) => {
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState<{ current: number; total: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    e.target.value = '';

    setErrorMessage(null);
    setIsRendering(true);

    try {
      const newItems: DeckSlideItem[] = [];

      for (const file of files) {
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          // Render PDF pages to 1920px JPEG
          const pages = await renderPdfToJpegs(file, (current, total) => {
            setRenderProgress({ current, total });
          });

          for (const p of pages) {
            newItems.push({
              id: `pdf_${Date.now()}_p${p.pageNumber}_${Math.random().toString(36).substring(7)}`,
              blob: p.blob,
              thumbnailUrl: p.thumbnailUrl,
              name: `${file.name} - Page ${p.pageNumber}`,
              sourceType: 'pdf',
              pageNumber: p.pageNumber,
            });
          }
        } else if (file.type.startsWith('image/')) {
          const url = URL.createObjectURL(file);
          newItems.push({
            id: `img_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            blob: file,
            thumbnailUrl: url,
            name: file.name,
            sourceType: 'image',
          });
        }
      }

      onChange([...items, ...newItems]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to process presentation slides: ${msg}`);
    } finally {
      setIsRendering(false);
      setRenderProgress(null);
    }
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    const target = direction === 'left' ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;

    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    onChange(updated);
  };

  const handleDelete = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs" id="section-feature-deck">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Speaker Feature Presentation Deck (#feature_deck)
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
              {items.length} slide{items.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload the feature presenter's PDF or slide images. PDFs are rendered to 1920px wide HD JPEGs.
          </p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isRendering}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload PDF / Images</span>
          </button>
        </div>
      </div>

      {isRendering && (
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-center space-x-3 animate-pulse">
          <RefreshCw className="w-5 h-5 animate-spin text-purple-600 shrink-0" />
          <div>
            <span className="font-semibold block">Rasterizing PDF Presentation Pages...</span>
            <span className="text-[11px] text-purple-700">
              Rendering to 1920px high-definition JPEG ({renderProgress ? `Page ${renderProgress.current} of ${renderProgress.total}` : 'Please wait...'})
            </span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
          {errorMessage}
        </div>
      )}

      {items.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 hover:border-purple-400 rounded-xl p-8 text-center cursor-pointer transition"
        >
          <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-semibold text-slate-700">No feature deck slides uploaded</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Upload the speaker's PDF slides to insert them into the deck.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((slide, idx) => (
            <div
              key={slide.id || idx}
              className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between group shadow-2xs"
            >
              <div className="relative aspect-video bg-slate-200 overflow-hidden flex items-center justify-center">
                <img
                  src={slide.thumbnailUrl}
                  alt={slide.name}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white font-mono text-[10px] font-bold">
                  #{idx + 1}
                </span>
              </div>

              <div className="p-2 space-y-1">
                <p className="text-[11px] font-medium text-slate-700 truncate" title={slide.name}>
                  {slide.name}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-xs">
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'left')}
                      disabled={idx === 0}
                      className="p-1 rounded text-slate-400 hover:text-slate-800 disabled:opacity-20 hover:bg-slate-200"
                      title="Move left"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'right')}
                      disabled={idx === items.length - 1}
                      className="p-1 rounded text-slate-400 hover:text-slate-800 disabled:opacity-20 hover:bg-slate-200"
                      title="Move right"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="Delete slide"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
