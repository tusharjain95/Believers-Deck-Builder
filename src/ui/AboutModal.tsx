import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  Code2,
  FileText,
  Layers,
  Image as ImageIcon,
  CheckCircle,
  BookOpen,
  Search,
  Zap,
} from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<'syntax' | 'formats' | 'directives' | 'images' | 'architecture'>('syntax');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl max-w-4xl w-full h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-md shadow-red-900/20">
              <BookOpen className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-900">About & Tag Syntax Guide</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 border border-red-200">
                  BNI Believers Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Reference manual for PowerPoint XML template tags, formats, slide notes directives, and images.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center space-x-2 px-6 pt-3 pb-2 border-b border-slate-100 bg-slate-50 text-xs overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveSection('syntax')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
              activeSection === 'syntax'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            1. Text Tags & Variables
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('formats')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
              activeSection === 'formats'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            2. Pipe Formats (| inr, | num)
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('directives')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
              activeSection === 'directives'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            3. Directives (@repeat, @if)
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('images')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
              activeSection === 'images'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            4. Image Slots (Cards, Photos, Library)
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('architecture')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
              activeSection === 'architecture'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            5. XML Architecture
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700 bg-white">
          {activeSection === 'syntax' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">Standard Text Tags</h3>
                <p className="text-slate-500 mb-3">
                  Place double curly braces in any PowerPoint textbox. During generation, the engine finds these runs in slide XML and replaces them with resolved meeting values.
                </p>

                <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs space-y-2 border border-slate-800">
                  <div className="text-slate-400">// Meeting Metadata</div>
                  <div>{"{{meeting.date}}"} <span className="text-slate-400">→ "08 Oct 2026"</span></div>
                  <div>{"{{meeting.number}}"} <span className="text-slate-400">→ "248"</span></div>
                  <div>{"{{chapter.name}}"} <span className="text-slate-400">→ "BNI Believers"</span></div>
                  <div className="pt-2 text-slate-400">// Vice President Weekly Report</div>
                  <div>{"{{vp.referrals}}"} <span className="text-slate-400">→ "42"</span></div>
                  <div>{"{{vp.visitors}}"} <span className="text-slate-400">→ "11"</span></div>
                  <div>{"{{vp.one_to_ones}}"} <span className="text-slate-400">→ "35"</span></div>
                  <div>{"{{vp.tyfcb}}"} <span className="text-slate-400">→ "₹12,45,000"</span></div>
                  <div className="pt-2 text-slate-400">// Chapter Statistics</div>
                  <div>{"{{monthly.business_inr}}"} <span className="text-slate-400">→ "₹85,20,000"</span></div>
                  <div>{"{{monthly.referrals}}"} <span className="text-slate-400">→ "182"</span></div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">Split-Run Tag Protection</h3>
                <p className="text-slate-500">
                  PowerPoint often splits text like <code>{"{{meeting.date}}"}</code> across multiple <code>&lt;a:r&gt;</code> elements if styled or edited. The Believers Engine runs a span-reconstruction pass, reuniting fragmented tags into a single clean text run before resolving.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'formats' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Piped Formatting Filters</h3>
              <p className="text-slate-500 mb-3">
                Append a pipe <code>|</code> followed by the format specifier to automatically format numbers, currency, and percentages according to Indian standards.
              </p>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-3">Filter</th>
                      <th className="p-3">Syntax Example</th>
                      <th className="p-3">Raw Value</th>
                      <th className="p-3">Formatted Output</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 font-mono font-semibold text-red-600">| num</td>
                      <td className="p-3 font-mono">{"{{vp.tyfcb | num}}"}</td>
                      <td className="p-3 font-mono text-slate-500">1250000</td>
                      <td className="p-3 font-semibold text-slate-900">12,50,000 (Indian grouping)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-red-600">| inr</td>
                      <td className="p-3 font-mono">{"{{vp.tyfcb | inr}}"}</td>
                      <td className="p-3 font-mono text-slate-500">734492</td>
                      <td className="p-3 font-semibold text-slate-900">₹7,34,492</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-red-600">| inr_lakh</td>
                      <td className="p-3 font-mono">{"{{weekly.tyfcb | inr_lakh}}"}</td>
                      <td className="p-3 font-mono text-slate-500">734492</td>
                      <td className="p-3 font-semibold text-slate-900">₹7.34 L</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-red-600">| inr_cr</td>
                      <td className="p-3 font-mono">{"{{monthly.tyfcb | inr_cr}}"}</td>
                      <td className="p-3 font-mono text-slate-500">12000000</td>
                      <td className="p-3 font-semibold text-slate-900">₹1.20 Cr</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-red-600">| pct</td>
                      <td className="p-3 font-mono">{"{{vp.attendance | pct}}"}</td>
                      <td className="p-3 font-mono text-slate-500">92</td>
                      <td className="p-3 font-semibold text-slate-900">92%</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-red-600">| date:...</td>
                      <td className="p-3 font-mono">{"{{meeting.date | date:DD MMM}}"}</td>
                      <td className="p-3 font-mono text-slate-500">2026-10-08</td>
                      <td className="p-3 font-semibold text-slate-900">08 Oct</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSection === 'directives' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">Slide Notes Directives</h3>
                <p className="text-slate-500 mb-3">
                  Directives are written directly in the <strong>Slide Notes</strong> panel in PowerPoint. They instruct the engine how to dynamically clone or conditionally remove slides.
                </p>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-blue-900 text-xs px-2 py-0.5 rounded bg-blue-100 border border-blue-200">
                        @repeat &lt;list&gt; per=N
                      </span>
                      <span className="text-xs text-blue-800 font-semibold">Slide Multiplication</span>
                    </div>
                    <p className="text-xs text-blue-900">
                      Repeats the slide for each chunk of N items in the list.
                    </p>
                    <div className="bg-white p-3 rounded-lg border border-blue-200 font-mono text-[11px] text-slate-800">
                      @repeat presenters per=1<br />
                      <span className="text-slate-400">// Clones slide once for every active presenter (e.g. 19 slides for 19 presenters)</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-blue-200 font-mono text-[11px] text-slate-800">
                      @repeat rotation per=2<br />
                      <span className="text-slate-400">// Displays 2 upcoming speaker dates per slide</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-rose-900 text-xs px-2 py-0.5 rounded bg-rose-100 border border-rose-200">
                        @if &lt;condition&gt;
                      </span>
                      <span className="text-xs text-rose-800 font-semibold">Conditional Slide Inclusion</span>
                    </div>
                    <p className="text-xs text-rose-900">
                      Keeps the slide only if the condition evaluates to true or the list contains items; otherwise cleanly purges the slide and all relationships from the PPTX package.
                    </p>
                    <div className="bg-white p-3 rounded-lg border border-rose-200 font-mono text-[11px] text-slate-800">
                      @if #events<br />
                      <span className="text-slate-400">// Only includes chapter events slide if there are upcoming events</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-rose-200 font-mono text-[11px] text-slate-800">
                      @if feature_speaker_2<br />
                      <span className="text-slate-400">// Includes 2nd feature presentation intro only if a 2nd speaker is scheduled</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'images' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Image Slot Replacement</h3>
              <p className="text-slate-500 mb-3">
                In PowerPoint, right-click any picture shape and set its <strong>Alt Text</strong> or <strong>Shape Name</strong> in the Selection Pane to one of the following tags:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                  <div className="font-mono font-bold text-slate-900 text-xs">{"{{card}}"} or {"{{member_card}}"}</div>
                  <p className="text-[11px] text-slate-500">
                    Replaced with the member's business card PNG/JPG on repeated presenter slides.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                  <div className="font-mono font-bold text-slate-900 text-xs">{"{{photo}}"} or {"{{member_photo}}"}</div>
                  <p className="text-[11px] text-slate-500">
                    Replaced with the member's cropped portrait photo on feature speaker intro slides.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                  <div className="font-mono font-bold text-slate-900 text-xs">{"{{lib.white_lion}}"}</div>
                  <p className="text-[11px] text-slate-500">
                    Library image stored in chapter database (e.g. Chapter Logo, Mascots, Sponsor Banners).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                  <div className="font-mono font-bold text-slate-900 text-xs">{"{{img.events}}"} / {"{{img.thought}}"}</div>
                  <p className="text-[11px] text-slate-500">
                    Weekly uploaded graphics or screenshots for Chapter Events, Thought of the Day, or VP notices.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'architecture' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Architecture & Guarantee</h3>
              <p className="text-slate-500 leading-relaxed">
                The BNI Weekly Deck Builder operates under strict architectural principles designed for zero visual degradation:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1">
                  <div className="flex items-center space-x-2 text-emerald-800 font-semibold">
                    <CheckCircle className="w-4 h-4" />
                    <span>Pure DOMParser XML Mutation</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    No canvas redrawing or HTML-to-PPTX conversion. The engine unzips the genuine PowerPoint archive and parses XML elements with full XML namespace fidelity.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1">
                  <div className="flex items-center space-x-2 text-emerald-800 font-semibold">
                    <CheckCircle className="w-4 h-4" />
                    <span>Exact Preservation</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Slide master layouts, color palettes, custom fonts, morph transitions, embedded video files, audio tracks, and vector shapes remain 100% byte-exact.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1">
                  <div className="flex items-center space-x-2 text-emerald-800 font-semibold">
                    <CheckCircle className="w-4 h-4" />
                    <span>100% Client-Side Privacy</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    All templates, member cards, photos, and generated presentations are stored in your browser's IndexedDB. No presentation data is ever uploaded to a 3rd party server.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1">
                  <div className="flex items-center space-x-2 text-emerald-800 font-semibold">
                    <CheckCircle className="w-4 h-4" />
                    <span>Safe In-Browser Download</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Generates valid OpenXML PowerPoint files (.pptx) ready for direct presentation playback in Microsoft PowerPoint, Apple Keynote, and Google Slides.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            BNI Believers Chapter • PowerPoint Automation Engine
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
