/**
 * Pure Engine Function: resolve
 * Deterministically resolves template fields, formats, dynamic lists, library images,
 * and audits all issues against chapter data.
 * Pure TypeScript, no React dependencies.
 */

import type {
  TemplateMap,
  Meeting,
  Member,
  Role,
  ScheduleEntry,
  LibraryImage,
  ChapterSettings,
} from '../types';
import {
  parseIndianNumber,
  formatIndianGrouping,
  formatInr,
  formatInrLakh,
  formatInrCr,
  formatPct,
} from '../utils/indianNumberFormat';
import { formatDatePattern } from '../utils/dateFormat';

export interface ResolutionIssue {
  id: string;
  category:
    | 'Meeting'
    | 'VP Report'
    | 'Weekly Report'
    | 'Statistics'
    | 'Presenters'
    | 'Feature'
    | 'Rotation'
    | 'Images'
    | 'General';
  severity: 'error' | 'warning';
  fieldKey?: string;
  slideNumber?: number;
  message: string;
}

export interface ResolutionResult {
  values: Record<string, string>;
  lists: Record<string, any[]>;
  images: Record<string, Blob>;
  issues: ResolutionIssue[];
  isValid: boolean;
}

/**
 * Assigns category for an issue based on field key or list name
 */
function getIssueCategory(keyOrList: string): ResolutionIssue['category'] {
  const lower = keyOrList.toLowerCase();
  if (lower.startsWith('meeting')) return 'Meeting';
  if (lower.startsWith('vp')) return 'VP Report';
  if (lower.startsWith('weekly')) return 'Weekly Report';
  if (lower.startsWith('global') || lower.startsWith('india') || lower.startsWith('region') || lower.startsWith('monthly')) {
    return 'Statistics';
  }
  if (lower.includes('presenter')) return 'Presenters';
  if (lower.includes('feature')) return 'Feature';
  if (lower.includes('rotation')) return 'Rotation';
  if (lower.includes('img') || lower.startsWith('lib') || lower.includes('banner') || lower.includes('photo') || lower.includes('card')) {
    return 'Images';
  }
  return 'General';
}

/**
 * Applies pipe formats to raw value
 */
export function applyFieldFormats(rawValue: unknown, formats: string[]): string {
  if (rawValue === null || rawValue === undefined) return '';
  let str = String(rawValue).trim();
  if (str === '') return '';

  for (const fmt of formats) {
    if (fmt === 'num') {
      const parsedNum = parseIndianNumber(str);
      if (parsedNum !== null) {
        str = formatIndianGrouping(parsedNum);
      }
    } else if (fmt === 'inr') {
      const parsedNum = parseIndianNumber(str);
      if (parsedNum !== null) {
        str = formatInr(parsedNum);
      }
    } else if (fmt === 'inr_lakh') {
      const parsedNum = parseIndianNumber(str);
      if (parsedNum !== null) {
        str = formatInrLakh(parsedNum);
      }
    } else if (fmt === 'inr_cr') {
      const parsedNum = parseIndianNumber(str);
      if (parsedNum !== null) {
        str = formatInrCr(parsedNum);
      }
    } else if (fmt === 'pct') {
      const parsedNum = parseIndianNumber(str);
      if (parsedNum !== null) {
        str = formatPct(parsedNum);
      }
    } else if (fmt === 'upper') {
      str = str.toUpperCase();
    } else if (fmt === 'lower') {
      str = str.toLowerCase();
    } else if (fmt === 'title') {
      str = str.replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
      );
    } else if (fmt.startsWith('date:')) {
      const pattern = fmt.substring(5).trim();
      str = formatDatePattern(str, pattern);
    }
  }

  return str;
}

export function resolve(
  templateMap: TemplateMap,
  meeting: Meeting,
  members: Member[],
  roles: Role[],
  schedule: ScheduleEntry[],
  library: LibraryImage[],
  settings: ChapterSettings
): ResolutionResult {
  const resolvedValues: Record<string, string> = {};
  const resolvedImages: Record<string, Blob> = {};
  const issues: ResolutionIssue[] = [];

  const membersMap = new Map<string, Member>();
  members.forEach((m) => membersMap.set(m.id, m));

  const libraryMap = new Map<string, LibraryImage>();
  library.forEach((l) => libraryMap.set(l.key, l));

  // 1. Resolve library images (lib.*)
  for (const libKey of templateMap.libraryImages) {
    const libImg = libraryMap.get(libKey);
    if (libImg?.currentBlob) {
      resolvedImages[libKey] = libImg.currentBlob;
    } else {
      issues.push({
        id: `missing-lib-${libKey}`,
        category: 'Images',
        severity: 'error',
        fieldKey: libKey,
        message: `Library image "${libKey}" has no media uploaded or seeded in Slide Library.`,
      });
    }
  }

  // 2. Resolve template fields and check validations
  for (const field of templateMap.fields) {
    const key = field.key;
    const isLib = field.group === 'lib';
    const isList = field.kind === 'list';
    const isImage = field.kind === 'image';

    if (isLib || isList) continue; // Handled separately

    if (isImage) {
      // Check if image blob exists in meeting.images
      const meetingImg = (meeting as any).images?.[key]?.blob || (meeting as any).images?.[key];
      if (meetingImg instanceof Blob) {
        resolvedImages[key] = meetingImg;
      } else if (!field.optional) {
        issues.push({
          id: `missing-image-${key}`,
          category: getIssueCategory(key),
          severity: 'error',
          fieldKey: key,
          slideNumber: field.slides[0],
          message: `Image slot "${field.name}" is missing an uploaded image.`,
        });
      }
      continue;
    }

    // Text / Number / Date fields
    const rawVal = meeting.values[key];
    const hasValue = rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '';

    if (!hasValue) {
      if (!field.optional) {
        issues.push({
          id: `required-${key}`,
          category: getIssueCategory(key),
          severity: 'error',
          fieldKey: key,
          slideNumber: field.slides[0],
          message: `Required field "${key}" has no value entered.`,
        });
      }
      resolvedValues[key] = '';
      continue;
    }

    // Number validation
    if (field.kind === 'number') {
      const parsed = parseIndianNumber(rawVal);
      if (parsed === null) {
        issues.push({
          id: `invalid-number-${key}`,
          category: getIssueCategory(key),
          severity: 'error',
          fieldKey: key,
          slideNumber: field.slides[0],
          message: `Field "${key}" must be a valid number (e.g. 7.34L, 1.2 Cr, or 50,000).`,
        });
      }
    }

    // Max length validation
    if (field.maxLength !== null && String(rawVal).length > field.maxLength) {
      issues.push({
        id: `max-length-${key}`,
        category: getIssueCategory(key),
        severity: 'warning',
        fieldKey: key,
        slideNumber: field.slides[0],
        message: `Field "${key}" exceeds recommended maximum of ${field.maxLength} characters (${String(rawVal).length} chars entered).`,
      });
    }

    // Apply formats
    const formatted = applyFieldFormats(rawVal, field.formats);
    resolvedValues[key] = formatted;
  }

  // 3. Resolve Special and Generic Lists
  const resolvedLists: Record<string, any[]> = {};

  for (const listName of Object.keys(templateMap.lists)) {
    const listKey = `#${listName}`;
    const listItems = meeting.lists[listKey] || meeting.lists[listName] || [];
    resolvedLists[listName] = listItems;

    // Check empty list on slide without @if
    if (listItems.length === 0) {
      for (const slideNum of templateMap.lists[listName].slides) {
        const slide = templateMap.slides.find((s) => s.slideNumber === slideNum);
        const hasIfDirective = slide?.notesDirectives.some(
          (d) => d.name === 'if' && d.target.includes(listName)
        );

        if (!hasIfDirective) {
          issues.push({
            id: `empty-list-${listName}-slide-${slideNum}`,
            category: getIssueCategory(listName),
            severity: 'error',
            slideNumber: slideNum,
            message: `List "#${listName}" has 0 items on Slide #${slideNum}, and slide does not have an "@if ${listName}" directive. Slide will be blank.`,
          });
        }
      }
    }

    // Validate special lists
    if (listName === 'presenters') {
      for (const presenter of listItems) {
        const memberId = String(presenter.memberId || presenter.id || '');
        const member = membersMap.get(memberId);
        const memberName = member?.name || presenter.name || 'Member';

        if (member && !member.cardBlob && !presenter.cardBlob) {
          issues.push({
            id: `presenter-no-card-${memberId}`,
            category: 'Presenters',
            severity: 'warning',
            message: `Presenter "${memberName}" does not have a 16:9 "Now Presenting" card.`,
          });
        }
      }
    } else if (listName === 'features') {
      for (const feature of listItems) {
        const memberId = String(feature.memberId || feature.id || '');
        const member = membersMap.get(memberId);
        const memberName = member?.name || feature.name || 'Feature Speaker';

        if (member && !member.photoBlob && !feature.photoBlob) {
          issues.push({
            id: `feature-no-photo-${memberId}`,
            category: 'Feature',
            severity: 'warning',
            message: `Feature Presenter "${memberName}" does not have a profile photo.`,
          });
        }
      }
    } else if (listName === 'rotation') {
      if (listItems.length < 6) {
        issues.push({
          id: `rotation-less-than-6`,
          category: 'Rotation',
          severity: 'warning',
          message: `Upcoming speaker rotation has only ${listItems.length} meetings scheduled (6 recommended).`,
        });
      }
    }
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;

  return {
    values: resolvedValues,
    lists: resolvedLists,
    images: resolvedImages,
    issues,
    isValid: errorCount === 0,
  };
}
