import React, { useState, useEffect } from 'react';
import type {
  TemplateVersion,
  TemplateMap,
  Meeting,
  Member,
  Role,
  ScheduleEntry,
  LibraryImage,
  ChapterSettings,
} from './types';
import {
  getActiveTemplateVersion,
  getTemplateMap,
} from './data/templateRepo';
import { getAllMembers } from './data/membersRepo';
import { getAllRoles } from './data/rolesRepo';
import { getAllSchedule } from './data/scheduleRepo';
import { getAllLibraryImages } from './data/libraryRepo';
import { getChapterSettings, DEFAULT_SETTINGS } from './data/settingsRepo';
import { getAllMeetings, createNewMeeting } from './data/meetingsRepo';
import { Navbar, type AppTab } from './ui/Navbar';
import { HomeView } from './ui/HomeView';
import { HistoryView } from './ui/HistoryView';
import { AboutModal } from './ui/AboutModal';
import { TemplateUpload } from './ui/TemplateUpload';
import { TemplateMapViewer } from './ui/TemplateMapViewer';
import { MembersView } from './ui/MembersView';
import { RolesView } from './ui/RolesView';
import { ScheduleView } from './ui/ScheduleView';
import { SlideLibraryView } from './ui/SlideLibraryView';
import { SettingsView } from './ui/SettingsView';
import { BackupView } from './ui/BackupView';
import { RawJsonViewer } from './ui/RawJsonViewer';
import { MeetingsListView } from './ui/meetings/MeetingsListView';
import { MeetingEditorView } from './ui/meetings/MeetingEditorView';
import { RefreshCw, UploadCloud } from 'lucide-react';

const getInitialTab = (): AppTab => {
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  const path = window.location.pathname.replace(/^\//, '').toLowerCase();
  if (hash === 'history' || path === 'history') return 'history';
  if (hash === 'meetings' || path === 'meetings') return 'meetings';
  if (hash === 'upload' || hash === 'template') return 'upload';
  if (hash === 'map') return 'map';
  if (hash === 'members') return 'members';
  if (hash === 'roles') return 'roles';
  if (hash === 'schedule') return 'schedule';
  if (hash === 'library') return 'library';
  if (hash === 'settings') return 'settings';
  if (hash === 'backup') return 'backup';
  if (hash === 'json') return 'json';
  return 'home';
};

export default function App() {
  const [currentTab, setCurrentTab] = useState<AppTab>(getInitialTab);
  const [activeVersion, setActiveVersion] = useState<TemplateVersion | undefined>(undefined);
  const [templateMap, setTemplateMap] = useState<TemplateMap | null>(null);

  // Entities for meeting resolution and editor
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [library, setLibrary] = useState<LibraryImage[]>([]);
  const [settings, setSettings] = useState<ChapterSettings>(DEFAULT_SETTINGS);

  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [openSmartEntryOnEditor, setOpenSmartEntryOnEditor] = useState<boolean>(false);
  const [openDeckPlanOnEditor, setOpenDeckPlanOnEditor] = useState<boolean>(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async (showSpinner: boolean = true) => {
    if (showSpinner) {
      setIsLoading(true);
    }
    try {
      const [active, allMembers, allRoles, allSchedule, allLibrary, chapterSettings, allMeetings] =
        await Promise.all([
          getActiveTemplateVersion(),
          getAllMembers(),
          getAllRoles(),
          getAllSchedule(),
          getAllLibraryImages(),
          getChapterSettings(),
          getAllMeetings(),
        ]);

      setActiveVersion(active);
      setMembers(allMembers);
      setRoles(allRoles);
      setSchedule(allSchedule);
      setLibrary(allLibrary);
      setSettings(chapterSettings);
      setMeetings(allMeetings);

      if (active?.id) {
        const map = await getTemplateMap(active.id);
        setTemplateMap(map);
      } else {
        setTemplateMap(null);
      }
    } catch (err) {
      console.error('Failed to load initial app data:', err);
    } finally {
      if (showSpinner) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync tab with URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const newTab = getInitialTab();
      setCurrentTab(newTab);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSelectTab = (tab: AppTab) => {
    if (tab !== 'meetings') {
      setActiveMeeting(null);
      setOpenSmartEntryOnEditor(false);
      setOpenDeckPlanOnEditor(false);
    }
    setCurrentTab(tab);
    window.location.hash = `#/${tab}`;
  };

  const handleTemplateReady = (version: TemplateVersion, map: TemplateMap) => {
    setActiveVersion(version);
    setTemplateMap(map);
    setCurrentTab('map');
    window.location.hash = '#/map';
  };

  const handleSelectMeeting = (meeting: Meeting) => {
    setActiveMeeting(meeting);
    setOpenSmartEntryOnEditor(false);
    setOpenDeckPlanOnEditor(false);
    setCurrentTab('meetings');
    window.location.hash = '#/meetings';
  };

  const handleCreateNewMeeting = async () => {
    if (!templateMap) {
      setCurrentTab('upload');
      window.location.hash = '#/upload';
      return;
    }

    try {
      const newMeeting = await createNewMeeting(
        templateMap,
        settings,
        members,
        roles,
        schedule
      );
      await loadData(false);
      setActiveMeeting(newMeeting);
      setOpenSmartEntryOnEditor(false);
      setOpenDeckPlanOnEditor(false);
      setCurrentTab('meetings');
      window.location.hash = '#/meetings';
    } catch (err) {
      console.error('Failed creating new meeting:', err);
    }
  };

  const warningCount = templateMap ? templateMap.warnings.length : 0;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased selection:bg-red-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenAbout={() => setShowAboutModal(true)}
        activeVersion={activeVersion}
        warningCount={warningCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {isLoading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-red-600" />
            <p className="text-sm font-medium text-slate-500">
              Loading BNI Believers Deck Engine...
            </p>
          </div>
        ) : (
          <>
            {/* 1. HOME VIEW */}
            {currentTab === 'home' && (
              <HomeView
                meetings={meetings}
                members={members}
                roles={roles}
                schedule={schedule}
                settings={settings}
                activeVersion={activeVersion}
                templateMap={templateMap}
                onContinueMeeting={handleSelectMeeting}
                onSmartEntry={(m) => {
                  setActiveMeeting(m);
                  setOpenSmartEntryOnEditor(true);
                  setCurrentTab('meetings');
                  window.location.hash = '#/meetings';
                }}
                onGenerateMeeting={(m) => {
                  setActiveMeeting(m);
                  setOpenDeckPlanOnEditor(true);
                  setCurrentTab('meetings');
                  window.location.hash = '#/meetings';
                }}
                onCreateNewMeeting={handleCreateNewMeeting}
                onNavigateTab={(tab) => handleSelectTab(tab as AppTab)}
              />
            )}

            {/* 2. HISTORY VIEW */}
            {currentTab === 'history' && (
              <HistoryView
                onOpenMeeting={handleSelectMeeting}
                members={members}
                roles={roles}
                schedule={schedule}
                library={library}
                settings={settings}
                activeTemplateMap={templateMap}
              />
            )}

            {/* 3. TEMPLATE UPLOAD & VERSIONS */}
            {currentTab === 'upload' && (
              <TemplateUpload
                onTemplateReady={handleTemplateReady}
                activeVersion={activeVersion}
                onRefreshVersions={loadData}
              />
            )}

            {/* 4. DECK MAP VIEWER */}
            {currentTab === 'map' && templateMap && (
              <TemplateMapViewer
                templateMap={templateMap}
                onUploadNewVersion={() => handleSelectTab('upload')}
              />
            )}

            {currentTab === 'map' && !templateMap && (
              <div className="max-w-md mx-auto mt-16 p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
                <UploadCloud className="w-12 h-12 text-slate-400 mx-auto" />
                <h3 className="text-lg font-semibold text-slate-800">No Template Selected</h3>
                <p className="text-sm text-slate-500">
                  Please upload a .pptx template or select a version to explore its Template Map.
                </p>
                <button
                  onClick={() => handleSelectTab('upload')}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition"
                >
                  Go to Template Upload
                </button>
              </div>
            )}

            {/* 5. MEETING EDITOR / MEETINGS LIST */}
            {currentTab === 'meetings' && activeMeeting && templateMap && (
              <MeetingEditorView
                meeting={activeMeeting}
                templateMap={templateMap}
                members={members}
                roles={roles}
                schedule={schedule}
                library={library}
                settings={settings}
                initialOpenSmartEntry={openSmartEntryOnEditor}
                initialOpenDeckPlan={openDeckPlanOnEditor}
                onBack={() => {
                  setActiveMeeting(null);
                  setOpenSmartEntryOnEditor(false);
                  setOpenDeckPlanOnEditor(false);
                  loadData(false);
                }}
                onMeetingChange={(updated) => {
                  setActiveMeeting(updated);
                }}
              />
            )}

            {currentTab === 'meetings' && (!activeMeeting || !templateMap) && (
              <MeetingsListView
                templateMap={templateMap}
                settings={settings}
                members={members}
                roles={roles}
                schedule={schedule}
                onSelectMeeting={handleSelectMeeting}
              />
            )}

            {/* 6. MEMBERS VIEW */}
            {currentTab === 'members' && <MembersView />}

            {/* 7. ROLES VIEW */}
            {currentTab === 'roles' && <RolesView />}

            {/* 8. SCHEDULE VIEW */}
            {currentTab === 'schedule' && <ScheduleView />}

            {/* 9. SLIDE LIBRARY VIEW */}
            {currentTab === 'library' && (
              <SlideLibraryView activeTemplateMap={templateMap} />
            )}

            {/* 10. SETTINGS VIEW */}
            {currentTab === 'settings' && <SettingsView />}

            {/* 11. BACKUP VIEW */}
            {currentTab === 'backup' && (
              <BackupView onDataRestored={loadData} />
            )}

            {/* 12. RAW JSON VIEWER */}
            {currentTab === 'json' && templateMap && (
              <div className="max-w-6xl mx-auto px-4 py-8">
                <RawJsonViewer templateMap={templateMap} />
              </div>
            )}
          </>
        )}
      </main>

      {/* About & Syntax Modal */}
      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700">BNI Believers</span>
            <span>•</span>
            <span>Weekly Deck Builder Engine</span>
          </div>
          <div className="text-slate-400">
            Pure Client-Side XML Parsing • IndexedDB Persistence • Zero Re-drawing
          </div>
        </div>
      </footer>
    </div>
  );
}
