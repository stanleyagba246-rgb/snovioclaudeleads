'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, ExternalLink, FileText, Link2 } from 'lucide-react';
import type { ProspectAudit } from '@/types';

interface Props {
  prospects: ProspectAudit[];
}

type Filter = 'all' | 'good' | 'weak';

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-zinc-600 font-mono text-sm">—</span>;

  const color =
    score >= 7
      ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
      : score >= 4
      ? 'text-amber-400 bg-amber-400/10 border-amber-400/20'
      : 'text-red-400 bg-red-400/10 border-red-400/20';

  return (
    <span className={`inline-flex items-center font-mono font-semibold text-sm px-2.5 py-1 rounded border ${color}`}>
      {score}/10
    </span>
  );
}

export default function ProspectsTable({ prospects }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    return prospects.filter((p) => {
      const q = query.toLowerCase();
      const matchesSearch =
        !q ||
        (p.company_name ?? '').toLowerCase().includes(q) ||
        (p.first_name ?? '').toLowerCase().includes(q) ||
        (p.last_name ?? '').toLowerCase().includes(q) ||
        (p.email ?? '').toLowerCase().includes(q) ||
        (p.domain ?? '').toLowerCase().includes(q);

      const score = p.overall_score ?? 0;
      const matchesFilter =
        filter === 'all' ||
        (filter === 'good' && score >= 7) ||
        (filter === 'weak' && score < 7);

      return matchesSearch && matchesFilter;
    });
  }, [prospects, query, filter]);

  const tabs: { key: Filter; label: string }[] = [
    { key: 'all', label: `All  ${prospects.length}` },
    { key: 'good', label: `Good (7+)  ${prospects.filter((p) => (p.overall_score ?? 0) >= 7).length}` },
    { key: 'weak', label: `Needs work  ${prospects.filter((p) => (p.overall_score ?? 0) < 7 && p.overall_score !== null).length}` },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`font-mono text-xs px-4 py-2 rounded-md transition-colors whitespace-nowrap ${
                filter === tab.key
                  ? 'bg-surface2 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
          <input
            type="text"
            placeholder="Search companies, names, emails…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:w-72 bg-surface border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm font-mono text-zinc-200 placeholder-zinc-600 outline-none focus:border-border2 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-mono text-sm text-zinc-600">No results</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="text-left font-mono text-xs text-zinc-600 tracking-widest uppercase px-5 py-3">
                    Company
                  </th>
                  <th className="text-left font-mono text-xs text-zinc-600 tracking-widest uppercase px-5 py-3">
                    Lead
                  </th>
                  <th className="text-left font-mono text-xs text-zinc-600 tracking-widest uppercase px-5 py-3">
                    Score
                  </th>
                  <th className="text-left font-mono text-xs text-zinc-600 tracking-widest uppercase px-5 py-3">
                    PDF
                  </th>
                  <th className="text-left font-mono text-xs text-zinc-600 tracking-widest uppercase px-5 py-3">
                    Report Link
                  </th>
                  <th className="text-left font-mono text-xs text-zinc-600 tracking-widest uppercase px-5 py-3 hidden lg:table-cell">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.03 }}
                    className="hover:bg-surface2 transition-colors"
                  >
                    {/* Company */}
                    <td className="px-5 py-4 align-top">
                      <p className="font-semibold text-white leading-tight">
                        {p.company_name ?? '—'}
                      </p>
                      {p.domain && (
                        <a
                          href={`https://${p.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs text-accent opacity-70 hover:opacity-100 transition-opacity mt-0.5"
                        >
                          {p.domain}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>

                    {/* Lead */}
                    <td className="px-5 py-4 align-top">
                      <p className="text-zinc-200">
                        {[p.first_name, p.last_name].filter(Boolean).join(' ') || '—'}
                      </p>
                      {p.email && (
                        <p className="font-mono text-xs text-zinc-600 mt-0.5">{p.email}</p>
                      )}
                    </td>

                    {/* Score */}
                    <td className="px-5 py-4 align-middle">
                      <ScoreBadge score={p.overall_score} />
                    </td>

                    {/* PDF */}
                    <td className="px-5 py-4 align-middle">
                      {p.pdf_url ? (
                        <a
                          href={p.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-mono text-xs text-accent border border-accent/30 rounded px-3 py-1.5 hover:bg-accent/10 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          View PDF
                        </a>
                      ) : (
                        <span className="font-mono text-xs text-zinc-700">Not generated</span>
                      )}
                    </td>

                    {/* Report Link */}
                    <td className="px-5 py-4 align-middle">
                      {p.slug ? (
                        <a
                          href={`/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-mono text-xs text-emerald-400 border border-emerald-400/30 rounded px-3 py-1.5 hover:bg-emerald-400/10 transition-colors"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          {p.slug}
                        </a>
                      ) : (
                        <span className="font-mono text-xs text-zinc-700">No slug</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 align-middle hidden lg:table-cell">
                      <span className="font-mono text-xs text-zinc-600">
                        {new Date(p.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
