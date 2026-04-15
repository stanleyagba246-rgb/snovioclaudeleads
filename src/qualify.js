import Anthropic from '@anthropic-ai/sdk';
import { BATCH_SIZE } from './config.js';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a lead qualification assistant. Given a company name, domain, and available info, determine if this is a good lead.

Answer with JSON only: {"qualified": true/false, "reason": "one sentence"}

Qualify if ALL of the following are true:
1. The company rents or leases equipment (construction equipment, heavy machinery, tools, aerial lifts, earthmoving equipment, generators, etc.)
2. The company appears to be small — 50 or fewer employees (regional operator, local rental yard, small fleet)

Disqualify if ANY of the following are true:
- Equipment manufacturer, dealer, or seller (not rental)
- Construction contractor (they use equipment, not rent it out)
- Software, staffing, repair/maintenance-only, or unrelated business
- Large national chain or enterprise-scale operation (e.g. United Rentals, Sunbelt, RSC) — too big`;

async function qualifyOne(prospect) {
  const companyName = prospect.companyName ?? prospect.company_name ?? prospect.company ?? 'Unknown';
  const domain = prospect.domain ?? '';
  const description = prospect.description ?? prospect.snippet ?? '';

  const employeeCount = prospect.employeeCount ?? prospect.employee_count ?? prospect.companySize ?? prospect.company_size ?? null;
  const userMessage = `Company: ${companyName}\nDomain: ${domain}${employeeCount != null ? `\nEmployees: ${employeeCount}` : ''}${description ? `\nDescription: ${description}` : ''}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = message.content[0]?.text ?? '';
    const result = JSON.parse(text);
    return { prospect, qualified: result.qualified, reason: result.reason };
  } catch (err) {
    // On parse error or API error, default to qualified (per key decision)
    console.warn(`  Warning: qualification failed for ${companyName}: ${err.message}`);
    return { prospect, qualified: true, reason: 'Defaulted to qualified due to API/parse error' };
  }
}

export async function qualifyProspects(prospects) {
  const results = [];
  const batches = [];

  for (let i = 0; i < prospects.length; i += BATCH_SIZE) {
    batches.push(prospects.slice(i, i + BATCH_SIZE));
  }

  console.log(`  Processing ${prospects.length} prospects in ${batches.length} batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < batches.length; i++) {
    console.log(`  Batch ${i + 1}/${batches.length}...`);
    const batchResults = await Promise.all(batches[i].map(qualifyOne));
    results.push(...batchResults);
  }

  return results;
}
