/**
 * BNI Weekly Deck Builder - Template Reader Engine
 * Pure TypeScript functions, no React dependencies.
 * Uses DOMParser and JSZip to deterministically read OpenXML template.
 */

import JSZip from 'jszip';
import type {
  TemplateMap,
  SlideInfo,
  Field,
  ListSpec,
  ImageSlotInfo,
  TagRunSpan,
  DirectiveInfo,
  TemplateWarning,
  FieldKind,
} from '../types';

// XML Namespaces
export const NS = {
  P: 'http://schemas.openxmlformats.org/presentationml/2006/main',
  A: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  R: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  PKG_REL: 'http://schemas.openxmlformats.org/package/2006/relationships',
};

const VALID_FORMAT_NAMES = new Set([
  'num',
  'inr',
  'inr_lakh',
  'inr_cr',
  'pct',
  'upper',
  'lower',
  'title',
  'optional',
  'contain',
]);

/**
 * Helper to query elements by local name across namespaces reliably
 */
export function getElementsByLocalName(parent: Element | Document, localName: string): Element[] {
  const result: Element[] = [];
  const all = parent.getElementsByTagName('*');
  const target = localName.toLowerCase();
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    if (el.localName && el.localName.toLowerCase() === target) {
      result.push(el);
    }
  }
  return result;
}

/**
 * Helper to get direct children by local name
 */
export function getChildrenByLocalName(parent: Element, localName: string): Element[] {
  const result: Element[] = [];
  const target = localName.toLowerCase();
  for (let i = 0; i < parent.children.length; i++) {
    const el = parent.children[i];
    if (el.localName && el.localName.toLowerCase() === target) {
      result.push(el);
    }
  }
  return result;
}

/**
 * Resolves relative path inside zip (e.g. "ppt/slides", "../notesSlides/notesSlide1.xml" -> "ppt/notesSlides/notesSlide1.xml")
 */
export function resolveRelativePath(baseDir: string, relativePath: string): string {
  const cleanedRelative = relativePath.replace(/^\//, '');
  if (!cleanedRelative.startsWith('..')) {
    return `${baseDir}/${cleanedRelative}`.replace(/\/+/g, '/');
  }

  const baseParts = baseDir.split('/').filter(Boolean);
  const relParts = cleanedRelative.split('/');

  for (const part of relParts) {
    if (part === '..') {
      baseParts.pop();
    } else if (part !== '.') {
      baseParts.push(part);
    }
  }
  return baseParts.join('/');
}

export interface ProgressCallback {
  (percent: number, message: string): void;
}

/**
 * Parses and validates a tag string e.g. "{{meeting.date | date:Do MMM YYYY}}"
 */
export function parseTagExpression(rawTagWithBraces: string): {
  cleanTag: string;
  key: string;
  group: string;
  name: string;
  formats: string[];
  optional: boolean;
  maxLength: number | null;
  listName?: string;
  slotNumber?: number;
  subField?: string;
  formatWarnings: string[];
} {
  // Strip outer {{ and }}
  const cleanTag = rawTagWithBraces.replace(/^\{\{\s*/, '').replace(/\s*\}\}$/, '').trim();
  const parts = cleanTag.split('|').map((p) => p.trim()).filter(Boolean);
  const tagIdentifier = parts[0] || '';
  const formatTokens = parts.slice(1);

  const formatWarnings: string[] = [];
  let optional = false;
  let maxLength: number | null = null;
  const validFormats: string[] = [];

  for (const fmt of formatTokens) {
    if (fmt === 'optional') {
      optional = true;
      validFormats.push(fmt);
    } else if (/^max:\d+$/.test(fmt)) {
      const match = fmt.match(/^max:(\d+)$/);
      if (match) {
        maxLength = parseInt(match[1], 10);
      }
      validFormats.push(fmt);
    } else if (fmt.startsWith('date:')) {
      const pattern = fmt.substring(5).trim();
      if (!pattern) {
        formatWarnings.push(`Empty date pattern in format "${fmt}"`);
      } else {
        validFormats.push(fmt);
      }
    } else if (VALID_FORMAT_NAMES.has(fmt)) {
      validFormats.push(fmt);
    } else {
      formatWarnings.push(`Unknown format "${fmt}"`);
      validFormats.push(fmt); // Keep for inspection
    }
  }

  // Parse tag identifier: group.field or #list.N.field or #list.field
  let group = '';
  let name = '';
  let listName: string | undefined;
  let slotNumber: number | undefined;
  let subField: string | undefined;

  if (tagIdentifier.startsWith('#')) {
    // List tag: e.g. #rotation.3.speaker_1 or #presenters.1.card
    const dotParts = tagIdentifier.substring(1).split('.');
    listName = dotParts[0];
    group = `#${listName}`;

    if (dotParts.length >= 3 && /^\d+$/.test(dotParts[1])) {
      slotNumber = parseInt(dotParts[1], 10);
      subField = dotParts.slice(2).join('.');
      name = subField;
    } else if (dotParts.length >= 2) {
      subField = dotParts.slice(1).join('.');
      name = subField;
    } else {
      name = dotParts[0] || '';
    }
  } else {
    // Standard tag: e.g. meeting.date, vp.referrals, lib.white_lion
    const dotIndex = tagIdentifier.indexOf('.');
    if (dotIndex > 0) {
      group = tagIdentifier.substring(0, dotIndex);
      name = tagIdentifier.substring(dotIndex + 1);
    } else {
      group = 'global';
      name = tagIdentifier;
    }
  }

  const normalizedKey = listName && subField
    ? `#${listName}.${subField}`
    : `${group}.${name}`;

  return {
    cleanTag,
    key: normalizedKey,
    group,
    name,
    formats: validFormats,
    optional,
    maxLength,
    listName,
    slotNumber,
    subField,
    formatWarnings,
  };
}

/**
 * Extracts and maps all tags, image slots, and speaker notes directives from a PPTX file.
 */
export async function readTemplate(
  pptxData: Blob | ArrayBuffer | Uint8Array,
  fileName: string = 'template.pptx',
  onProgress?: ProgressCallback
): Promise<TemplateMap> {
  const domParser = new DOMParser();

  onProgress?.(5, 'Opening PPTX archive...');
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(pptxData);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read PPTX file: Not a valid ZIP or file is corrupted. (${errorMsg})`);
  }

  // Verify PPTX structure
  const presFile = zip.file('ppt/presentation.xml');
  const presRelsFile = zip.file('ppt/_rels/presentation.xml.rels');
  if (!presFile || !presRelsFile) {
    throw new Error('Invalid PowerPoint template: Missing ppt/presentation.xml or relationship file.');
  }

  onProgress?.(15, 'Reading presentation structure & slide order...');
  const presXmlText = await presFile.async('text');
  const presRelsXmlText = await presRelsFile.async('text');

  const presDoc = domParser.parseFromString(presXmlText, 'application/xml');
  if (presDoc.querySelector('parsererror')) {
    throw new Error('XML parsing error in ppt/presentation.xml');
  }

  const presRelsDoc = domParser.parseFromString(presRelsXmlText, 'application/xml');
  if (presRelsDoc.querySelector('parsererror')) {
    throw new Error('XML parsing error in ppt/_rels/presentation.xml.rels');
  }

  // Map presentation.xml.rels: rId -> target
  const relMap = new Map<string, string>();
  const relElements = getElementsByLocalName(presRelsDoc, 'Relationship');
  for (const rel of relElements) {
    const id = rel.getAttribute('Id');
    const target = rel.getAttribute('Target');
    if (id && target) {
      relMap.set(id, target);
    }
  }

  // Find slide IDs in exact presentation order from <p:sldIdLst>
  const sldIdList = getElementsByLocalName(presDoc, 'sldId');
  if (sldIdList.length === 0) {
    throw new Error('No slides found in ppt/presentation.xml (sldIdLst is empty).');
  }

  const warnings: TemplateWarning[] = [];
  const slideInfos: SlideInfo[] = [];

  // Check Slide Masters and Slide Layouts for misplaced tags
  onProgress?.(25, 'Auditing slide masters and layouts...');
  const masterAndLayoutFiles = Object.keys(zip.files).filter(
    (f) => f.startsWith('ppt/slideMasters/') || f.startsWith('ppt/slideLayouts/')
  );

  for (const layoutPath of masterAndLayoutFiles) {
    if (!layoutPath.endsWith('.xml')) continue;
    const file = zip.file(layoutPath);
    if (!file) continue;
    const xml = await file.async('text');
    const tagMatches = xml.match(/\{\{([^{}]+)\}\}/g);
    if (tagMatches && tagMatches.length > 0) {
      for (const rawTag of tagMatches) {
        warnings.push({
          id: `master-${layoutPath}-${rawTag}`,
          tag: rawTag,
          code: 'TAG_IN_MASTER_LAYOUT',
          severity: 'warning',
          message: `Tag "${rawTag}" found in master/layout file "${layoutPath}". Tags should only be on presentation slides.`,
        });
      }
    }
  }

  // Iterate over each slide in presentation order
  const totalSlides = sldIdList.length;
  onProgress?.(30, `Analyzing ${totalSlides} slides...`);

  for (let i = 0; i < totalSlides; i++) {
    const slideNumber = i + 1;
    const sldIdEl = sldIdList[i];
    const sldId = sldIdEl.getAttribute('id') || `slide_${slideNumber}`;
    const rId = sldIdEl.getAttribute('r:id') || sldIdEl.getAttribute('id');
    const showAttr = sldIdEl.getAttribute('show');
    const isHidden = showAttr === '0';

    const targetRel = rId ? relMap.get(rId) : undefined;
    if (!targetRel) {
      warnings.push({
        id: `slide-missing-rel-${slideNumber}`,
        slideNumber,
        code: 'CORRUPT_XML',
        severity: 'error',
        message: `Slide ${slideNumber} has r:id "${rId}" which could not be resolved in ppt/_rels/presentation.xml.rels.`,
      });
      continue;
    }

    const slidePath = resolveRelativePath('ppt', targetRel);
    const slideZipFile = zip.file(slidePath);
    if (!slideZipFile) {
      warnings.push({
        id: `slide-missing-file-${slideNumber}`,
        slideNumber,
        code: 'CORRUPT_XML',
        severity: 'error',
        message: `Slide ${slideNumber} target file "${slidePath}" not found in archive.`,
      });
      continue;
    }

    const slideProgress = 30 + Math.round(((i + 1) / totalSlides) * 45);
    onProgress?.(slideProgress, `Inspecting Slide ${slideNumber} of ${totalSlides}...`);

    const slideXmlText = await slideZipFile.async('text');
    const slideDoc = domParser.parseFromString(slideXmlText, 'application/xml');
    if (slideDoc.querySelector('parsererror')) {
      warnings.push({
        id: `slide-xml-error-${slideNumber}`,
        slideNumber,
        code: 'CORRUPT_XML',
        severity: 'error',
        message: `XML syntax error in slide ${slideNumber} (${slidePath}).`,
      });
      continue;
    }

    const slideWarnings: TemplateWarning[] = [];
    const textTags: TagRunSpan[] = [];
    const imageSlots: ImageSlotInfo[] = [];
    const notesDirectives: DirectiveInfo[] = [];

    // --- 1. Detect Text Tags at Paragraph Level (accounting for split <a:r> runs) ---
    const paragraphs = getElementsByLocalName(slideDoc, 'p');

    paragraphs.forEach((p, pIdx) => {
      // Find all runs (<a:r>) inside this paragraph
      const runs = getElementsByLocalName(p, 'r');
      if (runs.length === 0) {
        // Also check if paragraph has direct text or fld
        const fullPText = p.textContent || '';
        checkUnclosedTags(fullPText, slideNumber, slideWarnings);
        return;
      }

      // Map each run's start and end char positions in joined text
      let joinedText = '';
      const runOffsets: Array<{ runIdx: number; startChar: number; endChar: number; text: string }> = [];

      runs.forEach((r, rIdx) => {
        // Find text element <a:t>
        const tEls = getElementsByLocalName(r, 't');
        const rText = tEls.map((t) => t.textContent || '').join('');
        const startChar = joinedText.length;
        joinedText += rText;
        const endChar = joinedText.length;
        runOffsets.push({ runIdx: rIdx, startChar, endChar, text: rText });
      });

      checkUnclosedTags(joinedText, slideNumber, slideWarnings);

      // Find all tag patterns: {{ ... }}
      const tagRegex = /\{\{([^{}]+)\}\}/g;
      let match: RegExpExecArray | null;

      while ((match = tagRegex.exec(joinedText)) !== null) {
        const fullTag = match[0];
        const matchStart = match.index;
        const matchEnd = matchStart + fullTag.length;

        // Find which runs this tag spans
        let startRunIndex = -1;
        let endRunIndex = -1;

        for (const ro of runOffsets) {
          if (ro.startChar <= matchStart && matchStart < ro.endChar) {
            startRunIndex = ro.runIdx;
          }
          if (ro.startChar < matchEnd && matchEnd <= ro.endChar) {
            endRunIndex = ro.runIdx;
          }
        }

        if (startRunIndex === -1 && runOffsets.length > 0) startRunIndex = 0;
        if (endRunIndex === -1 && runOffsets.length > 0) endRunIndex = runOffsets.length - 1;

        const runCount = endRunIndex >= startRunIndex ? endRunIndex - startRunIndex + 1 : 1;

        const parsed = parseTagExpression(fullTag);

        for (const fmtWarn of parsed.formatWarnings) {
          slideWarnings.push({
            id: `fmt-warn-${slideNumber}-${fullTag}-${fmtWarn}`,
            slideNumber,
            tag: fullTag,
            code: 'UNKNOWN_FORMAT',
            severity: 'warning',
            message: `Slide ${slideNumber}: ${fmtWarn} in tag "${fullTag}".`,
          });
        }

        if (runCount > 1) {
          slideWarnings.push({
            id: `split-run-${slideNumber}-${pIdx}-${fullTag}`,
            slideNumber,
            tag: fullTag,
            code: 'SPLIT_RUN_TAG',
            severity: 'info',
            message: `Slide ${slideNumber}: Tag "${fullTag}" is split across ${runCount} text runs (<a:r>). It will be seamlessly joined during generation.`,
          });
        }

        textTags.push({
          tag: fullTag,
          cleanTag: parsed.cleanTag,
          key: parsed.key,
          group: parsed.group,
          formats: parsed.formats,
          paragraphIndex: pIdx,
          startRunIndex,
          endRunIndex,
          runCount,
          text: joinedText,
        });
      }
    });

    // --- Load Slide Relationships first so we can map picture embeds to media files ---
    const slideDir = slidePath.substring(0, slidePath.lastIndexOf('/'));
    const slideFilename = slidePath.substring(slidePath.lastIndexOf('/') + 1);
    const slideRelsPath = `${slideDir}/_rels/${slideFilename}.rels`;
    const slideRelsFile = zip.file(slideRelsPath);
    const slideRelMap = new Map<string, string>();
    let slideRelsDoc: Document | null = null;

    if (slideRelsFile) {
      const slideRelsXml = await slideRelsFile.async('text');
      slideRelsDoc = domParser.parseFromString(slideRelsXml, 'application/xml');
      const rels = getElementsByLocalName(slideRelsDoc, 'Relationship');
      for (const rel of rels) {
        const id = rel.getAttribute('Id');
        const target = rel.getAttribute('Target');
        if (id && target) {
          slideRelMap.set(id, target);
        }
      }
    }

    // --- 2. Detect Image Slots (p:pic where p:cNvPr @name is a tag) ---
    // Rule: Image slot is a picture (p:pic) whose shape name (p:cNvPr @name) is a tag
    const pics = getElementsByLocalName(slideDoc, 'pic');

    for (const pic of pics) {
      // Find <p:cNvPr>
      const cNvPrs = getElementsByLocalName(pic, 'cNvPr');
      if (cNvPrs.length === 0) continue;
      const cNvPr = cNvPrs[0];
      const name = (cNvPr.getAttribute('name') || '').trim();
      const shapeId = cNvPr.getAttribute('id') || '';

      if (/^\{\{.*\}\}$/.test(name)) {
        // Tagged image slot!
        const parsed = parseTagExpression(name);

        for (const fmtWarn of parsed.formatWarnings) {
          slideWarnings.push({
            id: `img-fmt-warn-${slideNumber}-${name}-${fmtWarn}`,
            slideNumber,
            tag: name,
            code: 'UNKNOWN_FORMAT',
            severity: 'warning',
            message: `Slide ${slideNumber} (image slot "${name}"): ${fmtWarn}`,
          });
        }

        // Extract frame size: <p:spPr><a:xfrm><a:ext cx="..." cy="..."/></a:xfrm></p:spPr>
        let cx = 0;
        let cy = 0;
        const exts = getElementsByLocalName(pic, 'ext');
        for (const ext of exts) {
          const cxAttr = ext.getAttribute('cx');
          const cyAttr = ext.getAttribute('cy');
          if (cxAttr && cyAttr) {
            cx = parseInt(cxAttr, 10) || 0;
            cy = parseInt(cyAttr, 10) || 0;
            break;
          }
        }

        // 914400 EMUs = 1 inch = 96 px -> 1 px = 9525 EMUs
        const widthPx = Math.round(cx / 9525);
        const heightPx = Math.round(cy / 9525);
        const aspectRatio = cy > 0 ? Number((cx / cy).toFixed(3)) : 1;

        // Find r:embed relationship to media
        let blipRelId: string | undefined;
        let mediaPath: string | undefined;
        const blips = getElementsByLocalName(pic, 'blip');
        if (blips.length > 0) {
          const blip = blips[0];
          blipRelId = blip.getAttribute('r:embed') || blip.getAttribute('embed') || undefined;
          if (blipRelId && slideRelMap.has(blipRelId)) {
            const target = slideRelMap.get(blipRelId)!;
            mediaPath = resolveRelativePath(slideDir, target);
          }
        }

        imageSlots.push({
          shapeId,
          shapeName: name,
          tag: parsed.cleanTag,
          group: parsed.group,
          key: parsed.key,
          formats: parsed.formats,
          cx,
          cy,
          widthPx,
          heightPx,
          aspectRatio,
          blipRelId,
          mediaPath,
        });
      }
    }

    // --- 3. Warning Check: image-slot names on non-pictures ---
    // Rule: Shape with {{...}} in @name that is NOT inside a <p:pic>
    const allCNvPrs = getElementsByLocalName(slideDoc, 'cNvPr');
    for (const cNvPr of allCNvPrs) {
      const name = (cNvPr.getAttribute('name') || '').trim();
      if (/^\{\{.*\}\}$/.test(name)) {
        // Check if parent or ancestor is a <p:pic>
        let parent: Element | null = cNvPr.parentElement;
        let isPic = false;
        while (parent && parent !== slideDoc.documentElement) {
          if (parent.localName && parent.localName.toLowerCase() === 'pic') {
            isPic = true;
            break;
          }
          parent = parent.parentElement;
        }

        if (!isPic) {
          slideWarnings.push({
            id: `non-pic-image-slot-${slideNumber}-${name}`,
            slideNumber,
            tag: name,
            code: 'NON_PICTURE_IMAGE_TAG',
            severity: 'warning',
            message: `Slide ${slideNumber}: Shape name "${name}" looks like an image tag, but shape is not a Picture (p:pic). Only Picture shapes can receive image replacements.`,
          });
        }
      }
    }

    // --- 4. Speaker Notes & Directives ---
    // Notes slide relation was already mapped in slideRelsFile
    let notesRawText = '';

    if (slideRelsFile) {
      const slideRelsXml = await slideRelsFile.async('text');
      const slideRelsDoc = domParser.parseFromString(slideRelsXml, 'application/xml');
      const rels = getElementsByLocalName(slideRelsDoc, 'Relationship');

      for (const rel of rels) {
        const type = rel.getAttribute('Type') || '';
        const target = rel.getAttribute('Target') || '';
        if (type.includes('notesSlide') && target) {
          const notesPath = resolveRelativePath(slideDir, target);
          const notesZipFile = zip.file(notesPath);
          if (notesZipFile) {
            const notesXml = await notesZipFile.async('text');
            const notesDoc = domParser.parseFromString(notesXml, 'application/xml');
            // Extract text from notesDoc
            const noteParagraphs = getElementsByLocalName(notesDoc, 'p');
            const lines: string[] = [];

            for (const np of noteParagraphs) {
              const lineText = np.textContent?.trim() || '';
              if (lineText) lines.push(lineText);
            }

            notesRawText = lines.join('\n');

            // Parse directives line-by-line
            lines.forEach((line, lineIdx) => {
              if (line.startsWith('@')) {
                const directive = parseDirectiveLine(line, lineIdx + 1);
                if (directive) {
                  notesDirectives.push(directive);
                }
              }
            });
          }
        }
      }
    }

    slideInfos.push({
      slideNumber,
      slideId: sldId,
      rId: rId || '',
      slidePath,
      isHidden,
      textTags,
      imageSlots,
      notesDirectives,
      notesRawText,
      warnings: slideWarnings,
    });

    warnings.push(...slideWarnings);
  }

  onProgress?.(80, 'Aggregating fields, lists, and library images...');

  // --- 5. Build De-duplicated Field List & Lists Spec ---
  const fieldMap = new Map<string, Field>();
  const listSpecs: Record<string, ListSpec> = {};
  const libraryImagesSet = new Set<string>();

  for (const slide of slideInfos) {
    // Process text tags
    for (const tagSpan of slide.textTags) {
      const parsed = parseTagExpression(tagSpan.tag);
      const key = parsed.key;

      let kind: FieldKind = 'text';
      if (parsed.listName) {
        kind = 'list';
      } else if (
        parsed.formats.some((f) => ['num', 'inr', 'inr_lakh', 'inr_cr', 'pct'].includes(f))
      ) {
        kind = 'number';
      } else if (
        parsed.formats.some((f) => f.startsWith('date:')) ||
        parsed.name.toLowerCase().includes('date')
      ) {
        kind = 'date';
      }

      if (!fieldMap.has(key)) {
        fieldMap.set(key, {
          key,
          rawTag: tagSpan.tag,
          group: parsed.group,
          name: parsed.name,
          kind,
          formats: [...parsed.formats],
          optional: parsed.optional,
          maxLength: parsed.maxLength,
          slides: [slide.slideNumber],
          listName: parsed.listName,
          slotNumber: parsed.slotNumber,
          subField: parsed.subField,
        });
      } else {
        const existing = fieldMap.get(key)!;
        if (!existing.slides.includes(slide.slideNumber)) {
          existing.slides.push(slide.slideNumber);
        }
        for (const fmt of parsed.formats) {
          if (!existing.formats.includes(fmt)) {
            existing.formats.push(fmt);
          }
        }
        if (parsed.optional) existing.optional = true;
        if (parsed.maxLength !== null) {
          existing.maxLength = Math.min(existing.maxLength ?? Infinity, parsed.maxLength);
        }
      }

      // Collect List metadata
      if (parsed.listName) {
        const lName = parsed.listName;
        if (!listSpecs[lName]) {
          listSpecs[lName] = {
            name: lName,
            slotsFound: [],
            itemFields: [],
            imageItemFields: [],
            slides: [],
          };
        }
        const ls = listSpecs[lName];
        if (!ls.slides.includes(slide.slideNumber)) {
          ls.slides.push(slide.slideNumber);
        }
        if (parsed.slotNumber && !ls.slotsFound.includes(parsed.slotNumber)) {
          ls.slotsFound.push(parsed.slotNumber);
          ls.slotsFound.sort((a, b) => a - b);
        }
        if (parsed.subField && !ls.itemFields.includes(parsed.subField)) {
          ls.itemFields.push(parsed.subField);
        }
      }
    }

    // Process image slots
    for (const imgSlot of slide.imageSlots) {
      const parsed = parseTagExpression(imgSlot.shapeName);
      const isLib = parsed.group === 'lib';
      const isList = Boolean(parsed.listName);
      const key = parsed.key;

      if (isLib) {
        libraryImagesSet.add(key);
      }

      const kind: FieldKind = isLib ? 'library_image' : isList ? 'list' : 'image';

      if (!fieldMap.has(key)) {
        fieldMap.set(key, {
          key,
          rawTag: imgSlot.shapeName,
          group: parsed.group,
          name: parsed.name,
          kind,
          formats: [...imgSlot.formats],
          optional: parsed.optional,
          maxLength: null,
          slides: [slide.slideNumber],
          listName: parsed.listName,
          slotNumber: parsed.slotNumber,
          subField: parsed.subField,
        });
      } else {
        const existing = fieldMap.get(key)!;
        if (!existing.slides.includes(slide.slideNumber)) {
          existing.slides.push(slide.slideNumber);
        }
        for (const fmt of imgSlot.formats) {
          if (!existing.formats.includes(fmt)) {
            existing.formats.push(fmt);
          }
        }
      }

      // If this is a list image slot e.g. {{#presenters.1.card}}
      if (parsed.listName) {
        const lName = parsed.listName;
        if (!listSpecs[lName]) {
          listSpecs[lName] = {
            name: lName,
            slotsFound: [],
            itemFields: [],
            imageItemFields: [],
            slides: [],
          };
        }
        const ls = listSpecs[lName];
        if (!ls.slides.includes(slide.slideNumber)) {
          ls.slides.push(slide.slideNumber);
        }
        if (parsed.slotNumber && !ls.slotsFound.includes(parsed.slotNumber)) {
          ls.slotsFound.push(parsed.slotNumber);
          ls.slotsFound.sort((a, b) => a - b);
        }
        if (parsed.subField && !ls.imageItemFields.includes(parsed.subField)) {
          ls.imageItemFields.push(parsed.subField);
        }
      }
    }

    // Record per value from slide directives into listSpecs
    for (const dir of slide.notesDirectives) {
      if (dir.name === 'repeat' && dir.target) {
        const lName = dir.target.replace(/^#/, '');
        if (!listSpecs[lName]) {
          listSpecs[lName] = {
            name: lName,
            slotsFound: [],
            itemFields: [],
            imageItemFields: [],
            slides: [slide.slideNumber],
          };
        }
        if (dir.args.per) {
          listSpecs[lName].perValue = parseInt(dir.args.per, 10);
        }
      }
    }
  }

  // --- 6. Cross-Validation Warnings ---
  onProgress?.(90, 'Validating directives and tags across template...');

  for (const slide of slideInfos) {
    for (const dir of slide.notesDirectives) {
      if (dir.name === 'repeat') {
        const listName = dir.target.replace(/^#/, '');
        const hasMatchingTags =
          slide.textTags.some((t) => t.cleanTag.startsWith(`#${listName}`)) ||
          slide.imageSlots.some((s) => s.tag.startsWith(`#${listName}`)) ||
          (listSpecs[listName] && listSpecs[listName].itemFields.length > 0);

        if (!hasMatchingTags) {
          warnings.push({
            id: `repeat-no-tags-${slide.slideNumber}-${listName}`,
            slideNumber: slide.slideNumber,
            code: 'REPEAT_WITHOUT_TAGS',
            severity: 'warning',
            message: `Slide ${slide.slideNumber}: Directive "@repeat ${listName}" has no matching {{#${listName}...}} tags in this slide or template.`,
          });
        }
      } else if (dir.name === 'if') {
        const target = dir.target;
        const cleanTarget = target.replace(/^#/, '');
        const isKnownList = Boolean(listSpecs[cleanTarget]);
        const isKnownField = Array.from(fieldMap.keys()).some(
          (k) => k === target || k === cleanTarget || k.endsWith(`.${target}`)
        );
        const isFlag = target.startsWith('flags.') || target.includes('flag');

        if (!isKnownList && !isKnownField && !isFlag) {
          warnings.push({
            id: `if-unknown-${slide.slideNumber}-${target}`,
            slideNumber: slide.slideNumber,
            code: 'IF_UNKNOWN_LIST',
            severity: 'warning',
            message: `Slide ${slide.slideNumber}: Directive "@if ${target}" points to unknown list or field "${target}".`,
          });
        }
      }
    }
  }

  onProgress?.(100, 'Template mapping complete!');

  const fields = Array.from(fieldMap.values()).sort((a, b) => a.key.localeCompare(b.key));
  const libraryImages = Array.from(libraryImagesSet).sort();

  const warningCount = warnings.filter((w) => w.severity === 'warning').length;
  const errorCount = warnings.filter((w) => w.severity === 'error').length;
  const textFieldsCount = fields.filter((f) => f.kind === 'text' || f.kind === 'number' || f.kind === 'date').length;
  const imageSlotsCount = slideInfos.reduce((acc, s) => acc + s.imageSlots.length, 0);

  return {
    version: 1,
    templateFileName: fileName,
    analyzedAt: new Date().toISOString(),
    slideCount: slideInfos.length,
    hiddenSlideCount: slideInfos.filter((s) => s.isHidden).length,
    slides: slideInfos,
    fields,
    lists: listSpecs,
    libraryImages,
    warnings,
    summary: {
      totalSlides: slideInfos.length,
      textFieldsCount,
      imageSlotsCount,
      libraryImagesCount: libraryImages.length,
      listsCount: Object.keys(listSpecs).length,
      warningCount,
      errorCount,
    },
  };
}

/**
 * Checks for unclosed or malformed braces e.g. {{foo without }}
 */
function checkUnclosedTags(text: string, slideNumber: number, warnings: TemplateWarning[]): void {
  // Count {{ vs }}
  const openCount = (text.match(/\{\{/g) || []).length;
  const closeCount = (text.match(/\}\}/g) || []).length;

  if (openCount !== closeCount) {
    warnings.push({
      id: `unbalanced-tag-${slideNumber}-${Math.random().toString(36).substring(7)}`,
      slideNumber,
      code: 'MALFORMED_TAG',
      severity: 'error',
      message: `Slide ${slideNumber}: Unbalanced curly braces detected (${openCount} "{{" vs ${closeCount} "}}"). Check for broken or unclosed tags.`,
    });
  }

  // Empty tags: {{}}
  if (/\{\{\s*\}\}/.test(text)) {
    warnings.push({
      id: `empty-tag-${slideNumber}`,
      slideNumber,
      code: 'MALFORMED_TAG',
      severity: 'warning',
      message: `Slide ${slideNumber}: Empty tag "{{}}" found.`,
    });
  }
}

/**
 * Parses directive lines from speaker notes e.g. "@repeat rotation per=2" or "@if presenters"
 */
function parseDirectiveLine(line: string, lineNumber: number): DirectiveInfo | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('@')) return null;

  const match = trimmed.match(/^@([a-zA-Z0-9_]+)\s*(.*)$/);
  if (!match) return null;

  const directiveName = match[1].toLowerCase();
  const rest = match[2].trim();
  const tokens = rest.split(/\s+/).filter(Boolean);

  const target = tokens[0] || '';
  const args: Record<string, string> = {};

  tokens.slice(1).forEach((param) => {
    const eqIdx = param.indexOf('=');
    if (eqIdx > 0) {
      const k = param.substring(0, eqIdx).trim();
      const v = param.substring(eqIdx + 1).trim();
      args[k] = v;
    } else {
      args[param] = 'true';
    }
  });

  return {
    raw: trimmed,
    name: directiveName,
    args,
    target,
    lineNumber,
  };
}
