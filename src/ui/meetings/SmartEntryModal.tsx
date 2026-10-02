import React, { useState } from 'react';
import {
  Sparkles,
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  ArrowRight,
  RotateCcw,
  Check,
  AlertCircle,
  HelpCircle,
  Briefcase,
  Layers,
} from 'lucide-react';
import type { TemplateMap } from '../../types';
import { parseIndianNumber, formatIndianGrouping, formatInr } from '../../utils/indianNumberFormat';

interface ExtractedFieldResult {
  key: string;
  name: string;
  group: string;
  currentValue: string | number | boolean | undefined;
  extractedValue: number | string | null;
  rawExtractedValue: string | null;
  sourceSnippet: string | null;
  willOverwrite: boolean;
  selected: boolean;
}

interface ExtractedVacantResult {
  category: string;
  sourceSnippet: string | null;
  selected: boolean;
}

interface SmartEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateMap: TemplateMap;
  currentValues: Record<string, string | number | boolean>;
  currentLists: Record<string, any[]>;
  onApply: (
    updatedValues: Record<string, number | string>,
    vacantCategories: string[]
  ) => void;
}

export const SmartEntryModal: React.FC<SmartEntryModalProps> = ({
  isOpen,
  onClose,
  templateMap,
  currentValues,
  currentLists,
  onApply,
}) => {
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [pastedText, setPastedText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<
    Array<{ name: string; mimeType: string; dataBase64: string; sizeBytes: number }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Review table states
  const [extractedFields, setExtractedFields] = useState<ExtractedFieldResult[]>([]);
  const [extractedVacant, setExtractedVacant] = useState<ExtractedVacantResult[]>([]);

  if (!isOpen) return null;

  // Filter target fields from templateMap:
  // "only number fields in groups vp and weekly, the monthly statistics fields, and the #vacant list (category)"
  const targetFields = templateMap.fields.filter((f) => {
    const isNum =
      f.kind === 'number' ||
      f.formats.some((fmt) => ['num', 'inr', 'inr_lakh', 'inr_cr', 'pct'].includes(fmt));
    const isVpOrWeeklyNumber = (f.group === 'vp' || f.group === 'weekly') && isNum;
    const isStats = ['monthly', 'global', 'india', 'region'].includes(f.group);
    return isVpOrWeeklyNumber || isStats;
  });

  const hasVacant = Boolean(
    templateMap.lists['vacant'] ||
    templateMap.fields.some((f) => f.key.toLowerCase().includes('vacant'))
  );

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);

    const newFiles: Array<{ name: string; mimeType: string; dataBase64: string; sizeBytes: number }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImg = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      if (!isImg && !isPdf) {
        setErrorMessage(`"${file.name}" is not a supported image or PDF file.`);
        continue;
      }

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          resolve(res);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);

      try {
        const dataBase64 = await base64Promise;
        newFiles.push({
          name: file.name,
          mimeType: file.type || (isPdf ? 'application/pdf' : 'image/png'),
          dataBase64,
          sizeBytes: file.size,
        });
      } catch (err) {
        console.error('Failed reading file:', err);
      }
    }

    setAttachedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePasteModal = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = () => {
            const dataBase64 = reader.result as string;
            setAttachedFiles((prev) => [
              ...prev,
              {
                name: `Pasted Screenshot ${new Date().toLocaleTimeString('en-IN')}.png`,
                mimeType: file.type || 'image/png',
                dataBase64,
                sizeBytes: file.size,
              },
            ]);
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  const handleExtract = async () => {
    if (!pastedText.trim() && attachedFiles.length === 0) {
      setErrorMessage('Please provide either text or upload screenshots/PDFs to extract.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const payload = {
        pastedText: pastedText.trim(),
        files: attachedFiles.map((f) => ({
          name: f.name,
          mimeType: f.mimeType,
          dataBase64: f.dataBase64,
        })),
        targetFields: targetFields.map((f) => ({
          key: f.key,
          name: f.name,
          group: f.group,
          formats: f.formats,
        })),
        hasVacantList: hasVacant || true,
      };

      const response = await fetch('/api/smart-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Gemini extraction failed.');
      }

      const extractedData = data.extracted || {};

      // Process and re-parse numbers in code
      const fieldsResult: ExtractedFieldResult[] = [];

      for (const field of targetFields) {
        const resObj = extractedData[field.key];
        const rawVal = resObj?.value;
        const sourceSnippet = resObj?.sourceSnippet || null;

        let parsedVal: number | string | null = null;

        if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '' && String(rawVal).trim() !== 'null') {
          // Re-parse number using parseIndianNumber
          const num = parseIndianNumber(rawVal);
          parsedVal = num !== null ? num : String(rawVal).trim();
        }

        const currVal = currentValues[field.key];
        const hasExisting =
          currVal !== undefined && currVal !== null && String(currVal).trim() !== '';

        const willOverwrite =
          hasExisting &&
          parsedVal !== null &&
          String(currVal).trim() !== String(parsedVal).trim();

        fieldsResult.push({
          key: field.key,
          name: field.name,
          group: field.group,
          currentValue: currVal,
          extractedValue: parsedVal,
          rawExtractedValue: rawVal ? String(rawVal) : null,
          sourceSnippet,
          willOverwrite,
          // Select by default if Gemini found an explicit value
          selected: parsedVal !== null,
        });
      }

      // Vacant categories
      const vacantListRaw = Array.isArray(extractedData['#vacant'])
        ? extractedData['#vacant']
        : [];
      const vacantResult: ExtractedVacantResult[] = vacantListRaw
        .filter((v: any) => v && (v.category || typeof v === 'string'))
        .map((v: any) => ({
          category: typeof v === 'string' ? v.trim() : (v.category || '').trim(),
          sourceSnippet: v.sourceSnippet || null,
          selected: true,
        }))
        .filter((v: ExtractedVacantResult) => v.category.length > 0);

      setExtractedFields(fieldsResult);
      setExtractedVacant(vacantResult);
      setStep('review');
    } catch (err: any) {
      console.error('Smart entry error:', err);
      setErrorMessage(err.message || 'Gemini extraction failed. The rest of the app continues working.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelectField = (key: string) => {
    setExtractedFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, selected: !f.selected } : f))
    );
  };

  const handleToggleAllFields = (select: boolean) => {
    setExtractedFields((prev) =>
      prev.map((f) => (f.extractedValue !== null ? { ...f, selected: select } : f))
    );
  };

  const handleToggleSelectVacant = (index: number) => {
    setExtractedVacant((prev) =>
      prev.map((v, i) => (i === index ? { ...v, selected: !v.selected } : v))
    );
  };

  const handleApply = () => {
    const valuesToUpdate: Record<string, number | string> = {};

    for (const f of extractedFields) {
      if (f.selected && f.extractedValue !== null) {
        valuesToUpdate[f.key] = f.extractedValue;
      }
    }

    const selectedVacant = extractedVacant
      .filter((v) => v.selected)
      .map((v) => v.category);

    onApply(valuesToUpdate, selectedVacant);
    onClose();
  };

  const selectedCount = extractedFields.filter((f) => f.selected && f.extractedValue !== null).length;
  const overwriteCount = extractedFields.filter(
    (f) => f.selected && f.extractedValue !== null && f.willOverwrite
  ).length;

  return (
    <div
      onPaste={handlePasteModal}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-md shadow-red-900/20">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">
                  AI Smart Entry
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 border border-red-200">
                  Gemini 3.8 Flash • Zero-Guess
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Paste the VP's WhatsApp summary or drop screenshots/PDFs to auto-fill weekly metrics.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Notification (Non-blocking: rest of app keeps working) */}
        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start justify-between gap-3 shrink-0 animate-in fade-in">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold block">Gemini Extraction Notice</span>
                <span className="text-[11px] text-red-700">{errorMessage}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-700 text-xs font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Body Steps */}
        {step === 'input' ? (
          <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-xs">
            {/* 1. WhatsApp Text Input */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-800">
                1. WhatsApp Summary / Weekly Text
              </label>
              <textarea
                rows={5}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste the Vice President's WhatsApp message or meeting announcements here...&#10;e.g.&#10;Referrals Passed: 52&#10;Visitors: 8&#10;Closed Business (TYFCB): ₹ 14.85 Lakhs&#10;Retention: 95%&#10;Vacant Categories: Chartered Accountant, Architect..."
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none font-mono text-xs leading-relaxed"
              />
            </div>

            {/* 2. Screenshots / PDF Reports Drop Zone */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-slate-800">
                  2. Screenshots or BNI Connect PDF Reports
                </label>
                <span className="text-[11px] text-slate-400">
                  Paste screenshot (Ctrl+V / ⌘V) or drop files
                </span>
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileUpload(e.dataTransfer.files);
                }}
                className="border-2 border-dashed border-slate-300 hover:border-red-400 rounded-xl p-5 text-center bg-slate-50/60 hover:bg-red-50/20 transition cursor-pointer"
              >
                <label className="cursor-pointer block space-y-2">
                  <Upload className="w-7 h-7 mx-auto text-slate-400" />
                  <div>
                    <span className="font-semibold text-slate-700 text-xs">
                      Drop screenshots or PDF reports here, or browse
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Supports PNG, JPG, WebP, and PDF documents
                    </p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Attached files preview */}
              {attachedFiles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {attachedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {file.mimeType.includes('pdf') ? (
                          <FileText className="w-4 h-4 text-red-500 shrink-0" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                        )}
                        <span className="truncate text-[11px] font-medium text-slate-700" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition shrink-0 cursor-pointer"
                        title="Remove file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Target Fields Preview info */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center space-x-1.5 text-slate-700 font-semibold text-[11px]">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Target Fields Configured from Template ({targetFields.length} metrics):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {targetFields.map((f) => (
                  <span
                    key={f.key}
                    className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-mono text-[10px]"
                  >
                    &#123;&#123;{f.key}&#125;&#125;
                  </span>
                ))}
                {hasVacant && (
                  <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 font-mono text-[10px]">
                    #vacant
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* STEP 2: REVIEW TABLE */
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Review Extracted Metrics
                </h4>
                <p className="text-[11px] text-slate-500">
                  Select which values to apply. Nothing is saved until you click "Apply Selected".
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleToggleAllFields(true)}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleAllFields(false)}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Overwrite Warning Callout if applicable */}
            {overwriteCount > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-[11px]">
                  <strong className="block font-semibold">
                    {overwriteCount} value{overwriteCount === 1 ? '' : 's'} will overwrite existing data.
                  </strong>
                  Rows highlighted in amber already contain typed or carried-forward values in this meeting.
                </div>
              </div>
            )}

            {/* Main Review Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                  <tr>
                    <th className="px-3.5 py-2.5 w-10 text-center">Use</th>
                    <th className="px-3.5 py-2.5">Field / Tag</th>
                    <th className="px-3.5 py-2.5">Current Value</th>
                    <th className="px-3.5 py-2.5">Extracted Value</th>
                    <th className="px-3.5 py-2.5">Source Snippet</th>
                    <th className="px-3.5 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {extractedFields.map((f) => {
                    const hasExtracted = f.extractedValue !== null;
                    const isCurrency = f.key.includes('tyfcb');

                    return (
                      <tr
                        key={f.key}
                        className={`transition ${
                          f.willOverwrite
                            ? 'bg-amber-50/50 hover:bg-amber-50'
                            : hasExtracted
                            ? 'hover:bg-slate-50/70'
                            : 'opacity-40 bg-slate-50/30'
                        }`}
                      >
                        <td className="px-3.5 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={f.selected && hasExtracted}
                            disabled={!hasExtracted}
                            onChange={() => handleToggleSelectField(f.key)}
                            className="rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                          />
                        </td>

                        <td className="px-3.5 py-3">
                          <div className="font-semibold text-slate-800">{f.name}</div>
                          <span className="font-mono text-[10px] text-slate-400">
                            &#123;&#123;{f.key}&#125;&#125;
                          </span>
                        </td>

                        <td className="px-3.5 py-3">
                          {f.currentValue !== undefined && f.currentValue !== null && String(f.currentValue).trim() !== '' ? (
                            <span className="font-mono font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                              {String(f.currentValue)}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Empty</span>
                          )}
                        </td>

                        <td className="px-3.5 py-3 font-semibold font-mono">
                          {hasExtracted ? (
                            <div>
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {isCurrency && typeof f.extractedValue === 'number'
                                  ? formatInr(f.extractedValue)
                                  : typeof f.extractedValue === 'number'
                                  ? formatIndianGrouping(f.extractedValue)
                                  : String(f.extractedValue)}
                              </span>
                              {typeof f.extractedValue === 'number' && (
                                <span className="block text-[10px] text-slate-400 mt-0.5 font-normal">
                                  Raw: {f.extractedValue}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Not stated</span>
                          )}
                        </td>

                        <td className="px-3.5 py-3 text-[11px] text-slate-600 max-w-xs">
                          {f.sourceSnippet ? (
                            <span
                              className="italic text-slate-700 bg-slate-100/80 px-2 py-1 rounded block border border-slate-200"
                              title={f.sourceSnippet}
                            >
                              "{f.sourceSnippet}"
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        <td className="px-3.5 py-3">
                          {f.willOverwrite ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Overwrites</span>
                            </span>
                          ) : hasExtracted ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <Check className="w-3 h-3" />
                              <span>New</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Null</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Vacant Categories Section if any found */}
            {extractedVacant.length > 0 && (
              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                <div className="flex items-center space-x-2">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-bold text-slate-900 text-xs">
                    Extracted Vacant Categories ({extractedVacant.length} found)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {extractedVacant.map((v, idx) => (
                    <label
                      key={idx}
                      className="flex items-start space-x-2 p-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer transition text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={v.selected}
                        onChange={() => handleToggleSelectVacant(idx)}
                        className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                      />
                      <div className="flex-1 truncate">
                        <span className="font-semibold text-slate-800">{v.category}</span>
                        {v.sourceSnippet && (
                          <span className="block text-[10px] text-slate-400 italic truncate" title={v.sourceSnippet}>
                            "{v.sourceSnippet}"
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div>
            {step === 'review' && (
              <button
                type="button"
                onClick={() => setStep('input')}
                className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Back to Input</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>

            {step === 'input' ? (
              <button
                type="button"
                onClick={handleExtract}
                disabled={isLoading || (!pastedText.trim() && attachedFiles.length === 0)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Extract with Gemini</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApply}
                disabled={selectedCount === 0 && extractedVacant.filter((v) => v.selected).length === 0}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition disabled:opacity-50 cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  Apply Selected ({selectedCount + extractedVacant.filter((v) => v.selected).length})
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
