import PDFDocument from 'pdfkit';
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(__dirname, 'assets');

const C = {
  dark:     '#0B0F1A',
  white:    '#FFFFFF',
  offWhite: '#F9FAFB',
  accent:   '#F59E0B',
  text:     '#111827',
  muted:    '#6B7280',
  border:   '#E5E7EB',
  headerBg: '#1F2937',
  // Colorful table row tints
  row0: '#FEF3C7',
  row1: '#DBEAFE',
  row2: '#D1FAE5',
  row3: '#FCE7F3',
  row4: '#EDE9FE',
};

function toSlug(str = '') {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function bgFill(doc, color, W, H) {
  doc.rect(0, 0, W, H).fill(color);
}

export async function generatePdf(prospect, businessInfo, outputDir) {
  const firstName   = prospect.firstName  ?? prospect.first_name  ?? '';
  const domain      = prospect.domain     ?? '';
  const companyName = prospect.companyName ?? prospect.company_name ?? domain;

  const slug     = toSlug(companyName || domain || 'company');
  const nameSlug = firstName ? `-${toSlug(firstName)}` : '';
  const date     = new Date().toISOString().slice(0, 10);
  const filename = `blue-ocean-${slug}${nameSlug}-${date}.pdf`;

  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
  const filePath = resolve(outputDir, filename);

  // Equipment & cities — fall back to generic only on page 4 copy
  const equipment = businessInfo?.equipment?.filter(Boolean).length >= 1
    ? businessInfo.equipment.slice(0, 5)
    : [];
  const cities = businessInfo?.cities?.filter(Boolean).length >= 1
    ? businessInfo.cities.slice(0, 5)
    : [];
  const isPersonalized = equipment.length > 0 && cities.length > 0;

  const totalPages = isPersonalized ? equipment.length * cities.length : null;

  return new Promise((resolvePromise, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      autoFirstPage: false,
      info: {
        Title: `The Untapped Blue Ocean — ${companyName}`,
        Author: 'Agba Stanley — Cozy Automation',
      },
    });

    const stream = createWriteStream(filePath);
    doc.pipe(stream);

    const W   = 612;
    const H   = 792;
    const PAD = 52;
    const CW  = W - PAD * 2;

    // ════════════════════════════════════════════════════════════════════════
    // PAGE 1 — The Hook
    // ════════════════════════════════════════════════════════════════════════
    doc.addPage();
    bgFill(doc, C.dark, W, H);
    doc.rect(0, 0, W, 4).fill(C.accent);

    // (agency label removed)

    // Headline — exact copy from doc
    const headline =
      'The Untapped Blue Ocean\nThat Big Rentals Don\'t Touch\n— And How ' +
      (companyName || 'Your Company') +
      ' Can Use It to\nHijack Leads in Your Market';

    doc.font('Helvetica-Bold').fontSize(34).fillColor(C.white)
      .text(headline, PAD, 72, { width: CW, lineGap: 6 });

    const headlineH = doc.heightOfString(headline, { width: CW, lineGap: 6 });
    let y1 = 72 + headlineH + 40;

    // Divider
    doc.moveTo(PAD, y1).lineTo(W - PAD, y1).strokeColor('#2D3748').lineWidth(1).stroke();
    y1 += 28;

    // "Prepared for..." block
    if (firstName || companyName) {
      const prepLine = `Prepared for ${firstName || companyName}${firstName && companyName ? ' at ' + companyName : ''}`;
      doc.font('Helvetica').fontSize(12).fillColor('#9CA3AF').text(prepLine, PAD, y1);
      y1 += 22;
    }
    y1 += 24;

    // Profile pic
    const picPath = resolve(ASSETS, 'profile-pic 6.png');
    const picSize = 52;
    if (existsSync(picPath)) {
      doc.save();
      doc.circle(PAD + picSize / 2, y1 + picSize / 2, picSize / 2).clip();
      doc.image(picPath, PAD, y1, { width: picSize, height: picSize });
      doc.restore();
      doc.font('Helvetica-Bold').fontSize(13).fillColor(C.white)
        .text('Made by Agba Stanley', PAD + picSize + 14, y1 + 18);
    }

    // Bottom strip
    doc.rect(0, H - 40, W, 40).fill('#0D1117');
    doc.font('Helvetica').fontSize(8).fillColor('#374151')
      .text(
        'CONFIDENTIAL — PREPARED EXCLUSIVELY FOR ' + (companyName || 'YOU').toUpperCase(),
        0, H - 26, { width: W, align: 'center' }
      );

    // ════════════════════════════════════════════════════════════════════════
    // PAGE 2 — The Problem
    // ════════════════════════════════════════════════════════════════════════
    doc.addPage();
    bgFill(doc, C.offWhite, W, H);

    let y2 = PAD;

    // Section label
    doc.font('Helvetica').fontSize(8).fillColor(C.accent)
      .text('THE UNTAPPED OPPORTUNITY', PAD, y2, { characterSpacing: 2 });
    y2 += 20;

    // Opening line — exact copy
    doc.font('Helvetica-Bold').fontSize(18).fillColor(C.text)
      .text('Go search "crane rental in Charlotte, NC" right now.', PAD, y2, { width: CW });
    y2 += doc.heightOfString('Go search "crane rental in Charlotte, NC" right now.', { width: CW }) + 16;

    // Body — exact copy
    const p2body1 =
      'You\'ll notice something interesting. Marxim Crane — a small, local company — ranks above BigRentz, ' +
      'one of the largest rental marketplaces in the country.\n\n' +
      'Scroll a little further and you\'ll see Ameonline sitting higher than Sunbelt Rentals.\n\n' +
      'And here\'s the kicker — neither of these companies has a particularly well-built website.';

    doc.font('Helvetica').fontSize(11).fillColor(C.text)
      .text(p2body1, PAD, y2, { width: CW, lineGap: 5 });
    y2 += doc.heightOfString(p2body1, { width: CW, lineGap: 5 }) + 18;

    // Two images side by side
    const imgW = (CW - 12) / 2;
    const imgH = 120;
    const s1 = resolve(ASSETS, 'search-1.jpg');
    const s2 = resolve(ASSETS, 'search-2.jpg');
    if (existsSync(s1)) doc.image(s1, PAD, y2, { width: imgW, height: imgH, fit: [imgW, imgH] });
    if (existsSync(s2)) doc.image(s2, PAD + imgW + 12, y2, { width: imgW, height: imgH, fit: [imgW, imgH] });
    y2 += imgH + 18;

    // Exact copy after images
    const p2body2 =
      'They\'re not outspending the big guys. They\'re not running massive ad campaigns. ' +
      'They\'re just showing up where the big guys aren\'t.\n\n' +
      'Which means smaller rental companies can absolutely compete — and win — against the industry giants. ' +
      'You just need to know where the opening is.';

    doc.font('Helvetica').fontSize(11).fillColor(C.text)
      .text(p2body2, PAD, y2, { width: CW, lineGap: 5 });

    // ════════════════════════════════════════════════════════════════════════
    // PAGE 3 — The Strategy
    // ════════════════════════════════════════════════════════════════════════
    doc.addPage();
    bgFill(doc, C.offWhite, W, H);

    let y3 = PAD;

    doc.font('Helvetica').fontSize(8).fillColor(C.accent)
      .text('THE STRATEGY', PAD, y3, { characterSpacing: 2 });
    y3 += 20;

    // Exact copy
    const p3intro =
      'The strategy is dead simple: your website should have one dedicated page for every equipment type ' +
      'in every city you can serve.\n\nNot one page that lists everything. One page per combination.\n\nHere\'s what that looks like:';

    doc.font('Helvetica').fontSize(11).fillColor(C.text)
      .text(p3intro, PAD, y3, { width: CW, lineGap: 5 });
    y3 += doc.heightOfString(p3intro, { width: CW, lineGap: 5 }) + 18;

    // Generic example table (always Houston/Dallas/etc)
    const exEquip  = ['Crane', 'Forklift', 'Excavator', 'Boom Lift', 'Skid Steer'];
    const exCities = ['Houston', 'Dallas', 'San Antonio', 'Austin', 'Arlington'];
    y3 = drawTable(doc, PAD, y3, exEquip, exCities, CW);
    y3 += 18;

    // Exact copy after table
    const p3after =
      'That\'s 25 pages. Each one targets a keyword that almost nobody is competing for. ' +
      'People search for specific equipment in specific cities every single day — and right now, ' +
      'most rental companies aren\'t showing up for any of them.\n\n' +
      'Your office doesn\'t need to be in every city. You just need to be able to serve it.\n\n' +
      'The more cities you stretch into, the more of these keywords you own. And once you rank, ' +
      'that traffic comes in every month without paying for ads.';

    doc.font('Helvetica').fontSize(11).fillColor(C.text)
      .text(p3after, PAD, y3, { width: CW, lineGap: 5 });

    // ════════════════════════════════════════════════════════════════════════
    // PAGE 4 — What This Looks Like for {{company_name}} (personalized only)
    // ════════════════════════════════════════════════════════════════════════
    if (isPersonalized) {
      doc.addPage();
      bgFill(doc, C.offWhite, W, H);

      let y4 = PAD;

      doc.font('Helvetica').fontSize(8).fillColor(C.accent)
        .text('NEXT STEPS', PAD, y4, { characterSpacing: 2 });
      y4 += 20;

      doc.font('Helvetica-Bold').fontSize(22).fillColor(C.text)
        .text(`What This Looks Like for ${companyName || 'Your Company'}`, PAD, y4, { width: CW });
      y4 += doc.heightOfString(`What This Looks Like for ${companyName || 'Your Company'}`, { width: CW }) + 18;

      doc.font('Helvetica').fontSize(11).fillColor(C.text)
        .text(
          'Based on what I found on your site, here\'s what your page map could look like:',
          PAD, y4, { width: CW, lineGap: 5 }
        );
      y4 += doc.heightOfString(
        'Based on what I found on your site, here\'s what your page map could look like:',
        { width: CW, lineGap: 5 }
      ) + 18;

      y4 = drawTable(doc, PAD, y4, equipment, cities, CW);
      y4 += 20;

      doc.font('Helvetica-Bold').fontSize(13).fillColor(C.text)
        .text(
          `That\'s ${totalPages} pages targeting ${totalPages} keywords your competitors aren\'t touching.`,
          PAD, y4, { width: CW }
        );
    }

    // ════════════════════════════════════════════════════════════════════════
    // PAGE 5 — CTA
    // ════════════════════════════════════════════════════════════════════════
    doc.addPage();
    bgFill(doc, C.dark, W, H);
    doc.rect(0, 0, W, 4).fill(C.accent);

    let y5 = PAD + 20;

    // Exact copy — word for word
    const p5body =
      'This is the same approach I used to attract and close deals from people who had never heard of me.\n\n' +
      'I\'ve given you a working blueprint that can start getting results in as little as 2 weeks.\n\n' +
      'You can hand this to someone on your team and have them build it out for you.\n\n' +
      'Or if you\'d like me to walk you through how to set it up, you can book a quick call here:';

    doc.font('Helvetica').fontSize(13).fillColor('#D1D5DB')
      .text(p5body, PAD, y5, { width: CW, lineGap: 6 });
    y5 += doc.heightOfString(p5body, { width: CW, lineGap: 6 }) + 32;

    // CTA button
    const btnW = 200;
    const btnH = 50;
    doc.roundedRect(PAD, y5, btnW, btnH, 8).fill(C.accent);
    doc.font('Helvetica-Bold').fontSize(14).fillColor(C.dark)
      .text('Book a Call →', PAD, y5 + 17, { width: btnW, align: 'center' });
    doc.link(PAD, y5, btnW, btnH, 'https://calendly.com/stanleyagba246/the-goldy-lock-call-breakdown');
    y5 += btnH + 48;

    // Divider
    doc.moveTo(PAD, y5).lineTo(W - PAD, y5).strokeColor('#2D3748').lineWidth(1).stroke();
    y5 += 24;

    // Profile pic + byline — exact copy
    const picSize5 = 52;
    const picPath5 = resolve(ASSETS, 'profile-pic 6.png');
    if (existsSync(picPath5)) {
      doc.save();
      doc.circle(PAD + picSize5 / 2, y5 + picSize5 / 2, picSize5 / 2).clip();
      doc.image(picPath5, PAD, y5, { width: picSize5, height: picSize5 });
      doc.restore();
    }
    const by5X = PAD + picSize5 + 16;
    doc.font('Helvetica-Bold').fontSize(14).fillColor(C.white)
      .text('Agba Stanley', by5X, y5 + 8);
    doc.font('Helvetica').fontSize(11).fillColor(C.accent)
      .text('www.cozyautomation.com', by5X, y5 + 28, { link: 'https://www.cozyautomation.com', underline: false });

    doc.end();
    stream.on('finish', () => resolvePromise({ filePath, filename }));
    stream.on('error', reject);
  });
}

// ── Colorful table renderer ─────────────────────────────────────────────────
function drawTable(doc, x, startY, equipment, cities, totalWidth) {
  const rowColors = [C.row0, C.row1, C.row2, C.row3, C.row4];
  const colCount  = cities.length + 1;
  const colW      = totalWidth / colCount;
  const rowH      = 28;
  const headerH   = 32;

  let y = startY;

  // Header row
  doc.rect(x, y, totalWidth, headerH).fill(C.headerBg);

  // Empty top-left
  doc.rect(x, y, colW, headerH).fill(C.headerBg);

  // City headers
  for (let ci = 0; ci < cities.length; ci++) {
    const cellX = x + colW + ci * colW;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
      .text(cities[ci], cellX, y + (headerH - 9) / 2, { width: colW, align: 'center' });
  }
  y += headerH;

  // Equipment rows
  for (let ri = 0; ri < equipment.length; ri++) {
    const rowColor = rowColors[ri % rowColors.length];

    // Equipment label cell
    doc.rect(x, y, colW, rowH).fill(C.headerBg);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
      .text(equipment[ri], x + 5, y + (rowH - 9) / 2, { width: colW - 10 });

    // City cells
    for (let ci = 0; ci < cities.length; ci++) {
      const cellX = x + colW + ci * colW;
      doc.rect(cellX, y, colW, rowH).fill(rowColor);
      doc.rect(cellX, y, colW, rowH).strokeColor('#CBD5E1').lineWidth(0.5).stroke();

      const label = `${equipment[ri]} Rental in ${cities[ci]}`;
      doc.font('Helvetica').fontSize(6.5).fillColor('#374151')
        .text(label, cellX + 4, y + (rowH - 14) / 2, { width: colW - 8, lineGap: 1 });
    }

    y += rowH;
  }

  return y;
}
