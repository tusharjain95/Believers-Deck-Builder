import React from 'react';
import {
  Home,
  Presentation,
  UploadCloud,
  FileCode2,
  Users,
  Shield,
  Calendar,
  CalendarDays,
  BookOpen,
  Settings,
  HardDrive,
  History,
  HelpCircle,
} from 'lucide-react';
import type { TemplateVersion } from '../types';

export type AppTab =
  | 'home'
  | 'meetings'
  | 'history'
  | 'upload'
  | 'map'
  | 'members'
  | 'roles'
  | 'schedule'
  | 'library'
  | 'settings'
  | 'backup'
  | 'json';

interface NavbarProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenAbout: () => void;
  activeVersion?: TemplateVersion;
  warningCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenAbout,
  activeVersion,
  warningCount,
}) => {
  const navItems: Array<{
    id: AppTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    requiresActive?: boolean;
    badge?: number;
  }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'meetings', label: 'Meetings', icon: CalendarDays },
    { id: 'history', label: 'History', icon: History },
    { id: 'upload', label: 'Template', icon: UploadCloud },
    { id: 'map', label: 'Deck Map', icon: Presentation, requiresActive: true, badge: warningCount },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'roles', label: 'Roles', icon: Shield },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'library', label: 'Slide Library', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'backup', label: 'Backup', icon: HardDrive },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Brand */}
          <div
            onClick={() => onSelectTab('home')}
            className="flex items-center space-x-3 shrink-0 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-md shadow-red-900/30 text-white font-bold text-base tracking-wider">
              BNI
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-base tracking-tight text-white">Deck Builder</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-900/40 text-red-300 border border-red-700/50 font-semibold uppercase">
                  Believers
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">PowerPoint XML Engine • Browser Only</p>
            </div>
          </div>

          {/* Active Version Badge */}
          <div className="hidden xl:flex items-center space-x-2 shrink-0">
            {activeVersion ? (
              <div
                onClick={() => onSelectTab('upload')}
                className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs transition cursor-pointer"
                title={`Active template: ${activeVersion.filename}`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-slate-400">Deck:</span>
                <span className="font-semibold text-slate-200">v{activeVersion.version}</span>
                <span className="text-slate-400 truncate max-w-[100px]">
                  ({activeVersion.filename})
                </span>
              </div>
            ) : (
              <span
                onClick={() => onSelectTab('upload')}
                className="text-xs text-amber-400/90 bg-amber-950/50 px-2.5 py-1 rounded-md border border-amber-800/50 cursor-pointer"
              >
                No active deck
              </span>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto py-1 flex-1 justify-end min-w-0">
            <nav className="flex items-center space-x-1 overflow-x-auto py-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                const isDisabled = item.requiresActive && !activeVersion;

                return (
                  <button
                    key={item.id}
                    onClick={() => !isDisabled && onSelectTab(item.id)}
                    disabled={isDisabled}
                    className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      isDisabled
                        ? 'text-slate-600 cursor-not-allowed opacity-40'
                        : isActive
                        ? 'bg-red-600 text-white shadow-xs font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] border border-amber-500/30">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* About & Syntax Button */}
            <button
              type="button"
              onClick={onOpenAbout}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition whitespace-nowrap ml-1 shrink-0 cursor-pointer"
              title="View PowerPoint XML Tag Syntax & Architecture"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Tag Syntax</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
