import React from "react";
import { PublicLayout } from "@/components/PublicLayout";

export default function AboutPage() {
  return (
    <PublicLayout>
      {/* Structural Dot Matrix Civic Grid Mask Overlay - Matching Search Page */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none -z-20" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)',
        backgroundSize: '24px 24px'
      }} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-20 relative antialiased text-slate-800">

        {/* Animated gradient orbs - Matching Search Page colors */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-[pulse_6s_ease-in-out_infinite] mix-blend-multiply" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-[pulse_8s_ease-in-out_infinite_1s] mix-blend-multiply" />
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-[pulse_10s_ease-in-out_infinite_2s] mix-blend-multiply" />

        {/* SECTION 1: HERO MANIFESTO */}
        <section aria-labelledby="hero-title" className="relative mb-20">

          {/* Slow Motion Pendulum Balance Scale Graphic */}
          <div className="absolute -top-16 -right-6 md:-right-12 w-64 h-64 md:w-96 md:h-96 text-slate-300/40 dark:text-slate-700/10 pointer-events-none select-none hover:scale-105 transition-transform duration-1000">
            <svg
              viewBox="0 0 400 400"
              aria-hidden="true"
              className="w-full h-full origin-[200px_40px] animate-[swing_5s_ease-in-out_infinite]"
              style={{
                transformOrigin: '200px 40px'
              }}
            >
              <style>{`
                @keyframes swing {
                  0%, 100% { transform: rotate(-5deg); }
                  50% { transform: rotate(5deg); }
                }
              `}</style>

              <line x1="200" y1="40" x2="200" y2="330" stroke="currentColor" strokeWidth="4" />
              <circle cx="200" cy="40" r="10" fill="currentColor" className="text-emerald-500/30" />
              <path d="M 130 330 L 270 330 L 245 360 L 155 360 Z" fill="none" stroke="currentColor" strokeWidth="4" />
              <circle cx="200" cy="90" r="8" fill="currentColor" className="text-emerald-600 animate-pulse" />
              <line x1="80" y1="90" x2="320" y2="90" stroke="currentColor" strokeWidth="5" />
              <line x1="80" y1="90" x2="50" y2="180" stroke="currentColor" strokeWidth="2" />
              <line x1="80" y1="90" x2="110" y2="180" stroke="currentColor" strokeWidth="2" />
              <path d="M 40 180 A 40 30 0 0 0 120 180 Z" fill="none" stroke="currentColor" strokeWidth="3" />
              <line x1="320" y1="90" x2="290" y2="180" stroke="currentColor" strokeWidth="2" />
              <line x1="320" y1="90" x2="350" y2="180" stroke="currentColor" strokeWidth="2" />
              <path d="M 280 180 A 40 30 0 0 0 360 180 Z" fill="none" stroke="currentColor" strokeWidth="3" />
            </svg>
          </div>

          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200/60 backdrop-blur-sm hover:bg-emerald-100 transition-colors cursor-default">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Civic Infrastructure • Transparency First
            </span>
            <h1 id="hero-title" className="mt-6 font-display font-black text-5xl sm:text-6xl md:text-7xl tracking-tight text-slate-900 leading-[0.95] animate-fade-in-up">
              What Was Promised. What Was Delivered. <br/>
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 bg-clip-text text-transparent">
                Track Every Promise.
              </span>
            </h1>
            <p className="mt-8 text-lg sm:text-xl text-slate-600 leading-relaxed font-normal max-w-2xl animate-fade-in-up animation-delay-200">
              TrackMP is a public record of political performance — every campaign promise, every legislative
              action, every project outcome, logged against evidence and open for anyone to inspect. No editorial
              spin, no ranking by opinion. Just a timeline of what was said and what happened next.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="text-xs px-3 py-1.5 bg-slate-100/80 text-slate-600 rounded-full border border-slate-200/50 backdrop-blur-sm font-medium">
                #Accountability
              </span>
              <span className="text-xs px-3 py-1.5 bg-emerald-50/80 text-emerald-700 rounded-full border border-emerald-200/50 backdrop-blur-sm font-medium">
                #EvidenceBased
              </span>
              <span className="text-xs px-3 py-1.5 bg-blue-50/80 text-blue-700 rounded-full border border-blue-200/50 backdrop-blur-sm font-medium">
                #CitizenOversight
              </span>
              <span className="text-xs px-3 py-1.5 bg-amber-50/80 text-amber-700 rounded-full border border-amber-200/50 backdrop-blur-sm font-medium">
                #PoliticalTransparency
              </span>
              <span className="text-xs px-3 py-1.5 bg-purple-50/80 text-purple-700 rounded-full border border-purple-200/50 backdrop-blur-sm font-medium">
                #DemocracyInAction
              </span>
              <span className="text-xs px-3 py-1.5 bg-slate-900 text-white rounded-full font-medium shadow-2xs">
                #FactOverOpinion
              </span>
              <span className="text-xs px-3 py-1.5 bg-teal-50 text-teal-700 rounded-full border border-teal-200/50 font-medium">
                #LegislativeAudit
              </span>
            </div>
          </div>
        </section>

        {/* NEW SECTION: CORE MISSION STATEMENT - The text you requested */}
        <section aria-label="Core Mission" className="mb-24 relative">
          <div className="relative p-8 md:p-12 rounded-3xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/60 shadow-lg hover:shadow-xl transition-shadow duration-500">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500 rounded-t-3xl" />
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-400/5 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-blue-400/5 rounded-full blur-2xl" />
            
            <div className="relative">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-lg">
                    ⚖️
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      Our Mission
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-mono border border-slate-200">
                      non-partisan
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-mono border border-slate-200">
                      neutral
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-mono border border-slate-200">
                      fact-based
                    </span>
                  </div>
                  
                  <h2 className="font-display font-black text-2xl md:text-3xl text-slate-900 tracking-tight mb-4">
                    Objective. Neutral. Fact-Based.
                  </h2>
                  
                  <div className="space-y-4 text-slate-600 leading-relaxed">
                    <p className="text-base">
                      TrackMP is non-partisan by construction. We don't take positions, judge motives, or push narratives—we only report what is publicly documented.
                    </p>
                    <p className="text-base">
                      Democracy thrives on transparency. We invite researchers, data analysts, journalists, and active citizens to join our mission in keeping public officials accountable to the people they serve.
                    </p>
                  </div>
                  
                  <div className="mt-6 flex flex-wrap gap-3 pt-4 border-t border-slate-200/60">
                    <a href="/submit-update" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors group">
                      <span>Join our mission</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </a>
                    <span className="text-slate-300">|</span>
                    <a href="/search" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors group">
                      <span>Explore the data</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </a>
                    <span className="text-slate-300">|</span>
                    <span className="text-xs text-slate-400 font-mono">#TransparencyMatters</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: STATISTICAL SNAPSHOT - Matching Search Page card design */}
        <section aria-label="Platform Statistics" className="mb-24 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {[
            { value: "12K+", label: "Promises Tracked", color: "text-emerald-600", icon: "📋" },
            { value: "847", label: "Representatives", color: "text-amber-600", icon: "👥" },
            { value: "94%", label: "Verification Rate", color: "text-blue-600", icon: "✅" },
            { value: "36", label: "States Covered", color: "text-slate-800", icon: "📍" }
          ].map((stat, i) => (
            <div
              key={i}
              className="group p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200/80 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] cursor-default"
            >
              <div className="text-2xl mb-1 opacity-50 group-hover:opacity-100 transition-opacity">{stat.icon}</div>
              <div className={`text-3xl sm:text-4xl font-display font-black tracking-tight ${stat.color} group-hover:scale-105 transition-transform origin-left`}>
                {stat.value}
              </div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mt-2 font-semibold group-hover:text-slate-600 transition-colors">{stat.label}</div>
            </div>
          ))}
        </section>

        {/* SECTION 3: THE CORE ENGINE (FOUR PILLARS) - Matching Search Page card design */}
        <section aria-labelledby="pillars-title" className="mb-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">/// What We Actually Track</span>
              <p className="text-base text-slate-500 max-w-xl">
                Four categories of evidence, each held to the same rule: if it isn't documented, it isn't on the record.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-[10px] px-2 py-1 bg-slate-100 text-slate-500 rounded-full font-mono">verifiable</span>
                <span className="text-[10px] px-2 py-1 bg-slate-100 text-slate-500 rounded-full font-mono">auditable</span>
                <span className="text-[10px] px-2 py-1 bg-slate-100 text-slate-500 rounded-full font-mono">timestamped</span>
                <span className="text-[10px] px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full font-mono border border-emerald-100">zero-bias</span>
              </div>
            </div>
            <span className="text-sm text-slate-400 font-mono animate-pulse">⬇ scroll</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <article className="group relative p-8 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-100 shadow-sm hover:shadow-xl hover:border-emerald-200/80 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
              <div className="relative">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">Promise Ledger</div>
                <h3 className="mt-3 font-display font-bold text-2xl text-slate-900 group-hover:text-emerald-700 transition-colors">What Was Said.</h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Every campaign commitment, sourced and time-stamped at the moment it was made, then tracked
                  through defined stages from announcement to verified completion — no rhetoric, just status.
                </p>
              </div>
            </article>

            <article className="group relative p-8 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-100 shadow-sm hover:shadow-xl hover:border-amber-200/80 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
              <div className="relative">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-600">Work Log</div>
                <h3 className="mt-3 font-display font-bold text-2xl text-slate-900 group-hover:text-amber-700 transition-colors">What Was Done.</h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Votes, legislative contributions, and project sign-offs, entered chronologically. Every entry
                  carries a source document or public record — nothing goes in on someone's word alone.
                </p>
              </div>
            </article>

            <article className="group relative p-8 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200/80 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
              <div className="relative">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-600">Constituency View</div>
                <h3 className="mt-3 font-display font-bold text-2xl text-slate-900 group-hover:text-blue-700 transition-colors">Where It Happened.</h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Every record is tied to a place. Filter down from national trends to a single state, district,
                  or constituency to see how your own representative is actually performing.
                </p>
              </div>
            </article>

            <article className="group relative p-8 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-300/80 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-slate-800 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-slate-800/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
              <div className="relative">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Editorial Control</div>
                <h3 className="mt-3 font-display font-bold text-2xl text-slate-900 group-hover:text-slate-700 transition-colors">Who Can Add It.</h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Reading the data is open to everyone. Adding to it is not — every submission passes through
                  peer review before publication, so the record stays clean and defensible.
                </p>
              </div>
            </article>
          </div>
        </section>

        {/* SECTION 4: THE LIFECYCLE PIPELINE - Matching Search Page gradient */}
        <section aria-labelledby="pipeline-title" className="mb-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8 md:p-12 rounded-3xl relative overflow-hidden shadow-2xl shadow-slate-900/20">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500 animate-gradient bg-[length:300%_auto]"></div>

          <div className="relative">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">/// From Claim to Record</span>
            <h2 id="pipeline-title" className="font-display font-black text-3xl uppercase tracking-tight">How a Promise Gets Tracked</h2>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-[10px] px-2 py-1 bg-white/5 text-slate-400 rounded-full border border-white/10 font-mono">ingest → verify → publish</span>
              <span className="text-[10px] px-2 py-1 bg-white/5 text-slate-400 rounded-full border border-white/10 font-mono">source-first</span>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
              <div className="hidden md:block absolute top-1/2 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-emerald-500/20 via-amber-500/20 to-emerald-500/20 -translate-y-1/2"></div>

              <div className="group relative pl-6 border-l border-slate-700 hover:border-emerald-400 transition-colors duration-300">
                <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-slate-900 border-2 border-emerald-500 group-hover:scale-125 transition-transform duration-300"></div>
                <span className="font-mono text-xs block text-emerald-400 mb-2">[01 · Ingestion]</span>
                <strong className="text-white block text-base font-semibold mb-2">A Promise Is Logged</strong>
                <p className="text-slate-400 text-sm leading-relaxed">Campaign statements and manifestos are extracted, categorized, and linked to the representative who made them.</p>
                <span className="mt-2 text-[10px] text-slate-500 block font-mono">#DataCollection</span>
              </div>
              <div className="group relative pl-6 border-l border-slate-700 hover:border-amber-400 transition-colors duration-300">
                <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-slate-900 border-2 border-amber-500 group-hover:scale-125 transition-transform duration-300"></div>
                <span className="font-mono text-xs block text-amber-400 mb-2">[02 · Evidence]</span>
                <strong className="text-white block text-base font-semibold mb-2">Action Is Recorded</strong>
                <p className="text-slate-400 text-sm leading-relaxed">Votes, legislative work, and project milestones are appended to that representative's history, each with a source link.</p>
                <span className="mt-2 text-[10px] text-slate-500 block font-mono">#SourceVerification</span>
              </div>
              <div className="group relative pl-6 border-l-2 border-emerald-500/80 hover:border-emerald-400 transition-colors duration-300">
                <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-slate-900 border-2 border-emerald-400 group-hover:scale-125 transition-transform duration-300 animate-pulse"></div>
                <span className="font-mono text-xs block text-emerald-400 mb-2">[03 · Score]</span>
                <strong className="text-white block text-base font-semibold mb-2">A Delivery Index Is Set</strong>
                <p className="text-slate-400 text-sm leading-relaxed">The system aggregates the evidence into a transparent score for the representative and their region.</p>
                <span className="mt-2 text-[10px] text-slate-500 block font-mono">#PerformanceMetric</span>
              </div>
            </div>
          </div>
        </section>
	
        {/* SECTION 6: SUPPORT / FUNDING - Matching Search Page card design */}
        <section aria-labelledby="support-title" className="p-8 md:p-10 rounded-3xl bg-white/80 backdrop-blur-sm border border-slate-100 shadow-sm hover:shadow-xl transition-shadow duration-500">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">/// Independence Has a Cost</span>
              <h2 id="support-title" className="font-display font-black text-2xl md:text-3xl text-slate-900 uppercase tracking-tight">
                Kept Free. Funded By Citizens.
              </h2>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-2xl">
                TrackMP will always be free to read. It takes no money from political parties, candidates, or
                corporations — that's what keeps the record neutral. Verification, hosting, and moderation are
                paid for by small contributions from people who use it. If this platform is useful to you,
                consider chipping in.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">✨ 100% independent</span>
                <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">🔒 No corporate funding</span>
                <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200">❤️ Citizen-powered</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-[10px] px-2 py-1 bg-slate-50 text-slate-500 rounded-full border border-slate-200 font-mono">#CrowdFunded</span>
                <span className="text-[10px] px-2 py-1 bg-slate-50 text-slate-500 rounded-full border border-slate-200 font-mono">#PublicGood</span>
                <span className="text-[10px] px-2 py-1 bg-slate-50 text-slate-500 rounded-full border border-slate-200 font-mono">#OpenAccess</span>
              </div>
            </div>
            <a
              href="/donate"
              className="justify-self-start md:justify-self-end inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-display font-bold uppercase text-xs tracking-wider rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 active:scale-[0.97] transition-all duration-200 whitespace-nowrap group"
            >
              <span>Donate Now</span>
              <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </a>
          </div>
        </section>

      </main>
    </PublicLayout>
  );
}
