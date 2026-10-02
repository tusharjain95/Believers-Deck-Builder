import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileArchive,
  CheckCircle2,
  AlertTriangle,
  User,
  Image as ImageIcon,
  Check,
  RefreshCw,
} from 'lucide-react';
import { matchAssetsZip, commitAssetsToMembers, type AssetsZipPreview } from '../engine/assetsZipImport';

interface ImportAssetsZipModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

export const ImportAssetsZipModal: React.FC<ImportAssetsZipModalProps> = ({
  onSuccess,
  onClose,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<AssetsZipPreview | null>(null);
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
        const result = await matchAssetsZip(selected);
        setPreview(result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(`Could not read ZIP archive: ${msg}`);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    setIsSaving(true);
    try {
      await commitAssetsToMembers(preview.matches);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to save assets: ${msg}`);
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
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
              <FileArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Import Member Presentation Assets ZIP
              </h3>
              <p className="text-xs text-slate-500">
                Matches cards/ and photos/ folders in BNI_Member_Assets.zip against member profiles
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
              className="border-2 border-dashed border-slate-300 hover:border-purple-500 hover:bg-purple-50/30 rounded-2xl p-10 text-center cursor-pointer transition"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-3">
                {isProcessing ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-purple-700" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>
              <h4 className="font-semibold text-slate-800 text-sm">
                {isProcessing ? 'Inspecting Assets Archive...' : 'Select BNI_Member_Assets.zip'}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Scans cards/ and photos/ folders and matches against member card_file, photo_file, or member names.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Total Files in ZIP
                  </span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {preview.totalFiles}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">
                    Full Matches (Both)
                  </span>
                  <div className="text-xl font-bold font-mono mt-1">
                    {preview.matches.filter((m) => m.status === 'both').length}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">
                    Partial Matches
                  </span>
                  <div className="text-xl font-bold font-mono mt-1">
                    {preview.matches.filter((m) => m.status === 'photo_only' || m.status === 'card_only').length}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">
                    Unmatched Files
                  </span>
                  <div className="text-xl font-bold font-mono mt-1">
                    {preview.unmatchedFiles.length}
                  </div>
                </div>
              </div>

              {/* Match Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-2.5">Member</th>
                      <th className="px-4 py-2.5">Category</th>
                      <th className="px-4 py-2.5">Card File</th>
                      <th className="px-4 py-2.5">Photo File</th>
                      <th className="px-4 py-2.5">Match Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.matches.map((item) => (
                      <tr key={item.member.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium text-slate-900">
                          {item.member.name}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{item.member.category}</td>
                        <td className="px-4 py-2.5 font-mono text-[11px]">
                          {item.cardBlob ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                              ✓ {item.cardFileName}
                            </span>
                          ) : item.hasCard ? (
                            <span className="text-slate-500 italic">Existing card kept</span>
                          ) : (
                            <span className="text-slate-400 italic">Missing</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[11px]">
                          {item.photoBlob ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                              ✓ {item.photoFileName}
                            </span>
                          ) : item.hasPhoto ? (
                            <span className="text-slate-500 italic">Existing photo kept</span>
                          ) : (
                            <span className="text-slate-400 italic">Missing</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {item.status === 'both' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              Both Ready
                            </span>
                          ) : item.status === 'photo_only' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                              Photo Only
                            </span>
                          ) : item.status === 'card_only' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800">
                              Card Only
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                              No Assets
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {preview.unmatchedFiles.length > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="font-semibold text-slate-700 block mb-1">
                    Unmatched files in ZIP ({preview.unmatchedFiles.length}):
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto font-mono text-[10px] text-slate-500">
                    {preview.unmatchedFiles.map((f) => (
                      <span key={f} className="px-1.5 py-0.5 rounded bg-white border border-slate-200">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
              Choose different ZIP
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
                className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Saving Assets...' : 'Attach Assets to Members'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
