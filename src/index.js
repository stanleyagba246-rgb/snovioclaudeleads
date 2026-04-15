import 'dotenv/config';
import { searchProspects, getOrCreateList, getExistingListEmails, addProspectsToList } from './snov.js';
import { qualifyProspects } from './qualify.js';
import { generateReport } from './report.js';

async function main() {
  console.log('=== Lead Qualification Pipeline ===\n');

  // Step 1: Search prospects
  console.log('[1/4] Searching Snov.io for prospects...');
  const prospects = await searchProspects();
  console.log(`  Total prospects found: ${prospects.length}\n`);

  if (prospects.length === 0) {
    console.log('No prospects found. Exiting.');
    return;
  }

  // Step 2: Get or create the list and filter already-added prospects
  console.log('[2/4] Setting up "Equipment Rental" list...');
  const listId = await getOrCreateList();
  const existingEmails = await getExistingListEmails(listId);
  console.log(`  Already in list: ${existingEmails.size} prospects\n`);

  const newProspects = prospects.filter((p) => !existingEmails.has(p.email));
  console.log(`  New prospects to qualify: ${newProspects.length}\n`);

  if (newProspects.length === 0) {
    console.log('No new prospects to process. Exiting.');
    return;
  }

  // Step 3: AI qualification
  console.log('[3/4] Qualifying prospects with Claude AI...');
  const results = await qualifyProspects(newProspects);

  const qualified = results.filter((r) => r.qualified);
  const rejected = results.filter((r) => !r.qualified);

  console.log(`\n  Qualified: ${qualified.length}`);
  console.log(`  Rejected:  ${rejected.length}\n`);

  if (rejected.length > 0) {
    console.log('--- Rejected Prospects ---');
    for (const r of rejected) {
      const name = r.prospect.companyName ?? r.prospect.company ?? r.prospect.email ?? 'Unknown';
      console.log(`  - ${name}: ${r.reason}`);
    }
    console.log('');
  }

  // Step 4: Add qualified prospects to list
  console.log('[4/4] Adding qualified prospects to Snov.io list...');
  const qualifiedProspects = qualified.map((r) => r.prospect);
  const added = await addProspectsToList(listId, qualifiedProspects);

  // Final summary
  console.log('\n=== Summary ===');
  console.log(`  Total pulled from Snov.io : ${prospects.length}`);
  console.log(`  Already in list (skipped) : ${existingEmails.size}`);
  console.log(`  New prospects processed   : ${newProspects.length}`);
  console.log(`  Qualified by AI           : ${qualified.length}`);
  console.log(`  Rejected by AI            : ${rejected.length}`);
  console.log(`  Successfully added to list: ${added}`);
  console.log('');

  // Generate HTML report
  const reportPath = generateReport(qualified, rejected, {
    totalPulled: prospects.length,
    alreadyInList: existingEmails.size,
    newProcessed: newProspects.length,
    qualified: qualified.length,
    rejected: rejected.length,
    added,
  });
  console.log(`  Report saved to: ${reportPath}`);
}

main().catch((err) => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
