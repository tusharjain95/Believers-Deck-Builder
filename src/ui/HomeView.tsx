import React, { useMemo } from 'react';
import {
  Calendar,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  HardDrive,
  Users,
  CheckCircle2,
  Clock,
  Layers,
  FileCheck2,
  Plus,
  Play,
  RotateCcw,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import type {
  Meeting,
  TemplateVersion,
  TemplateMap,
  Member,
  Role,
  ScheduleEntry,
  ChapterSettings,
} from '../types';

interface HomeViewProps {
  meetings: Meeting[];
  members: Member[];
  roles: Role[];
  schedule: ScheduleEntry[];
  settings: ChapterSettings;
  activeVersion?: TemplateVersion;
  templateMap: TemplateMap | null;
  onContinueMeeting: (meeting: Meeting) => void;
  onSmartEntry: (meeting: Meeting) => void;
  onGenerateMeeting: (meeting: Meeting) => void;
  onCreateNewMeeting: () => void;
  onNavigateTab: (tab: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  meetings,
  members,
  roles,
  schedule,
  settings,
  activeVersion,
  templateMap,
  onContinueMeeting,
  onSmartEntry,
  onGenerateMeeting,
  onCreateNewMeeting,
  onNavigateTab,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // 1. Identify "Next meeting"
  // Either the closest upcoming meeting, or the latest meeting if none in future
  const nextMeeting = useMemo<Meeting | null>(() => {
    if (meetings.length === 0) return null;
    const sorted = [...meetings].sort((a, b) => a.date.localeCompare(b.date));
    const upcoming = sorted.find((m) => m.date >= todayStr);
    return upcoming || sorted[sorted.length - 1];
  }, [meetings, todayStr]);

  // 2. Compute % complete and top 3 missing items for next meeting
  const { percentComplete, missingItems } = useMemo(() => {
    if (!nextMeeting) return { percentComplete: 0, missingItems: [] };

    const missing: string[] = [];
    let checksTotal = 0;
    let checksPassed = 0;

    const check = (name: string, passed: boolean) => {
      checksTotal++;
      if (passed) {
        checksPassed++;
      } else {
        missing.push(name);
      }
    };

    // Meeting Number
    check('Meeting number', Boolean(nextMeeting.values['meeting.number']));

    // VP Metrics
    check('VP Referrals count', nextMeeting.values['vp.referrals'] !== undefined && String(nextMeeting.values['vp.referrals']).trim() !== '');
    check('VP Visitors count', nextMeeting.values['vp.visitors'] !== undefined && String(nextMeeting.values['vp.visitors']).trim() !== '');
    check('VP 1-to-1s count', nextMeeting.values['vp.one_to_ones'] !== undefined && String(nextMeeting.values['vp.one_to_ones']).trim() !== '');
    check('VP TYFCB amount', nextMeeting.values['vp.tyfcb'] !== undefined && String(nextMeeting.values['vp.tyfcb']).trim() !== '');

    // Weekly Metrics
    check('Weekly TYFCB amount', nextMeeting.values['weekly.tyfcb'] !== undefined && String(nextMeeting.values['weekly.tyfcb']).trim() !== '');

    // Monthly Theme & Statistics
    check('Monthly Business amount', nextMeeting.values['monthly.business_inr'] !== undefined && String(nextMeeting.values['monthly.business_inr']).trim() !== '');

    // Feature Speaker
    const features = nextMeeting.lists['#features'] || nextMeeting.lists['features'] || [];
    const hasFeature = features.length > 0 && Boolean(features[0]?.name);
    check('Feature Presentation speaker scheduled', hasFeature);

    // Presenters
    const presenters = nextMeeting.lists['#presenters'] || nextMeeting.lists['presenters'] || [];
    const hasPresenters = presenters.length > 0;
    check('Presenters list populated', hasPresenters);

    // Missing presenter cards
    const presentersWithoutCard = presenters.filter((p: any) => !p.hasCard && !p.cardBlob);
    if (presentersWithoutCard.length > 0) {
      check(
        `${presentersWithoutCard.length} presenter(s) missing business card`,
        false
      );
    } else {
      check('Presenter cards attached', true);
    }

    const pct = checksTotal > 0 ? Math.round((checksPassed / checksTotal) * 100) : 0;
    return {
      percentComplete: pct,
      missingItems: missing.slice(0, 3), // Top 3 missing items (exact requirement)
    };
  }, [nextMeeting]);

  // 3. Reminders calculations
  // Reminder A: Backup older than 7 days
  const backupReminder = useMemo(() => {
    const lastBackupIso = localStorage.getItem('bni_last_backup_date');
    if (!lastBackupIso) {
      return {
        triggered: true,
        message: 'No backup recorded in browser. Download a backup to protect your chapter data.',
        daysAgo: null,
      };
    }
    const days = Math.floor((Date.now() - new Date(lastBackupIso).getTime()) / (1000 * 60 * 60 * 24));
    return {
      triggered: days >= 7,
      message: `Last backup was taken ${days} days ago. Create a fresh backup to protect weekly data.`,
      daysAgo: days,
    };
  }, []);

  // Reminder B: Fewer than 6 future Speaker Schedule entries
  const futureScheduleCount = useMemo(() => {
    const refDate = nextMeeting?.date || todayStr;
    return schedule.filter((s) => s.date >= refDate).length;
  }, [schedule, nextMeeting, todayStr]);

  // Reminder C: Active members without card or photo
  const membersWithoutAssets = useMemo(() => {
    return members.filter((m) => m.active && (!m.cardBlob || !m.photoBlob));
  }, [members]);

  const formatMeetingDate = (dateStr: string) => {
    try {
      const d = new Date(`${dateStr}T12:00:00Z`);
      return d.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {settings.chapterName || 'BNI Believers'} Deck Builder
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
              {settings.region || 'Bengaluru South'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            PowerPoint automation engine for weekly chapter presentations. Pure client-side XML mutation.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {activeVersion && (
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Template v{activeVersion.version}</span>
              <span className="text-slate-400 font-mono">({activeVersion.slideCount} slides)</span>
            </div>
          )}
        </div>
      </div>

      {/* NEXT MEETING CARD (Exact Requirement) */}
      {nextMeeting ? (
        <div className="bg-white rounded-2xl border-2 border-red-500/20 shadow-md p-6 sm:p-8 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-red-100/40 to-transparent rounded-bl-full pointer-events-none"></div>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-3 flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-200">
                  Next Meeting
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase font-mono ${
                    nextMeeting.status === 'ready'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : nextMeeting.status === 'generated'
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {nextMeeting.status}
                </span>
                {nextMeeting.values['meeting.number'] && (
                  <span className="font-mono text-xs text-slate-500">
                    Meeting #{nextMeeting.values['meeting.number']}
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {formatMeetingDate(nextMeeting.date)}
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{nextMeeting.date}</p>
              </div>

              {/* % Complete Progress Bar */}
              <div className="space-y-1.5 pt-1 max-w-md">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">Data Readiness</span>
                  <span className="font-bold font-mono text-red-600">{percentComplete}% complete</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      percentComplete === 100
                        ? 'bg-emerald-600'
                        : percentComplete >= 60
                        ? 'bg-red-600'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${percentComplete}%` }}
                  ></div>
                </div>
              </div>

              {/* Top 3 Missing Items (Exact Requirement) */}
              {missingItems.length > 0 ? (
                <div className="pt-2 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Top Missing Items to Complete:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {missingItems.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200"
                      >
                        <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                        <span>{item}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="pt-2 flex items-center space-x-2 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>All core weekly metrics and speaker details are configured!</span>
                </div>
              )}
            </div>

            {/* Buttons: Continue / Smart Entry / Generate (Exact Requirement) */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 justify-end">
              {/* Continue */}
              <button
                type="button"
                onClick={() => onContinueMeeting(nextMeeting)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Smart Entry */}
              <button
                type="button"
                onClick={() => onSmartEntry(nextMeeting)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
                title="Paste WhatsApp text or drop screenshots for Gemini AI extraction"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Smart Entry</span>
              </button>

              {/* Generate */}
              <button
                type="button"
                onClick={() => onGenerateMeeting(nextMeeting)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-bold shadow-2xs transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-red-600 fill-red-600" />
                <span>Generate</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-xs">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <div>
            <h3 className="text-lg font-bold text-slate-900">No Upcoming Meeting Scheduled</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Initialize next week's meeting form. Carry-forward rules will automatically copy stats, monthly theme, and vacant categories from previous weeks.
            </p>
          </div>
          <button
            type="button"
            onClick={onCreateNewMeeting}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Next Weekly Meeting</span>
          </button>
        </div>
      )}

      {/* REMINDERS SECTION (Exact Requirement) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
              Chapter Operations & Reminders
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Reminder 1: Backup older than 7 days */}
          <div
            className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 ${
              backupReminder.triggered
                ? 'bg-amber-50/60 border-amber-200'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <HardDrive
                  className={`w-4 h-4 ${
                    backupReminder.triggered ? 'text-amber-600' : 'text-slate-500'
                  }`}
                />
                <span className="font-bold text-xs text-slate-900">Database Backup</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {backupReminder.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('backup')}
              className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold transition text-center flex items-center justify-center space-x-1 ${
                backupReminder.triggered
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>{backupReminder.triggered ? 'Back Up Now' : 'Manage Backups'}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Reminder 2: Fewer than 6 future Speaker Schedule entries */}
          <div
            className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 ${
              futureScheduleCount < 6
                ? 'bg-amber-50/60 border-amber-200'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <Calendar
                  className={`w-4 h-4 ${
                    futureScheduleCount < 6 ? 'text-amber-600' : 'text-slate-500'
                  }`}
                />
                <span className="font-bold text-xs text-slate-900">Speaker Schedule</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {futureScheduleCount < 6
                  ? `Only ${futureScheduleCount} upcoming speaker slots scheduled. Chapters should maintain at least 6 future dates.`
                  : `${futureScheduleCount} upcoming speaker dates planned in the 6-week rotation.`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('schedule')}
              className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold transition text-center flex items-center justify-center space-x-1 ${
                futureScheduleCount < 6
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>{futureScheduleCount < 6 ? 'Update Schedule' : 'View Schedule'}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Reminder 3: Members without card or photo */}
          <div
            className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 ${
              membersWithoutAssets.length > 0
                ? 'bg-amber-50/60 border-amber-200'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <Users
                  className={`w-4 h-4 ${
                    membersWithoutAssets.length > 0 ? 'text-amber-600' : 'text-slate-500'
                  }`}
                />
                <span className="font-bold text-xs text-slate-900">Member Cards & Photos</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {membersWithoutAssets.length > 0
                  ? `${membersWithoutAssets.length} active member(s) are missing a business card or portrait photo.`
                  : 'All active members have both business cards and portrait photos attached.'}
              </p>
              {membersWithoutAssets.length > 0 && (
                <p className="text-[10px] text-slate-400 truncate">
                  {membersWithoutAssets.slice(0, 2).map((m) => m.name).join(', ')}
                  {membersWithoutAssets.length > 2 && ` +${membersWithoutAssets.length - 2} more`}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('members')}
              className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold transition text-center flex items-center justify-center space-x-1 ${
                membersWithoutAssets.length > 0
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>{membersWithoutAssets.length > 0 ? 'Upload Assets' : 'View Members'}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
