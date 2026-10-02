import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  HardDrive,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  FileArchive,
  RefreshCw,
  Layers,
  Users,
} from 'lucide-react';
import {
  createBackupZip,
  restoreBackupZip,
  type RestoreStats,
} from '../engine/backupRestore';

interface BackupViewProps {
  onDataRestored?: () => void;
}

export const BackupView: React.FC<BackupViewProps> = ({ onDataRestored }) => {
  const [includeTemplates, setIncludeTemplates] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');

  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreStatus, setRestoreStatus] = useState('');
  const [restoreStats, setRestoreStats] = useState<RestoreStats | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const restoreInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadBackup = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsExporting(true);
    setExportProgress(10);
    setExportStatus('Starting backup creation...');

    try {
      const zipBlob = await createBackupZip({
        includeTemplates,
        onProgress: (p, msg) => {
          setExportProgress(p);
          setExportStatus(msg);
        },
      });

      const filename = `BNI_Believers_Backup_${new Date().toISOString().slice(0, 10)}.zip`;
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccessMessage(`Backup "${filename}" downloaded successfully.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Backup generation failed: ${msg}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      e.target.value = '';

      if (
        !confirm(
          `Are you sure you want to restore "${file.name}"? This will update your IndexedDB with the data in this backup.`
        )
      ) {
        return;
      }

      setErrorMessage(null);
      setSuccessMessage(null);
      setIsRestoring(true);
      setRestoreProgress(10);
      setRestoreStatus('Reading archive...');

      try {
        const stats = await restoreBackupZip(file, (p, msg) => {
          setRestoreProgress(p);
          setRestoreStatus(msg);
        });

        setRestoreStats(stats);
        setSuccessMessage('Backup restored successfully into IndexedDB!');
        onDataRestored?.();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(`Restore failed: ${msg}`);
      } finally {
        setIsRestoring(false);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-2 pb-4 border-b border-slate-200">
        <HardDrive className="w-6 h-6 text-red-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Data Backup &amp; Disaster Recovery
          </h1>
          <p className="text-sm text-slate-500">
            Export a self-contained ZIP of your chapter database (members, images, roles, schedule, slide library, settings).
          </p>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-3">
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Operation Error</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-3">
          <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Success</p>
            <p className="mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Export Backup Archive</h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Creates a single compressed .zip file containing all IndexedDB records, high-resolution member photos, presentation cards, and slide library versions.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="flex items-start space-x-2.5 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={includeTemplates}
                  onChange={(e) => setIncludeTemplates(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 mt-0.5"
                />
                <div>
                  <span className="font-semibold text-slate-800 block">
                    Include PowerPoint Master Templates (.pptx)
                  </span>
                  <span className="text-slate-500 text-[11px] block mt-0.5">
                    Includes original uploaded PPTX files (decks containing embedded videos can be 120MB+).
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            {isExporting && (
              <div className="space-y-1">
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${exportProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>{exportStatus}</span>
                  <span>{exportProgress}%</span>
                </div>
              </div>
            )}

            <button
              onClick={handleDownloadBackup}
              disabled={isExporting}
              className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generating ZIP...' : 'Download Backup (.zip)'}</span>
            </button>
          </div>
        </div>

        {/* Restore Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Restore from Backup</h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Restore chapter members, photos, roles, rotation schedule, and slide library images from a previously exported backup archive.
            </p>

            {restoreStats && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                <span className="font-semibold block">Last Restore Summary:</span>
                <div className="grid grid-cols-2 gap-x-2 text-[11px]">
                  <span>Members: {restoreStats.membersRestored}</span>
                  <span>Roles: {restoreStats.rolesRestored}</span>
                  <span>Schedule: {restoreStats.scheduleRestored}</span>
                  <span>Library: {restoreStats.libraryRestored}</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            {isRestoring && (
              <div className="space-y-1">
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${restoreProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>{restoreStatus}</span>
                  <span>{restoreProgress}%</span>
                </div>
              </div>
            )}

            <input
              ref={restoreInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileRestore}
              className="hidden"
            />

            <button
              onClick={() => restoreInputRef.current?.click()}
              disabled={isRestoring}
              className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{isRestoring ? 'Restoring Archive...' : 'Select Backup ZIP to Restore'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
