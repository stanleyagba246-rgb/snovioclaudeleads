import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import { getSupabase } from '@/lib/supabase';
import type { BusinessInfo } from '@/types';

const FALLBACK_EQUIPMENT = ['Crane', 'Forklift', 'Excavator', 'Boom Lift', 'Skid Steer'];
const FALLBACK_CITIES    = ['Houston', 'Dallas', 'San Antonio', 'Austin', 'Arlington'];
const EXAMPLE_EQUIPMENT  = ['Crane', 'Forklift', 'Excavator', 'Boom Lift', 'Skid Steer'];
const EXAMPLE_CITIES     = ['Houston', 'Dallas', 'San Antonio', 'Austin', 'Arlington'];
const ROW_COLORS         = ['#FEF3C7', '#DBEAFE', '#D1FAE5', '#FCE7F3', '#EDE9FE'];

async function getData(slug: string) {
  const supabase = getSupabase();
  const { data: prospect } = await supabase
    .from('prospect_audits')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (!prospect) return null;

  const { data: domainAudit } = await supabase
    .from('domain_audits')
    .select('business_info')
    .eq('domain', prospect.domain)
    .maybeSingle();

  return {
    prospect,
    businessInfo: (domainAudit?.business_info ?? null) as BusinessInfo | null,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getData(slug);
  if (!data) return { title: 'Report' };
  const name = data.prospect.company_name ?? data.prospect.domain ?? 'Your Company';
  return {
    title: `The Untapped Blue Ocean — ${name}`,
    description: `A custom strategy breakdown for ${name} on how to capture high-intent leads your competitors aren't targeting.`,
  };
}

function StrategyTable({ equipment, cities }: { equipment: string[]; cities: string[] }) {
  return (
    <div className="overflow-x-auto rounded-lg overflow-hidden shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="bg-[#1F2937] text-white text-left px-4 py-3 text-xs font-semibold w-28" />
            {cities.map((city) => (
              <th key={city} className="bg-[#1F2937] text-white text-center px-3 py-3 text-xs font-semibold">
                {city}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {equipment.map((eq, ri) => (
            <tr key={eq}>
              <td className="bg-[#1F2937] text-white px-4 py-2.5 text-xs font-semibold border-t border-white/5">
                {eq}
              </td>
              {cities.map((city) => (
                <td
                  key={city}
                  className="px-2 py-2 text-center border border-slate-200/50"
                  style={{ backgroundColor: ROW_COLORS[ri % ROW_COLORS.length] }}
                >
                  <span className="text-[11px] text-slate-700 font-medium leading-tight block">
                    {eq} Rental in {city}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="font-mono text-[10px] text-amber-500 tracking-[0.22em] uppercase mb-4">
      {children}
    </p>
  );
}

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getData(slug);
  if (!data) notFound();

  const { prospect, businessInfo } = data;
  const firstName   = prospect.first_name ?? '';
  const companyName = prospect.company_name ?? prospect.domain ?? '';
  const equipment   = businessInfo?.equipment?.slice(0, 5) ?? FALLBACK_EQUIPMENT;
  const cities      = businessInfo?.cities?.slice(0, 5) ?? FALLBACK_CITIES;
  const totalPages  = equipment.length * cities.length;
  const isPersonalized = !!(businessInfo?.equipment?.length && businessInfo?.cities?.length);

  const headline = `The Untapped Blue Ocean That Big Rentals Don't Touch — And How ${companyName || 'You'} Can Use It to Hijack Leads in Your Market`;
  const preparedFor = firstName
    ? `Prepared for ${firstName}${companyName ? ` at ${companyName}` : ''}`
    : companyName
    ? `Prepared for ${companyName}`
    : 'Prepared exclusively for you';

  return (
    <div className="bg-white text-[#111827]" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── HERO — full viewport height ── */}
      <section className="min-h-screen bg-[#0B0F1A] flex flex-col justify-center px-6 py-16 border-b-4 border-amber-400 relative">
        <div className="max-w-2xl mx-auto w-full">
          <p className="font-mono text-[10px] text-amber-400 tracking-[0.22em] uppercase mb-5">
            Cozy Automation
          </p>
          <p className="text-sm text-slate-400 mb-7">{preparedFor}</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-[1.15] mb-8">
            {headline}
          </h1>
          <div className="flex items-center gap-3 mt-10">
            <Image
              src="/images/profile-pic.png"
              alt="Agba Stanley"
              width={44}
              height={44}
              className="rounded-full object-cover"
            />
            <div>
              <p className="text-sm font-semibold text-white">Agba Stanley</p>
              <p className="text-xs text-slate-500">Cozy Automation &middot; cozyautomation.com</p>
            </div>
          </div>
        </div>
        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-30">
          <div className="w-px h-8 bg-white animate-pulse" />
        </div>
      </section>

      {/* ── THE PROBLEM ── */}
      <section className="bg-[#f9fafb] px-6 py-16 border-b border-slate-100">
        <div className="max-w-2xl mx-auto">
          <SectionLabel>The Problem</SectionLabel>
          <h2 className="text-3xl font-bold leading-snug mb-7">
            Go search &ldquo;crane rental in Charlotte, NC&rdquo; right now.
          </h2>
          <p className="text-slate-600 leading-relaxed mb-6">
            You&rsquo;ll notice something interesting. Marxim Crane — a small, local company — ranks above
            BigRentz, one of the largest rental marketplaces in the country.
          </p>
          <p className="text-slate-600 leading-relaxed mb-6">
            Scroll a little further and you&rsquo;ll see Ameonline sitting higher than Sunbelt Rentals.
          </p>
          <p className="text-slate-600 leading-relaxed mb-8">
            And here&rsquo;s the kicker — neither of these companies has a particularly well-built website.
          </p>

          {/* Search screenshots */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <Image
              src="/images/search-1.jpg"
              alt="Search results showing local company outranking BigRentz"
              width={600}
              height={400}
              className="rounded-lg w-full object-cover shadow-sm"
            />
            <Image
              src="/images/search-2.jpg"
              alt="Search results showing Ameonline outranking Sunbelt"
              width={600}
              height={400}
              className="rounded-lg w-full object-cover shadow-sm"
            />
          </div>
          <p className="text-xs text-slate-400 text-center mb-8">
            Real Google results. Local operators outranking national chains.
          </p>

          <p className="text-slate-600 leading-relaxed mb-5">
            They&rsquo;re not outspending the big guys. They&rsquo;re not running massive ad campaigns.
            They&rsquo;re just showing up where the big guys aren&rsquo;t.
          </p>
          <p className="text-slate-700 font-medium leading-relaxed">
            Which means smaller rental companies can absolutely compete — and win — against the
            industry giants. You just need to know where the opening is.
          </p>
        </div>
      </section>

      {/* ── THE STRATEGY ── */}
      <section className="bg-white px-6 py-16 border-b border-slate-100">
        <div className="max-w-2xl mx-auto">
          <SectionLabel>The Strategy</SectionLabel>
          <h2 className="text-3xl font-bold leading-snug mb-7">
            One Page Per Equipment &times; City Combo
          </h2>
          <p className="text-slate-600 leading-relaxed mb-5">
            The strategy is dead simple: your website should have one dedicated page for every
            equipment type in every city you can serve.
          </p>
          <p className="text-slate-600 leading-relaxed mb-5">
            Not one page that lists everything. One page per combination.
          </p>
          <p className="text-slate-600 leading-relaxed mb-8">
            Here&rsquo;s what that looks like:
          </p>

          <StrategyTable equipment={EXAMPLE_EQUIPMENT} cities={EXAMPLE_CITIES} />

          <div className="mt-8 space-y-5 text-slate-600 leading-relaxed">
            <p>
              That&rsquo;s 25 pages. Each one targets a keyword that almost nobody is competing for.
              People search for specific equipment in specific cities every single day — and right
              now, most rental companies aren&rsquo;t showing up for any of them.
            </p>
            <p>
              Your office doesn&rsquo;t need to be in every city. You just need to be able to serve it.
            </p>
            <p>
              The more cities you stretch into, the more of these keywords you own. And once you
              rank, that traffic comes in every month without paying for ads.
            </p>
          </div>
        </div>
      </section>

      {/* ── YOUR OPPORTUNITY ── */}
      <section className="bg-[#f9fafb] px-6 py-16 border-b border-slate-100">
        <div className="max-w-2xl mx-auto">
          <SectionLabel>Your Opportunity</SectionLabel>
          <h2 className="text-3xl font-bold leading-snug mb-7">
            What This Looks Like for {companyName || 'Your Company'}
          </h2>

          {isPersonalized ? (
            <>
              <p className="text-slate-600 leading-relaxed mb-8">
                Based on what I found on your site, here&rsquo;s what your page map could look like:
              </p>
              <StrategyTable equipment={equipment} cities={cities} />
              <p className="mt-7 text-lg font-bold text-slate-800">
                That&rsquo;s {totalPages} pages targeting {totalPages} keywords your competitors aren&rsquo;t touching.
              </p>
            </>
          ) : (
            <p className="text-slate-600 leading-relaxed">
              If you rent 4 types of equipment and can serve 5 cities, that&rsquo;s 20 pages — each one
              ranking for a keyword nobody in your market is going after.
            </p>
          )}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-[#0B0F1A] px-6 py-20 border-t-4 border-amber-400">
        <div className="max-w-2xl mx-auto">
          <SectionLabel>Next Step</SectionLabel>

          <div className="space-y-5 text-slate-300 leading-relaxed mb-10 text-base">
            <p>
              This is the same approach I used to attract and close deals from people who had
              never heard of me.
            </p>
            <p>
              I&rsquo;ve given you a working blueprint that can start getting results in as little as
              2 weeks.
            </p>
            <p>
              You can hand this to someone on your team and have them build it out for you.
            </p>
            <p className="text-white font-medium">
              Or if you&rsquo;d like me to walk you through how to set it up, you can book a quick
              call here:
            </p>
          </div>

          <a
            href="https://calendly.com/stanleyagba246/the-goldy-lock-call-breakdown"
            className="inline-block bg-amber-400 text-[#0B0F1A] font-bold text-base px-8 py-4 rounded-lg hover:bg-amber-300 transition-colors"
          >
            Book a Call &rarr;
          </a>

          <div className="mt-16 pt-10 border-t border-white/10 flex items-center gap-4">
            <Image
              src="/images/profile-pic.png"
              alt="Agba Stanley"
              width={52}
              height={52}
              className="rounded-full object-cover flex-shrink-0"
            />
            <div>
              <p className="font-bold text-white">Agba Stanley</p>
              <a
                href="https://cozyautomation.com"
                className="text-sm text-amber-400 hover:underline"
              >
                www.cozyautomation.com
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
