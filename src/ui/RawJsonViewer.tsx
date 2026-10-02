import React, { useState } from 'react';
import { Download, Copy, Check, FileCode2, Search } from 'lucide-react';
import type { TemplateMap } from '../types';

interface RawJsonViewerProps {
  templateMap: TemplateMap;
}

export const RawJsonViewer: React.FC<RawJsonViewerProps> = ({ templateMap }) => {
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const jsonString = JSON.stringify(templateMap, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TemplateMap_v${templateMap.version}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <FileCode2 className="w-5 h-5 text-red-600" />
          <div>
            <h3 className="font-semibold text-slate-900 text-base">Raw TemplateMap JSON Representation</h3>
            <p className="text-xs text-slate-500">
              Deterministic AST representing slides, text spans, picture slots, directives, and fields
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy JSON</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download TemplateMap.json</span>
          </button>
        </div>
      </div>

      {/* Code Box */}
      <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 font-mono text-xs text-slate-300 p-4 max-h-[650px] overflow-y-auto">
        <pre className="whitespace-pre-wrap leading-relaxed">{jsonString}</pre>
      </div>
    </div>
  );
};
