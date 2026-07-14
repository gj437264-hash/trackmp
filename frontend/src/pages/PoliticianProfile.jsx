import { avatarDataUri } from "@/lib/avatar";
import React, { useEffect, useState, useRef } from "react";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Image as ImageIcon, FileArchive, Video } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "@/components/Motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { ArrowLeft, ExternalLink, Plus, CheckCircle2, XCircle, Clock, CircleDashed, Mail, Phone, Globe, Twitter, Facebook, Instagram, Youtube, Briefcase, Sparkles, Users, Award, Calendar, MapPin, Building2, Wallet } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

// Soft styled StatBox
function StatBox({ label, value, tone = "default", icon: Icon }) {
  const bg = tone === "primary" 
    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white" 
    : "bg-white/80 backdrop-blur-sm";
  return (
    <div className={`border border-slate-200 rounded-2xl p-5 ${bg} shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className={tone === "primary" ? "text-white/70" : "text-indigo-400"} />}
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">{label}</div>
      </div>
      <div className="font-display font-bold text-2xl md:text-3xl mt-2">
        {value !== undefined && value !== null && value !== "—" ? value : "—"}
      </div>
      {tone === "primary" && (
        <div className="mt-1 text-[8px] font-bold uppercase tracking-[0.15em] text-white/50">
          Estimated Value
        </div>
      )}
    </div>
  );
}

function mediaIcon(type) {
  if (type === "image") return ImageIcon;
  if (type === "pdf") return FileArchive;
  if (type === "video") return Video;
  return FileText;
}

function currencySymbol(currency) {
  try {
    const parts = new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", currencyDisplay: "narrowSymbol" }).formatToParts(0);
    const sym = parts.find((p) => p.type === "currency");
    return sym ? sym.value : (currency || "$");
  } catch {
    return currency || "$";
  }
}

function formatMoney(n, currency = "USD") {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  const sym = currencySymbol(currency);
  if (Math.abs(v) >= 1e9) return `${sym}${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `${sym}${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `${sym}${(v / 1e3).toFixed(1)}K`;
  return `${sym}${v.toLocaleString()}`;
}

function isFullHtmlDocument(html) {
  if (!html) return false;
  return /<html[\s>]/i.test(html) || /<!doctype/i.test(html);
}

function ensureUrl(url) {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

// Soft styled WealthChart
function WealthChart({ entries, currency = "USD" }) {
  if (!entries?.length) {
    return (
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-10 text-center text-slate-500">
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
    <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 shadow-sm">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="0" opacity={0.5} />
          <XAxis dataKey="year" tick={{ fontFamily: "Inter", fontSize: 12 }} stroke="#94A3B8" />
          <YAxis tick={{ fontFamily: "Inter", fontSize: 12 }} stroke="#94A3B8"
                 tickFormatter={(v) => formatMoney(v, currency)} />
          <Tooltip
            contentStyle={{ border: "1px solid #E2E8F0", borderRadius: "12px", fontFamily: "Inter", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)" }}
            formatter={(v) => formatMoney(v, currency)}
          />
          <Legend wrapperStyle={{ fontFamily: "Inter", fontSize: 12 }} />
          <Line type="linear" dataKey="Assets" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line type="linear" dataKey="Liabilities" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line type="linear" dataKey="NetWorth" stroke="#6366F1" strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Soft styled WealthTable
function WealthTable({ entries, currency = "USD" }) {
  if (!entries?.length) return null;
  return (
    <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl overflow-x-auto mt-4 shadow-sm">
      <table className="w-full border-collapse">
        <thead className="bg-slate-50/80">
          <tr>
            {["Year", "Assets", "Liabilities", "Net Worth", "Notes", "Sources"].map((h) => (
              <th key={h} className="text-left text-xs font-bold uppercase tracking-wider p-3 border-b border-slate-200 text-slate-600">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-slate-100">
              <td className="p-3 font-mono font-bold text-slate-700">{e.year}</td>
              <td className="p-3 font-mono text-emerald-600">{formatMoney(e.assets, currency)}</td>
              <td className="p-3 font-mono text-red-500">{formatMoney(e.liabilities, currency)}</td>
              <td className="p-3 font-mono text-indigo-600 font-bold">{formatMoney(e.net_worth, currency)}</td>
              <td className="p-3 text-sm text-slate-600 max-w-[220px]">{e.notes || "—"}</td>
              <td className="p-3">
                <div className="flex flex-wrap gap-2">
                  {(e.source_urls || []).map((u, i) => (
                    <a
                      key={i}
                      href={u}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold uppercase text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Src {i + 1} <ExternalLink size={10} />
                    </a>
                  ))}
                  {!(e.source_urls?.length) && <span className="text-slate-400">—</span>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const PROMISE_STATUS = [
  { value: "pending", label: "Pending", Icon: CircleDashed, color: "#A3A3A3", cls: "bg-slate-100 text-slate-700" },
  { value: "in_progress", label: "In Progress", Icon: Clock, color: "#F59E0B", cls: "bg-amber-100 text-amber-700" },
  { value: "delivered", label: "Delivered", Icon: CheckCircle2, color: "#10B981", cls: "bg-emerald-100 text-emerald-700" },
  { value: "broken", label: "Broken", Icon: XCircle, color: "#EF4444", cls: "bg-red-100 text-red-700" },
];

function statusMeta(status) {
  return PROMISE_STATUS.find((s) => s.value === status) || PROMISE_STATUS[0];
}

// Soft styled PromiseStatusBadge
function PromiseStatusBadge({ status }) {
  const s = statusMeta(status);
  const Icon = s.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${s.cls}`}>
      <Icon size={12} /> {s.label}
    </span>
  );
}

// Soft styled PromiseProgress
function PromiseProgress({ promises }) {
  const total = promises.length;
  if (!total) {
    return (
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-10 text-center text-slate-500">
        No promises logged yet
      </div>
    );
  }
  const counts = PROMISE_STATUS.map((s) => ({
    ...s,
    count: promises.filter((p) => p.status === s.value).length,
  }));
  const delivered = counts.find((c) => c.value === "delivered")?.count || 0;
  const broken = counts.find((c) => c.value === "broken")?.count || 0;
  const deliveredPct = Math.round((delivered / total) * 100);
  const brokenPct = Math.round((broken / total) * 100);
  const chartData = counts.filter((c) => c.count > 0).map((c) => ({ name: c.label, value: c.count, color: c.color }));

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 items-center">
        <div className="relative">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                stroke="#E2E8F0"
                strokeWidth={1}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: "12px", fontFamily: "Inter" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="font-display font-bold text-2xl text-slate-800">{deliveredPct}%</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Delivered</div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {counts.map((c) => (
            <div key={c.value} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                <c.Icon size={12} /> {c.label}
              </div>
              <div className="font-display font-bold text-xl mt-1 text-slate-800">{c.count}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 text-xs font-mono text-slate-400">
        {total} total promise{total !== 1 ? "s" : ""} tracked · {deliveredPct}% delivered
        {broken > 0 && ` · ${brokenPct}% broken`}
      </div>
    </div>
  );
}

// Soft styled PromiseCard
function PromiseCardBrutal({ promise, currentUser, onDelete }) {
  const isOwner = currentUser && currentUser.id === promise.created_by;
  const isAdmin = currentUser && (currentUser.role === "admin" || currentUser.role === "super_admin");
  const canEdit = isOwner || isAdmin;
  const remove = async () => {
    if (!window.confirm("Delete this promise?")) return;
    try {
      await api.delete(`/promises/${promise.id}`);
      onDelete(promise.id);
      toast.success("Promise removed");
    } catch {
      toast.error("Failed to delete");
    }
  };
  return (
    <div data-testid={`promise-card-${promise.id}`} className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-display font-bold text-slate-800 text-lg">{promise.title}</h4>
            <PromiseStatusBadge status={promise.status} />
          </div>
          {promise.description && (
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">{promise.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400">
            {promise.created_by_name && <span>Logged by {promise.created_by_name}</span>}
            {promise.date_made && <span>Made: {promise.date_made}</span>}
            {promise.source_url && (
              <a href={promise.source_url} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold hover:text-indigo-800 transition-colors">
                Source
              </a>
            )}
          </div>
        </div>
        {canEdit && (
          <Button size="sm" variant="ghost" onClick={remove} data-testid={`promise-delete-${promise.id}`} className="text-red-500 hover:text-red-700 hover:bg-red-50">
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

// Soft styled AddPromiseDialog
function AddPromiseDialog({ politicianId, onAdded }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", status: "pending", date_made: "", source_url: "" });

  const submit = async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/politicians/${politicianId}/promises`, form);
      onAdded(data);
      setForm({ title: "", description: "", status: "pending", date_made: "", source_url: "" });
      setOpen(false);
      toast.success("Promise added");
    } catch {
      toast.error("Failed to add promise");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-display font-bold text-sm px-6 py-3 rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]" data-testid="add-promise-trigger">
          <Plus size={16} /> Log Promise
        </button>
      </DialogTrigger>
      <DialogContent className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl">
        <DialogHeader><DialogTitle className="font-display font-bold text-2xl text-slate-800">Log a Promise</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-slate-600">Title *</Label>
            <Input data-testid="promise-title-input" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Build 50 new schools by 2026"
              className="border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <Label className="text-slate-600">Description</Label>
            <Textarea data-testid="promise-desc-input" rows={3} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-600">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger data-testid="promise-status-input" className="border-slate-200 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROMISE_STATUS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-600">Date made</Label>
              <Input data-testid="promise-date-input" type="date" value={form.date_made}
                onChange={(e) => setForm({ ...form, date_made: e.target.value })}
                className="border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
          </div>
          <div>
            <Label className="text-slate-600">Source URL</Label>
            <Input data-testid="promise-source-input" value={form.source_url}
              onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="https://..."
              className="border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
        </div>
        <DialogFooter>
          <Button data-testid="promise-submit-btn" onClick={submit} disabled={saving || !form.title}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl">
            {saving ? "Saving..." : "Add Promise"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PoliticianProfile() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const isAuthed = user && user !== false;
  const [iframeHeight, setIframeHeight] = useState(600);
  const bioIframeRef = useRef(null);

  useEffect(() => {
    api
      .get(`/politicians/${id}`)
      .then((r) => setP(r.data))
      .catch((e) => setError(e?.response?.data?.detail || "Not found"));
  }, [id]);

  if (error) {
    return (
      <PublicLayout>
        <div className="max-w-3xl mx-auto p-10 mt-16 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-sm">
          <h2 className="font-display font-black text-3xl text-slate-800">Record Not Found</h2>
          <p className="mt-3 text-slate-600">{error}</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-display font-bold px-6 py-3 rounded-2xl mt-6 transition-all duration-300 hover:scale-[1.02]">
            <ArrowLeft size={16} /> Back to Directory
          </Link>
        </div>
      </PublicLayout>
    );
  }
  if (!p) {
    return (
      <PublicLayout>
        <div className="max-w-5xl mx-auto p-10 mt-16 animate-pulse">
          <div className="h-8 bg-slate-200 w-64 rounded-xl mb-4" />
          <div className="h-96 bg-slate-200 rounded-2xl" />
        </div>
      </PublicLayout>
    );
  }

  const latest = (p.wealth || []).slice(-1)[0];

  return (
    <PublicLayout>
      {/* Structural Dot Matrix Civic Grid Mask Overlay */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none -z-20" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)',
        backgroundSize: '24px 24px'
      }} />

      {/* Animated gradient orbs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-[pulse_6s_ease-in-out_infinite] mix-blend-multiply" />
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-[pulse_8s_ease-in-out_infinite_1s] mix-blend-multiply" />
      <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-[pulse_10s_ease-in-out_infinite_2s] mix-blend-multiply" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 relative">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors" data-testid="back-to-directory">
          <ArrowLeft size={14} /> Back to Directory
        </Link>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
          {/* Profile Card - Soft Design */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="aspect-[4/5] bg-gradient-to-br from-slate-100 to-slate-200/50 border-b border-slate-200 overflow-hidden">
              <img
                src={p.image_url || avatarDataUri(p.name)}
                alt={p.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <Sparkles size={12} /> {p.role || "Elected Official"}
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-500">Party:</span>
                  <span className="font-bold text-slate-800">{p.party || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400" />
                  <span className="font-medium text-slate-500">DOB:</span>
                  <span className="font-bold text-slate-800">{p.date_of_birth || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-slate-400" />
                  <span className="font-medium text-slate-500">Country:</span>
                  <span className="font-bold text-slate-800">{p.country_code}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400">/// Politician Record #{p.id.slice(-6).toUpperCase()}</div>
            <h1 className="mt-3 font-display font-black text-4xl md:text-6xl tracking-tight leading-[0.95] text-slate-900" data-testid="politician-name">
              {p.name}
            </h1>
            {p.brief_intro && (
              <p className="mt-6 text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl border-l-4 border-indigo-400 pl-4" data-testid="brief-intro">
                {p.brief_intro}
              </p>
            )}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* Net Worth - Primary stat with enhanced visibility */}
              <StatBox 
                label="Net Worth" 
                value={latest?.net_worth !== undefined && latest?.net_worth !== null ? formatMoney(latest.net_worth, p.currency) : "—"} 
                tone="primary" 
                icon={Wallet}
              />
              <StatBox 
                label="Assets" 
                value={latest?.assets !== undefined && latest?.assets !== null ? formatMoney(latest.assets, p.currency) : "—"} 
                icon={Building2}
              />
              <StatBox 
                label="Liabilities" 
                value={latest?.liabilities !== undefined && latest?.liabilities !== null ? formatMoney(latest.liabilities, p.currency) : "—"} 
                icon={Briefcase}
              />
              <StatBox 
                label="Year On Record" 
                value={latest?.year || "—"} 
                icon={Calendar}
              />
              <StatBox 
                label="Relatives" 
                value={p.relatives?.length || 0} 
                icon={Users}
              />
              <StatBox 
                label="Wealth Entries" 
                value={p.wealth?.length || 0} 
                icon={Award}
              />
            </div>
          </div>
        </div>

        <div className="mt-12">
          <Tabs defaultValue="overview">
            <TabsList className="w-full justify-start border-b border-slate-200 rounded-none bg-transparent p-0 h-auto">
              {[
                { v: "overview", l: "Overview" },
                { v: "promises", l: "Promises" },
                { v: "wealth", l: "Wealth History" },
                { v: "relatives", l: "Relatives" },
                { v: "bio", l: "Bio & Media" },
              ].map((t) => (
                <TabsTrigger
                  key={t.v}
                  value={t.v}
                  data-testid={`tab-${t.v}`}
                  className="rounded-none px-6 py-3 -mb-[2px] border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 font-bold uppercase tracking-wider text-sm data-[state=active]:shadow-none data-[state=active]:bg-transparent text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {t.l}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="overview" className="pt-6">
              <FadeIn>
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 max-w-3xl shadow-sm">
                <h3 className="font-display font-bold text-2xl text-slate-800">Profile Details</h3>
                <dl className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Education</dt><dd className="mt-1 text-slate-700">{p.education || "—"}</dd></div>
                  <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Profession</dt><dd className="mt-1 text-slate-700">{p.profession || "—"}</dd></div>
                  <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Tags</dt><dd className="mt-1 text-slate-700">{p.tags?.join(", ") || "—"}</dd></div>
                </dl>
              </div>

              {(p.contact_email || p.contact_phone || p.official_website) && (
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 max-w-3xl mt-6 shadow-sm">
                  <h3 className="font-display font-bold text-2xl text-slate-800">Contact</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    {p.contact_email && (
                      <a href={`mailto:${p.contact_email}`} className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors">
                        <Mail size={16} className="text-indigo-400" /> {p.contact_email}
                      </a>
                    )}
                    {p.contact_phone && (
                      <a href={`tel:${p.contact_phone}`} className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors">
                        <Phone size={16} className="text-indigo-400" /> {p.contact_phone}
                      </a>
                    )}
                    {p.official_website && (
                      <a href={ensureUrl(p.official_website)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors">
                        <Globe size={16} className="text-indigo-400" /> Official Website <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {p.social_links && (p.social_links.twitter || p.social_links.facebook || p.social_links.instagram || p.social_links.youtube) && (
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 max-w-3xl mt-6 shadow-sm">
                  <h3 className="font-display font-bold text-2xl text-slate-800">Social Media</h3>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {p.social_links.twitter && (
                      <a href={ensureUrl(p.social_links.twitter)} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 font-bold uppercase text-xs text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all duration-300">
                        <Twitter size={14} className="text-indigo-400" /> Twitter
                      </a>
                    )}
                    {p.social_links.facebook && (
                      <a href={ensureUrl(p.social_links.facebook)} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 font-bold uppercase text-xs text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all duration-300">
                        <Facebook size={14} className="text-indigo-400" /> Facebook
                      </a>
                    )}
                    {p.social_links.instagram && (
                      <a href={ensureUrl(p.social_links.instagram)} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 font-bold uppercase text-xs text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all duration-300">
                        <Instagram size={14} className="text-indigo-400" /> Instagram
                      </a>
                    )}
                    {p.social_links.youtube && (
                      <a href={ensureUrl(p.social_links.youtube)} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 font-bold uppercase text-xs text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all duration-300">
                        <Youtube size={14} className="text-indigo-400" /> YouTube
                      </a>
                    )}
                  </div>
                </div>
              )}
              {(p.party_history || []).length > 0 && (
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 max-w-3xl mt-6 shadow-sm">
                  <h3 className="font-display font-bold text-2xl text-slate-800">Party History</h3>
                  <div className="mt-4 space-y-4">
                    {p.party_history.map((ph, i) => (
                      <div key={ph.id} className="flex gap-4">
                        <div className="flex flex-col items-center pt-1">
                          <div className={`w-3 h-3 rounded-full ${ph.end_date ? "bg-slate-300" : "bg-emerald-500"}`} />
                          {i < p.party_history.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
                        </div>
                        <div className="pb-4 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base text-slate-800">{ph.party}</span>
                            {!ph.end_date && (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono text-slate-400 mt-1">
                            {ph.start_date || "—"} → {ph.end_date || "Present"}
                          </div>
                          {ph.note && <p className="text-sm text-slate-600 mt-1.5">{ph.note}</p>}
                          {ph.source_url && (
                            <a href={ensureUrl(ph.source_url)} target="_blank" rel="noreferrer"
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center gap-1 mt-1.5">
                              Source <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(p.position_history || []).length > 0 && (
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 max-w-3xl mt-6 shadow-sm">
                  <h3 className="font-display font-bold text-2xl text-slate-800">Position History</h3>
                  <div className="mt-4 space-y-4">
                    {p.position_history.map((ph) => {
                      const location = [ph.constituency_name, ph.city_name, ph.state_name, ph.country_name].filter(Boolean).join(", ");
                      return (
                        <div key={ph.id} className="border-b border-slate-100 last:border-b-0 pb-4 last:pb-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base text-slate-800">{ph.position}</span>
                            {ph.party && <span className="text-sm text-slate-500">· {ph.party}</span>}
                            {ph.is_current && (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          {location && <div className="flex items-center gap-1 text-sm text-slate-600 mt-1"><MapPin size={12} className="text-indigo-400" /> {location}</div>}
                          <div className="text-xs font-mono text-slate-400 mt-1">
                            {ph.start_date || "—"} → {ph.end_date || (ph.is_current ? "Present" : "—")}
                            {ph.election_year && ` · Elected ${ph.election_year}`}
                          </div>
                          {ph.note && <p className="text-sm text-slate-600 mt-1.5">{ph.note}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              </FadeIn>
            </TabsContent>
            <TabsContent value="promises" className="pt-6">
              <FadeIn>
              <PromiseProgress promises={p.promises || []} />
              <div className="flex justify-end mb-4">
                {isAuthed && (
                  <AddPromiseDialog
                    politicianId={p.id}
                    onAdded={(promise) => setP({ ...p, promises: [promise, ...(p.promises || [])] })}
                  />
                )}
              </div>
              {(p.promises || []).length === 0 ? null : (
                <div className="space-y-4">
                  {p.promises.map((pr) => (
                    <PromiseCardBrutal
                      key={pr.id}
                      promise={pr}
                      currentUser={user}
                      onDelete={(pid) =>
                        setP({ ...p, promises: p.promises.filter((x) => x.id !== pid) })
                      }
                    />
                  ))}
                </div>
              )}
              </FadeIn>
            </TabsContent>
            <TabsContent value="wealth" className="pt-6">
              <FadeIn>
              <WealthChart entries={p.wealth || []} currency={p.currency} />
              <WealthTable entries={p.wealth || []} currency={p.currency} />
              </FadeIn>
            </TabsContent>
            <TabsContent value="relatives" className="pt-6">
              <FadeIn>
              {(p.relatives || []).length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-10 text-center text-slate-500">No relatives on record</div>
              ) : (
                <Accordion type="multiple" className="border border-slate-200 rounded-2xl bg-white/80 backdrop-blur-sm overflow-hidden">
                  {p.relatives.map((r) => (
                    <AccordionItem key={r.id} value={r.id} className="border-b border-slate-100 last:border-b-0">
                      <AccordionTrigger className="px-6 py-4 hover:no-underline font-bold uppercase tracking-wider text-left text-slate-800" data-testid={`relative-${r.id}`}>
                        <div className="flex-1 flex items-center justify-between gap-4 pr-4 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{r.name}</span>
                            {r.is_political && (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full normal-case">
                                Politically Active
                              </span>
                            )}
                          </div>
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{r.relationship}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        {r.description && <p className="text-sm text-slate-600 mb-4">{r.description}</p>}
                        {r.is_political && (r.political_role || r.linked_politician_id) && (
                          <div className="border border-indigo-200 bg-indigo-50/50 rounded-xl p-4 mb-4">
                            {r.political_role && (
                              <div className="text-sm">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Role: </span>
                                <span className="font-bold text-slate-800">{r.political_role}</span>
                              </div>
                            )}
                            {r.linked_politician_id && (
                              <Link
                                to={`/politicians/${r.linked_politician_id}`}
                                className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors mt-2"
                              >
                                View {r.linked_politician_name || "linked"} profile <ExternalLink size={12} />
                              </Link>
                            )}
                          </div>
                        )}
                        <WealthChart entries={r.wealth || []} currency={r.wealth_currency || p.currency} />
                        <WealthTable entries={r.wealth || []} currency={r.wealth_currency || p.currency} />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
              </FadeIn>
            </TabsContent>
            <TabsContent value="bio" className="pt-6">
              <FadeIn>
                {p.bio_html ? (
                  isFullHtmlDocument(p.bio_html) ? (
                    <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">
                      <iframe
                        ref={bioIframeRef}
                        srcDoc={p.bio_html}
                        title="Politician Biography"
                        sandbox="allow-same-origin"
                        className="w-full block"
                        style={{ height: iframeHeight, border: "none" }}
                        onLoad={() => {
                          try {
                            const doc = bioIframeRef.current?.contentDocument;
                            if (doc?.body) {
                              setIframeHeight(doc.body.scrollHeight + 40);
                            }
                          } catch {}
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 md:p-8 w-full prose prose-neutral prose-headings:font-display prose-headings:uppercase prose-a:text-indigo-600 max-w-none shadow-sm"
                      dangerouslySetInnerHTML={{ __html: p.bio_html }}
                    />
                  )
                ) : (
                  <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-10 text-center text-slate-500">No bio or article added yet</div>
                )}

                {(p.media || []).length > 0 && (
                  <div className="mt-8 w-full">
                    <h3 className="font-display font-bold text-2xl text-slate-800 mb-4">Know More</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {p.media.map((m) => {
                        const Icon = mediaIcon(m.file_type);
                        return (
                          <a
                            key={m.id}
                            href={m.url}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-2 text-center hover:shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200"
                            data-testid={`media-${m.id}`}
                          >
                            {m.file_type === "image" ? (
                              <img src={m.url} alt={m.filename} className="w-full h-20 object-cover rounded-lg" />
                            ) : (
                              <Icon size={28} className="text-indigo-400" />
                            )}
                            <span className="text-xs text-slate-500 truncate w-full">{m.filename}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </FadeIn>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PublicLayout>
  );
}
