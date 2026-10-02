/**
 * Pure Engine Module: buildDeckPlan
 * Generates an ordered plan of all slides in the final deck:
 * - Includes kept slides, expanded/cloned repeat slides, and removed slides (@if)
 * - Identifies text values to be written into every tag
 * - Maps image slots to their resolved Blobs (member cards, feature pages, library images, meeting images)
 * - Computes the top summary: e.g. "114 slides: 19 presenters, 2 feature intros, 12 feature pages"
 */

import type {
  TemplateMap,
  SlideInfo,
  Meeting,
  Member,
  Role,
  ScheduleEntry,
  LibraryImage,
  ChapterSettings,
  ResolutionResult,
} from '../types';

export interface PlannedTextTag {
  tag: string;
  fieldKey: string;
  resolvedValue: string;
}

export interface PlannedImageSlot {
  shapeName: string;
  tagKey: string;
  blob?: Blob;
  previewUrl?: string;
  sourceType: 'member_card' | 'member_photo' | 'library' | 'meeting_image' | 'feature_deck' | 'unknown';
  label: string;
}

export interface PlannedSlide {
  status: 'kept' | 'cloned' | 'removed';
  originalSlideNumber: number;
  outputSlideNumber: number | null; // null if removed
  title: string;
  category?: string;
  directiveSummary?: string;
  removeReason?: string;
  cloneInfo?: {
    listName: string;
    itemIndex: number;
    totalItems: number;
    chunkIndex: number;
    totalChunks: number;
    itemSummary: string;
  };
  textValues: PlannedTextTag[];
  imageSlots: PlannedImageSlot[];
}

export interface DeckPlanResult {
  slides: PlannedSlide[];
  totalsSummary: string;
  stats: {
    totalOriginalSlides: number;
    totalOutputSlides: number;
    totalRemovedSlides: number;
    totalClonedSlides: number;
    presentersCount: number;
    featureIntrosCount: number;
    featurePagesCount: number;
    rotationSlotsCount: number;
  };
}

export function buildDeckPlan(
  templateMap: TemplateMap,
  resolutionResult: ResolutionResult,
  meeting: Meeting,
  members: Member[],
  roles: Role[],
  schedule: ScheduleEntry[],
  library: LibraryImage[],
  settings: ChapterSettings
): DeckPlanResult {
  const membersMap = new Map<string, Member>();
  members.forEach((m) => membersMap.set(m.id, m));

  const libraryMap = new Map<string, LibraryImage>();
  library.forEach((l) => libraryMap.set(l.key.toLowerCase(), l));

  // Determine which lists are available
  const presentersList =
    resolutionResult.lists['presenters'] ||
    meeting.lists['#presenters'] ||
    meeting.lists['presenters'] ||
    [];

  const featuresList =
    resolutionResult.lists['features'] ||
    meeting.lists['#features'] ||
    meeting.lists['features'] ||
    [];

  const rotationList =
    resolutionResult.lists['rotation'] ||
    meeting.lists['#rotation'] ||
    meeting.lists['rotation'] ||
    [];

  const featureDeckList =
    meeting.lists['#feature_deck'] ||
    meeting.lists['feature_deck'] ||
    [];

  // 1. Identify slides to remove by @if
  const removedSlideNumbers = new Set<number>();
  const removeReasons = new Map<number, string>();

  for (const slide of templateMap.slides) {
    for (const dir of slide.notesDirectives) {
      if (dir.name === 'if' && dir.target) {
        const cleanTarget = dir.target.replace(/^#/, '');
        let keep = true;
        let reason = '';

        if (resolutionResult.lists[cleanTarget] !== undefined) {
          const listLen = resolutionResult.lists[cleanTarget].length;
          keep = listLen > 0;
          if (!keep) {
            reason = `Condition "@if #${cleanTarget}" evaluated to false (empty list with 0 items)`;
          }
        } else if (resolutionResult.values[dir.target] !== undefined) {
          const val = String(resolutionResult.values[dir.target]).toLowerCase().trim();
          keep = val !== 'false' && val !== '0' && val !== 'no' && val !== '';
          if (!keep) {
            reason = `Condition "@if ${dir.target}" is empty or false`;
          }
        } else {
          const flagVal = String(resolutionResult.values[`flags.${cleanTarget}`] || '').toLowerCase().trim();
          keep = flagVal === 'true' || flagVal === '1' || flagVal === 'yes';
          if (!keep) {
            reason = `Flag "flags.${cleanTarget}" is not set or false`;
          }
        }

        if (!keep) {
          removedSlideNumbers.add(slide.slideNumber);
          removeReasons.set(slide.slideNumber, reason);
        }
      }
    }
  }

  // 2. Build ordered list of planned slides
  const plannedSlides: PlannedSlide[] = [];
  let currentOutputIndex = 1;

  for (let i = 0; i < templateMap.slides.length; i++) {
    const slide = templateMap.slides[i];
    const originalNum = slide.slideNumber;

    // Check if removed
    if (removedSlideNumbers.has(originalNum)) {
      plannedSlides.push({
        status: 'removed',
        originalSlideNumber: originalNum,
        outputSlideNumber: null,
        title: slide.title || `Slide ${originalNum}`,
        directiveSummary: slide.notesDirectives.map((d) => d.raw).join('; '),
        removeReason: removeReasons.get(originalNum) || 'Removed by @if directive',
        textValues: [],
        imageSlots: [],
      });
      continue;
    }

    // Check for @repeat directive
    const repeatDir = slide.notesDirectives.find((d) => d.name === 'repeat');
    if (repeatDir && repeatDir.target) {
      const cleanTarget = repeatDir.target.replace(/^#/, '');
      const per = parseInt(repeatDir.args.per || '1', 10) || 1;

      let listItems: any[] = [];
      if (cleanTarget === 'presenters') listItems = presentersList;
      else if (cleanTarget === 'features') listItems = featuresList;
      else if (cleanTarget === 'rotation') listItems = rotationList;
      else if (cleanTarget === 'feature_deck') listItems = featureDeckList;
      else if (resolutionResult.lists[cleanTarget]) listItems = resolutionResult.lists[cleanTarget];
      else if (meeting.lists[`#${cleanTarget}`]) listItems = meeting.lists[`#${cleanTarget}`];

      const totalItems = listItems.length;
      const totalChunks = Math.max(1, Math.ceil(totalItems / per));

      if (totalItems === 0) {
        // Zero items repeat slide
        plannedSlides.push({
          status: 'cloned',
          originalSlideNumber: originalNum,
          outputSlideNumber: currentOutputIndex++,
          title: slide.title || `Slide ${originalNum} (${cleanTarget})`,
          directiveSummary: `@repeat #${cleanTarget} per=${per}`,
          cloneInfo: {
            listName: cleanTarget,
            itemIndex: 0,
            totalItems: 0,
            chunkIndex: 0,
            totalChunks: 1,
            itemSummary: 'Empty list (no items)',
          },
          textValues: [],
          imageSlots: [],
        });
        continue;
      }

      for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
        const chunkItems = listItems.slice(chunkIdx * per, (chunkIdx + 1) * per);

        // Summarize items in this chunk
        const itemSummaries = chunkItems.map((item, idx) => {
          if (cleanTarget === 'presenters') {
            return `${item.name || 'Member'} (${item.category || item.company || 'Presenter'})`;
          }
          if (cleanTarget === 'features') {
            return `${item.name || 'Speaker'}: ${item.topic || 'Presentation'}`;
          }
          if (cleanTarget === 'rotation') {
            return `Date ${item.date || 'TBD'}: ${item.speaker_1 || 'TBD'} & ${item.speaker_2 || 'TBD'}`;
          }
          return typeof item === 'object' ? item.name || item.title || JSON.stringify(item) : String(item);
        });

        // Determine text values for this chunk
        const textValues: PlannedTextTag[] = [];
        for (const tSpan of slide.textTags) {
          const rawTag = tSpan.tag;
          let val = resolutionResult.values[tSpan.key] || '';

          // If repeated tag belongs to this list slot
          if (cleanTarget === 'presenters' && chunkItems.length > 0) {
            const first = chunkItems[0];
            if (rawTag.includes('name')) val = first.name || val;
            else if (rawTag.includes('category')) val = first.category || val;
            else if (rawTag.includes('company')) val = first.company || val;
          } else if (cleanTarget === 'features' && chunkItems.length > 0) {
            const first = chunkItems[0];
            if (rawTag.includes('name')) val = first.name || val;
            else if (rawTag.includes('topic')) val = first.topic || val;
            else if (rawTag.includes('category')) val = first.category || val;
          }

          textValues.push({
            tag: rawTag,
            fieldKey: tSpan.key,
            resolvedValue: val,
          });
        }

        // Determine image slots for this chunk
        const imageSlots: PlannedImageSlot[] = [];
        for (const slot of slide.imageSlots) {
          let blob: Blob | undefined;
          let previewUrl: string | undefined;
          let sourceType: PlannedImageSlot['sourceType'] = 'unknown';
          let label = slot.shapeName || slot.key;

          if (cleanTarget === 'presenters' && chunkItems.length > 0) {
            const first = chunkItems[0];
            const mem = membersMap.get(first.memberId || '');
            if (mem?.cardBlob) {
              blob = mem.cardBlob;
              sourceType = 'member_card';
              label = `Member Card: ${first.name}`;
            } else if (first.cardBlob) {
              blob = first.cardBlob;
              sourceType = 'member_card';
              label = `Member Card: ${first.name}`;
            }
          } else if (cleanTarget === 'features' && chunkItems.length > 0) {
            const first = chunkItems[0];
            const mem = membersMap.get(first.memberId || '');
            if (mem?.photoBlob) {
              blob = mem.photoBlob;
              sourceType = 'member_photo';
              label = `Speaker Photo: ${first.name}`;
            }
          } else if (cleanTarget === 'feature_deck' && chunkItems.length > 0) {
            const first = chunkItems[0];
            blob = first.blob || first;
            sourceType = 'feature_deck';
            label = `Feature Page: Slide ${chunkIdx + 1}`;
          }

          if (!blob && slot.key) {
            blob = resolutionResult.images[slot.key];
          }

          imageSlots.push({
            shapeName: slot.shapeName,
            tagKey: slot.key,
            blob,
            previewUrl,
            sourceType,
            label,
          });
        }

        plannedSlides.push({
          status: 'cloned',
          originalSlideNumber: originalNum,
          outputSlideNumber: currentOutputIndex++,
          title: `${slide.title || `Slide ${originalNum}`} [${chunkIdx + 1}/${totalChunks}]`,
          category: cleanTarget,
          directiveSummary: `@repeat #${cleanTarget} per=${per}`,
          cloneInfo: {
            listName: cleanTarget,
            itemIndex: chunkIdx * per,
            totalItems,
            chunkIndex: chunkIdx,
            totalChunks,
            itemSummary: itemSummaries.join(', '),
          },
          textValues,
          imageSlots,
        });
      }

      continue;
    }

    // Standard kept slide
    const textValues: PlannedTextTag[] = slide.textTags.map((tSpan) => ({
      tag: tSpan.tag,
      fieldKey: tSpan.key,
      resolvedValue: resolutionResult.values[tSpan.key] || resolutionResult.values[tSpan.tag] || '',
    }));

    const imageSlots: PlannedImageSlot[] = slide.imageSlots.map((slot) => {
      let blob: Blob | undefined;
      let sourceType: PlannedImageSlot['sourceType'] = 'unknown';
      let label = slot.shapeName || slot.key;

      const cleanKey = slot.key.replace(/^\{\{|\}\}$/g, '').trim();

      if (resolutionResult.images[cleanKey]) {
        blob = resolutionResult.images[cleanKey];
        sourceType = cleanKey.startsWith('lib.') ? 'library' : 'meeting_image';
        label = `Image: ${cleanKey}`;
      } else if (cleanKey.startsWith('lib.')) {
        const libItem = libraryMap.get(cleanKey.toLowerCase());
        if (libItem?.currentBlob) {
          blob = libItem.currentBlob;
          sourceType = 'library';
          label = `Library: ${libItem.name}`;
        }
      } else {
        const meetingImg = meeting.images?.[cleanKey];
        if (meetingImg) {
          blob = meetingImg.blob || meetingImg;
          sourceType = 'meeting_image';
          label = `Meeting Image: ${cleanKey}`;
        }
      }

      return {
        shapeName: slot.shapeName,
        tagKey: slot.key,
        blob,
        sourceType,
        label,
      };
    });

    plannedSlides.push({
      status: 'kept',
      originalSlideNumber: originalNum,
      outputSlideNumber: currentOutputIndex++,
      title: slide.title || `Slide ${originalNum}`,
      directiveSummary: slide.notesDirectives.map((d) => d.raw).join('; '),
      textValues,
      imageSlots,
    });
  }

  // 3. Calculate statistics & totals summary
  const totalOutputSlides = currentOutputIndex - 1;
  const totalRemovedSlides = plannedSlides.filter((s) => s.status === 'removed').length;
  const totalClonedSlides = plannedSlides.filter((s) => s.status === 'cloned').length;

  const presentersCount = presentersList.length;
  const featureIntrosCount = featuresList.length;
  const featurePagesCount = featureDeckList.length;
  const rotationSlotsCount = rotationList.length;

  // Format exact string specified in requirements:
  // "Totals at the top: '114 slides: 19 presenters, 2 feature intros, 12 feature pages'. Label it as a content preview, not a rendering."
  const summaryParts: string[] = [];
  if (presentersCount > 0) {
    summaryParts.push(`${presentersCount} ${presentersCount === 1 ? 'presenter' : 'presenters'}`);
  }
  if (featureIntrosCount > 0) {
    summaryParts.push(`${featureIntrosCount} ${featureIntrosCount === 1 ? 'feature intro' : 'feature intros'}`);
  }
  if (featurePagesCount > 0) {
    summaryParts.push(`${featurePagesCount} ${featurePagesCount === 1 ? 'feature page' : 'feature pages'}`);
  }
  if (rotationSlotsCount > 0) {
    summaryParts.push(`${rotationSlotsCount} rotation slots`);
  }

  const totalsSummary =
    summaryParts.length > 0
      ? `${totalOutputSlides} slides: ${summaryParts.join(', ')}`
      : `${totalOutputSlides} slides`;

  return {
    slides: plannedSlides,
    totalsSummary,
    stats: {
      totalOriginalSlides: templateMap.slides.length,
      totalOutputSlides,
      totalRemovedSlides,
      totalClonedSlides,
      presentersCount,
      featureIntrosCount,
      featurePagesCount,
      rotationSlotsCount,
    },
  };
}
