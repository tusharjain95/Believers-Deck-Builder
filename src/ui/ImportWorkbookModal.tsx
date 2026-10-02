import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Users,
  Shield,
  Calendar,
  Layers,
  Check,
  RefreshCw,
} from 'lucide-react';
import { parseWorkbook, type ExcelImportPreview } from '../engine/excelImport';
import { bulkUpsertMembers } from '../data/membersRepo';
import { bulkSaveRoles } from '../data/rolesRepo';
import { bulkSaveSchedule } from '../data/scheduleRepo';

interface ImportWorkbookModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

export const ImportWorkbookModal: React.FC<ImportWorkbookModalProps> = ({
  onSuccess,
  onClose,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ExcelImportPreview | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'roles' | 'schedule' | 'unmatched'>('members');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      setFile(selected);
      setErrorMessage(null);
      setIsProcessing(true);

      try {
        const buffer = await selected.arrayBuffer();
        const result = await parseWorkbook(buffer);
        setPreview(result);
        if (result.unmatchedNames.length > 0) {
          setActiveTab('unmatched');
        } else {
          setActiveTab('members');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(`Could not read Excel file: ${msg}`);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    setIsSaving(true);
    try {
      // 1. Bulk upsert members (updates existing by name instead of duplicating)
      await bulkUpsertMembers(preview.members);
      // 2. Bulk save roles
      if (preview.roles.length > 0) {
        await bulkSaveRoles(preview.roles);
      }
      // 3. Bulk save schedule
      if (preview.schedule.length > 0) {
        await bulkSaveSchedule(preview.schedule);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to commit import: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-200 my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Import from Excel Workbook
              </h3>
              <p className="text-xs text-slate-500">
                Reads BNI_Believers_Field_Inventory.xlsx (Members, Roles, Speaker Schedule)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-2xl p-10 text-center cursor-pointer transition"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                {isProcessing ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-700" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>
              <h4 className="font-semibold text-slate-800 text-sm">
                {isProcessing ? 'Analyzing Workbook...' : 'Select BNI_Believers_Field_Inventory.xlsx'}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Reads "Members", "Roles", and "Speaker Schedule" sheets. Matches names case-insensitively ignoring honorifics (CA/Dr).
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Members
                  </span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {preview.summary.membersCount}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Roles
                  </span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {preview.summary.rolesCount}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Schedule Dates
                  </span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {preview.summary.scheduleCount}
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    preview.summary.unmatchedCount > 0
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider">
                    Unmatched Names
                  </span>
                  <div className="text-xl font-bold font-mono mt-1">
                    {preview.summary.unmatchedCount}
                  </div>
                </div>
              </div>

              {/* Unmatched Notice Banner */}
              {preview.unmatchedNames.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <div className="flex items-center space-x-1.5 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <span>
                      {preview.unmatchedNames.length} member name(s) in Roles or Schedule did not match any record on the "Members" sheet:
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    You can still import now; unmatched roles/slots will remain unassigned until updated.
                  </p>
                </div>
              )}

              {/* Sheet Preview Navigation */}
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 text-xs">
                <button
                  onClick={() => setActiveTab('members')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    activeTab === 'members'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Members Sheet ({preview.members.length})
                </button>
                <button
                  onClick={() => setActiveTab('roles')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    activeTab === 'roles'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Roles Sheet ({preview.roles.length})
                </button>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    activeTab === 'schedule'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Schedule Sheet ({preview.schedule.length})
                </button>
                {preview.unmatchedNames.length > 0 && (
                  <button
                    onClick={() => setActiveTab('unmatched')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                      activeTab === 'unmatched'
                        ? 'bg-amber-600 text-white'
                        : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
                    }`}
                  >
                    Unmatched Names ({preview.unmatchedNames.length})
                  </button>
                )}
              </div>

              {/* Table Previews */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                {activeTab === 'members' && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-2.5">Name</th>
                        <th className="px-4 py-2.5">Category</th>
                        <th className="px-4 py-2.5">Company</th>
                        <th className="px-4 py-2.5">Phone / Email</th>
                        <th className="px-4 py-2.5">Birthday</th>
                        <th className="px-4 py-2.5">Card / Photo File</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.members.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium text-slate-900">
                            {m.title && (
                              <span className="mr-1 px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                                {m.title}
                              </span>
                            )}
                            {m.name}
                          </td>
                          <td className="px-4 py-2 text-slate-600">{m.category}</td>
                          <td className="px-4 py-2 text-slate-600">{m.company}</td>
                          <td className="px-4 py-2 text-slate-500 font-mono text-[11px]">
                            {m.phone || m.email}
                          </td>
                          <td className="px-4 py-2 text-slate-500 font-mono">{m.birthday || '-'}</td>
                          <td className="px-4 py-2 text-slate-400 font-mono text-[10px] truncate max-w-xs">
                            {m.cardFile || m.photoFile || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'roles' && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-2.5">Role Key</th>
                        <th className="px-4 py-2.5">Role Label</th>
                        <th className="px-4 py-2.5">Assigned Member ID</th>
                        <th className="px-4 py-2.5">Term</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.roles.map((r) => (
                        <tr key={r.roleKey} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-mono font-semibold text-slate-900">{r.roleKey}</td>
                          <td className="px-4 py-2 text-slate-800 font-medium">{r.roleLabel}</td>
                          <td className="px-4 py-2 font-mono text-slate-600">
                            {r.memberId ? (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {r.memberId}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-slate-500 font-mono text-[11px]">
                            {r.termStart || '-'} to {r.termEnd || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'schedule' && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-2.5">Meeting Date</th>
                        <th className="px-4 py-2.5">Speaker 1</th>
                        <th className="px-4 py-2.5">Speaker 2</th>
                        <th className="px-4 py-2.5">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.schedule.map((s) => (
                        <tr key={s.date} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-mono font-semibold text-slate-900">{s.date}</td>
                          <td className="px-4 py-2 font-mono text-slate-600">
                            {s.speaker1Id || <span className="text-slate-400 italic">None</span>}
                          </td>
                          <td className="px-4 py-2 font-mono text-slate-600">
                            {s.speaker2Id || <span className="text-slate-400 italic">None</span>}
                          </td>
                          <td className="px-4 py-2 text-slate-500">{s.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'unmatched' && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-amber-50 border-b border-amber-200 text-amber-900 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-2.5">Sheet</th>
                        <th className="px-4 py-2.5">Field</th>
                        <th className="px-4 py-2.5">Unmatched Name in Workbook</th>
                        <th className="px-4 py-2.5">Context</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {preview.unmatchedNames.map((un, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/50">
                          <td className="px-4 py-2 font-medium text-slate-900">{un.sheet}</td>
                          <td className="px-4 py-2 font-mono text-slate-700">{un.field}</td>
                          <td className="px-4 py-2 font-mono font-bold text-red-600 bg-red-50 px-2 rounded">
                            "{un.rawName}"
                          </td>
                          <td className="px-4 py-2 text-slate-600">{un.context}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          {preview ? (
            <button
              onClick={() => {
                setPreview(null);
                setFile(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Choose different file
            </button>
          ) : (
            <div></div>
          )}

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            {preview && (
              <button
                onClick={handleCommit}
                disabled={isSaving}
                className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Importing...' : 'Confirm & Import to Dexie'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
