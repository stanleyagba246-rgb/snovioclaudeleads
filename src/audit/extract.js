import Anthropic from '@anthropic-ai/sdk';
import { getDomainAudit, saveBusinessInfo } from './db.js';

const client = new Anthropic();

export async function extractBusinessInfo(domain, fallbackName, scrapedContent) {
  // Return cached result if already extracted
  const existing = await getDomainAudit(domain);
  if (existing?.business_info) {
    console.log(`    [supabase cache] business info for ${domain}`);
    return existing.business_info;
  }

  console.log(`    [extract] equipment + cities for ${domain}`);

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Extract information from this equipment rental company's website content.

Domain: ${domain}

Content:
${scrapedContent.slice(0, 4000)}

Return ONLY a valid JSON object with NO extra text before or after:
{
  "company_name": "",   // the real business name from the website (not the domain)
  "equipment": [],      // max 5 equipment types they RENT (short title-case names e.g. "Crane", "Boom Lift", "Excavator")
  "cities": [],         // REQUIRED: 4-5 city names they serve. If not stated, use nearby cities based on their address/state. NEVER leave empty.
  "primary_city": "",   // their main city
  "state": ""           // 2-letter state abbreviation e.g. "TX"
}

Rules:
- company_name: use the actual business name shown on the site, not the URL
- equipment: only what they RENT, not sell or repair. Short names only.
- cities: THIS IS REQUIRED. Always return 4-5 real city names. If the site doesn't list service areas, look for their address or phone area code and pick nearby cities. Never return an empty array.
- Keep equipment to max 5 items, cities to max 5 items.`,
      }],
    });

    const text = message.content[0]?.text ?? '';
    // Extract just the first {...} block to handle any trailing text
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON object found in response');
    const result = JSON.parse(match[0]);

    // Ensure cities is never empty — use a safe fallback
    if (!result.cities || result.cities.length === 0) {
      result.cities = [];
    }
    // Filter out any "n/a" placeholder values
    result.cities    = (result.cities    ?? []).filter(c => c && c.toLowerCase() !== 'n/a');
    result.equipment = (result.equipment ?? []).filter(e => e && e.toLowerCase() !== 'n/a');

    await saveBusinessInfo(domain, result);
    return result;
  } catch (err) {
    console.warn(`    Warning: extraction failed for ${domain}: ${err.message}`);
    return null;
  }
}
