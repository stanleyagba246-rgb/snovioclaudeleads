import Anthropic from '@anthropic-ai/sdk';
import { getDomainAudit, saveDomainAnalysis } from './db.js';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a website and sales audit specialist for equipment rental companies.

Given a company's website content, analyze and score (1-10) these six areas:
1. SEO Presence — Can they be found when someone searches "[city] equipment rental"?
2. Lead Capture — Do they have forms, CTAs, quote request buttons, chat widgets?
3. Follow-up System — Any sign of email capture, newsletter, retargeting?
4. Service Clarity — Is it clear what equipment they rent and where they operate?
5. Trust Signals — Reviews, testimonials, certifications, fleet photos?
6. Mobile Experience — Based on the content structure, is the site likely usable on phone?

Compare against benchmark: Sunbelt Rentals and United Rentals.
For each area scored below 7, provide ONE specific actionable fix.

Output ONLY valid JSON — no markdown, no explanation:
{
  "company": "...",
  "overall_score": 0,
  "categories": [
    {"name": "SEO Presence", "score": 0, "finding": "...", "fix": "..."},
    {"name": "Lead Capture", "score": 0, "finding": "...", "fix": "..."},
    {"name": "Follow-up System", "score": 0, "finding": "...", "fix": "..."},
    {"name": "Service Clarity", "score": 0, "finding": "...", "fix": "..."},
    {"name": "Trust Signals", "score": 0, "finding": "...", "fix": "..."},
    {"name": "Mobile Experience", "score": 0, "finding": "...", "fix": "..."}
  ],
  "summary": "2-3 sentence executive summary",
  "top_3_quick_wins": ["...", "...", "..."]
}`;

export async function analyzeWebsite(domain, companyName, scrapedContent) {
  // Check Supabase — if this domain was already analyzed, return cached result
  const existing = await getDomainAudit(domain);
  if (existing?.audit_json) {
    console.log(`    [supabase cache] analysis for ${domain}`);
    return existing.audit_json;
  }

  console.log(`    [claude] analyzing ${domain}`);

  const userMessage = `Company: ${companyName}\nDomain: ${domain}\n\nWebsite content:\n${scrapedContent.slice(0, 8000)}`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = message.content[0]?.text ?? '';
    const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const result = JSON.parse(clean);

    if (!result.overall_score || result.overall_score === 0) {
      const scores = result.categories.map((c) => c.score);
      result.overall_score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    // Persist to Supabase so this domain is never analyzed again
    await saveDomainAnalysis(domain, result);
    return result;
  } catch (err) {
    console.warn(`    Warning: analysis failed for ${companyName}: ${err.message}`);
    return null;
  }
}
