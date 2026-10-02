/**
 * BNI Weekly Deck Builder - PPTX Generation Engine
 * Pure TypeScript OpenXML transformer.
 * Never recreates or redraws slides: edits the OpenXML inside a COPY of the template.
 */

import JSZip from 'jszip';
import type {
  TemplateMap,
  GenerationReport,
  ChapterSettings,
  ResolutionResult,
} from '../types';
import {
  readTemplate,
  getElementsByLocalName,
  resolveRelativePath,
  parseTagExpression,
} from './readTemplate';
import { processSlotImage } from './imageCanvas';
import { formatDatePattern } from '../utils/dateFormat';

/**
 * Escapes characters for XML text nodes
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Checks if a filename represents media (image, video, audio)
 */
export function isMediaFile(filename: string): boolean {
  return /\.(png|jpg|jpeg|gif|bmp|svg|mp4|mov|avi|wmv|wav|mp3|m4v)$/i.test(filename);
}

export interface GenerateOptions {
  onProgress?: (percent: number, message: string) => void;
}

/**
 * Core deck generation function.
 * Transforms an untouched copy of templateBytes into the weekly deck.
 */
export async function generate(
  templateBytes: Blob | ArrayBuffer | Uint8Array,
  templateMap: TemplateMap,
  resolved: ResolutionResult,
  settings: ChapterSettings,
  meetingDate: string,
  options?: GenerateOptions
): Promise<{ blob: Blob | null; report: GenerationReport }> {
  const startTime = Date.now();
  const onProgress = options?.onProgress;

  onProgress?.(5, 'Cloning template presentation archive...');
  const zip = await JSZip.loadAsync(templateBytes);
  const domParser = new DOMParser();
  const xmlSerializer = new XMLSerializer();

  const warnings: Array<{ slideNumber?: number; tag?: string; message: string }> = [];
  const errors: Array<{ slideNumber?: number; tag?: string; message: string }> = [];

  let slidesIn = templateMap.slideCount;
  let slidesCloned = 0;
  let slidesRemoved = 0;
  let tagsReplaced = 0;
  let imagesReplaced = 0;

  // Read presentation.xml and presentation.xml.rels
  const presFile = zip.file('ppt/presentation.xml');
  const presRelsFile = zip.file('ppt/_rels/presentation.xml.rels');
  const contentTypesFile = zip.file('[Content_Types].xml');

  if (!presFile || !presRelsFile || !contentTypesFile) {
    throw new Error('Corrupt template: Missing presentation.xml, presentation.xml.rels or [Content_Types].xml');
  }

  const presDoc = domParser.parseFromString(await presFile.async('text'), 'application/xml');
  const presRelsDoc = domParser.parseFromString(await presRelsFile.async('text'), 'application/xml');
  const contentTypesDoc = domParser.parseFromString(await contentTypesFile.async('text'), 'application/xml');

  // Map presentation.xml.rels: rId -> target
  const presRelMap = new Map<string, Element>();
  const presRels = getElementsByLocalName(presRelsDoc, 'Relationship');
  for (const rel of presRels) {
    const id = rel.getAttribute('Id');
    if (id) presRelMap.set(id, rel);
  }

  // Ensure [Content_Types].xml has defaults for png and jpeg/jpg
  const defaultTypes = getElementsByLocalName(contentTypesDoc, 'Default');
  const existingExts = new Set(defaultTypes.map((d) => d.getAttribute('Extension')?.toLowerCase()));
  const typesRoot = contentTypesDoc.documentElement;

  if (!existingExts.has('png')) {
    const d = contentTypesDoc.createElement('Default');
    d.setAttribute('Extension', 'png');
    d.setAttribute('ContentType', 'image/png');
    typesRoot.appendChild(d);
  }
  if (!existingExts.has('jpg')) {
    const d = contentTypesDoc.createElement('Default');
    d.setAttribute('Extension', 'jpg');
    d.setAttribute('ContentType', 'image/jpeg');
    typesRoot.appendChild(d);
  }
  if (!existingExts.has('jpeg')) {
    const d = contentTypesDoc.createElement('Default');
    d.setAttribute('Extension', 'jpeg');
    d.setAttribute('ContentType', 'image/jpeg');
    typesRoot.appendChild(d);
  }

  // Calculate current max slide id
  let maxSlideId = 255;
  const sldIdList = getElementsByLocalName(presDoc, 'sldId');
  for (const sld of sldIdList) {
    const idNum = parseInt(sld.getAttribute('id') || '0', 10);
    if (idNum > maxSlideId) maxSlideId = idNum;
  }

  // -------------------------------------------------------------
  // STEP 1: CONDITIONAL SLIDES (@if)
  // -------------------------------------------------------------
  onProgress?.(10, 'Preparing: Evaluating conditional slides (@if)...');

  // Identify slides to remove based on @if condition evaluating to empty/false
  const slidesToRemove = new Set<number>(); // 1-based slide numbers

  for (const slide of templateMap.slides) {
    for (const dir of slide.notesDirectives) {
      if (dir.name === 'if' && dir.target) {
        const target = dir.target;
        const cleanTarget = target.replace(/^#/, '');

        // Check if list
        let shouldKeep = true;
        if (resolved.lists[cleanTarget] !== undefined) {
          shouldKeep = resolved.lists[cleanTarget].length > 0;
        } else if (resolved.values[target] !== undefined) {
          const v = String(resolved.values[target]).toLowerCase().trim();
          shouldKeep = v !== 'false' && v !== '0' && v !== 'no' && v !== '';
        } else {
          // If flag starts with flags.
          const v = String(resolved.values[`flags.${cleanTarget}`] || '').toLowerCase().trim();
          shouldKeep = v === 'true' || v === '1' || v === 'yes';
        }

        if (!shouldKeep) {
          slidesToRemove.add(slide.slideNumber);
        }
      }
    }
  }

  // Helper to remove a slide completely
  const removeSlideFromPackage = (sldIdEl: Element, slideNumber: number) => {
    const rId = sldIdEl.getAttribute('r:id');
    if (!rId) return;

    const relEl = presRelMap.get(rId);
    if (relEl) {
      const target = relEl.getAttribute('Target') || '';
      const slidePath = resolveRelativePath('ppt', target);
      const slideDir = slidePath.substring(0, slidePath.lastIndexOf('/'));
      const slideFilename = slidePath.substring(slidePath.lastIndexOf('/') + 1);
      const slideRelsPath = `${slideDir}/_rels/${slideFilename}.rels`;

      // 1. Remove files from zip
      zip.remove(slidePath);
      zip.remove(slideRelsPath);

      // 2. Remove ContentTypes override
      const overrides = getElementsByLocalName(contentTypesDoc, 'Override');
      for (const ov of overrides) {
        const partName = ov.getAttribute('PartName');
        if (partName === `/${slidePath}` || partName === slidePath) {
          ov.parentElement?.removeChild(ov);
        }
      }

      // 3. Remove relationship from presentation.xml.rels
      relEl.parentElement?.removeChild(relEl);
      presRelMap.delete(rId);
    }

    // 4. Remove from presentation.xml
    sldIdEl.parentElement?.removeChild(sldIdEl);
    slidesRemoved++;
  };

  // -------------------------------------------------------------
  // STEP 2: REPEAT SLIDES (@repeat <list> per=N)
  // -------------------------------------------------------------
  onProgress?.(25, 'Repeating slides (@repeat)...');

  // Track slide items for rewriting list slots
  // slidePath -> { listName, chunkIndex, per, items }
  const chunkedSlidesMeta = new Map<
    string,
    { listName: string; chunkIndex: number; per: number; totalItems: number; items: any[] }
  >();

  // Iterate over original sldIds
  const currentSldIds = [...getElementsByLocalName(presDoc, 'sldId')];

  for (let sIdx = 0; sIdx < currentSldIds.length; sIdx++) {
    const sldIdEl = currentSldIds[sIdx];
    const slideNumber = sIdx + 1;

    // Check if this slide was marked for removal by @if
    if (slidesToRemove.has(slideNumber)) {
      removeSlideFromPackage(sldIdEl, slideNumber);
      continue;
    }

    const slideInfo = templateMap.slides.find((s) => s.slideNumber === slideNumber);
    if (!slideInfo) continue;

    // Check for @repeat directive
    const repeatDir = slideInfo.notesDirectives.find((d) => d.name === 'repeat');
    if (repeatDir && repeatDir.target) {
      const listName = repeatDir.target.replace(/^#/, '');
      const per = parseInt(repeatDir.args.per || '1', 10);
      const listItems = resolved.lists[listName] || [];
      const chunks = Math.ceil(listItems.length / per);

      if (chunks === 0) {
        // 0 chunks: remove the slide
        removeSlideFromPackage(sldIdEl, slideNumber);
        continue;
      }

      const rId = sldIdEl.getAttribute('r:id') || '';
      const relEl = presRelMap.get(rId);
      if (!relEl) continue;
      const originalTarget = relEl.getAttribute('Target') || '';
      const originalSlidePath = resolveRelativePath('ppt', originalTarget);
      const originalSlideDir = originalSlidePath.substring(0, originalSlidePath.lastIndexOf('/'));
      const originalSlideFilename = originalSlidePath.substring(originalSlidePath.lastIndexOf('/') + 1);
      const originalRelsPath = `${originalSlideDir}/_rels/${originalSlideFilename}.rels`;

      // Record chunk 1 metadata
      chunkedSlidesMeta.set(originalSlidePath, {
        listName,
        chunkIndex: 1,
        per,
        totalItems: listItems.length,
        items: listItems,
      });

      // Clone for chunks 2..k
      let previousSldIdNode: Element = sldIdEl;

      for (let c = 2; c <= chunks; c++) {
        const uniqueId = `${listName}_c${c}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const clonedSlidePath = `ppt/slides/slide_gen_${uniqueId}.xml`;
        const clonedRelsPath = `ppt/slides/_rels/slide_gen_${uniqueId}.xml.rels`;
        const clonedRelId = `rId_gen_${uniqueId}`;

        // 1. Copy slide XML
        const originalXml = await zip.file(originalSlidePath)!.async('text');
        zip.file(clonedSlidePath, originalXml);

        // 2. Copy rels XML without notesSlide relationship
        const originalRelsFile = zip.file(originalRelsPath);
        if (originalRelsFile) {
          const relsXml = await originalRelsFile.async('text');
          const relsDoc = domParser.parseFromString(relsXml, 'application/xml');
          // Remove notesSlide rel from clone
          const relElements = getElementsByLocalName(relsDoc, 'Relationship');
          for (const r of relElements) {
            if ((r.getAttribute('Type') || '').includes('notesSlide')) {
              r.parentElement?.removeChild(r);
            }
          }
          zip.file(clonedRelsPath, xmlSerializer.serializeToString(relsDoc));
        }

        // 3. Add [Content_Types].xml override
        const ov = contentTypesDoc.createElement('Override');
        ov.setAttribute('PartName', `/${clonedSlidePath}`);
        ov.setAttribute('ContentType', 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml');
        typesRoot.appendChild(ov);

        // 4. Add relationship in ppt/_rels/presentation.xml.rels
        const presRel = presRelsDoc.createElement('Relationship');
        presRel.setAttribute('Id', clonedRelId);
        presRel.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide');
        presRel.setAttribute('Target', `slides/slide_gen_${uniqueId}.xml`);
        presRelsDoc.documentElement.appendChild(presRel);
        presRelMap.set(clonedRelId, presRel);

        // 5. Add <p:sldId> directly after previous chunk
        maxSlideId += 1;
        const newSldId = presDoc.createElement('p:sldId');
        newSldId.setAttribute('id', String(maxSlideId));
        newSldId.setAttribute('r:id', clonedRelId);

        if (previousSldIdNode.nextSibling) {
          previousSldIdNode.parentElement?.insertBefore(newSldId, previousSldIdNode.nextSibling);
        } else {
          previousSldIdNode.parentElement?.appendChild(newSldId);
        }
        previousSldIdNode = newSldId;

        chunkedSlidesMeta.set(clonedSlidePath, {
          listName,
          chunkIndex: c,
          per,
          totalItems: listItems.length,
          items: listItems,
        });

        slidesCloned++;
      }
    }
  }

  // -------------------------------------------------------------
  // STEP 3: TEXT REPLACEMENT & EMPTY SLOT CLEANUP
  // -------------------------------------------------------------
  onProgress?.(45, 'Replacing text values and formats...');

  // Estimate total images to process for progress reporting
  const totalImagesCount = Math.max(
    1,
    Object.keys(resolved.images).length +
      Object.values(resolved.lists).reduce(
        (acc, l) => acc + l.filter((i) => i.cardBlob || i.photoBlob || i.blob).length,
        0
      )
  );

  // Get final presentation slide list in exact order
  const finalSldIds = getElementsByLocalName(presDoc, 'sldId');

  for (let sIdx = 0; sIdx < finalSldIds.length; sIdx++) {
    const sldIdEl = finalSldIds[sIdx];
    const slideNumber = sIdx + 1;
    const rId = sldIdEl.getAttribute('r:id') || '';
    const relEl = presRelMap.get(rId);
    if (!relEl) continue;

    const targetPath = relEl.getAttribute('Target') || '';
    const slidePath = resolveRelativePath('ppt', targetPath);
    const slideFile = zip.file(slidePath);
    if (!slideFile) continue;

    const slideXmlText = await slideFile.async('text');
    const slideDoc = domParser.parseFromString(slideXmlText, 'application/xml');

    // Check if this slide is a chunk of a repeat list
    const chunkMeta = chunkedSlidesMeta.get(slidePath);

    // If chunked: rewrite list tags for this chunk index
    // In chunk c, slot s means item (c-1)*N + s
    if (chunkMeta) {
      const { listName, chunkIndex, per, totalItems } = chunkMeta;
      const startItemIdx = (chunkIndex - 1) * per + 1; // 1-based item index
      const maxSlotsInChunk = per;

      // Identify empty slots in this chunk (if last chunk)
      const emptySlots = new Set<number>();
      for (let s = 1; s <= maxSlotsInChunk; s++) {
        const itemIdx = (chunkIndex - 1) * per + s;
        if (itemIdx > totalItems) {
          emptySlots.add(s);
        }
      }

      // Rule: "In the last chunk, delete shapes/pictures whose tags refer only to empty slots (groups too, when every child is empty)."
      if (emptySlots.size > 0) {
        deleteEmptySlotShapes(slideDoc, listName, emptySlots);
      }

      // Rewrite tags in remaining text paragraphs and shape names:
      // {{#list.s.field}} -> {{#list.actualItemIdx.field}}
      rewriteSlotTagsInSlide(slideDoc, listName, chunkIndex, per);
    }

    // Now perform standard text replacement on all <a:p> elements in this slide
    const paragraphs = getElementsByLocalName(slideDoc, 'p');

    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const p = paragraphs[pIdx];
      const runs = getElementsByLocalName(p, 'r');
      if (runs.length === 0) continue;

      // Collect run text and offsets
      let joinedText = '';
      const runOffsets: Array<{ runEl: Element; startChar: number; endChar: number; text: string }> = [];

      for (let rIdx = 0; rIdx < runs.length; rIdx++) {
        const rEl = runs[rIdx];
        const tEls = getElementsByLocalName(rEl, 't');
        const text = tEls.map((t) => t.textContent || '').join('');
        const startChar = joinedText.length;
        joinedText += text;
        const endChar = joinedText.length;
        runOffsets.push({ runEl: rEl, startChar, endChar, text });
      }

      const tagRegex = /\{\{([^{}]+)\}\}/g;
      const tagMatches: Array<{ fullTag: string; matchStart: number; matchEnd: number }> = [];
      let m: RegExpExecArray | null;
      while ((m = tagRegex.exec(joinedText)) !== null) {
        tagMatches.push({
          fullTag: m[0],
          matchStart: m.index,
          matchEnd: m.index + m[0].length,
        });
      }

      if (tagMatches.length === 0) continue;

      // Replace from right to left so char offsets of earlier matches remain valid
      for (let tIdx = tagMatches.length - 1; tIdx >= 0; tIdx--) {
        const match = tagMatches[tIdx];
        const fullTag = match.fullTag;
        const parsed = parseTagExpression(fullTag);

        // Resolve value
        let val = '';
        if (parsed.listName && parsed.slotNumber) {
          // List item field: e.g. #rotation.3.speaker_1 or #presenters.2.name
          const lItems = resolved.lists[parsed.listName] || [];
          const item = lItems[parsed.slotNumber - 1]; // 0-based
          if (item) {
            val = String(item[parsed.subField || ''] ?? item[parsed.name] ?? '');
          }
        } else {
          val = resolved.values[parsed.key] !== undefined ? resolved.values[parsed.key] : '';
        }

        // Check max:N shrinking
        let shrinkRatio = 1.0;
        if (parsed.maxLength !== null && val.length > parsed.maxLength) {
          shrinkRatio = Math.max(0.7, parsed.maxLength / val.length);
          warnings.push({
            slideNumber,
            tag: fullTag,
            message: `Slide ${slideNumber}: Text for "${fullTag}" (${val.length} chars) exceeded max:${parsed.maxLength}. Font size shrunk to ${Math.round(shrinkRatio * 100)}%.`,
          });
        }

        // Find which runs this tag spans
        let startRunIdx = -1;
        let endRunIdx = -1;

        for (let i = 0; i < runOffsets.length; i++) {
          const ro = runOffsets[i];
          if (ro.startChar <= match.matchStart && match.matchStart < ro.endChar) {
            startRunIdx = i;
          }
          if (ro.startChar < match.matchEnd && match.matchEnd <= ro.endChar) {
            endRunIdx = i;
          }
        }

        if (startRunIdx === -1 && runOffsets.length > 0) startRunIdx = 0;
        if (endRunIdx === -1 && runOffsets.length > 0) endRunIdx = runOffsets.length - 1;

        const firstRunObj = runOffsets[startRunIdx];
        const lastRunObj = runOffsets[endRunIdx];

        if (firstRunObj && lastRunObj) {
          const firstRunEl = firstRunObj.runEl;
          const firstTEl = getElementsByLocalName(firstRunEl, 't')[0];

          // Text before tag in first run
          const prefix = firstRunObj.text.substring(0, match.matchStart - firstRunObj.startChar);

          // Text after tag in last run
          const suffix = lastRunObj.text.substring(match.matchEnd - lastRunObj.startChar);

          if (startRunIdx === endRunIdx) {
            // Tag is fully inside a single run
            if (firstTEl) {
              firstTEl.textContent = prefix + val + suffix;
            }
          } else {
            // Tag spans multiple runs!
            // First run gets prefix + val
            if (firstTEl) {
              firstTEl.textContent = prefix + val;
            }
            // Last run gets suffix
            const lastTEl = getElementsByLocalName(lastRunObj.runEl, 't')[0];
            if (lastTEl) {
              lastTEl.textContent = suffix;
            }
            // Delete intermediate runs
            for (let i = startRunIdx + 1; i < endRunIdx; i++) {
              const midRun = runOffsets[i].runEl;
              midRun.parentElement?.removeChild(midRun);
            }
          }

          // Apply font shrinking if needed
          if (shrinkRatio < 1.0) {
            const rPrs = getElementsByLocalName(firstRunEl, 'rPr');
            if (rPrs.length > 0) {
              const rPr = rPrs[0];
              const curSz = parseInt(rPr.getAttribute('sz') || '2000', 10);
              rPr.setAttribute('sz', String(Math.round(curSz * shrinkRatio)));
            }
          }

          tagsReplaced++;
        }
      }
    }

    // -------------------------------------------------------------
    // STEP 4: IMAGE REPLACEMENT
    // -------------------------------------------------------------
    // Look for pictures with tagged names: {{...}}
    const pics = getElementsByLocalName(slideDoc, 'pic');
    const slideDir = slidePath.substring(0, slidePath.lastIndexOf('/'));
    const slideFilename = slidePath.substring(slidePath.lastIndexOf('/') + 1);
    const slideRelsPath = `${slideDir}/_rels/${slideFilename}.rels`;

    let slideRelsDoc: Document | null = null;
    let slideRelsChanged = false;

    for (let pIdx = 0; pIdx < pics.length; pIdx++) {
      const pic = pics[pIdx];
      const cNvPrs = getElementsByLocalName(pic, 'cNvPr');
      if (cNvPrs.length === 0) continue;
      const cNvPr = cNvPrs[0];
      const shapeName = (cNvPr.getAttribute('name') || '').trim();
      const shapeId = cNvPr.getAttribute('id') || String(pIdx + 1);

      if (/^\{\{.*\}\}$/.test(shapeName)) {
        const parsed = parseTagExpression(shapeName);

        // Resolve Image Blob
        let imgBlob: Blob | undefined;

        if (parsed.listName && parsed.slotNumber) {
          // List image slot e.g. {{#presenters.1.card}} or {{#features.1.photo}}
          const lItems = resolved.lists[parsed.listName] || [];
          const item = lItems[parsed.slotNumber - 1];
          if (item) {
            imgBlob = item[parsed.subField || ''] || item.cardBlob || item.photoBlob || item.blob;
          }
        } else if (parsed.group === 'lib') {
          imgBlob = resolved.images[parsed.key];
        } else {
          imgBlob = resolved.images[parsed.key];
        }

        if (imgBlob && imgBlob instanceof Blob) {
          // Read frame size from <a:ext cx cy>
          let cx = 914400;
          let cy = 914400;
          const exts = getElementsByLocalName(pic, 'ext');
          for (const ext of exts) {
            const cxAttr = ext.getAttribute('cx');
            const cyAttr = ext.getAttribute('cy');
            if (cxAttr && cyAttr) {
              cx = parseInt(cxAttr, 10);
              cy = parseInt(cyAttr, 10);
              break;
            }
          }

          const isContain = parsed.formats.includes('contain');

          // Process image on canvas (cover vs contain, max 1920px)
          const processed = await processSlotImage(imgBlob, cx, cy, isContain);

          // Add media file to zip
          const mediaUnique = `gen_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const mediaFilename = `${mediaUnique}.${processed.extension}`;
          const mediaPath = `ppt/media/${mediaFilename}`;

          // Store media with STORE compression
          zip.file(mediaPath, processed.blob, {
            compression: 'STORE',
          });

          // Add relationship to slide rels
          if (!slideRelsDoc) {
            const slideRelsFile = zip.file(slideRelsPath);
            const slideRelsText = slideRelsFile
              ? await slideRelsFile.async('text')
              : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>';
            slideRelsDoc = domParser.parseFromString(slideRelsText, 'application/xml');
          }

          const newRelId = `rId_media_${mediaUnique}`;
          const newRel = slideRelsDoc.createElement('Relationship');
          newRel.setAttribute('Id', newRelId);
          newRel.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image');
          newRel.setAttribute('Target', `../media/${mediaFilename}`);
          slideRelsDoc.documentElement.appendChild(newRel);
          slideRelsChanged = true;

          // Point <a:blip r:embed="..."> to new rel
          const blips = getElementsByLocalName(pic, 'blip');
          if (blips.length > 0) {
            blips[0].setAttribute('r:embed', newRelId);
          }

          // Remove any <a:srcRect>
          const srcRects = getElementsByLocalName(pic, 'srcRect');
          for (const sr of srcRects) {
            sr.parentElement?.removeChild(sr);
          }

          // Rename shape to neutral name
          cNvPr.setAttribute('name', `Picture ${shapeId}`);
          imagesReplaced++;
          const imgProgress = 60 + Math.min(20, Math.round((imagesReplaced / totalImagesCount) * 20));
          onProgress?.(imgProgress, `Processing images ${imagesReplaced}/${Math.max(imagesReplaced, totalImagesCount)}...`);
        }
      }
    }

    if (slideRelsDoc && slideRelsChanged) {
      zip.file(slideRelsPath, xmlSerializer.serializeToString(slideRelsDoc), {
        compression: 'DEFLATE',
      });
    }

    // Save updated slide XML
    zip.file(slidePath, xmlSerializer.serializeToString(slideDoc), {
      compression: 'DEFLATE',
    });
  }

  // -------------------------------------------------------------
  // STEP 5: CLEAN-UP & AUDIT LEFTOVERS
  // -------------------------------------------------------------
  onProgress?.(80, 'Cleaning speaker notes & auditing leftover tags...');

  // 1. Remove @repeat and @if lines from all notes slides; delete notes part if empty (Rule 5)
  const allZipFiles = Object.keys(zip.files);
  const notesFiles = allZipFiles.filter((f) => f.startsWith('ppt/notesSlides/notesSlide') && f.endsWith('.xml'));

  for (const nPath of notesFiles) {
    const nFile = zip.file(nPath);
    if (!nFile) continue;
    const nXml = await nFile.async('text');
    const nDoc = domParser.parseFromString(nXml, 'application/xml');
    const paragraphs = getElementsByLocalName(nDoc, 'p');

    let hasNonDirectiveText = false;
    for (const p of paragraphs) {
      const text = p.textContent || '';
      if (text.trim().startsWith('@repeat') || text.trim().startsWith('@if')) {
        p.parentElement?.removeChild(p);
      } else if (text.trim().length > 0) {
        hasNonDirectiveText = true;
      }
    }

    if (!hasNonDirectiveText) {
      // Notes slide is empty: delete notes part if empty (Rule 5)
      zip.remove(nPath);
      const nDir = nPath.substring(0, nPath.lastIndexOf('/'));
      const nFilename = nPath.substring(nPath.lastIndexOf('/') + 1);
      const nRelsPath = `${nDir}/_rels/${nFilename}.rels`;
      zip.remove(nRelsPath);

      // Remove Content_Types override
      const overrides = getElementsByLocalName(contentTypesDoc, 'Override');
      for (const ov of overrides) {
        const partName = ov.getAttribute('PartName');
        if (partName === `/${nPath}` || partName === nPath) {
          ov.parentElement?.removeChild(ov);
        }
      }

      // Remove relationship pointing to this notesSlide from all slide rels
      const slideRelsFiles = Object.keys(zip.files).filter(
        (f) => f.startsWith('ppt/slides/_rels/') && f.endsWith('.rels')
      );
      for (const srf of slideRelsFiles) {
        const rf = zip.file(srf);
        if (!rf) continue;
        const rXml = await rf.async('text');
        if (rXml.includes(nFilename)) {
          const rDoc = domParser.parseFromString(rXml, 'application/xml');
          const rels = getElementsByLocalName(rDoc, 'Relationship');
          let modified = false;
          for (const rel of rels) {
            const target = rel.getAttribute('Target') || '';
            if (target.includes(nFilename)) {
              rel.parentElement?.removeChild(rel);
              modified = true;
            }
          }
          if (modified) {
            zip.file(srf, xmlSerializer.serializeToString(rDoc), { compression: 'DEFLATE' });
          }
        }
      }
    } else {
      zip.file(nPath, xmlSerializer.serializeToString(nDoc), { compression: 'DEFLATE' });
    }
  }

  // 2. Scan every presentation slide for leftover "{{"
  const finalPresSlideList = getElementsByLocalName(presDoc, 'sldId');

  for (let sIdx = 0; sIdx < finalPresSlideList.length; sIdx++) {
    const sldIdEl = finalPresSlideList[sIdx];
    const slideNumber = sIdx + 1;
    const rId = sldIdEl.getAttribute('r:id') || '';
    const relEl = presRelMap.get(rId);
    if (!relEl) continue;

    const slidePath = resolveRelativePath('ppt', relEl.getAttribute('Target') || '');
    const sFile = zip.file(slidePath);
    if (!sFile) continue;

    const sXml = await sFile.async('text');
    const leftoverMatches = sXml.match(/\{\{([^{}]+)\}\}/g);
    if (leftoverMatches && leftoverMatches.length > 0) {
      for (const lo of leftoverMatches) {
        errors.push({
          slideNumber,
          tag: lo,
          message: `Slide ${slideNumber}: Leftover unreplaced tag "${lo}" found in final deck XML.`,
        });
      }
    }
  }

  // Update presentation.xml, presentation.xml.rels, and [Content_Types].xml
  zip.file('ppt/presentation.xml', xmlSerializer.serializeToString(presDoc), { compression: 'DEFLATE' });
  zip.file('ppt/_rels/presentation.xml.rels', xmlSerializer.serializeToString(presRelsDoc), { compression: 'DEFLATE' });
  zip.file('[Content_Types].xml', xmlSerializer.serializeToString(contentTypesDoc), { compression: 'DEFLATE' });

  // -------------------------------------------------------------
  // STEP 6: SELF-CHECK
  // -------------------------------------------------------------
  onProgress?.(90, 'Running self-check audit on generated deck...');

  let slidesOut = finalPresSlideList.length;

  // -------------------------------------------------------------
  // STEP 7: OUTPUT & COMPRESSION
  // -------------------------------------------------------------
  onProgress?.(95, 'Packaging PPTX (DEFLATE XML/rels, STORE media)...');

  // Format output filename from settings
  const formattedDate = formatDatePattern(meetingDate, 'DD MMM YYYY');
  let outputFilename = (settings.outputFileNamePattern || 'BNI Believers - {DD MMM YYYY}.pptx').replace(
    /\{DD MMM YYYY\}/g,
    formattedDate
  );
  if (!outputFilename.endsWith('.pptx')) {
    outputFilename += '.pptx';
  }

  // Set file compression flags for all files
  zip.forEach((path, file) => {
    if (!file.dir) {
      if (isMediaFile(path)) {
        file.options.compression = 'STORE';
      } else {
        file.options.compression = 'DEFLATE';
      }
    }
  });

  const generatedBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });

  const durationMs = Date.now() - startTime;

  const report: GenerationReport = {
    generatedAt: new Date().toISOString(),
    templateVersion: templateMap.version,
    meetingDate,
    slideCount: slidesOut,
    slidesIn,
    slidesOut,
    slidesCloned,
    slidesRemoved,
    tagsReplaced,
    replacedTags: tagsReplaced,
    imagesReplaced,
    warnings,
    errors,
    durationMs,
    outputSizeBytes: generatedBlob.size,
    filename: outputFilename,
  };

  onProgress?.(100, 'Generation complete!');

  return {
    blob: generatedBlob,
    report,
  };
}

/**
 * Helper to delete shapes/pictures referring only to empty slots in a chunk
 */
function deleteEmptySlotShapes(slideDoc: Document, listName: string, emptySlots: Set<number>): void {
  // Check shapes (<p:sp>) and pictures (<p:pic>)
  const shapes = [
    ...getElementsByLocalName(slideDoc, 'sp'),
    ...getElementsByLocalName(slideDoc, 'pic'),
  ];

  for (const shp of shapes) {
    const cNvPrs = getElementsByLocalName(shp, 'cNvPr');
    const shapeName = cNvPrs[0]?.getAttribute('name') || '';

    // Check all text tags in shape
    const fullText = shp.textContent || '';
    const allTags = [
      shapeName,
      ...(fullText.match(/\{\{([^{}]+)\}\}/g) || []),
    ];

    let hasEmptySlotTag = false;
    let hasValidSlotTag = false;

    for (const rawTag of allTags) {
      const parsed = parseTagExpression(rawTag);
      if (parsed.listName === listName && parsed.slotNumber) {
        if (emptySlots.has(parsed.slotNumber)) {
          hasEmptySlotTag = true;
        } else {
          hasValidSlotTag = true;
        }
      }
    }

    if (hasEmptySlotTag && !hasValidSlotTag) {
      // Shape only belongs to empty slot: delete it!
      const parent = shp.parentElement;
      parent?.removeChild(shp);

      // If parent is a group shape (<p:grpSp>) and has no shape children left, delete group too!
      if (parent && parent.localName && parent.localName.toLowerCase() === 'grpsp') {
        const remainingChildren = [
          ...getElementsByLocalName(parent, 'sp'),
          ...getElementsByLocalName(parent, 'pic'),
        ];
        if (remainingChildren.length === 0) {
          parent.parentElement?.removeChild(parent);
        }
      }
    }
  }
}

/**
 * Rewrites slot tags in a slide chunk from 1-based chunk slot to actual item index
 * e.g. chunk 2, per 2: slot 1 -> item 3, slot 2 -> item 4
 */
function rewriteSlotTagsInSlide(slideDoc: Document, listName: string, chunkIndex: number, per: number): void {
  // 1. Rewrite shape names in <p:cNvPr name="...">
  const allCNvPrs = getElementsByLocalName(slideDoc, 'cNvPr');
  for (const c of allCNvPrs) {
    const name = c.getAttribute('name') || '';
    if (name.includes(`{{#${listName}.`)) {
      const rewritten = name.replace(
        new RegExp(`\\{\\{#${listName}\\.(\\d+)\\.`, 'g'),
        (_, slotStr) => {
          const slot = parseInt(slotStr, 10);
          const actualItemIdx = (chunkIndex - 1) * per + slot;
          return `{{#${listName}.${actualItemIdx}.`;
        }
      );
      c.setAttribute('name', rewritten);
    }
  }

  // 2. Rewrite text runs in <a:t>
  const textEls = getElementsByLocalName(slideDoc, 't');
  for (const t of textEls) {
    const text = t.textContent || '';
    if (text.includes(`{{#${listName}.`)) {
      const rewritten = text.replace(
        new RegExp(`\\{\\{#${listName}\\.(\\d+)\\.`, 'g'),
        (_, slotStr) => {
          const slot = parseInt(slotStr, 10);
          const actualItemIdx = (chunkIndex - 1) * per + slot;
          return `{{#${listName}.${actualItemIdx}.`;
        }
      );
      t.textContent = rewritten;
    }
  }
}
