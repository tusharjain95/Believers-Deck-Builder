import React, { useState, useEffect } from 'react';
import { Settings, Save, Check, FileText, Calendar, Building, Sparkles } from 'lucide-react';
import type { ChapterSettings } from '../types';
import { getChapterSettings, saveChapterSettings } from '../data/settingsRepo';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<ChapterSettings>({
    chapterName: 'BNI Believers',
    meetingWeekday: 'Wednesday',
    outputFileNamePattern: 'BNI Believers - {DD MMM YYYY}.pptx',
    presentLastRoleOrder: ['secretary_treasurer', 'vice_president', 'president'],
    region: 'Surat',
    venue: 'Avadh Utopia',
  });
  const [roleOrderStr, setRoleOrderStr] = useState('secretary_treasurer, vice_president, president');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getChapterSettings().then((s) => {
      setSettings(s);
      setRoleOrderStr(s.presentLastRoleOrder.join(', '));
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const order = roleOrderStr
        .split(',')
        .map((s) => s.trim().toLowerCase().replace(/\s+/g, '_'))
        .filter(Boolean);

      const updated = await saveChapterSettings({
        ...settings,
        presentLastRoleOrder: order,
      });
      setSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  // Preview generated output filename
  const previewFilename = settings.outputFileNamePattern.replace(
    /\{DD MMM YYYY\}/g,
    new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2 pb-4 border-b border-slate-200">
        <Settings className="w-6 h-6 text-red-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Chapter Deck Configuration &amp; Settings
          </h1>
          <p className="text-sm text-slate-500">
            Define meeting schedule parameters, file naming conventions, and presentation hierarchy.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
        {savedSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">Chapter settings updated successfully in IndexedDB!</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          {/* Chapter Name */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Chapter Name
            </label>
            <input
              type="text"
              required
              value={settings.chapterName}
              onChange={(e) => setSettings({ ...settings, chapterName: e.target.value })}
              placeholder="e.g. BNI Believers"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-medium"
            />
          </div>

          {/* Meeting Weekday */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Regular Meeting Weekday
            </label>
            <select
              value={settings.meetingWeekday}
              onChange={(e) => setSettings({ ...settings, meetingWeekday: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-medium"
            >
              {[
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday',
                'Sunday',
              ].map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Used by "Add Next Week" in speaker schedule generator.
            </p>
          </div>

          {/* Output File Name Pattern */}
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Generated File Name Pattern
            </label>
            <input
              type="text"
              required
              value={settings.outputFileNamePattern}
              onChange={(e) => setSettings({ ...settings, outputFileNamePattern: e.target.value })}
              placeholder="e.g. BNI Believers - {DD MMM YYYY}.pptx"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
            />
            <div className="mt-1.5 flex items-center space-x-2 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-600">Sample output filename:</span>
              <code className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-mono border border-slate-200">
                {previewFilename}
              </code>
            </div>
          </div>

          {/* "Present Last" Role Order */}
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              "Present Last" Leadership Role Hierarchy
            </label>
            <input
              type="text"
              required
              value={roleOrderStr}
              onChange={(e) => setRoleOrderStr(e.target.value)}
              placeholder="secretary_treasurer, vice_president, president"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Comma-separated role keys. Default order:{' '}
              <code className="bg-slate-100 px-1 rounded font-mono">
                secretary_treasurer, vice_president, president
              </code>
            </p>
          </div>

          {/* Region */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              BNI Region
            </label>
            <input
              type="text"
              value={settings.region || ''}
              onChange={(e) => setSettings({ ...settings, region: e.target.value })}
              placeholder="e.g. Surat"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          {/* Venue */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Meeting Venue
            </label>
            <input
              type="text"
              value={settings.venue || ''}
              onChange={(e) => setSettings({ ...settings, venue: e.target.value })}
              placeholder="e.g. Avadh Utopia"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
