/**
 * One-time backfill: adds a slug to every prospect_audits row that doesn't have one.
 * Run AFTER adding the slug column in Supabase:
 *
 *   alter table prospect_audits add column if not exists slug text unique;
 *   create index if not exists idx_prospect_audits_slug on prospect_audits(slug);
 *
 * Usage: node src/audit/backfill-slugs.js
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

function toSlug(str = '') {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  // Fetch all rows without a slug
  const { data: rows, error } = await supabase
    .from('prospect_audits')
    .select('id, company_name, first_name, domain, slug')
    .is('slug', null);

  if (error) throw new Error(`Fetch failed: ${error.message}`);
  console.log(`Found ${rows.length} rows without a slug\n`);

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const base = toSlug(row.company_name || row.domain || '');
    const name = toSlug(row.first_name || '');
    const slug = [base, name].filter(Boolean).join('-');

    if (!slug) {
      console.log(`  [skip] id=${row.id} — no company name or domain`);
      skipped++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('prospect_audits')
      .update({ slug })
      .eq('id', row.id);

    if (updateError) {
      // Likely a unique conflict — another row already has this slug
      const unique = `${slug}-${row.id.slice(0, 6)}`;
      const { error: retryError } = await supabase
        .from('prospect_audits')
        .update({ slug: unique })
        .eq('id', row.id);

      if (retryError) {
        console.warn(`  [error] id=${row.id}: ${retryError.message}`);
        skipped++;
      } else {
        console.log(`  [updated] ${slug} → conflict, saved as ${unique}`);
        updated++;
      }
    } else {
      console.log(`  [updated] id=${row.id} → ${slug}`);
      updated++;
    }
  }

  console.log(`\nDone. Updated: ${updated}  Skipped: ${skipped}`);
  console.log('\nSample URLs:');
  const { data: sample } = await supabase
    .from('prospect_audits')
    .select('slug, company_name, first_name')
    .not('slug', 'is', null)
    .limit(5);
  for (const r of sample ?? []) {
    console.log(`  localhost:3000/${r.slug}  (${r.company_name ?? ''} / ${r.first_name ?? ''})`);
  }
}

main().catch((err) => {
  console.error('Backfill failed:', err.message);
  process.exit(1);
});
