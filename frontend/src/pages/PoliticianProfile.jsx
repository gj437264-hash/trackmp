import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { PublicLayout } from "@/components/PublicLayout";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, ExternalLink } from "lucide-react";

function StatBox({ label, value, tone = "default" }) {
  const bg = tone === "primary" ? "bg-klein text-white" : "bg-white";
  return (
    <div className={`border-2 border-black p-5 ${bg}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">{label}</div>
      <div className="font-mono text-2xl md:text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}

function formatMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toLocaleString()}`;
}

function WealthChart({ entries }) {
  if (!entries?.length) {
    return (
      <div className="border-2 border-black p-10 text-center label-eyebrow">
        No wealth history recorded
      </div>
    );
  }
  const data = entries.map((e) => ({
    year: e.year,
    Assets: e.assets,
    Liabilities: e.liabilities,
    NetWorth: e.net_worth,
  }));
  return (
    <div className="border-2 border-black bg-white p-4">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid stroke="#0A0A0A" strokeDasharray="0" opacity={0.15} />
          <XAxis dataKey="year" tick={{ fontFamily: "IBM Plex Mono", fontSize: 12 }} stroke="#0A0A0A" />
          <YAxis tick={{ fontFamily: "IBM Plex Mono", fontSize: 12 }} stroke="#0A0A0A"
                 tickFormatter={(v) => formatMoney(v)} />
          <Tooltip
            contentStyle={{ border: "2px solid #0A0A0A", borderRadius: 0, fontFamily: "IBM Plex Mono" }}
            formatter={(v) => formatMoney(v)}
          />
          <Legend wrapperStyle={{ fontFamily: "IBM Plex Mono", fontSize: 12, textTransform: "uppercase" }} />
          <Line type="linear" dataKey="Assets" stroke="#16A34A" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line type="linear" dataKey="Liabilities" stroke="#DC2626" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line type="linear" dataKey="NetWorth" stroke="#002FA7" strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function WealthTable({ entries }) {
  if (!entries?.length) return null;
  return (
    <div className="border-2 border-black overflow-x-auto mt-4">
      <table className="w-full border-collapse">
        <thead className="bg-surfaceAlt">
          <tr>
            {["Year", "Assets", "Liabilities", "Net Worth", "Notes", "Sources"].map((h) => (
              <th key={h} className="text-left text-xs font-bold uppercase tracking-wider p-3 border-b-2 border-black">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-neutral-300">
              <td className="p-3 font-mono font-bold">{e.year}</td>
              <td className="p-3 font-mono text-success">{formatMoney(e.assets)}</td>
              <td className="p-3 font-mono text-danger">{formatMoney(e.liabilities)}</td>
              <td className="p-3 font-mono text-klein font-bold">{formatMoney(e.net_worth)}</td>
              <td className="p-3 text-sm text-neutral-700 max-w-[220px]">{e.notes || "—"}</td>
              <td className="p-3">
                <div className="flex flex-wrap gap-2">
                  {(e.source_urls || []).map((u, i) => (
                    <a
                      key={i}
                      href={u}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold uppercase text-klein hover:underline"
                    >
                      Src {i + 1} <ExternalLink size={10} />
                    </a>
                  ))}
                  {!(e.source_urls?.length) && <span className="label-eyebrow">—</span>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PoliticianProfile() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/politicians/${id}`)
      .then((r) => setP(r.data))
      .catch((e) => setError(e?.response?.data?.detail || "Not found"));
  }, [id]);

  if (error) {
    return (
      <PublicLayout>
        <div className="max-w-3xl mx-auto p-10 mt-16 brutal-card">
          <h2 className="font-display font-black text-3xl uppercase">Record Not Found</h2>
          <p className="mt-3 text-neutral-600">{error}</p>
          <Link to="/" className="brutal-btn-primary mt-6 inline-flex">
            <ArrowLeft size={16} className="mr-2" /> Back to Directory
          </Link>
        </div>
      </PublicLayout>
    );
  }
  if (!p) {
    return (
      <PublicLayout>
        <div className="max-w-5xl mx-auto p-10 mt-16 animate-pulse">
          <div className="h-8 bg-surfaceAlt w-64 mb-4" />
          <div className="h-96 bg-surfaceAlt" />
        </div>
      </PublicLayout>
    );
  }

  const latest = (p.wealth || []).slice(-1)[0];

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <Link to="/" className="label-eyebrow inline-flex items-center gap-2 hover:text-klein" data-testid="back-to-directory">
          <ArrowLeft size={14} /> Directory
        </Link>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
          <div className="border-2 border-black bg-white shadow-brutal">
            <div className="aspect-[4/5] bg-surfaceAlt border-b-2 border-black overflow-hidden">
              <img
                src={
                  p.image_url ||
                  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=entropy&cs=srgb&fm=jpg&w=600"
                }
                alt={p.name}
                className="w-full h-full object-cover grayscale"
              />
            </div>
            <div className="p-5">
              <div className="label-eyebrow">{p.role || "Elected Official"}</div>
              <div className="mt-2 font-mono text-sm">
                <div>Party: <span className="font-bold">{p.party || "—"}</span></div>
                <div>DOB: <span className="font-bold">{p.date_of_birth || "—"}</span></div>
                <div>Country: <span className="font-bold">{p.country_code}</span></div>
              </div>
            </div>
          </div>

          <div>
            <div className="label-eyebrow">/// Politician Record #{p.id.slice(-6).toUpperCase()}</div>
            <h1 className="mt-3 font-display font-black text-4xl md:text-6xl uppercase tracking-tighter leading-[0.95]" data-testid="politician-name">
              {p.name}
            </h1>
            {p.brief_intro && (
              <p className="mt-6 text-base md:text-lg text-neutral-800 leading-relaxed max-w-2xl border-l-4 border-klein pl-4" data-testid="brief-intro">
                {p.brief_intro}
              </p>
            )}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-0 border-2 border-black">
              <StatBox label="Net Worth (Latest)" value={formatMoney(latest?.net_worth)} tone="primary" />
              <StatBox label="Assets" value={formatMoney(latest?.assets)} />
              <StatBox label="Liabilities" value={formatMoney(latest?.liabilities)} />
              <StatBox label="Year On Record" value={latest?.year || "—"} />
              <StatBox label="Relatives Tracked" value={p.relatives?.length || 0} />
              <StatBox label="Wealth Entries" value={p.wealth?.length || 0} />
            </div>
          </div>
        </div>

        <div className="mt-12">
          <Tabs defaultValue="overview">
            <TabsList className="w-full justify-start border-b-2 border-black rounded-none bg-transparent p-0 h-auto">
              {[
                { v: "overview", l: "Overview" },
                { v: "wealth", l: "Wealth History" },
                { v: "relatives", l: "Relatives" },
              ].map((t) => (
                <TabsTrigger
                  key={t.v}
                  value={t.v}
                  data-testid={`tab-${t.v}`}
                  className="rounded-none px-6 py-3 -mb-[2px] border-b-2 border-transparent data-[state=active]:border-klein data-[state=active]:text-klein font-bold uppercase tracking-wider text-sm data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                >
                  {t.l}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="overview" className="pt-6">
              <div className="brutal-card p-6 max-w-3xl">
                <h3 className="font-display font-black text-2xl uppercase">Profile Details</h3>
                <dl className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-sm">
                  <div><dt className="label-eyebrow">Education</dt><dd className="mt-1">{p.education || "—"}</dd></div>
                  <div><dt className="label-eyebrow">Tags</dt><dd className="mt-1">{p.tags?.join(", ") || "—"}</dd></div>
                </dl>
              </div>
            </TabsContent>
            <TabsContent value="wealth" className="pt-6">
              <WealthChart entries={p.wealth || []} />
              <WealthTable entries={p.wealth || []} />
            </TabsContent>
            <TabsContent value="relatives" className="pt-6">
              {(p.relatives || []).length === 0 ? (
                <div className="brutal-card p-10 text-center label-eyebrow">No relatives on record</div>
              ) : (
                <Accordion type="multiple" className="border-2 border-black bg-white">
                  {p.relatives.map((r) => (
                    <AccordionItem key={r.id} value={r.id} className="border-b-2 border-black last:border-b-0">
                      <AccordionTrigger className="px-6 py-4 hover:no-underline font-bold uppercase tracking-wider text-left" data-testid={`relative-${r.id}`}>
                        <div className="flex-1 flex items-center justify-between gap-4 pr-4">
                          <span>{r.name}</span>
                          <span className="text-xs bg-black text-white px-2 py-1">{r.relationship}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        {r.description && <p className="text-sm text-neutral-700 mb-4">{r.description}</p>}
                        <WealthChart entries={r.wealth || []} />
                        <WealthTable entries={r.wealth || []} />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PublicLayout>
  );
}
