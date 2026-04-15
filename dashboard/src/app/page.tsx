import { getSupabase } from '@/lib/supabase';
import ProspectsTable from '@/components/ProspectsTable';
import type { ProspectAudit, DashboardStats } from '@/types';

async function getData(): Promise<{ prospects: ProspectAudit[]; stats: DashboardStats }> {
  const supabase = getSupabase();

  const [{ data: prospects }, { data: domains }] = await Promise.all([
    supabase.from('prospect_audits').select('*').order('created_at', { ascending: false }),
    supabase.from('domain_audits').select('id, overall_score').not('analyzed_at', 'is', null),
  ]);

  const rows = prospects ?? [];
  const scored = rows.filter((p) => p.overall_score !== null);
  const avgScore =
    scored.length > 0
      ? Math.round(scored.reduce((sum, p) => sum + (p.overall_score ?? 0), 0) / scored.length)
      : 0;

  return {
    prospects: rows,
    stats: {
      totalDomains: (domains ?? []).length,
      totalLeads: rows.length,
      avgScore,
      pdfsGenerated: rows.filter((p) => p.pdf_url).length,
    },
  };
}

function Stat({ value, label, highlight }: { value: string | number; label: string; highlight?: boolean }) {
  return (
    <div className="bg-surface border border-border rounded-lg px-6 py-5">
      <p
        className={`text-4xl font-semibold leading-none mb-2 ${
          highlight ? 'text-emerald-400' : 'text-white'
        }`}
      >
        {value}
      </p>
      <p className="font-mono text-xs text-zinc-600 tracking-widest uppercase">{label}</p>
    </div>
  );
}

export default async function Page() {
  const { prospects, stats } = await getData();

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-xl font-semibold text-white tracking-tight">Audit Dashboard</h1>
            <span className="font-mono text-xs text-accent border border-accent/30 rounded px-2 py-0.5 tracking-widest">
              COZY AUTOMATIONS
            </span>
          </div>
          <span className="font-mono text-xs text-zinc-600">
            {new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat value={stats.totalDomains} label="Domains Audited" />
          <Stat value={stats.totalLeads} label="Total Leads" />
          <Stat value={stats.avgScore > 0 ? `${stats.avgScore}/10` : '—'} label="Avg Score" highlight={stats.avgScore >= 7} />
          <Stat value={stats.pdfsGenerated} label="PDFs Generated" highlight />
        </div>

        {/* Table */}
        {prospects.length === 0 ? (
          <div className="border border-border rounded-lg py-20 text-center">
            <p className="text-zinc-400 font-medium mb-1">No audits yet</p>
            <p className="font-mono text-xs text-zinc-700">Run <code className="text-zinc-500">node src/audit/run-audits.js</code> to generate your first batch</p>
          </div>
        ) : (
          <ProspectsTable prospects={prospects} />
        )}
      </main>
    </div>
  );
}
