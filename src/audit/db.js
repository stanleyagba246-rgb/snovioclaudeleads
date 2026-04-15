import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

// ── Domain level (shared across all leads on the same domain) ─────────────────

export async function getDomainAudit(domain) {
  const { data } = await getSupabase()
    .from('domain_audits')
    .select('*')
    .eq('domain', domain)
    .maybeSingle();
  return data ?? null;
}

export async function saveDomainScrape(domain, scrapedContent) {
  const { data, error } = await getSupabase()
    .from('domain_audits')
    .upsert(
      { domain, scraped_content: scrapedContent, scraped_at: new Date().toISOString() },
      { onConflict: 'domain' }
    )
    .select()
    .single();
  if (error) throw new Error(`saveDomainScrape failed: ${error.message}`);
  return data;
}

export async function saveDomainAnalysis(domain, auditJson) {
  const { data, error } = await getSupabase()
    .from('domain_audits')
    .upsert(
      {
        domain,
        audit_json: auditJson,
        overall_score: Math.round(auditJson.overall_score),
        analyzed_at: new Date().toISOString(),
      },
      { onConflict: 'domain' }
    )
    .select()
    .single();
  if (error) throw new Error(`saveDomainAnalysis failed: ${error.message}`);
  return data;
}

// ── Prospect level (per lead — personalized PDF) ──────────────────────────────

export async function getProspectAudit(email) {
  if (!email) return null;
  const { data } = await getSupabase()
    .from('prospect_audits')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  return data ?? null;
}

export async function saveBusinessInfo(domain, businessInfo) {
  const { error } = await getSupabase()
    .from('domain_audits')
    .upsert(
      { domain, business_info: businessInfo },
      { onConflict: 'domain' }
    );
  if (error) throw new Error(`saveBusinessInfo failed: ${error.message}`);
}

export async function saveProspectAudit({ domain, companyName, firstName, lastName, email, pdfUrl, pdfFilename, overallScore }) {
  const { data, error } = await getSupabase()
    .from('prospect_audits')
    .upsert(
      {
        domain,
        company_name: companyName,
        first_name: firstName,
        last_name: lastName,
        email,
        pdf_url: pdfUrl,
        pdf_filename: pdfFilename,
        overall_score: Math.round(overallScore),
      },
      { onConflict: 'email' }
    )
    .select()
    .single();
  if (error) throw new Error(`saveProspectAudit failed: ${error.message}`);
  return data;
}
