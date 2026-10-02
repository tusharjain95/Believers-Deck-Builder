/**
 * Generates an authentic BNI Believers sample .pptx template for immediate testing.
 * Includes text tags, split-run tags, picture slots, library image slots, list slots,
 * hidden slides, and speaker notes directives.
 */

import JSZip from 'jszip';

// 1x1 transparent PNG data url / bytes
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export async function createSampleBniTemplate(): Promise<Blob> {
  const zip = new JSZip();

  // [Content_Types].xml
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide3.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide4.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide5.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide6.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/notesSlides/notesSlide4.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>
  <Override PartName="/ppt/notesSlides/notesSlide6.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>
</Types>`
  );

  // _rels/.rels
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`
  );

  // ppt/presentation.xml
  zip.file(
    'ppt/presentation.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rIdMaster1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    <p:sldId id="256" r:id="rIdSlide1"/>
    <p:sldId id="257" r:id="rIdSlide2"/>
    <p:sldId id="258" r:id="rIdSlide3"/>
    <p:sldId id="259" r:id="rIdSlide4"/>
    <p:sldId id="260" r:id="rIdSlide5"/>
    <p:sldId id="261" r:id="rIdSlide6" show="0"/>
  </p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000" type="screen16x9"/>
</p:presentation>`
  );

  // ppt/_rels/presentation.xml.rels
  zip.file(
    'ppt/_rels/presentation.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdSlide1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
  <Relationship Id="rIdSlide2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>
  <Relationship Id="rIdSlide3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide3.xml"/>
  <Relationship Id="rIdSlide4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide4.xml"/>
  <Relationship Id="rIdSlide5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide5.xml"/>
  <Relationship Id="rIdSlide6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide6.xml"/>
</Relationships>`
  );

  // Media dummy image
  zip.file('ppt/media/image1.png', TINY_PNG_BASE64, { base64: true });

  // Slide 1: Welcome & Meeting Info
  zip.file(
    'ppt/slides/slide1.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Title 1"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:p>
            <a:r><a:t>BNI Believers - Weekly Chapter Meeting</a:t></a:r>
          </a:p>
          <a:p>
            <a:r><a:t>Meeting #{{meeting.number | num}} | </a:t></a:r>
            <a:r><a:t>{{meeting.date | date:Do MMM YYYY}}</a:t></a:r>
          </a:p>
          <a:p>
            <a:r><a:t>Theme of the Month: {{monthly.theme | upper}}</a:t></a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`
  );

  // Slide 2: VP Report (Numbers with Indian formatting & Split Run test!)
  zip.file(
    'ppt/slides/slide2.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Report Title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:p><a:r><a:t>Vice President's Performance Report</a:t></a:r></a:p>
          <a:p>
            <a:r><a:t>Referrals Passed This Week: </a:t></a:r>
            <!-- Here PowerPoint split a tag across runs intentionally to test split-run engine -->
            <a:r><a:t>{{</a:t></a:r>
            <a:r><a:t>vp.referrals</a:t></a:r>
            <a:r><a:t> | </a:t></a:r>
            <a:r><a:t>num}}</a:t></a:r>
          </a:p>
          <a:p>
            <a:r><a:t>Visitors Welcomed: {{vp.visitors | num}}</a:t></a:r>
          </a:p>
          <a:p>
            <a:r><a:t>Thank You For Closed Business: {{vp.tyfcb | inr_cr}}</a:t></a:r>
          </a:p>
          <a:p>
            <a:r><a:t>Chapter Retention: {{vp.retention_rate | pct}}</a:t></a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`
  );

  // Slide 3: Images & Library Picture slots
  zip.file(
    'ppt/slides/slide3.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Heading"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:p><a:r><a:t>Upcoming Chapter Events &amp; Recognition</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      <!-- Library Image Slot: {{lib.white_lion}} -->
      <p:pic>
        <p:nvPicPr>
          <p:cNvPr id="10" name="{{lib.white_lion}}"/>
          <p:cNvPicPr/>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="rIdImg1"/>
          <a:stretch><a:fillRect/></a:stretch>
        </p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="1828800"/>
            <a:ext cx="2743200" cy="2743200"/>
          </a:xfrm>
        </p:spPr>
      </p:pic>
      <!-- Weekly Event Banner Image Slot: {{weekly.events_image | contain}} -->
      <p:pic>
        <p:nvPicPr>
          <p:cNvPr id="11" name="{{weekly.events_image | contain}}"/>
          <p:cNvPicPr/>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="rIdImg1"/>
          <a:stretch><a:fillRect/></a:stretch>
        </p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="4572000" y="1828800"/>
            <a:ext cx="6400800" cy="3657600"/>
          </a:xfrm>
        </p:spPr>
      </p:pic>
    </p:spTree>
  </p:cSld>
</p:sld>`
  );

  // Slide 3 rels
  zip.file(
    'ppt/slides/_rels/slide3.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
</Relationships>`
  );

  // Slide 4: Speaker Rotation (Lists + Speaker Notes Directive @repeat rotation per=2)
  zip.file(
    'ppt/slides/slide4.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:p><a:r><a:t>Upcoming 8-Minute Feature Presentations</a:t></a:r></a:p>
          <a:p>
            <a:r><a:t>Slot 1: {{#rotation.1.speaker}} - {{#rotation.1.category}} ({{#rotation.1.topic}})</a:t></a:r>
          </a:p>
          <a:p>
            <a:r><a:t>Slot 2: {{#rotation.2.speaker}} - {{#rotation.2.category}} ({{#rotation.2.topic}})</a:t></a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`
  );

  // Slide 4 rels (pointing to notesSlide4.xml)
  zip.file(
    'ppt/slides/_rels/slide4.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdNotes1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide4.xml"/>
</Relationships>`
  );

  // Notes Slide 4: Directives!
  zip.file(
    'ppt/notesSlides/notesSlide4.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
         xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Notes Placeholder"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:p><a:r><a:t>Introduce upcoming speakers with their category and company.</a:t></a:r></a:p>
          <a:p><a:r><a:t>@repeat rotation per=2</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:notes>`
  );

  // Slide 5: Feature Presenter Profile Card (List image slot: {{#presenters.1.card}})
  zip.file(
    'ppt/slides/slide5.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Presenter Title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:p><a:r><a:t>Feature Presentation of the Day</a:t></a:r></a:p>
          <a:p><a:r><a:t>{{#presenters.1.name | title}} ({{#presenters.1.company}})</a:t></a:r></a:p>
          <a:p><a:r><a:t>Topic: {{#presenters.1.topic | max:80}}</a:t></a:r></a:p>
          <a:p><a:r><a:t>Bio: {{#presenters.1.bio | optional}}</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      <!-- List Card Image Slot -->
      <p:pic>
        <p:nvPicPr>
          <p:cNvPr id="12" name="{{#presenters.1.card}}"/>
          <p:cNvPicPr/>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="rIdImg1"/>
          <a:stretch><a:fillRect/></a:stretch>
        </p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="5486400" y="1828800"/>
            <a:ext cx="5486400" cy="3657600"/>
          </a:xfrm>
        </p:spPr>
      </p:pic>
    </p:spTree>
  </p:cSld>
</p:sld>`
  );

  // Slide 5 rels
  zip.file(
    'ppt/slides/_rels/slide5.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
</Relationships>`
  );

  // Slide 6: Hidden slide (show="0") with Conditional Directive @if flags.audit_mode
  zip.file(
    'ppt/slides/slide6.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Internal Title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:p><a:r><a:t>[Hidden] Leadership Team Debrief</a:t></a:r></a:p>
          <a:p><a:r><a:t>Chapter: {{region.chapter_rank | num}} in Region</a:t></a:r></a:p>
          <a:p><a:r><a:t>Global Network Size: {{global.members | num}} Members across {{global.countries | num}} Countries</a:t></a:r></a:p>
          <a:p><a:r><a:t>India Chapters: {{india.chapters | num}}</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`
  );

  // Slide 6 rels
  zip.file(
    'ppt/slides/_rels/slide6.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdNotes2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide6.xml"/>
</Relationships>`
  );

  // Notes Slide 6: @if directive
  zip.file(
    'ppt/notesSlides/notesSlide6.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
         xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Notes Placeholder"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:p><a:r><a:t>@if flags.audit_mode</a:t></a:r></a:p>
          <a:p><a:r><a:t>Show only when monthly chapter audit is enabled.</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:notes>`
  );

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });

  return blob;
}
