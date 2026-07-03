import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { PublicLayout } from "@/components/PublicLayout";
import { Search, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AVATAR_FALLBACKS = [
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=entropy&cs=srgb&fm=jpg&w=400",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=srgb&fm=jpg&w=400",
  "https://images.pexels.com/photos/26872232/pexels-photo-26872232.jpeg?auto=compress&cs=tinysrgb&w=400",
];

function PoliticianCard({ p, index }) {
  const img = p.image_url || AVATAR_FALLBACKS[index % AVATAR_FALLBACKS.length];
  return (
    <Link
      to={`/politicians/${p.id}`}
      data-testid={`politician-card-${p.id}`}
      className="group brutal-card p-0 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col"
    >
      <div className="border-b-2 border-black aspect-[4/3] overflow-hidden bg-surfaceAlt">
        <img
          src={img}
          alt={p.name}
          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
          loading="lazy"
        />
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="label-eyebrow">{p.party || "Independent"}</div>
        <h3 className="mt-2 font-display font-black text-xl md:text-2xl leading-tight uppercase tracking-tight">
          {p.name}
        </h3>
        <div className="mt-2 text-sm text-neutral-600 line-clamp-2">
          {p.brief_intro || p.role || "Elected official"}
        </div>
        <div className="mt-5 pt-4 border-t border-neutral-300 flex items-center justify-between">
          <span className="label-eyebrow">{p.country_code}</span>
          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-klein">
            View Record <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [politicians, setPoliticians] = useState([]);
  const [countries, setCountries] = useState([]);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/ref/countries").then((r) => setCountries(r.data.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (q) params.q = q;
    if (country && country !== "all") params.country_code = country;
    const t = setTimeout(() => {
      api
        .get("/politicians", { params })
        .then((r) => setPoliticians(r.data.items || []))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q, country]);

  const total = politicians.length;

  return (
    <PublicLayout>
      <section className="border-b-2 border-black relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1523292562811-8fa7962a78c8?crop=entropy&cs=srgb&fm=jpg&w=1920)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24 relative">
          <div className="label-eyebrow mb-4">/// Public Ledger · v.2</div>
          <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-7xl leading-[0.9] tracking-tighter uppercase max-w-4xl">
            The Public Record
            <br />
            <span className="text-klein">Of Every Politician.</span>
          </h1>
          <p className="mt-6 text-base md:text-lg max-w-2xl text-neutral-700 leading-relaxed">
            A permanent, auditable ledger of politicians, their wealth, their relatives,
            and everything they&apos;d rather you not read. Transparent by construction.
          </p>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4 max-w-3xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" size={20} />
              <Input
                data-testid="search-politician-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search politicians by name…"
                className="brutal-input pl-12 text-base h-14"
              />
            </div>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger
                data-testid="filter-country-select"
                className="brutal-input h-14 text-base"
              >
                <SelectValue placeholder="All countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All countries</SelectItem>
                {countries.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-6 flex items-center gap-6 label-eyebrow">
            <span data-testid="total-count">{loading ? "Searching…" : `${total} records`}</span>
            <span>{countries.length} countries indexed</span>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="brutal-card h-80 animate-pulse bg-surfaceAlt" />
            ))}
          </div>
        ) : politicians.length === 0 ? (
          <div className="brutal-card p-16 text-center">
            <div className="label-eyebrow">Empty Ledger</div>
            <h3 className="font-display font-black text-3xl mt-3 uppercase">No politicians match your filter.</h3>
            <p className="mt-3 text-neutral-600">
              Try clearing the search or adjust the country filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="politician-grid">
            {politicians.map((p, i) => (
              <PoliticianCard key={p.id} p={p} index={i} />
            ))}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
