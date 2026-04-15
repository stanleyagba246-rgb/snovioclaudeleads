# Lead Qualification Automation

## Project Overview
Automated pipeline that pulls equipment rental company prospects from Snov.io, qualifies them using AI, and adds qualified leads to a dedicated "Equipment Rental" list in Snov.io.

## Tech Stack
- **Runtime:** Node.js (ES modules)
- **APIs:** Snov.io REST API, Anthropic Claude API
- **No frontend.** This is a CLI script.

## Environment Variables (.env)
```
SNOV_CLIENT_ID=
SNOV_CLIENT_SECRET=
ANTHROPIC_API_KEY=
```

## How It Works

### Step 1: Authenticate with Snov.io
- POST to `https://api.snov.io/v1/oauth/access_token` with client_id and client_secret
- Cache the access token for subsequent requests

### Step 2: Search Prospects
- Use Snov.io Domain Search or Database Search endpoints
- Search filters:
  - **Industry keywords:** "equipment rental", "equipment leasing", "tool rental", "machinery rental"
  - **Countries:** US, UK, Canada, Australia, New Zealand
  - **Job titles/roles:** CEO, President, Owner, Founder, Managing Director, General Manager, Director of Sales, Director of Marketing, Director of Operations, VP of Sales, VP of Marketing, VP of Operations

### Step 3: AI Qualification
- For each prospect, send company name + domain + any available description to Claude API
- Claude checks: **Is this actually an equipment rental/leasing company?**
- Disqualify: equipment manufacturers, construction companies, dealerships, equipment repair shops, software companies, staffing agencies
- Return: qualified (true/false) + reason

### Step 4: Add to List
- Ensure an "Equipment Rental" list exists in Snov.io (create if not)
- Add all qualified prospects to this list via Snov.io API
- Log: total pulled, total qualified, total added, total rejected with reasons

## File Structure
```
/
├── CLAUDE.md
├── .env
├── package.json
├── src/
│   ├── index.js          # Main entry point - runs the full pipeline
│   ├── snov.js           # Snov.io API client (auth, search, list management)
│   ├── qualify.js         # Claude API qualification logic
│   └── config.js          # Constants (countries, titles, industry keywords)
```

## Usage
```bash
npm install
node src/index.js
```

## Qualification Prompt (for Claude API)
The prompt should be direct:
```
You are a lead qualification assistant. Given a company name and domain, determine if this is an equipment rental or leasing company.

Answer with JSON only: {"qualified": true/false, "reason": "one sentence"}

Qualify: companies that rent or lease construction equipment, heavy machinery, tools, aerial lifts, earthmoving equipment, generators, etc.

Disqualify: equipment manufacturers, equipment dealers/sellers (not rental), construction contractors, software companies, staffing/recruitment, equipment repair/maintenance only, unrelated businesses.
```

## Key Decisions
- Batch Claude API calls (not one at a time) to manage rate limits
- Log all rejections with reasons so Agba can spot-check accuracy
- Default to qualifying borderline cases (better to manually remove a few than miss opportunities)
- Script should be re-runnable without duplicating prospects already in the list

---

# Module 2: Personalized Audit Pipeline (Email 5)

## Overview
For each qualified prospect, generate a hyper-personalized website/SEO/lead-capture audit PDF. The PDF compares their site against top rental companies (Sunbelt Rentals, United Rentals) and gives specific recommendations. Hosted as a link dropped into email 5.

## Tech Stack (additions)
- **Firecrawl API** — scrapes prospect websites
- **ReportLab** (Python) or **pdfkit** (Node.js) — generates branded PDF audits
- **Supabase Storage** — hosts the PDF, generates a public URL

## Environment Variables (add to .env)
```
FIRECRAWL_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
```

## How It Works

### Step 1: Pull Prospects from Equipment Rental List
- Fetch qualified prospects from the "Equipment Rental" list in Snov.io
- For each prospect, extract: company name, domain, contact first name, contact email

### Step 2: Scrape Website with Firecrawl
- Send domain to Firecrawl API
- Extract: page structure, headlines, CTAs, forms/lead capture, services listed, service areas, contact methods, overall content quality

### Step 3: Claude Analyzes & Compares
- Send scraped data to Claude API with this prompt framework:

```
You are a website and sales audit specialist for equipment rental companies.

Given this company's website data, analyze and score (1-10) these areas:
1. **SEO Presence** — Can they be found when someone searches "[city] equipment rental"?
2. **Lead Capture** — Do they have forms, CTAs, quote request buttons, chat widgets?
3. **Follow-up System** — Any sign of email capture, newsletter, retargeting?
4. **Service Clarity** — Is it clear what equipment they rent and where they operate?
5. **Trust Signals** — Reviews, testimonials, certifications, fleet photos?
6. **Mobile Experience** — Is the site usable on phone?

Compare against benchmark: Sunbelt Rentals and United Rentals.

For each area scored below 7, provide ONE specific actionable fix.

Output as JSON:
{
  "company": "...",
  "overall_score": X,
  "categories": [
    {"name": "SEO Presence", "score": X, "finding": "...", "fix": "..."},
    ...
  ],
  "summary": "2-3 sentence executive summary",
  "top_3_quick_wins": ["...", "...", "..."]
}
```

### Step 4: Generate PDF
- Branded PDF with Agba's agency branding
- Sections: Executive Summary, Score Breakdown (with visual score bars), Category Details, Top 3 Quick Wins, "Want help implementing these?" CTA with Calendly link
- Filename: `audit-{company-slug}-{date}.pdf`

### Step 5: Upload & Store
- Upload PDF to Supabase Storage bucket (e.g., `audits/`)
- Generate public URL
- Store the URL alongside the prospect record (log to a local JSON or CSV for now)

### Step 6: Email 5 Copy
The email template:
```
Hey {first_name},

I put together a quick breakdown for {company_name} — no fluff, just what I found looking at your site vs the top rental companies in the game.

Here's your report: {pdf_link}

If anything in there surprises you, I'm around to chat.
```

## File Structure (additions)
```
src/
├── audit/
│   ├── scrape.js         # Firecrawl API client
│   ├── analyze.js        # Claude API audit analysis
│   ├── generate-pdf.js   # PDF generation
│   ├── upload.js          # Supabase Storage upload
│   └── run-audits.js     # Main entry - runs audit pipeline for all qualified leads
```

## Usage
```bash
node src/audit/run-audits.js
```

## Key Decisions
- Rate limit Firecrawl calls (respect their API limits)
- Cache scraped data so re-runs don't re-scrape the same site
- If a site has no content or is down, skip and log — don't generate a useless audit
- PDFs should look professional — this is the prospect's first impression of your work quality
- Batch process: run all audits at once, not one at a time manually

## Future Enhancements (not now)
- Expand to contractor and trade school niches
- Auto-trigger Snov.io email sequences for newly qualified leads
- Schedule as a daily cron job
- Auto-insert PDF link into Snov.io email 5 template via API
