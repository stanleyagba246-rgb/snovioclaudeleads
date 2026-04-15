import { writeFileSync } from 'fs';
import { resolve } from 'path';

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mapLead(r) {
  const p = r.prospect;
  const name = `${p.firstName ?? p.first_name ?? ''} ${p.lastName ?? p.last_name ?? ''}`.trim();
  const company = p.companyName ?? p.company_name ?? p.company ?? '—';
  const domain = p.domain ?? '';
  const title = p.position ?? p.title ?? '—';
  const headcount = p.employeeCount ?? p.employee_count ?? p.companySize ?? p.company_size ?? null;
  const site = domain ? (domain.startsWith('http') ? domain : `https://${domain}`) : null;
  return { name, company, title, domain, site, headcount, reason: r.reason };
}

export function generateReport(qualifiedResults, rejectedResults, summary) {
  const qualified = qualifiedResults.map(mapLead);
  const rejected = rejectedResults.map(mapLead);

  const runDate = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });
  const qualRate = summary.newProcessed > 0
    ? Math.round((summary.qualified / summary.newProcessed) * 100)
    : 0;

  const qualRows = qualified.map((l) => `
    <tr>
      <td>
        <div class="co-name">${esc(l.company)}</div>
        ${l.site
          ? `<a class="co-link" href="${esc(l.site)}" target="_blank" rel="noopener noreferrer">&#8599; ${esc(l.domain)}</a>`
          : '<span class="co-nosite">No domain</span>'}
      </td>
      <td>
        <div class="ct-name">${esc(l.name) || '&mdash;'}</div>
        <div class="ct-title">${esc(l.title)}</div>
      </td>
      <td class="td-center">
        ${l.headcount != null
          ? `<span class="hc-badge">${esc(String(l.headcount))}</span>`
          : '<span class="hc-unknown">&mdash;</span>'}
      </td>
      <td class="td-reason">${esc(l.reason)}</td>
    </tr>`).join('');

  const rejRows = rejected.map((l) => `
    <tr>
      <td>
        <div class="co-name">${esc(l.company)}</div>
        ${l.site
          ? `<a class="co-link" href="${esc(l.site)}" target="_blank" rel="noopener noreferrer">&#8599; ${esc(l.domain)}</a>`
          : '<span class="co-nosite">No domain</span>'}
      </td>
      <td>
        <div class="ct-name">${esc(l.name) || '&mdash;'}</div>
        <div class="ct-title">${esc(l.title)}</div>
      </td>
      <td class="td-reason rej-reason">${esc(l.reason)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lead Dashboard &mdash; Equipment Rental</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;600&family=DM+Sans:ital,wght@0,400;0,500;0,600&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg:          #080808;
      --surface:     #101010;
      --surface2:    #161616;
      --border:      #1e1e1e;
      --border2:     #2a2a2a;
      --text:        #e8e8e8;
      --text2:       #666;
      --text3:       #3a3a3a;
      --accent:      #F59E0B;
      --green:       #22C55E;
      --green-dim:   rgba(34,197,94,0.08);
      --red:         #EF4444;
      --radius:      6px;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'DM Sans', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
    }

    /* ── HEADER ── */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 32px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
    }

    .header-left { display: flex; align-items: baseline; gap: 14px; }

    .header-title {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 26px;
      letter-spacing: 0.06em;
      color: #fff;
      line-height: 1;
    }

    .header-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: var(--accent);
      letter-spacing: 0.18em;
      text-transform: uppercase;
      border: 1px solid rgba(245,158,11,0.4);
      padding: 3px 8px;
      border-radius: 3px;
    }

    .header-right { text-align: right; }

    .run-label {
      display: block;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: var(--text3);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 3px;
    }

    .run-date {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--text2);
    }

    /* ── BODY ── */
    .body { padding: 28px 32px; max-width: 1280px; }

    /* ── STATS ── */
    .stats {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
      margin-bottom: 10px;
    }

    .stat {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px 18px;
      opacity: 0;
      animation: fadeUp 0.35s ease forwards;
    }

    .stat:nth-child(1) { animation-delay: 0.05s; }
    .stat:nth-child(2) { animation-delay: 0.10s; }
    .stat:nth-child(3) { animation-delay: 0.15s; }
    .stat:nth-child(4) { animation-delay: 0.20s; }
    .stat:nth-child(5) { animation-delay: 0.25s; }

    .stat.is-green {
      border-color: rgba(34,197,94,0.2);
      background: var(--green-dim);
    }

    .stat-num {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 42px;
      line-height: 1;
      color: #fff;
      margin-bottom: 4px;
    }

    .stat.is-green .stat-num { color: var(--green); }

    .stat-lbl {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: var(--text3);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    /* ── RATE BAR ── */
    .rate-row {
      display: flex;
      align-items: center;
      gap: 14px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 11px 18px;
      margin-bottom: 24px;
      opacity: 0;
      animation: fadeUp 0.35s ease 0.3s forwards;
    }

    .rate-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: var(--text3);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .rate-track {
      flex: 1;
      height: 3px;
      background: var(--border2);
      border-radius: 2px;
      overflow: hidden;
    }

    .rate-fill {
      height: 100%;
      width: 0;
      background: var(--green);
      border-radius: 2px;
      transition: width 1s cubic-bezier(0.4,0,0.2,1) 0.5s;
    }

    .rate-pct {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 600;
      color: var(--green);
      min-width: 38px;
      text-align: right;
    }

    /* ── TOOLBAR ── */
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .tabs {
      display: flex;
      gap: 2px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 3px;
    }

    .tab {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
      padding: 6px 18px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: var(--text2);
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }

    .tab:hover { color: var(--text); }
    .tab.active { background: var(--surface2); color: #fff; }
    .tab[data-tab="qualified"].active { color: var(--green); }
    .tab[data-tab="rejected"].active  { color: var(--red); }

    /* ── SEARCH ── */
    .search-wrap { position: relative; }

    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text3);
      font-size: 13px;
      pointer-events: none;
      line-height: 1;
    }

    .search-input {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--text);
      padding: 7px 12px 7px 30px;
      width: 230px;
      outline: none;
      transition: border-color 0.15s;
    }

    .search-input::placeholder { color: var(--text3); }
    .search-input:focus { border-color: var(--border2); }

    /* ── TABLE WRAP ── */
    .table-wrap {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      opacity: 0;
      animation: fadeUp 0.35s ease 0.35s forwards;
    }

    /* ── PANELS ── */
    .panel { display: none; }
    .panel.active { display: block; }

    /* ── TABLE ── */
    table { width: 100%; border-collapse: collapse; font-size: 13px; }

    thead th {
      background: var(--surface);
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--text3);
      padding: 10px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }

    thead th.th-c { text-align: center; }

    tbody tr { border-bottom: 1px solid var(--border); transition: background 0.1s; }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: var(--surface2); }
    tbody tr.sr-hidden { display: none; }

    td { padding: 13px 16px; vertical-align: top; }

    .co-name { font-weight: 600; color: #fff; font-size: 13px; margin-bottom: 3px; }

    .co-link {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--accent);
      text-decoration: none;
      opacity: 0.75;
      transition: opacity 0.15s;
    }
    .co-link:hover { opacity: 1; text-decoration: underline; }
    .co-nosite { font-size: 11px; color: var(--text3); }

    .ct-name { font-weight: 500; color: var(--text); font-size: 13px; margin-bottom: 3px; }
    .ct-title { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text2); }

    .td-center { text-align: center; vertical-align: middle; }

    .hc-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 600;
      color: var(--text2);
      background: var(--surface2);
      border: 1px solid var(--border2);
      padding: 3px 11px;
      border-radius: 99px;
      display: inline-block;
    }

    .hc-unknown { color: var(--text3); }

    .td-reason { font-size: 12px; color: var(--text2); line-height: 1.55; max-width: 320px; }
    .rej-reason { color: rgba(239,68,68,0.6); }

    /* ── EMPTY ── */
    .empty {
      padding: 56px;
      text-align: center;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: var(--text3);
      letter-spacing: 0.05em;
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <h1 class="header-title">Equipment Rental Leads</h1>
    <span class="header-badge">AI Qualified</span>
  </div>
  <div class="header-right">
    <span class="run-label">Last run</span>
    <span class="run-date">${runDate}</span>
  </div>
</div>

<div class="body">

  <div class="stats">
    <div class="stat">
      <div class="stat-num">${summary.totalPulled}</div>
      <div class="stat-lbl">Pulled</div>
    </div>
    <div class="stat">
      <div class="stat-num">${summary.alreadyInList}</div>
      <div class="stat-lbl">Skipped</div>
    </div>
    <div class="stat">
      <div class="stat-num">${summary.newProcessed}</div>
      <div class="stat-lbl">Processed</div>
    </div>
    <div class="stat is-green">
      <div class="stat-num">${summary.qualified}</div>
      <div class="stat-lbl">Qualified</div>
    </div>
    <div class="stat">
      <div class="stat-num">${summary.added}</div>
      <div class="stat-lbl">Added to list</div>
    </div>
  </div>

  <div class="rate-row">
    <span class="rate-label">Qualification rate</span>
    <div class="rate-track">
      <div class="rate-fill" id="rateFill"></div>
    </div>
    <span class="rate-pct">${qualRate}%</span>
  </div>

  <div class="toolbar">
    <div class="tabs">
      <button class="tab active" data-tab="qualified">Qualified &nbsp; ${summary.qualified}</button>
      <button class="tab" data-tab="rejected">Rejected &nbsp; ${summary.rejected}</button>
    </div>
    <div class="search-wrap">
      <span class="search-icon">&#9906;</span>
      <input class="search-input" type="text" id="searchInput" placeholder="Search companies&hellip;" />
    </div>
  </div>

  <div class="table-wrap">

    <div class="panel active" id="panel-qualified">
      ${qualified.length === 0
        ? '<div class="empty">No qualified leads this run.</div>'
        : `<table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Contact</th>
            <th class="th-c">Headcount</th>
            <th>Why qualified</th>
          </tr>
        </thead>
        <tbody>${qualRows}</tbody>
      </table>`}
    </div>

    <div class="panel" id="panel-rejected">
      ${rejected.length === 0
        ? '<div class="empty">No rejected leads this run.</div>'
        : `<table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Contact</th>
            <th>Why rejected</th>
          </tr>
        </thead>
        <tbody>${rejRows}</tbody>
      </table>`}
    </div>

  </div>

</div>

<script>
  // Animate rate bar
  window.addEventListener('load', () => {
    setTimeout(() => {
      const fill = document.getElementById('rateFill');
      if (fill) fill.style.width = '${qualRate}%';
    }, 120);
  });

  // Tab switching
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById('panel-' + btn.dataset.tab);
      if (panel) panel.classList.add('active');
      document.getElementById('searchInput').value = '';
      filter('');
    });
  });

  // Search
  document.getElementById('searchInput').addEventListener('input', (e) => {
    filter(e.target.value.toLowerCase().trim());
  });

  function filter(q) {
    const active = document.querySelector('.panel.active');
    if (!active) return;
    active.querySelectorAll('tbody tr').forEach((row) => {
      row.classList.toggle('sr-hidden', q !== '' && !row.textContent.toLowerCase().includes(q));
    });
  }
</script>

</body>
</html>`;

  const outPath = resolve(process.cwd(), 'report.html');
  writeFileSync(outPath, html, 'utf8');
  return outPath;
}
