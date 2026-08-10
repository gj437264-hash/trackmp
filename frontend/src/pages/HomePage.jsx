import React, { useEffect, useRef, useState, useMemo, useCallback, memo } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { avatarDataUri } from "@/lib/avatar";
import { PublicLayout } from "@/components/PublicLayout";
import {
  Search, ArrowRight, TrendingUp, TrendingDown, Users, Award,
  Globe, CheckCircle2, XCircle, Clock, MapPin, Shield, BookOpen, Target,
  BarChart3, PieChart as PieChartIcon, Flag, Handshake,
  AlertTriangle, X, Scale, FileSearch, Landmark,
  Sparkles, Zap, Star, ExternalLink, ChevronRight,
  Activity, Layers, GitBranch, Cpu, Database, Lock
} from "lucide-react";
import { useCountUp } from "@/lib/useCountUp";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Reveal } from "./extensions/homepage/Reveal";
import { useSEO } from "./extensions/homepage/useSEO";
import "./extensions/homepage/homepage.css";

/* ------------------------------------------------------------------ */
/* Security helpers                                                    */
/* ------------------------------------------------------------------ */

function isSafeImageUrl(url) {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.length === 0 || trimmed.length > 2048) return false;
  try {
    if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(trimmed)) return true;
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
    const parsed = new URL(trimmed, window.location.origin);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function safeImageSrc(url, name) {
  return isSafeImageUrl(url) ? url : avatarDataUri(name);
}

function clampPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/* ------------------------------------------------------------------ */
/* Perf helper: lazy-mount offscreen sections via IntersectionObserver */
/* ------------------------------------------------------------------ */

function useInView(rootMargin = "240px 0px") {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) return;
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return [ref, inView];
}

const LazySection = memo(function LazySection({ children, minHeight = 240 }) {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      style={!inView ? { minHeight, contentVisibility: "auto", containIntrinsicSize: `${minHeight}px` } : undefined}
    >
      {inView ? children : null}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Loading skeletons                                                   */
/* ------------------------------------------------------------------ */

const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl h-80 overflow-hidden shadow-sm">
      <div className="h-48 skeleton-shimmer" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-slate-100 rounded w-1/3 animate-pulse" />
        <div className="h-3 bg-slate-100 rounded w-3/4 animate-pulse" />
        <div className="h-3 bg-slate-100 rounded w-1/2 animate-pulse" />
      </div>
    </div>
  );
});

const SkeletonLeaderboard = memo(function SkeletonLeaderboard() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" role="status" aria-label="Loading leaderboard">
      <span className="sr-only">Loading leaderboard…</span>
      <div className="space-y-3" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, j) => (
          <div key={j} className="h-20 bg-slate-100 rounded-xl skeleton-shimmer" />
        ))}
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Error banner                                                        */
/* ------------------------------------------------------------------ */

const ApiErrorBanner = memo(function ApiErrorBanner({ message, onDismiss }) {
  return (
    <div className="error-banner flex items-start gap-3 mb-6 rounded-2xl border border-rose-200 bg-rose-50/80 backdrop-blur-sm p-4 shadow-sm" role="alert" aria-live="assertive" data-testid="api-error-banner">
      <AlertTriangle size={18} className="shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-semibold text-rose-900">Unable to load data</p>
        <p className="text-rose-600/80 text-xs mt-0.5">{message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="p-1 rounded-lg hover:bg-rose-100 transition-colors"
        aria-label="Dismiss error"
        data-testid="dismiss-error-button"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Editorial ribbon ticker — pure CSS animation, zero JS overhead      */
/* ------------------------------------------------------------------ */

const LiveTicker = memo(function LiveTicker({ items }) {
  const doubled = useMemo(() => (items?.length ? [...items, ...items] : []), [items]);
  if (!items?.length) return null;
  return (
    <div
      className="relative overflow-hidden border-y border-slate-200/60 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 py-3.5 backdrop-blur-sm"
      aria-label="Recently added politicians ticker"
      data-testid="live-ticker"
    >
      {/* Edge fade masks — pure CSS, replaces any JS-driven fade logic */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent z-10" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent z-10" aria-hidden="true" />
      <div className="flex gap-24 whitespace-nowrap animate-marquee" style={{ width: "max-content" }} aria-hidden="true">
        {doubled.map((p, i) => (
          <Link
            key={`${p.id}-${i}`}
            to={`/politicians/${encodeURIComponent(p.id)}`}
            tabIndex={-1}
            className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ticker-pulse shrink-0 shadow-lg shadow-emerald-500/30" />
            {p.name}
            <span className="text-slate-300">/</span>
            <span className="text-slate-400 font-normal normal-case tracking-normal">{p.party || "Independent"}</span>
          </Link>
        ))}
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Cards                                                               */
/* ------------------------------------------------------------------ */

const PoliticianCard = memo(function PoliticianCard({ p, index }) {
  const img = safeImageSrc(p.image_url, p.name);
  const staggerDelay = Math.min(index, 8) * 60;
  return (
    <Reveal as="div" delay={staggerDelay} once className="h-full">
      <Link
        to={`/politicians/${encodeURIComponent(p.id)}`}
        data-testid={`politician-card-${p.id}`}
        className="group relative bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:border-indigo-300 hover:-translate-y-0.5 card-lift flex flex-col h-full transition-all duration-300"
      >
        <div className="aspect-[4/3] overflow-hidden bg-slate-100 relative">
          <img
            src={img}
            alt={`Portrait of ${p.name}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            width="400"
            height="300"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = avatarDataUri(p.name);
            }}
          />
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-700 border border-slate-200/50 shadow-sm">
            {p.country_code}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        <div className="p-6 flex-1 flex flex-col">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700 self-start">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30" aria-hidden="true" />
            {p.party || "Independent"}
          </div>
          <h3 className="mt-2 font-display font-bold text-xl leading-tight tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
            {p.name}
          </h3>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed line-clamp-2 flex-1">
            {p.brief_intro || p.role || "Elected official"}
          </p>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin size={12} className="text-indigo-400" aria-hidden="true" />
              <span>{p.country_code}</span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 group-hover:text-indigo-800 transition-colors">
              View Record <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </Reveal>
  );
});

const Counter = memo(function Counter({ target, suffix = "" }) {
  const { ref, value } = useCountUp(target);
  return (
    <span ref={ref} className="font-display font-bold tabular-nums">
      {value.toLocaleString()}{suffix}
    </span>
  );
});

const RecentCard = memo(function RecentCard({ p }) {
  const img = safeImageSrc(p.image_url, p.name);
  return (
    <Link
      to={`/politicians/${encodeURIComponent(p.id)}`}
      className="group flex-shrink-0 w-48 bg-white border border-slate-200 rounded-2xl overflow-hidden block hover:shadow-xl hover:border-indigo-300 hover:-translate-y-0.5 card-lift-sm transition-all duration-300"
      data-testid={`recent-card-${p.id}`}
    >
      <div className="aspect-square overflow-hidden bg-slate-100 relative">
        <img
          src={img}
          alt={`Portrait of ${p.name}`}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
          width="192"
          height="192"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = avatarDataUri(p.name);
          }}
        />
        <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg">
          New
        </div>
      </div>
      <div className="p-3.5 border-t border-slate-100">
        <div className="font-display font-bold text-sm text-slate-900 truncate">{p.name}</div>
        <div className="text-xs text-slate-400 truncate">{p.party || "Independent"}</div>
      </div>
    </Link>
  );
});

const LeaderboardCard = memo(function LeaderboardCard({ p, rank, tone, delay }) {
  const img = safeImageSrc(p.photo_url, p.name);
  const pct = clampPct(tone === "keeper" ? p.delivered_pct : p.broken_pct);
  const pctLabel = tone === "keeper" ? "Delivered" : "Broken";
  const colorClass = tone === "keeper" ? "text-emerald-600" : "text-rose-500";
  const ringClass = tone === "keeper" ? "ring-emerald-200" : "ring-rose-200";

  const rankBadge = rank <= 3 ? (
    <div className={`rank-badge ${rank === 1 ? "rank-gold" : rank === 2 ? "rank-silver" : "rank-bronze"}`} aria-hidden="true">
      {rank}
    </div>
  ) : (
    <span className={`font-mono font-bold text-sm ${colorClass} w-8 text-center shrink-0 opacity-60`} aria-hidden="true">
      {String(rank).padStart(2, "0")}
    </span>
  );

  return (
    <Link
      to={`/politicians/${encodeURIComponent(p.politician_id)}`}
      data-testid={`leaderboard-card-${p.politician_id}`}
      className="reveal-item group bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 hover:shadow-lg hover:border-indigo-300 card-lift-sm transition-all duration-300"
      style={{ "--i-delay": `${delay}ms` }}
      aria-label={`${p.name}, rank ${rank}, ${pct}% promises ${pctLabel.toLowerCase()}`}
    >
      {rankBadge}
      <div className={`relative shrink-0 rounded-xl ring-2 ${ringClass} group-hover:ring-4 transition-all duration-300`}>
        <img
          src={img}
          alt={`Portrait of ${p.name}`}
          className="w-12 h-12 rounded-xl object-cover bg-slate-100"
          loading="lazy"
          width="48"
          height="48"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = avatarDataUri(p.name);
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-base text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{p.name}</div>
        <div className="text-xs text-slate-400 truncate">{p.party || "Independent"}{p.role ? ` · ${p.role}` : ""}</div>
        <div
          className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct}% promises ${pctLabel.toLowerCase()}`}
        >
          <div
            className={`bar-fill h-full rounded-full ${tone === "keeper" ? "bg-emerald-500" : "bg-rose-400"}`}
            style={{ "--bar-pct": `${pct}%`, "--bar-delay": `${delay + 150}ms` }}
          />
        </div>
      </div>
      <div className="text-right shrink-0" aria-hidden="true">
        <div className={`font-display font-bold text-xl ${colorClass}`}>{pct}%</div>
        <div className="text-[10px] uppercase tracking-wider text-slate-400">{pctLabel}</div>
      </div>
    </Link>
  );
});

const Leaderboard = memo(function Leaderboard({ title, icon, items, tone }) {
  const Icon = icon;
  const colorClass = tone === "keeper" ? "text-emerald-600" : "text-rose-500";
  const headingId = `leaderboard-heading-${tone}`;

  return (
    <Reveal
      as="section"
      aria-labelledby={headingId}
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-slate-200 bg-gradient-to-r ${tone === "keeper" ? "from-emerald-50/60 to-white" : "from-rose-50/60 to-white"}`}>
        <Icon size={18} className={colorClass} aria-hidden="true" />
        <h2 id={headingId} className="font-display font-bold text-lg tracking-tight text-slate-900">{title}</h2>
        <span className="ml-auto text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 border border-slate-200 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
          {items.length} records
        </span>
      </div>
      {items.length === 0 ? (
        <div className="p-10 text-center text-slate-400 text-sm">Not enough data yet</div>
      ) : (
        <ul className="p-4 space-y-2.5 max-h-[600px] overflow-y-auto pr-3 scrollbar-thin list-none">
          {items.map((p, i) => (
            <li key={p.politician_id}>
              <LeaderboardCard p={p} rank={i + 1} tone={tone} delay={Math.min(i, 10) * 45} />
            </li>
          ))}
        </ul>
      )}
    </Reveal>
  );
});

const FEATURE_ACCENT_MAP = {
  emerald: "text-emerald-600 border-emerald-200 bg-emerald-50/60",
  indigo: "text-indigo-600 border-indigo-200 bg-indigo-50/60",
  amber: "text-amber-600 border-amber-200 bg-amber-50/60",
  purple: "text-purple-600 border-purple-200 bg-purple-50/60",
  slate: "text-slate-600 border-slate-200 bg-slate-50/60",
  teal: "text-teal-600 border-teal-200 bg-teal-50/60",
};

const FeatureCard = memo(function FeatureCard({ icon: Icon, title, description, color, delay, className = "" }) {
  return (
    <div
      className={`reveal-item group bg-white border border-slate-200 rounded-2xl p-8 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-0.5 card-lift-sm transition-all duration-300 ${className}`}
      style={{ "--i-delay": `${delay}ms` }}
    >
      <div className={`inline-flex p-3.5 rounded-2xl border-2 ${FEATURE_ACCENT_MAP[color]} mb-5 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
        <Icon size={22} aria-hidden="true" />
      </div>
      <h3 className="font-display font-bold text-xl tracking-tight text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed max-w-md">{description}</p>
    </div>
  );
});

const StepCard = memo(function StepCard({ number, title, description, icon: Icon, delay }) {
  return (
    <div
      className="reveal-item relative bg-white border border-slate-200 rounded-2xl p-8 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-0.5 card-lift-sm h-full transition-all duration-300"
      style={{ "--i-delay": `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-6">
        <span className="font-mono font-bold text-3xl text-slate-200" aria-hidden="true">
          {String(number).padStart(2, "0")}
        </span>
        <div className="inline-flex p-3 rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white text-indigo-600 shadow-sm">
          <Icon size={20} aria-hidden="true" />
        </div>
      </div>
      <h3 className="font-display font-bold text-lg tracking-tight text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const SEARCH_DEBOUNCE_MS = 250;
const MAX_QUERY_LENGTH = 120;
const RECENT_DISPLAY_LIMIT = 20;

const HERO_BG =
  "/images/uf7ne1m3m7wkazptdvgm.webp";
const GLOBE_BG =
  "/images/qap5tauldakh2to8iiip.webp";

const SITE_DESCRIPTION =
  "TrackMP is the global public ledger for political accountability. Track campaign promises, voting records, and legislative performance of politicians across 160+ countries.";

export default function HomePage() {
  const [politicians, setPoliticians] = useState([]);
  const [countries, setCountries] = useState([]);
  const [q, setQ] = useState(() => {
    if (typeof window === "undefined") return "";
    const param = new URLSearchParams(window.location.search).get("q");
    return param ? param.slice(0, MAX_QUERY_LENGTH) : "";
  });
  const [country, setCountry] = useState("all");
  const [loading, setLoading] = useState(false);

  const [keepers, setKeepers] = useState([]);
  const [breakers, setBreakers] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [stats, setStats] = useState({ total_politicians: 0, total_promises: 0, total_delivered: 0, total_broken: 0, delivered_pct: 0, broken_pct: 0 });
  const [recent, setRecent] = useState([]);
  const [apiError, setApiError] = useState(null);

  const isBrowsing = !!q || (country && country !== "all");

  /* SEO: title, meta description, canonical/OG/Twitter tags, JSON-LD.
     Structured data is derived from real, already-rendered data (top
     keepers) so it never claims anything the page doesn't show. */
  const structuredData = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : undefined;
    const graph = [
      {
        "@type": "WebSite",
        name: "TrackMP",
        url: origin,
        description: SITE_DESCRIPTION,
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${origin}/?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        name: "TrackMP",
        url: origin,
        description: "Public ledger tracking political promises and legislative performance.",
        logo: `${origin}/logo.png`,
        sameAs: [
          "https://twitter.com/trackmp",
          "https://linkedin.com/company/trackmp"
        ],
      },
    ];

    if (keepers.length > 0) {
      graph.push({
        "@type": "ItemList",
        name: "Top Promise Keepers",
        itemListElement: keepers.slice(0, 10).map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: p.name,
          url: origin ? new URL(`/politicians/${encodeURIComponent(p.politician_id)}`, origin).toString() : undefined,
        })),
      });
    }

    // FAQPage entry aids SEO rich-result eligibility for the methodology
    // section without adding any new UI or JS — pure metadata.
    graph.push({
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does TrackMP track political promises?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "TrackMP logs campaign promises from manifestos and public statements, tracks related legislative action, and scores delivery based on verifiable, cited sources.",
          },
        },
      ],
    });

    return { "@context": "https://schema.org", "@graph": graph };
  }, [keepers]);

  useSEO({
    title: "TrackMP | Global Politician Accountability & Promise Tracking",
    description: SITE_DESCRIPTION,
    canonicalPath: "/",
    structuredData,
  });

  /* Load countries */
  useEffect(() => {
    const controller = new AbortController();
    api
      .get("/ref/countries", { signal: controller.signal })
      .then((r) => setCountries(r.data.items || []))
      .catch((err) => {
        if (err?.name !== "CanceledError" && err?.code !== "ERR_CANCELED") {
          console.error("Failed to load countries:", err);
        }
      });
    return () => controller.abort();
  }, []);

  /* Load homepage data */
  useEffect(() => {
    const controller = new AbortController();
    setLeaderboardLoading(true);
    setApiError(null);
    Promise.all([
      api.get("/leaderboards/promises", { params: { kind: "keepers", limit: 20 }, signal: controller.signal }),
      api.get("/leaderboards/promises", { params: { kind: "breakers", limit: 20 }, signal: controller.signal }),
      api.get("/stats", { signal: controller.signal }),
      api.get("/politicians", { params: { sort: "recent", limit: RECENT_DISPLAY_LIMIT }, signal: controller.signal }),
    ])
      .then(([keepersRes, breakersRes, statsRes, recentRes]) => {
        setKeepers(keepersRes.data.items || []);
        setBreakers(breakersRes.data.items || []);
        setStats(statsRes.data);
        setRecent(recentRes.data.items || []);
      })
      .catch((err) => {
        if (err?.name !== "CanceledError" && err?.code !== "ERR_CANCELED") {
          console.error("Failed to load homepage data:", err);
          setApiError("We couldn't load the latest data. Please refresh the page or try again later.");
        }
      })
      .finally(() => setLeaderboardLoading(false));
    return () => controller.abort();
  }, []);

  /* Search */
  useEffect(() => {
    if (!isBrowsing) {
      setPoliticians([]);
      setApiError(null);
      return;
    }
    setLoading(true);
    setApiError(null);
    const controller = new AbortController();
    const params = {};
    const cleanQ = q.trim().slice(0, MAX_QUERY_LENGTH);
    if (cleanQ) params.q = cleanQ;
    if (country && country !== "all" && /^[A-Za-z]{2,3}$/.test(country)) {
      params.country_code = country;
    }
    const t = setTimeout(() => {
      api
        .get("/politicians", { params, signal: controller.signal })
        .then((r) => setPoliticians(r.data.items || []))
        .catch((err) => {
          if (err?.name !== "CanceledError" && err?.code !== "ERR_CANCELED") {
            console.error("Search failed:", err);
            setApiError("Search failed. Please check your connection and try again.");
          }
        })
        .finally(() => setLoading(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q, country, isBrowsing]);

  const total = politicians.length;

  const handleSearchChange = useCallback((e) => {
    setQ(e.target.value);
  }, []);

  const dismissError = useCallback(() => setApiError(null), []);

  const focusSearch = useCallback(() => {
    const el = document.getElementById("home-search-input");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
    }
  }, []);

  const heroStats = useMemo(
    () => [
      { icon: Users, color: "text-emerald-600", value: stats.total_politicians, suffix: "+", label: "Politicians Tracked" },
      { icon: CheckCircle2, color: "text-emerald-600", value: stats.total_delivered || 0, suffix: "", label: "Promises Delivered" },
      { icon: XCircle, color: "text-rose-500", value: stats.total_broken || 0, suffix: "", label: "Promises Broken" },
      { icon: Globe, color: "text-indigo-600", value: 160, suffix: "+", label: "Countries Indexed" },
    ],
    [stats.total_politicians, stats.total_delivered, stats.total_broken]
  );

  return (
    <PublicLayout>
      <div className="homepage-root">
        {/* ============================ HERO ============================ */}
        {/*
          FIX: top padding reduced from pt-20/md:pt-28 to pt-8/md:pt-12.
          That extra padding — stacked on top of PublicLayout's header —
          was the source of the visible gap above the "Public Ledger"
          badge. Bottom padding is unchanged so section rhythm elsewhere
          on the page isn't affected.
        */}
        <section className="relative overflow-hidden border-b border-slate-200" aria-label="Introduction and search">
          <div className="absolute inset-0 -z-10" aria-hidden="true">
            <img
              src={HERO_BG}
              alt=""
              className="w-full h-full object-cover opacity-[0.45]"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/50 to-white/80" />
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
            />
          </div>

          <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-16 md:pt-12 md:pb-20">
            <div
              className="hero-in inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700 border border-emerald-200 bg-emerald-50/90 backdrop-blur-sm px-5 py-2 rounded-full mb-6 shadow-sm"
              style={{ "--hero-delay": "0ms" }}
            >
              <Sparkles size={14} className="text-emerald-500" aria-hidden="true" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ticker-pulse shadow-lg shadow-emerald-500/30" aria-hidden="true" />
              Public Ledger · Real-Time Tracking
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ticker-pulse shadow-lg shadow-emerald-500/30" aria-hidden="true" />
            </div>

            <h1
              className="hero-in font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.02] tracking-tighter max-w-3xl text-slate-900"
              style={{ "--hero-delay": "80ms" }}
            >
              The public record{" "}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
                of every politician.
              </span>
            </h1>

            <p
              className="hero-in mt-6 text-base md:text-lg max-w-2xl text-slate-600 leading-relaxed"
              style={{ "--hero-delay": "180ms" }}
            >
              A real-time, auditable ledger of campaign promises, legislative actions, and constituency milestones.
              From pledge to performance — transparent by construction.
            </p>

            {/* Glass search panel */}
            <div
              id="search"
              className="hero-in mt-10 max-w-3xl backdrop-blur-xl bg-white/90 border border-slate-200/80 rounded-2xl p-4 shadow-xl shadow-slate-200/30"
              style={{ "--hero-delay": "260ms" }}
              role="search"
              aria-label="Search and filter politicians"
            >
              <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" size={18} aria-hidden="true" />
                  <label htmlFor="home-search-input" className="sr-only">Search politicians by name</label>
                  <Input
                    id="home-search-input"
                    data-testid="search-politician-input"
                    value={q}
                    onChange={handleSearchChange}
                    maxLength={MAX_QUERY_LENGTH}
                    placeholder="Search politicians by name…"
                    autoComplete="off"
                    className="bg-white border-slate-200 rounded-xl pl-11 text-base h-12 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                  />
                </div>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger
                    data-testid="filter-country-select"
                    aria-label="Filter by country"
                    className="bg-white border-slate-200 rounded-xl h-12 text-base focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                  >
                    <SelectValue placeholder="All countries" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 rounded-xl">
                    <SelectItem value="all">🌍 All countries</SelectItem>
                    {countries.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {apiError && isBrowsing && (
              <div className="hero-in mt-4 max-w-3xl">
                <ApiErrorBanner message={apiError} onDismiss={dismissError} />
              </div>
            )}

            {isBrowsing ? (
              <div className="mt-6 flex items-center gap-6 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                <span data-testid="total-count" className="text-slate-600" aria-live="polite">
                  {loading ? "Searching…" : `${total} records found`}
                </span>
                <span>{countries.length} countries indexed</span>
              </div>
            ) : (
              <div
                className="hero-in mt-12 grid grid-cols-2 md:grid-cols-4 border border-slate-200 rounded-2xl bg-white/80 backdrop-blur-md divide-x divide-y md:divide-y-0 divide-slate-200 overflow-hidden shadow-lg shadow-slate-200/20"
                style={{ "--hero-delay": "340ms" }}
                data-testid="hero-stats-band"
              >
                {heroStats.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="p-5 md:p-6 hover:bg-slate-50/50 transition-colors">
                      <div className={`flex items-center gap-2 ${s.color}`}>
                        <Icon size={16} aria-hidden="true" />
                        <span className="font-display font-bold text-3xl md:text-4xl tracking-tighter text-slate-900">
                          <Counter target={s.value} suffix={s.suffix} />
                        </span>
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-2">{s.label}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ======================== TICKER ======================== */}
        {!isBrowsing && recent.length > 0 && <LiveTicker items={recent} />}

        {/* ===================== RECENTLY ADDED ===================== */}
        {!isBrowsing && recent.length > 0 && (
          <Reveal as="section" aria-labelledby="recent-heading" className="max-w-7xl mx-auto px-4 md:px-8 pt-14">
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600 mb-2 flex items-center gap-2">
                  <Zap size={14} /> Latest Entries
                </div>
                <h2 id="recent-heading" className="font-display font-bold text-2xl md:text-3xl tracking-tight text-slate-900">
                  Recently added to the ledger
                </h2>
              </div>
              <Clock size={20} className="text-slate-300 shrink-0" aria-hidden="true" />
            </div>
            <div className="flex gap-5 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-thin snap-x snap-mandatory">
              {recent.map((p) => (
                <div key={p.id} className="snap-start">
                  <RecentCard p={p} />
                </div>
              ))}
            </div>
          </Reveal>
        )}

        {/* ================= RESULTS / LEADERBOARDS ================= */}
        <section
          id="leaderboards"
          className="max-w-7xl mx-auto px-4 md:px-8 py-14"
          aria-label={isBrowsing ? "Search results" : "Leaderboards"}
        >
          {apiError && !isBrowsing && <ApiErrorBanner message={apiError} onDismiss={dismissError} />}

          {isBrowsing ? (
            loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-live="polite">
                <span className="sr-only">Searching politicians…</span>
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : politicians.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm" data-testid="empty-results">
                <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 border border-slate-200 px-4 py-2 rounded-full">
                  <Search size={14} aria-hidden="true" /> Empty Ledger
                </div>
                <h3 className="font-display font-bold text-3xl tracking-tight mt-4 text-slate-900">No politicians match your filter.</h3>
                <p className="mt-3 text-slate-500">Try clearing the search or adjust the country filter.</p>
              </div>
            ) : (
              <div>
                <div className="flex items-end justify-between gap-4 mb-6">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600 mb-2 flex items-center gap-2">
                      <Search size={14} /> Search Results
                    </div>
                    <h2 className="font-display font-bold text-2xl md:text-3xl tracking-tight text-slate-900">
                      {politicians.length} politician{politicians.length === 1 ? "" : "s"} found
                    </h2>
                  </div>
                  <Users size={20} className="text-slate-300 shrink-0" aria-hidden="true" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="politician-grid">
                  {politicians.map((p, i) => (
                    <PoliticianCard key={p.id} p={p} index={i} />
                  ))}
                </div>
              </div>
            )
          ) : leaderboardLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-busy="true" aria-live="polite">
              {[0, 1].map((i) => (
                <SkeletonLeaderboard key={i} />
              ))}
            </div>
          ) : (
            <div>
              <div className="flex items-end justify-between gap-4 mb-6">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600 mb-2 flex items-center gap-2">
                    <Activity size={14} /> Accountability Index
                  </div>
                  <h2 className="font-display font-bold text-2xl md:text-3xl tracking-tight text-slate-900">
                    Who delivers — and who doesn't
                  </h2>
                </div>
                <Scale size={20} className="text-slate-300 shrink-0" aria-hidden="true" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Leaderboard title="Top Promise Keepers" icon={TrendingUp} items={keepers} tone="keeper" />
                <Leaderboard title="Top Promise Breakers" icon={TrendingDown} items={breakers} tone="breaker" />
              </div>
            </div>
          )}
        </section>

        {/* ===================== WHY TRACKMP (BENTO) ===================== */}
        {!isBrowsing && (
          <LazySection minHeight={520}>
            <Reveal as="section" id="why-trackmp" aria-labelledby="why-heading" className="border-t border-slate-200 bg-gradient-to-b from-slate-50/60 to-white">
              <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-20">
                <div className="max-w-2xl mb-12">
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600 mb-3 flex items-center gap-2">
                    <Star size={14} /> Why TrackMP
                  </div>
                  <h2 id="why-heading" className="font-display font-bold text-3xl md:text-4xl tracking-tight text-slate-900">
                    Transparency through{" "}
                    <span className="bg-gradient-to-r from-emerald-600 to-indigo-600 bg-clip-text text-transparent">
                      verifiable data
                    </span>
                  </h2>
                  <p className="mt-4 text-slate-500 leading-relaxed">
                    Every promise, every vote, every project — logged with sources and open for inspection.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
                  <FeatureCard
                    icon={Target}
                    title="Promise Tracking"
                    description="Every campaign promise logged with timestamp, source, and real-time status updates — from manifesto to measurable outcome."
                    color="emerald"
                    delay={0}
                    className="lg:col-span-7"
                  />
                  <FeatureCard
                    icon={BarChart3}
                    title="Performance Metrics"
                    description="Clear, data-driven metrics showing delivery rates and legislative impact with historical trends."
                    color="indigo"
                    delay={60}
                    className="lg:col-span-5"
                  />
                  <FeatureCard
                    icon={Shield}
                    title="Verified Sources"
                    description="All entries backed by official documents, news sources, and public records with citation tracking."
                    color="amber"
                    delay={120}
                    className="lg:col-span-5"
                  />
                  <FeatureCard
                    icon={Landmark}
                    title="Public Accountability"
                    description="Hold representatives accountable with transparent, auditable records that any citizen, journalist, or researcher can inspect and cite."
                    color="purple"
                    delay={180}
                    className="lg:col-span-7"
                  />
                </div>
              </div>
            </Reveal>
          </LazySection>
        )}

        {/* ======================= HOW IT WORKS ======================= */}
        {!isBrowsing && (
          <LazySection minHeight={420}>
            <Reveal as="section" id="how-it-works" aria-labelledby="how-heading" className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-20">
              <div className="max-w-2xl mb-12">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-600 mb-3 flex items-center gap-2">
                  <GitBranch size={14} /> Methodology
                </div>
                <h2 id="how-heading" className="font-display font-bold text-3xl md:text-4xl tracking-tight text-slate-900">
                  From promise to{" "}
                  <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">performance</span>
                </h2>
              </div>
              <ol className="flex flex-col md:flex-row gap-5 items-stretch list-none p-0 m-0">
                {[
                  { number: 1, icon: Flag, title: "Promise Logged", description: "Campaign promises and commitments are extracted from manifestos, speeches, and public statements." },
                  { number: 2, icon: Handshake, title: "Action Tracked", description: "Legislative votes, project milestones, and constituency work are recorded with source links." },
                  { number: 3, icon: PieChartIcon, title: "Performance Scored", description: "Aggregated metrics show delivery rates, broken promises, and overall performance." },
                ].map((step, i, arr) => (
                  <React.Fragment key={step.number}>
                    <li className="flex-1">
                      <StepCard number={step.number} icon={step.icon} title={step.title} description={step.description} delay={i * 80} />
                    </li>
                    {i < arr.length - 1 && (
                      <div className="hidden md:flex items-center justify-center self-center" aria-hidden="true">
                        <div className="w-10 h-px bg-gradient-to-r from-slate-300 via-slate-200 to-transparent" />
                        <ChevronRight size={20} className="text-slate-300" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </ol>
            </Reveal>
          </LazySection>
        )}

        {/* ========================= STATS BAND ========================= */}
        {!isBrowsing && (
          <LazySection minHeight={260}>
            <Reveal as="section" aria-label="Platform statistics" className="max-w-7xl mx-auto px-4 md:px-8 pb-16">
              <div className="relative border border-slate-200 rounded-2xl overflow-hidden shadow-lg shadow-slate-200/20">
                <div className="absolute inset-0" aria-hidden="true">
                  <img src={GLOBE_BG} alt="" className="w-full h-full object-cover opacity-40" loading="lazy" decoding="async" />
                  <div className="absolute inset-0 bg-gradient-to-r from-white/50 via-white/40 to-white/70 backdrop-blur-sm" />
                </div>
                <div className="relative grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-200">
                  <div className="p-8 md:p-10 hover:bg-white/20 transition-colors">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 size={20} aria-hidden="true" />
                      <span className="font-display font-bold text-4xl md:text-5xl tracking-tighter text-slate-900">
                        <Counter target={stats.delivered_pct || 0} />%
                      </span>
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-2">Delivery Rate</div>
                  </div>
                  <div className="p-8 md:p-10 hover:bg-white/20 transition-colors">
                    <div className="flex items-center gap-2 text-indigo-600">
                      <Users size={20} aria-hidden="true" />
                      <span className="font-display font-bold text-4xl md:text-5xl tracking-tighter text-slate-900">
                        <Counter target={stats.total_politicians || 0} />
                      </span>
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-2">Total Politicians</div>
                  </div>
                  <div className="p-8 md:p-10 hover:bg-white/20 transition-colors">
                    <div className="flex items-center gap-2 text-amber-600">
                      <Award size={20} aria-hidden="true" />
                      <span className="font-display font-bold text-4xl md:text-5xl tracking-tighter text-slate-900">
                        <Counter target={stats.total_promises || 0} />
                      </span>
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-2">Total Promises</div>
                  </div>
                  <div className="p-8 md:p-10 hover:bg-white/20 transition-colors">
                    <div className="flex items-center gap-2 text-purple-600">
                      <Globe size={20} aria-hidden="true" />
                      <span className="font-display font-bold text-4xl md:text-5xl tracking-tighter text-slate-900">
                        <Counter target={160} />+
                      </span>
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-2">Countries</div>
                  </div>
                </div>
              </div>
            </Reveal>
          </LazySection>
        )}

        {/* =========================== CTA =========================== */}
        {!isBrowsing && (
          <LazySection minHeight={200}>
            <Reveal as="section" aria-label="Call to action" className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
              <div className="border border-slate-200 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-10 md:p-14 flex flex-col md:flex-row md:items-center gap-8 shadow-2xl shadow-slate-900/20 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" aria-hidden="true">
                  <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500 rounded-full blur-3xl" />
                  <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500 rounded-full blur-3xl" />
                </div>
                <div className="flex-1 relative z-10">
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400 mb-3 flex items-center gap-2">
                    <Lock size={14} /> Open to Everyone
                  </div>
                  <h2 className="font-display font-bold text-3xl md:text-4xl tracking-tight">
                    Every promise. On the record.
                  </h2>
                  <p className="mt-3 text-slate-300 leading-relaxed max-w-xl">
                    Search the ledger, inspect the sources, and see exactly what your representatives committed to — and what they delivered.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={focusSearch}
                  data-testid="cta-search-button"
                  className="relative z-10 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg shadow-emerald-600/30 hover:shadow-emerald-500/40 hover:scale-105 transform duration-300"
                >
                  <FileSearch size={18} aria-hidden="true" />
                  Search the Ledger
                  <ExternalLink size={16} className="opacity-50" />
                </button>
              </div>
            </Reveal>
          </LazySection>
        )}
      </div>
    </PublicLayout>
  );
}
