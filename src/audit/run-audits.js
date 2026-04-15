import 'dotenv/config';
import { resolve } from 'path';
import { getOrCreateList, getListProspects } from '../snov.js';
import { scrapeWebsite } from './scrape.js';
import { extractBusinessInfo } from './extract.js';
import { generatePdf } from './generate-pdf.js';
import { uploadPdf } from './upload.js';
import { getProspectAudit, saveProspectAudit } from './db.js';

function toSlug(str = '') {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const PDF_DIR = resolve(process.cwd(), 'pdfs');

async function main() {
  console.log('=== Audit Pipeline ===\n');

  // Pull all prospects from Snov.io list
  console.log('[1] Fetching prospects from "equipment rentals" list...');
  const listId = await getOrCreateList();
  const allProspects = await getListProspects(listId);
  console.log(`    ${allProspects.length} prospects found\n`);

  if (allProspects.length === 0) {
    console.log('No prospects. Run src/index.js first.');
    return;
  }

  // Drop prospects with no domain
  const withDomain = allProspects.filter((p) => {
    const d = p.domain ?? p.website ?? '';
    return d.length > 0;
  });
  console.log(`    ${allProspects.length - withDomain.length} skipped (no domain)\n`);

  // Group by domain — key insight: one scrape + analysis per domain, one PDF per lead
  const byDomain = {};
  for (const p of withDomain) {
    const domain = (p.domain ?? p.website ?? '').toLowerCase().replace(/^www\./, '');
    if (!byDomain[domain]) byDomain[domain] = [];
    byDomain[domain].push(p);
  }
  const domains = Object.keys(byDomain);
  console.log(`[2] ${domains.length} unique domains across ${withDomain.length} prospects\n`);

  // Stats
  let domainsScraped = 0;
  let domainsExtracted = 0;
  let pdfsGenerated = 0;
  let pdfsUploaded = 0;
  let leadsSkipped = 0;
  const errors = [];

  for (let di = 0; di < domains.length; di++) {
    const domain = domains[di];
    const leads = byDomain[domain];
    const companyName =
      leads[0].companyName ?? leads[0].company_name ?? leads[0].company ?? domain;

    console.log(`[Domain ${di + 1}/${domains.length}] ${companyName} (${domain}) — ${leads.length} lead(s)`);

    // ── Step A: Scrape (once per domain) ──────────────────────────────────────
    const scraped = await scrapeWebsite(domain);
    if (!scraped) {
      console.log(`    Skipped — site unreachable\n`);
      errors.push({ domain, companyName, reason: 'Site unreachable or empty' });
      continue;
    }
    domainsScraped++;

    // ── Step B: Extract business info (once per domain) ───────────────────────
    const businessInfo = await extractBusinessInfo(domain, companyName, scraped.content);
    if (businessInfo) {
      domainsExtracted++;
      console.log(`    Equipment: ${(businessInfo.equipment ?? []).join(', ') || 'n/a'}`);
      console.log(`    Cities: ${(businessInfo.cities ?? []).join(', ') || 'n/a'}`);
    } else {
      console.log(`    Warning: extraction failed — will use generic table`);
    }

    // Use extracted company name if available (better than domain)
    const displayCompanyName = businessInfo?.company_name || companyName;

    // ── Step C: One personalized PDF per lead ──────────────────────────────────
    for (const prospect of leads) {
      const email = prospect.email ?? '';
      const firstName = prospect.firstName ?? prospect.first_name ?? '';
      const lastName = prospect.lastName ?? prospect.last_name ?? '';
      const displayName = firstName || email || domain;

      // Skip if this lead already has a PDF in Supabase
      const existing = await getProspectAudit(email);
      if (existing?.pdf_url) {
        console.log(`    [skip] ${displayName} — already has PDF`);
        leadsSkipped++;
        continue;
      }

      console.log(`    [pdf] Generating for ${displayName}...`);

      // Generate PDF with their first name + personalized table
      let pdfResult;
      try {
        pdfResult = await generatePdf({ domain, ...prospect, companyName: displayCompanyName }, businessInfo, PDF_DIR);
        pdfsGenerated++;
      } catch (err) {
        console.warn(`    Warning: PDF failed for ${displayName}: ${err.message}`);
        errors.push({ domain, companyName, lead: displayName, reason: `PDF: ${err.message}` });
        continue;
      }

      // Upload to Supabase Storage
      let pdfUrl;
      try {
        pdfUrl = await uploadPdf(pdfResult.filePath, pdfResult.filename);
        pdfsUploaded++;
      } catch (err) {
        console.warn(`    Warning: upload failed for ${displayName}: ${err.message}`);
        errors.push({ domain, companyName, lead: displayName, reason: `Upload: ${err.message}` });
        continue;
      }

      // Save record to Supabase DB
      await saveProspectAudit({
        domain,
        companyName: displayCompanyName,
        firstName,
        lastName,
        email,
        pdfUrl,
        pdfFilename: pdfResult.filename,
        overallScore: 0,
      });

      console.log(`    [done] ${displayName} → ${pdfUrl}`);
    }

    console.log('');
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('=== Summary ===');
  console.log(`  Unique domains      : ${domains.length}`);
  console.log(`  Domains scraped     : ${domainsScraped}`);
  console.log(`  Domains extracted   : ${domainsExtracted}`);
  console.log(`  PDFs generated      : ${pdfsGenerated}`);
  console.log(`  PDFs uploaded       : ${pdfsUploaded}`);
  console.log(`  Leads skipped       : ${leadsSkipped}`);
  console.log(`  Errors              : ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n--- Errors ---');
    for (const e of errors) {
      const who = e.lead ? `${e.companyName} / ${e.lead}` : e.companyName;
      console.log(`  - ${who}: ${e.reason}`);
    }
  }
}

main().catch((err) => {
  console.error('Audit pipeline failed:', err);
  process.exit(1);
});
