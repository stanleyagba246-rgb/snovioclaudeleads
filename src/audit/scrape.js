import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { getDomainAudit, saveDomainScrape } from './db.js';

const CACHE_DIR = resolve(process.cwd(), 'src/audit/.cache');
const FIRECRAWL_URL = 'https://api.firecrawl.dev/v1/scrape';
const RATE_LIMIT_MS = 1500;

function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Local file cache — backup in case Supabase is unavailable
function getLocalCachePath(domain) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  return resolve(CACHE_DIR, `${toSlug(domain)}.json`);
}

function readLocalCache(domain) {
  const path = getLocalCachePath(domain);
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

function writeLocalCache(domain, data) {
  writeFileSync(getLocalCachePath(domain), JSON.stringify(data, null, 2), 'utf8');
}

export async function scrapeWebsite(domain) {
  const url = domain.startsWith('http') ? domain : `https://${domain}`;

  // 1. Check Supabase first — most reliable source of truth
  const existing = await getDomainAudit(domain);
  if (existing?.scraped_content) {
    console.log(`    [supabase cache] ${domain}`);
    return { domain, url, content: existing.scraped_content, scrapedAt: existing.scraped_at };
  }

  // 2. Fall back to local file cache
  const local = readLocalCache(domain);
  if (local?.content) {
    console.log(`    [local cache] ${domain}`);
    return local;
  }

  // 3. Hit Firecrawl
  console.log(`    [firecrawl] ${domain}`);
  try {
    const res = await fetch(FIRECRAWL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true, timeout: 15000 }),
    });

    if (!res.ok) {
      console.warn(`    Warning: Firecrawl ${res.status} for ${domain}`);
      return null;
    }

    const data = await res.json();
    const content = data.data?.markdown ?? data.markdown ?? '';

    if (!content || content.trim().length < 50) {
      console.warn(`    Warning: ${domain} returned thin content — skipping`);
      return null;
    }

    const result = { domain, url, content, scrapedAt: new Date().toISOString() };

    // Persist to both Supabase and local cache
    await saveDomainScrape(domain, content);
    writeLocalCache(domain, result);

    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
    return result;
  } catch (err) {
    console.warn(`    Warning: scrape failed for ${domain}: ${err.message}`);
    return null;
  }
}
