/**
 * Syncs audit landing page URLs back to Snov.io prospects as a custom field.
 * Run after backfill-slugs.js has populated slugs.
 *
 * Usage: SITE_URL=https://yourdomain.com node src/audit/sync-audit-links.js
 * Or for local testing: SITE_URL=http://localhost:3000 node src/audit/sync-audit-links.js
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SITE_URL  = process.env.SITE_URL ?? 'http://localhost:3000';
const SNOV_BASE = 'https://api.snov.io';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ── Snov.io auth ─────────────────────────────────────────────────────────────
let cachedToken = null;
async function getToken() {
  if (cachedToken) return cachedToken;
  const res = await fetch(`${SNOV_BASE}/v1/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.SNOV_CLIENT_ID,
      client_secret: process.env.SNOV_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Snov.io auth failed: ${res.status}`);
  const data = await res.json();
  cachedToken = data.access_token;
  return cachedToken;
}

// ── Update a single prospect's custom field in Snov.io ───────────────────────
async function updateProspect(email, auditUrl) {
  const token = await getToken();

  const res = await fetch(`${SNOV_BASE}/v1/edit-prospect-custom-fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: token,
      email,
      customFields: [
        { identifier: 'audit_link', value: auditUrl },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  return await res.json();
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`=== Sync Audit Links to Snov.io ===`);
  console.log(`Site URL: ${SITE_URL}\n`);

  // Pull all prospects that have a slug and an email
  const { data: rows, error } = await supabase
    .from('prospect_audits')
    .select('email, slug, company_name, first_name')
    .not('slug', 'is', null)
    .not('email', 'is', null);

  if (error) throw new Error(`Supabase fetch failed: ${error.message}`);
  console.log(`Found ${rows.length} prospects with slugs\n`);

  let updated = 0;
  let failed  = 0;

  for (const row of rows) {
    const auditUrl = `${SITE_URL}/${row.slug}`;
    const label = `${row.company_name ?? ''} / ${row.first_name ?? ''} (${row.email})`;

    try {
      await updateProspect(row.email, auditUrl);
      console.log(`  [ok] ${label}`);
      console.log(`       → ${auditUrl}`);
      updated++;
    } catch (err) {
      console.warn(`  [fail] ${label}: ${err.message}`);
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`\nDone. Updated: ${updated}  Failed: ${failed}`);
}

main().catch((err) => {
  console.error('Sync failed:', err.message);
  process.exit(1);
});
