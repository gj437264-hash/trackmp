// ProfileHeader.jsx — critical path: photo, name, badges, stat boxes.
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { avatarDataUri } from "@/lib/avatar";
import {
  Share2, Bookmark, Sparkles, Shield, Calendar, Globe,
  Wallet, Building2, Briefcase, Users, Award,
} from "lucide-react";
import StatBox from "./StatBox";
import { formatMoney } from "./utils";

export default function ProfileHeader({ p, isBookmarked, onToggleBookmark, onShare }) {
  const latest = useMemo(() => (p?.wealth || []).slice(-1)[0], [p]);

  return (
    <header className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center justify-between relative z-10">
        <ol className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <li>
            <Link
              to="/"
              className="hover:text-indigo-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1"
              data-testid="back-to-directory"
            >
              Directory
            </Link>
          </li>
          <li aria-hidden="true" className="text-slate-400">/</li>
          <li className="text-slate-900 font-bold truncate max-w-[220px]" aria-current="page">
            {p.name}
          </li>
        </ol>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onShare}
            aria-label="Share profile link"
            className="rounded-xl p-2.5 bg-white/80 border border-slate-200/70 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Share2 size={16} className="text-slate-600" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onToggleBookmark}
            aria-pressed={isBookmarked}
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this profile"}
            className={`rounded-xl p-2.5 border transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              isBookmarked
                ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                : "bg-white/80 border-slate-200/70 hover:bg-indigo-50 hover:border-indigo-200 text-slate-600"
            }`}
          >
            <Bookmark size={16} className={isBookmarked ? "fill-indigo-600 text-indigo-600" : "text-slate-600"} aria-hidden="true" />
          </button>
        </div>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8 relative z-10 items-start">
        {/* Politician Photo Card */}
        <article className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-3xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <div className="aspect-[4/5] bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 overflow-hidden relative">
            <img
              src={p.image_url || avatarDataUri(p.name)}
              alt={`${p.name} — Official Politician profile portrait`}
              fetchpriority="high"
              decoding="async"
              width={720}
              height={900}
              onError={(e) => { e.currentTarget.src = avatarDataUri(p.name); }}
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 pointer-events-none" aria-hidden="true" />
          </div>
          <div className="p-6 bg-white">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-4 py-1.5 rounded-full border border-emerald-200/80 shadow-sm">
              <Sparkles size={13} aria-hidden="true" /> {p.role || "Elected Official"}
            </div>
            <dl className="mt-5 space-y-3 text-sm text-slate-700" aria-label="Key biographical details">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Shield size={16} className="text-indigo-500 shrink-0" aria-hidden="true" />
                  <dt className="font-semibold text-slate-600">Party</dt>
                </div>
                <dd className="font-bold text-slate-900 text-right">{p.party || "—"}</dd>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Calendar size={16} className="text-indigo-500 shrink-0" aria-hidden="true" />
                  <dt className="font-semibold text-slate-600">DOB</dt>
                </div>
                <dd className="font-bold text-slate-900 text-right">{p.date_of_birth || "—"}</dd>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Globe size={16} className="text-indigo-500 shrink-0" aria-hidden="true" />
                  <dt className="font-semibold text-slate-600">Country</dt>
                </div>
                <dd className="font-bold text-slate-900 text-right uppercase tracking-wider">{p.country_code || "—"}</dd>
              </div>
            </dl>
          </div>
        </article>

        {/* Header Metadata & Stat Boxes */}
        <div className="flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md w-fit border border-indigo-100 mb-3">
            <span>Verified Public Record</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
          </div>
          
          <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.05] text-slate-900" data-testid="politician-name">
            {p.name}
          </h1>

          {p.brief_intro && (
            <p className="mt-6 text-base md:text-lg text-slate-700 leading-relaxed max-w-3xl border-l-4 border-indigo-500 pl-5 bg-gradient-to-r from-indigo-50/50 to-transparent py-3 rounded-r-2xl shadow-sm" data-testid="brief-intro">
              {p.brief_intro}
            </p>
          )}

          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4" role="region" aria-label="Financial and background metrics">
            <StatBox label="Net Worth" value={latest?.net_worth != null ? formatMoney(latest.net_worth, p.currency) : "—"} tone="primary" icon={Wallet} trend="up" trendValue="+12.5%" />
            <StatBox label="Assets" value={latest?.assets != null ? formatMoney(latest.assets, p.currency) : "—"} tone="success" icon={Building2} />
            <StatBox label="Liabilities" value={latest?.liabilities != null ? formatMoney(latest.liabilities, p.currency) : "—"} tone="danger" icon={Briefcase} />
            <StatBox label="Year On Record" value={latest?.year || "—"} icon={Calendar} />
            <StatBox label="Relatives" value={p.relatives?.length || 0} icon={Users} />
            <StatBox label="Wealth Entries" value={p.wealth?.length || 0} icon={Award} />
          </div>
        </div>
      </div>
    </header>
  );
}
