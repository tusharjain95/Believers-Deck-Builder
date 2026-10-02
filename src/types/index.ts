/**
 * BNI Weekly Deck Builder - Domain Types
 */

export type FieldKind = 'text' | 'number' | 'date' | 'image' | 'library_image' | 'list';

export interface Field {
  key: string;                          // e.g. "meeting.date", "vp.referrals", "lib.white_lion", "#rotation.speaker_1"
  rawTag: string;                       // e.g. "{{meeting.date | date:Do MMM YYYY}}"
  group: string;                        // "meeting" | "vp" | "weekly" | "monthly" | "global" | "india" | "region" | "lib" | "#<list>"
  name: string;                         // e.g. "date", "referrals", "white_lion"
  kind: FieldKind;
  formats: string[];                    // e.g. ["date:Do MMM YYYY"], ["num"], ["contain"]
  optional: boolean;
  maxLength: number | null;
  slides: number[];                     // 1-based slide indices where this field is used
  // List-specific fields (when kind === 'list')
  listName?: string;
  slotNumber?: number;                  // 1-based slot index if bound to a slot e.g. 1 in #rotation.1.speaker
  subField?: string;                    // e.g. "speaker"
}

export interface ListSpec {
  name: string;                         // e.g. "rotation", "presenters"
  perValue?: number;                    // from speaker notes directive `@repeat <list> per=<N>`
  slotsFound: number[];                 // e.g. [1, 2, 3]
  itemFields: string[];                 // e.g. ["speaker", "topic", "category"]
  imageItemFields: string[];            // e.g. ["card", "photo"]
  slides: number[];                     // Slides where this list appears
}

export interface ImageSlotInfo {
  shapeId: string;
  shapeName: string;                    // The tag in p:cNvPr @name, e.g. "{{lib.white_lion}}"
  tag: string;                          // Normalized tag without braces e.g. "lib.white_lion"
  group: string;                        // "lib", "weekly", "#presenters", etc.
  key: string;
  formats: string[];                    // e.g. ["contain"]
  cx: number;                           // Width in EMUs
  cy: number;                           // Height in EMUs
  widthPx: number;                      // Approximate CSS/display width
  heightPx: number;                     // Approximate CSS/display height
  aspectRatio: number;
  blipRelId?: string;                   // r:embed id in slide rels
  mediaPath?: string;                   // Resolved ppt/media/imageX.png
}

export interface TagRunSpan {
  tag: string;                          // Full tag e.g. "{{meeting.date | date:Do MMM YYYY}}"
  cleanTag: string;                     // "meeting.date | date:Do MMM YYYY"
  key: string;                          // "meeting.date"
  group: string;                        // "meeting"
  formats: string[];
  paragraphIndex: number;
  startRunIndex: number;
  endRunIndex: number;
  runCount: number;                     // If > 1, PowerPoint split the tag across runs
  text: string;                         // Full paragraph text or snippet
}

export interface DirectiveInfo {
  raw: string;                          // e.g. "@repeat rotation per=2"
  name: string;                         // "repeat" | "if" | string
  args: Record<string, string>;         // { list: "rotation", per: "2" }
  target: string;                       // e.g. "rotation"
  lineNumber: number;
}

export interface SlideInfo {
  slideNumber: number;                  // 1-based presentation order
  slideId: string;                      // p:sldId @id
  rId: string;                          // r:id in presentation.xml
  slidePath: string;                    // e.g. "ppt/slides/slide1.xml"
  isHidden: boolean;                    // show="0" attribute
  title?: string;
  textTags: TagRunSpan[];
  imageSlots: ImageSlotInfo[];
  notesDirectives: DirectiveInfo[];
  notesRawText?: string;
  warnings: TemplateWarning[];
}

export interface TemplateWarning {
  id: string;
  slideNumber?: number;
  tag?: string;
  code:
    | 'SPLIT_RUN_TAG'
    | 'MALFORMED_TAG'
    | 'UNKNOWN_FORMAT'
    | 'NON_PICTURE_IMAGE_TAG'
    | 'REPEAT_WITHOUT_TAGS'
    | 'IF_UNKNOWN_LIST'
    | 'TAG_IN_MASTER_LAYOUT'
    | 'DUPLICATE_IMAGE_NAME'
    | 'CORRUPT_XML'
    | 'EMPTY_SLIDE';
  message: string;
  severity: 'warning' | 'error' | 'info';
}

export interface TemplateMap {
  version: number;
  templateFileName: string;
  analyzedAt: string;
  slideCount: number;
  hiddenSlideCount: number;
  slides: SlideInfo[];
  fields: Field[];
  lists: Record<string, ListSpec>;
  libraryImages: string[];
  warnings: TemplateWarning[];
  summary: {
    totalSlides: number;
    textFieldsCount: number;
    imageSlotsCount: number;
    libraryImagesCount: number;
    listsCount: number;
    warningCount: number;
    errorCount: number;
  };
}

export interface TemplateVersion {
  id?: number;
  version: number;
  filename: string;
  byteLength: number;
  formattedSize: string;
  uploadDate: string;
  isActive: boolean;
  slideCount: number;
  warningCount: number;
}

// -------------------------------------------------------------
// Members, Roles, Schedule, Library, Settings, Backup Types
// -------------------------------------------------------------

export interface Member {
  id: string;
  title?: string;                       // CA/Dr/Adv, optional
  name: string;
  category: string;
  company: string;
  phone: string;
  email: string;
  birthday?: string;                    // DD-MM
  joinedDate?: string;                  // YYYY-MM-DD
  active: boolean;
  photoBlob?: Blob;
  cardBlob?: Blob;
  cardFile?: string;                    // e.g. "cards/tushar_card.png"
  photoFile?: string;                   // e.g. "photos/tushar.jpg"
  notes?: string;
}

export interface Role {
  id: string;
  roleKey: string;                      // e.g. "president", "vice_president", "secretary_treasurer"
  roleLabel: string;
  memberId?: string;
  origSlide?: string | number;
  termStart?: string;                   // YYYY-MM-DD
  termEnd?: string;                     // YYYY-MM-DD
}

export interface ScheduleEntry {
  id: string;
  date: string;                         // YYYY-MM-DD
  speaker1Id?: string;
  speaker2Id?: string;
  notes?: string;
}

export interface LibraryImageVersion {
  blob: Blob;
  date: string;
  filename?: string;
  byteLength?: number;
}

export interface LibraryImage {
  key: string;                          // e.g. "lib.white_lion"
  name: string;
  category?: string;
  currentBlob?: Blob;
  versions: LibraryImageVersion[];
  slideNumber?: number;
  lastUpdated?: string;
}

export interface ChapterSettings {
  chapterName: string;                  // default: "BNI Believers"
  meetingWeekday: string;               // default: "Wednesday"
  outputFileNamePattern: string;        // default: "BNI Believers - {DD MMM YYYY}.pptx"
  presentLastRoleOrder: string[];       // default: ["secretary_treasurer", "vice_president", "president"]
  region?: string;
  venue?: string;
  activeTemplateVersionId?: number;
}

export interface Meeting {
  id: string;
  date: string;                         // YYYY-MM-DD
  meetingNumber?: number;
  status: 'draft' | 'ready' | 'generated' | 'completed' | 'archived';
  values: Record<string, string | number | boolean>;
  lists: Record<string, any[]>;
  images?: Record<string, any>;
  copiedFromMeetingId?: string;
  copiedImageKeys?: string[];
  generatedPptxBlob?: Blob;
  generatedAt?: string;
  updatedAt?: string;
}

export interface GenerationWarningOrError {
  slideNumber?: number;
  tag?: string;
  message: string;
}

export interface GeneratedDeckRecord {
  meetingId: string;
  meetingDate: string;
  filename: string;
  blob: Blob;
  sizeBytes: number;
  savedAt: string;
}

export interface GenerationReport {
  generatedAt: string;
  templateVersion: number;
  meetingDate: string;
  slideCount?: number;
  slidesIn: number;
  slidesOut: number;
  slidesCloned: number;
  slidesRemoved: number;
  tagsReplaced: number;
  replacedTags?: number;
  imagesReplaced: number;
  warnings: GenerationWarningOrError[];
  errors: GenerationWarningOrError[];
  durationMs: number;
  outputSizeBytes: number;
  filename: string;
}

// Re-export Resolution types
export type { ResolutionIssue, ResolutionResult } from '../engine/resolve';
