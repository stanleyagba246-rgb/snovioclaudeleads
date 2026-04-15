import { SNOV_BASE_URL, INDUSTRY_KEYWORDS, COUNTRIES, JOB_TITLES, LIST_NAME, COMPANY_SIZE_MIN, COMPANY_SIZE_MAX } from './config.js';

let cachedToken = null;

export async function getAccessToken() {
  if (cachedToken) return cachedToken;

  const res = await fetch(`${SNOV_BASE_URL}/v1/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.SNOV_CLIENT_ID,
      client_secret: process.env.SNOV_CLIENT_SECRET,
    }),
  });

  if (!res.ok) throw new Error(`Snov.io auth failed: ${res.status} ${await res.text()}`);

  const data = await res.json();
  cachedToken = data.access_token;
  return cachedToken;
}

export async function searchProspects() {
  const token = await getAccessToken();
  const prospects = [];

  for (const keyword of INDUSTRY_KEYWORDS) {
    console.log(`  Searching for keyword: "${keyword}"...`);

    const res = await fetch(`${SNOV_BASE_URL}/v2/leads/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        industry: keyword,
        countries: COUNTRIES,
        positions: JOB_TITLES,
        companySizeFrom: COMPANY_SIZE_MIN,
        companySizeTo: COMPANY_SIZE_MAX,
        limit: 100,
      }),
    });

    if (!res.ok) {
      console.warn(`  Warning: search for "${keyword}" failed: ${res.status} ${await res.text()}`);
      continue;
    }

    const data = await res.json();
    const leads = data.data ?? data.leads ?? [];
    console.log(`  Found ${leads.length} prospects for "${keyword}"`);
    prospects.push(...leads);
  }

  // Deduplicate by email or domain
  const seen = new Set();
  return prospects.filter((p) => {
    const key = p.email ?? p.domain ?? `${p.firstName}${p.lastName}${p.companyName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getOrCreateList() {
  const token = await getAccessToken();

  // v2/lists is the working endpoint for listing
  const listRes = await fetch(`${SNOV_BASE_URL}/v2/lists?access_token=${token}`);
  if (!listRes.ok) throw new Error(`Failed to fetch lists: ${listRes.status} ${await listRes.text()}`);

  const listsData = await listRes.json();
  const lists = listsData.data ?? listsData ?? [];
  const existing = lists.find((l) => l.name?.toLowerCase() === LIST_NAME.toLowerCase());
  if (existing) {
    console.log(`  Using existing list "${existing.name}" (id: ${existing.id})`);
    return existing.id;
  }

  // Create via v2
  const createRes = await fetch(`${SNOV_BASE_URL}/v2/lists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: token, name: LIST_NAME }),
  });

  if (!createRes.ok) throw new Error(`Failed to create list: ${createRes.status} ${await createRes.text()}`);

  const created = await createRes.json();
  const listId = created.data?.id ?? created.id;
  console.log(`  Created new list "${LIST_NAME}" (id: ${listId})`);
  return listId;
}

// Normalise a raw v2 prospect into the shape the rest of the app expects
function normaliseProspect(p) {
  const email = p.emails?.[0]?.email ?? '';
  const domain = email ? email.split('@')[1] ?? '' : '';
  return {
    firstName: p.first_name ?? '',
    lastName:  p.last_name  ?? '',
    email,
    domain,
    // company name isn't returned by the list endpoint — use domain as fallback
    companyName: domain,
  };
}

export async function getExistingListEmails(listId) {
  const token = await getAccessToken();
  const emails = new Set();
  let page = 1;

  while (true) {
    const res = await fetch(
      `${SNOV_BASE_URL}/v2/lists/${listId}/prospects?access_token=${token}&page=${page}&per_page=100`
    );
    if (!res.ok) {
      console.warn(`  Warning: could not fetch existing list leads: ${res.status}`);
      break;
    }
    const data = await res.json();
    const leads = data.data ?? [];
    if (leads.length === 0) break;
    for (const l of leads) {
      const email = l.emails?.[0]?.email;
      if (email) emails.add(email);
    }
    if (leads.length < 100) break;
    page++;
  }
  return emails;
}

export async function getListProspects(listId) {
  const token = await getAccessToken();
  const all = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `${SNOV_BASE_URL}/v2/lists/${listId}/prospects?access_token=${token}&page=${page}&per_page=100`
    );
    if (!res.ok) throw new Error(`Failed to fetch list prospects: ${res.status} ${await res.text()}`);

    const data = await res.json();
    const leads = data.data ?? [];
    if (leads.length === 0) break;
    all.push(...leads.map(normaliseProspect));
    if (leads.length < 100) break;
    page++;
  }
  return all;
}

export async function addProspectsToList(listId, prospects) {
  const token = await getAccessToken();
  let added = 0;

  for (const prospect of prospects) {
    const body = {
      listId,
      email: prospect.email,
      firstName: prospect.firstName ?? prospect.first_name ?? '',
      lastName: prospect.lastName ?? prospect.last_name ?? '',
      companyName: prospect.companyName ?? prospect.company_name ?? prospect.company ?? '',
      position: prospect.position ?? prospect.title ?? '',
      domain: prospect.domain ?? '',
    };

    const res = await fetch(`${SNOV_BASE_URL}/v1/lists/${listId}/leads?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      added++;
    } else {
      console.warn(`  Warning: failed to add ${prospect.email}: ${res.status}`);
    }
  }

  return added;
}
