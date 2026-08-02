// PoliticianProfile.jsx - Fixed Hook Order
import { avatarDataUri } from "@/lib/avatar";
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
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
  AreaChart,
  Area,
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

import { ArrowLeft, ExternalLink, Plus, CheckCircle2, XCircle, Clock, CircleDashed, Mail, Phone, Globe, Twitter, Facebook, Instagram, Youtube, Briefcase, Sparkles, Users, Award, Calendar, MapPin, Building2, Wallet, TrendingUp, TrendingDown, Star, Heart, Share2, Bookmark, Award as AwardIcon, Crown, Shield, Zap, PauseCircle, Scale, Pencil, Paperclip, Trash2, Upload, Link as LinkIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

// ============================================================================
// 1. OPTIMIZED STATBOX - Reduced DOM complexity, better semantics
// ============================================================================
function StatBox({ label, value, tone = "default", icon: Icon, trend, trendValue, delay = 0 }) {
  const toneClasses = useMemo(() => ({
    primary: "from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-emerald-500/20",
    success: "from-green-500 via-emerald-500 to-teal-500 text-white shadow-green-500/20",
    warning: "from-amber-500 via-orange-500 to-yellow-500 text-white shadow-amber-500/20",
    danger: "from-red-500 via-pink-500 to-rose-500 text-white shadow-red-500/20",
    info: "from-blue-500 via-indigo-500 to-purple-500 text-white shadow-blue-500/20",
    default: "bg-white/80 border border-slate-200/60 text-slate-800 shadow-slate-200/20"
  }), []);

  const isHighlight = tone !== "default";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative overflow-hidden rounded-2xl p-5 ${isHighlight ? `bg-gradient-to-br ${toneClasses[tone]} shadow-lg` : toneClasses[tone]} transition-all duration-300`}
      style={{ willChange: 'transform' }}
    >
      {(isHighlight) && (
        <>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
        </>
      )}
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1.5">
          {Icon && <Icon size={14} className={isHighlight ? "text-white/70" : "text-indigo-400"} aria-hidden="true" />}
          <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isHighlight ? "text-white/70" : "text-slate-500"}`}>
            {label}
          </span>
        </div>
        <div className={`font-display font-bold text-2xl md:text-3xl leading-tight ${isHighlight ? "text-white" : "text-slate-800"}`}>
          {value !== undefined && value !== null && value !== "—" ? value : "—"}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-bold ${isHighlight ? "text-white/70" : "text-slate-500"}`}>
            {trend === "up" ? <TrendingUp size={12} className="text-emerald-400" aria-hidden="true" /> : <TrendingDown size={12} className="text-red-400" aria-hidden="true" />}
            <span>{trendValue || "0%"}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// 2. UTILITY FUNCTIONS (unchanged, optimized)
// ============================================================================
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
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

// ============================================================================
// 3. WEALTH CHART - Memoized, fixed hook order
// ============================================================================
const WealthChart = React.memo(function WealthChart({ entries, currency = "USD" }) {
  // All hooks must be called before any conditional returns
  const data = useMemo(() => {
    if (!entries?.length) return [];
    return entries.map((e) => ({
      year: e.year,
      Assets: e.assets,
      Liabilities: e.liabilities,
      NetWorth: e.net_worth,
    }));
  }, [entries]);

  if (!entries?.length) {
    return (
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-10 text-center text-slate-500">
        No wealth history recorded
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-6 shadow-lg shadow-slate-200/20">
      <ResponsiveContainer width="100%" height={340}>
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
          <defs>
            <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="assetsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="year" tick={{ fontFamily: "Inter", fontSize: 12 }} stroke="#94A3B8" />
          <YAxis tick={{ fontFamily: "Inter", fontSize: 12 }} stroke="#94A3B8" tickFormatter={(v) => formatMoney(v, currency)} />
          <Tooltip
            contentStyle={{
              border: "1px solid #E2E8F0",
              borderRadius: "12px",
              fontFamily: "Inter",
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.1)"
            }}
            formatter={(v) => formatMoney(v, currency)}
          />
          <Legend wrapperStyle={{ fontFamily: "Inter", fontSize: 12 }} />
          <Area type="monotone" dataKey="NetWorth" stroke="#6366F1" strokeWidth={3} fill="url(#netWorthGradient)" dot={{ r: 5, strokeWidth: 2 }} />
          <Area type="monotone" dataKey="Assets" stroke="#10B981" strokeWidth={2} fill="url(#assetsGradient)" dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Liabilities" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

// ============================================================================
// 4. WEALTH TABLE - Memoized
// ============================================================================
const WealthTable = React.memo(function WealthTable({ entries, currency = "USD" }) {
  if (!entries?.length) return null;

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl overflow-x-auto mt-6 shadow-lg shadow-slate-200/20">
      <table className="w-full border-collapse">
        <thead className="bg-gradient-to-r from-indigo-50/80 to-purple-50/80">
          <tr>
            {["Year", "Assets", "Liabilities", "Net Worth", "Notes", "Sources"].map((h) => (
              <th key={h} className="text-left text-xs font-bold uppercase tracking-wider p-4 border-b border-slate-200/50 text-slate-600">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e, index) => (
            <tr
              key={e.id}
              className="border-b border-slate-100/50 hover:bg-indigo-50/30 transition-colors duration-200"
            >
              <td className="p-4 font-mono font-bold text-slate-700">{e.year}</td>
              <td className="p-4 font-mono text-emerald-600 font-medium">{formatMoney(e.assets, currency)}</td>
              <td className="p-4 font-mono text-red-500 font-medium">{formatMoney(e.liabilities, currency)}</td>
              <td className="p-4 font-mono text-indigo-600 font-bold">{formatMoney(e.net_worth, currency)}</td>
              <td className="p-4 text-sm text-slate-600 max-w-[220px]">{e.notes || "—"}</td>
              <td className="p-4">
                <div className="flex flex-wrap gap-2">
                  {(e.source_urls || []).map((u, i) => (
                    <a
                      key={i}
                      href={ensureUrl(u)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold uppercase text-indigo-600 hover:text-indigo-800 transition-colors hover:underline"
                    >
                      Src {i + 1} <ExternalLink size={10} aria-hidden="true" />
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
});

// ============================================================================
// 5. PROMISE STATUS CONFIG (unchanged)
// ============================================================================
const PROMISE_STATUS = [
  { value: "pending", label: "Pending", Icon: CircleDashed, color: "#A3A3A3", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "stalled", label: "Stalled", Icon: PauseCircle, color: "#94A3B8", cls: "bg-slate-200 text-slate-700 border-slate-300" },
  { value: "in_progress", label: "In Progress", Icon: Clock, color: "#F59E0B", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "compromised", label: "Compromised", Icon: Scale, color: "#8B5CF6", cls: "bg-violet-100 text-violet-700 border-violet-200" },
  { value: "delivered", label: "Delivered", Icon: CheckCircle2, color: "#10B981", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "broken", label: "Broken", Icon: XCircle, color: "#EF4444", cls: "bg-red-100 text-red-700 border-red-200" },
];

function statusMeta(status) {
  return PROMISE_STATUS.find((s) => s.value === status) || PROMISE_STATUS[0];
}

// ============================================================================
// 6. PROMISE STATUS BADGE - Simplified CSS animation
// ============================================================================
function PromiseStatusBadge({ status }) {
  const s = statusMeta(status);
  const Icon = s.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full border-2 ${s.cls} shadow-sm transition-all duration-200`}>
      <Icon size={12} aria-hidden="true" /> {s.label}
    </span>
  );
}

// ============================================================================
// 7. PROMISE PROGRESS - Memoized, reduced re-renders
// ============================================================================
const PromiseProgress = React.memo(function PromiseProgress({ promises }) {
  const total = promises.length;

  // All hooks must be called before conditional returns
  const { counts, delivered, broken, deliveredPct, brokenPct, chartData } = useMemo(() => {
    const counts = PROMISE_STATUS.map((s) => ({
      ...s,
      count: promises.filter((p) => p.status === s.value).length,
    }));
    const delivered = counts.find((c) => c.value === "delivered")?.count || 0;
    const broken = counts.find((c) => c.value === "broken")?.count || 0;
    const deliveredPct = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const brokenPct = total > 0 ? Math.round((broken / total) * 100) : 0;
    const chartData = counts.filter((c) => c.count > 0).map((c) => ({ name: c.label, value: c.count, color: c.color }));
    return { counts, delivered, broken, deliveredPct, brokenPct, chartData };
  }, [promises, total]);

  if (!total) {
    return (
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-10 text-center text-slate-500">
        No promises logged yet
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white/90 to-slate-50/90 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-8 mb-8 shadow-lg shadow-slate-200/20">
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 items-center">
        <div className="relative">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                stroke="white"
                strokeWidth={2}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                fontFamily: "Inter",
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(8px)"
              }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-display font-bold text-3xl text-slate-800">{deliveredPct}%</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Delivered</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {counts.map((c) => (
            <div
              key={c.value}
              className="bg-white border-2 border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                <c.Icon size={12} aria-hidden="true" /> {c.label}
              </div>
              <div className="font-display font-bold text-2xl mt-1 text-slate-800">{c.count}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-slate-200/50 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400">
        <span>{total} total promise{total !== 1 ? "s" : ""} tracked</span>
        <span className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" /> {deliveredPct}% delivered</span>
          {broken > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" /> {brokenPct}% broken</span>}
        </span>
      </div>
    </div>
  );
});

// ============================================================================
// 8. ATTACHMENT COMPONENTS - Memoized
// ============================================================================
function AttachmentIcon({ fileType }) {
  if (fileType === "image") return <ImageIcon size={14} aria-hidden="true" />;
  if (fileType === "video") return <Video size={14} aria-hidden="true" />;
  if (fileType === "document") return <FileText size={14} aria-hidden="true" />;
  return <FileArchive size={14} aria-hidden="true" />;
}

function PromiseAttachments({ promise, canEdit, onUpdate }) {
  const links = promise.source_links || [];
  const files = promise.files || [];
  const [linkForm, setLinkForm] = useState({ name: "", url: "" });
  const [addingLink, setAddingLink] = useState(false);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const addLink = useCallback(async () => {
    if (!linkForm.url.trim()) {
      toast.error("URL is required");
      return;
    }
    setAddingLink(true);
    try {
      const { data } = await api.post(`/promises/${promise.id}/links`, linkForm);
      onUpdate({ ...promise, source_links: [...links, data.link] });
      setLinkForm({ name: "", url: "" });
      toast.success("Link added");
    } catch {
      toast.error("Failed to add link");
    } finally {
      setAddingLink(false);
    }
  }, [linkForm, promise.id, onUpdate, links]);

  const removeLink = useCallback(async (linkId) => {
    if (!window.confirm("Remove this link?")) return;
    try {
      await api.delete(`/promises/${promise.id}/links/${linkId}`);
      onUpdate({ ...promise, source_links: links.filter((l) => l.id !== linkId) });
      toast.success("Link removed");
    } catch {
      toast.error("Failed to remove link");
    }
  }, [promise.id, onUpdate, links]);

  const uploadFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (fileName.trim()) formData.append("name", fileName.trim());
      const { data } = await api.post(`/promises/${promise.id}/files`, formData);
      onUpdate({ ...promise, files: [...files, data.file] });
      setFileName("");
      toast.success("File uploaded");
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [fileName, promise.id, onUpdate, files]);

  const removeFile = useCallback(async (fileId) => {
    if (!window.confirm("Remove this file?")) return;
    try {
      await api.delete(`/promises/${promise.id}/files/${fileId}`);
      onUpdate({ ...promise, files: files.filter((f) => f.id !== fileId) });
      toast.success("File removed");
    } catch {
      toast.error("Failed to remove file");
    }
  }, [promise.id, onUpdate, files]);

  return (
    <div className="mt-4 pt-4 border-t border-slate-200/50 space-y-4">
      {(links.length > 0 || files.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {links.map((l) => (
            <span key={l.id} className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-full pl-3 pr-1.5 py-1">
              <a href={ensureUrl(l.url)} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline max-w-[220px] truncate">
                <LinkIcon size={11} aria-hidden="true" /> {l.name || l.url}
              </a>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => removeLink(l.id)}
                  data-testid={`promise-link-remove-${l.id}`}
                  className="hover:text-red-600 transition-colors p-1 rounded-full hover:bg-red-50"
                  aria-label="Remove link"
                >
                  <Trash2 size={11} aria-hidden="true" />
                </button>
              )}
            </span>
          ))}
          {files.map((f) => (
            <span key={f.id} className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold rounded-full pl-3 pr-1.5 py-1">
              <a href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline max-w-[220px] truncate">
                <AttachmentIcon fileType={f.file_type} /> {f.name || f.original_filename}
              </a>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => removeFile(f.id)}
                  data-testid={`promise-file-remove-${f.id}`}
                  className="hover:text-red-600 transition-colors p-1 rounded-full hover:bg-red-50"
                  aria-label="Remove file"
                >
                  <Trash2 size={11} aria-hidden="true" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {canEdit && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label htmlFor={`link-name-${promise.id}`} className="text-slate-500 text-xs font-bold">Link name</Label>
              <Input
                id={`link-name-${promise.id}`}
                value={linkForm.name}
                onChange={(e) => setLinkForm({ ...linkForm, name: e.target.value })}
                placeholder="Optional label"
                className="border-slate-200 rounded-xl h-9 text-sm w-36"
              />
            </div>
            <div>
              <Label htmlFor={`link-url-${promise.id}`} className="text-slate-500 text-xs font-bold">Link URL</Label>
              <Input
                id={`link-url-${promise.id}`}
                value={linkForm.url}
                onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                placeholder="https://..."
                className="border-slate-200 rounded-xl h-9 text-sm w-48"
              />
            </div>
            <Button
              size="sm"
              onClick={addLink}
              disabled={addingLink || !linkForm.url.trim()}
              data-testid={`promise-link-add-${promise.id}`}
              className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl h-9 transition-all duration-200"
            >
              <Plus size={14} aria-hidden="true" /> Add link
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label htmlFor={`file-name-${promise.id}`} className="text-slate-500 text-xs font-bold">File name</Label>
              <Input
                id={`file-name-${promise.id}`}
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Optional label"
                className="border-slate-200 rounded-xl h-9 text-sm w-36"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              data-testid={`promise-file-add-${promise.id}`}
              className="rounded-xl h-9 transition-all duration-200"
            >
              <Upload size={14} aria-hidden="true" /> {uploading ? "Uploading..." : "Attach file"}
            </Button>
            <input
              ref={fileInputRef}
              id={`file-input-${promise.id}`}
              type="file"
              className="hidden"
              onChange={uploadFile}
              aria-label="Upload file"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 9. EDIT PROMISE DIALOG
// ============================================================================
function EditPromiseDialog({ promise, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: promise.title || "",
    description: promise.description || "",
    date_made: promise.date_made || "",
    source_url: promise.source_url || "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        title: promise.title || "",
        description: promise.description || "",
        date_made: promise.date_made || "",
        source_url: promise.source_url || "",
      });
    }
  }, [open, promise]);

  const submit = useCallback(async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/promises/${promise.id}`, form);
      onUpdated({ ...promise, ...form });
      setOpen(false);
      toast.success("Promise updated");
    } catch {
      toast.error("Failed to update promise");
    } finally {
      setSaving(false);
    }
  }, [form, promise, onUpdated]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          data-testid={`promise-edit-trigger-${promise.id}`}
          className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200"
          aria-label="Edit promise"
        >
          <Pencil size={14} aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white/95 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-2xl text-slate-800 flex items-center gap-2">
            <Pencil className="text-indigo-500" size={22} aria-hidden="true" /> Edit Promise
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-title" className="text-slate-600 font-bold">Title *</Label>
            <Input
              id="edit-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              aria-required="true"
            />
          </div>
          <div>
            <Label htmlFor="edit-description" className="text-slate-600 font-bold">Description</Label>
            <Textarea
              id="edit-description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-date" className="text-slate-600 font-bold">Date made</Label>
              <Input
                id="edit-date"
                type="date"
                value={form.date_made}
                onChange={(e) => setForm({ ...form, date_made: e.target.value })}
                className="border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              />
            </div>
            <div>
              <Label htmlFor="edit-source" className="text-slate-600 font-bold">Primary source URL</Label>
              <Input
                id="edit-source"
                value={form.source_url}
                onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                placeholder="https://..."
                className="border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={submit}
            disabled={saving || !form.title.trim()}
            className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white rounded-xl px-8 py-3 font-bold transition-all duration-300"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 10. PROMISE CARD - Memoized
// ============================================================================
const PromiseCardBrutal = React.memo(function PromiseCardBrutal({ promise, currentUser, onDelete, onUpdate }) {
  const isOwner = currentUser && currentUser.id === promise.created_by;
  const isAdmin = currentUser && (currentUser.role === "admin" || currentUser.role === "super_admin");
  const canEdit = isOwner || isAdmin;
  const [statusSaving, setStatusSaving] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);

  const remove = useCallback(async () => {
    if (!window.confirm("Delete this promise?")) return;
    try {
      await api.delete(`/promises/${promise.id}`);
      onDelete(promise.id);
      toast.success("Promise removed");
    } catch {
      toast.error("Failed to delete");
    }
  }, [promise.id, onDelete]);

  const changeStatus = useCallback(async (newStatus) => {
    if (newStatus === promise.status) return;
    setStatusSaving(true);
    try {
      await api.put(`/promises/${promise.id}`, { status: newStatus });
      onUpdate({ ...promise, status: newStatus });
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  }, [promise, onUpdate]);

  const linkCount = (promise.source_links || []).length + (promise.source_url ? 1 : 0);
  const fileCount = (promise.files || []).length;

  return (
    <div
      data-testid={`promise-card-${promise.id}`}
      className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h4 className="font-display font-bold text-slate-800 text-lg">{promise.title}</h4>
            {canEdit ? (
              <Select value={promise.status} onValueChange={changeStatus} disabled={statusSaving}>
                <SelectTrigger
                  data-testid={`promise-status-select-${promise.id}`}
                  className="h-auto w-auto border-none p-0 bg-transparent shadow-none focus:ring-0"
                >
                  <SelectValue>
                    <PromiseStatusBadge status={promise.status} />
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PROMISE_STATUS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <span className="flex items-center gap-2">
                        <s.Icon size={12} aria-hidden="true" /> {s.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <PromiseStatusBadge status={promise.status} />
            )}
          </div>
          {promise.description && (
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">{promise.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
            {promise.created_by_name && (
              <span className="flex items-center gap-1">
                <Users size={12} aria-hidden="true" /> Logged by {promise.created_by_name}
              </span>
            )}
            {promise.date_made && (
              <span className="flex items-center gap-1">
                <Calendar size={12} aria-hidden="true" /> Made: {promise.date_made}
              </span>
            )}
            {promise.source_url && (
              <a
                href={ensureUrl(promise.source_url)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-indigo-600 font-bold hover:text-indigo-800 transition-colors hover:underline"
              >
                Source <ExternalLink size={10} aria-hidden="true" />
              </a>
            )}
            <button
              type="button"
              onClick={() => setShowAttachments((v) => !v)}
              data-testid={`promise-attachments-toggle-${promise.id}`}
              className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-bold transition-colors"
              aria-expanded={showAttachments}
            >
              <Paperclip size={12} aria-hidden="true" /> {linkCount + fileCount} attachment{linkCount + fileCount !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-1 shrink-0">
            <EditPromiseDialog promise={promise} onUpdated={(updated) => onUpdate(updated)} />
            <Button
              size="sm"
              variant="ghost"
              onClick={remove}
              data-testid={`promise-delete-${promise.id}`}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200"
              aria-label="Delete promise"
            >
              Delete
            </Button>
          </div>
        )}
      </div>
      <AnimatePresence>
        {showAttachments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <PromiseAttachments promise={promise} canEdit={canEdit} onUpdate={onUpdate} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ============================================================================
// 11. ADD PROMISE DIALOG
// ============================================================================
function AddPromiseDialog({ politicianId, onAdded }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", status: "pending", date_made: "", source_url: "" });

  const submit = useCallback(async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/politicians/${politicianId}/promises`, form);
      onAdded(data);
      setForm({ title: "", description: "", status: "pending", date_made: "", source_url: "" });
      setOpen(false);
      toast.success("Promise added successfully!");
    } catch {
      toast.error("Failed to add promise");
    } finally {
      setSaving(false);
    }
  }, [politicianId, form, onAdded]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white font-display font-bold text-sm px-8 py-4 rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-105 active:scale-95"
          data-testid="add-promise-trigger"
        >
          <Plus size={18} aria-hidden="true" /> Log Promise
        </button>
      </DialogTrigger>
      <DialogContent className="bg-white/95 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-2xl text-slate-800 flex items-center gap-2">
            <AwardIcon className="text-indigo-500" size={24} aria-hidden="true" /> Log a Promise
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="add-title" className="text-slate-600 font-bold">Title *</Label>
            <Input
              id="add-title"
              data-testid="promise-title-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Build 50 new schools by 2026"
              className="border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              aria-required="true"
            />
          </div>
          <div>
            <Label htmlFor="add-description" className="text-slate-600 font-bold">Description</Label>
            <Textarea
              id="add-description"
              data-testid="promise-desc-input"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="add-status" className="text-slate-600 font-bold">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger id="add-status" data-testid="promise-status-input" className="border-slate-200 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROMISE_STATUS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="add-date" className="text-slate-600 font-bold">Date made</Label>
              <Input
                id="add-date"
                data-testid="promise-date-input"
                type="date"
                value={form.date_made}
                onChange={(e) => setForm({ ...form, date_made: e.target.value })}
                className="border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="add-source" className="text-slate-600 font-bold">Source URL</Label>
            <Input
              id="add-source"
              data-testid="promise-source-input"
              value={form.source_url}
              onChange={(e) => setForm({ ...form, source_url: e.target.value })}
              placeholder="https://..."
              className="border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            data-testid="promise-submit-btn"
            onClick={submit}
            disabled={saving || !form.title}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl px-8 py-3 font-bold transition-all duration-300"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin" aria-hidden="true">⚡</span> Saving...
              </span>
            ) : (
              "Add Promise"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 12. MAIN POLITICIAN PROFILE COMPONENT
// ============================================================================
export default function PoliticianProfile() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const isAuthed = user && user !== false;
  const [iframeHeight, setIframeHeight] = useState(600);
  const bioIframeRef = useRef(null);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({ title: document.title, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  }, []);

  // Fetch politician data
  useEffect(() => {
    const controller = new AbortController();
    api
      .get(`/politicians/${id}`, { signal: controller.signal })
      .then((r) => setP(r.data))
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(e?.response?.data?.detail || "Not found");
        }
      });
    return () => controller.abort();
  }, [id]);

  // Memoize latest wealth entry - must be called before conditional returns
  const latest = useMemo(() => (p?.wealth || []).slice(-1)[0], [p]);

  // Loading state
  if (!p && !error) {
    return (
      <PublicLayout>
        <div className="max-w-5xl mx-auto p-10 mt-16">
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-slate-200 rounded-xl w-64" />
            <div className="h-96 bg-slate-200 rounded-2xl" />
            <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">
              <div className="h-[500px] bg-slate-200 rounded-3xl" />
              <div className="space-y-4">
                <div className="h-12 bg-slate-200 rounded-xl w-3/4" />
                <div className="h-24 bg-slate-200 rounded-xl" />
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-24 bg-slate-200 rounded-2xl" />
                  <div className="h-24 bg-slate-200 rounded-2xl" />
                  <div className="h-24 bg-slate-200 rounded-2xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (error) {
    return (
      <PublicLayout>
        <div className="max-w-3xl mx-auto p-10 mt-16 bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-lg text-center">
          <h2 className="font-display font-black text-3xl text-slate-800">Record Not Found</h2>
          <p className="mt-3 text-slate-600">{error}</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-display font-bold px-8 py-4 rounded-2xl mt-6 transition-all duration-300 hover:scale-105 active:scale-95">
            <ArrowLeft size={16} aria-hidden="true" /> Back to Directory
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }} />

        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none mix-blend-multiply" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none mix-blend-multiply" />
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl pointer-events-none mix-blend-multiply" />

        {/* Top navigation bar */}
        <div className="flex items-center justify-between relative z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-all hover:scale-105"
            data-testid="back-to-directory"
          >
            <ArrowLeft size={14} aria-hidden="true" /> Back to Directory
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl hover:bg-indigo-50 transition-all duration-200"
              onClick={handleShare}
              aria-label="Share profile"
            >
              <Share2 size={16} className="text-slate-500" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-xl hover:bg-indigo-50 transition-all duration-200 ${isBookmarked ? 'bg-indigo-50' : ''}`}
              onClick={() => setIsBookmarked(!isBookmarked)}
              aria-label={isBookmarked ? "Remove bookmark" : "Bookmark profile"}
            >
              <Bookmark
                size={16}
                className={isBookmarked ? "text-indigo-600 fill-indigo-600" : "text-slate-500"}
                aria-hidden="true"
              />
            </Button>
          </div>
        </div>

        {/* Profile header */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8 relative z-10">
          {/* Profile image card */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500">
            <div className="aspect-[4/5] bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 overflow-hidden relative group">
              <img
                src={p.image_url || avatarDataUri(p.name)}
                alt={`${p.name} - Politician profile photo`}
                fetchpriority="high"
                decoding="async"
                onError={(e) => { e.currentTarget.src = avatarDataUri(p.name); }}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="eager"
              />
            </div>
            <div className="p-6">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50/80 backdrop-blur-sm px-4 py-1.5 rounded-full border border-emerald-200 shadow-sm">
                <Sparkles size={12} aria-hidden="true" /> {p.role || "Elected Official"}
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <Shield size={14} className="text-indigo-400 shrink-0" aria-hidden="true" />
                  <span className="font-medium text-slate-500">Party:</span>
                  <span className="font-bold text-slate-800">{p.party || "—"}</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <Calendar size={14} className="text-indigo-400 shrink-0" aria-hidden="true" />
                  <span className="font-medium text-slate-500">DOB:</span>
                  <span className="font-bold text-slate-800">{p.date_of_birth || "—"}</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <Globe size={14} className="text-indigo-400 shrink-0" aria-hidden="true" />
                  <span className="font-medium text-slate-500">Country:</span>
                  <span className="font-bold text-slate-800">{p.country_code}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile info */}
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <span>/// Politician Record</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
            </div>
            <h1 className="mt-3 font-display font-black text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[0.95] text-slate-900" data-testid="politician-name">
              {p.name}
            </h1>
            {p.brief_intro && (
              <p
                className="mt-6 text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl border-l-4 border-indigo-400 pl-4 bg-gradient-to-r from-indigo-50/30 to-transparent p-3 rounded-r-xl"
                data-testid="brief-intro"
              >
                {p.brief_intro}
              </p>
            )}

            {/* Stats grid */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatBox
                label="Net Worth"
                value={latest?.net_worth !== undefined && latest?.net_worth !== null ? formatMoney(latest.net_worth, p.currency) : "—"}
                tone="primary"
                icon={Wallet}
                trend="up"
                trendValue="+12.5%"
                delay={0.05}
              />
              <StatBox
                label="Assets"
                value={latest?.assets !== undefined && latest?.assets !== null ? formatMoney(latest.assets, p.currency) : "—"}
                tone="success"
                icon={Building2}
                delay={0.1}
              />
              <StatBox
                label="Liabilities"
                value={latest?.liabilities !== undefined && latest?.liabilities !== null ? formatMoney(latest.liabilities, p.currency) : "—"}
                tone="danger"
                icon={Briefcase}
                delay={0.15}
              />
              <StatBox
                label="Year On Record"
                value={latest?.year || "—"}
                icon={Calendar}
                delay={0.2}
              />
              <StatBox
                label="Relatives"
                value={p.relatives?.length || 0}
                icon={Users}
                delay={0.25}
              />
              <StatBox
                label="Wealth Entries"
                value={p.wealth?.length || 0}
                icon={Award}
                delay={0.3}
              />
            </div>
          </div>
        </div>

        {/* Tabs section */}
        <div className="mt-12 relative z-10">
          <Tabs defaultValue="overview">
            <TabsList className="w-full justify-start border-b border-slate-200/50 rounded-none bg-transparent p-0 h-auto overflow-x-auto">
              {[
                { v: "overview", l: "Overview", icon: Star },
                { v: "promises", l: "Promises", icon: CheckCircle2 },
                { v: "wealth", l: "Wealth History", icon: TrendingUp },
                { v: "relatives", l: "Relatives", icon: Users },
                { v: "bio", l: "Bio & Media", icon: FileText },
              ].map((t) => (
                <TabsTrigger
                  key={t.v}
                  value={t.v}
                  data-testid={`tab-${t.v}`}
                  className="rounded-none px-4 md:px-6 py-3 -mb-[2px] border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 font-bold uppercase tracking-wider text-xs md:text-sm data-[state=active]:shadow-none data-[state=active]:bg-transparent text-slate-500 hover:text-slate-700 transition-all hover:-translate-y-0.5 flex items-center gap-2 whitespace-nowrap"
                >
                  <t.icon size={14} className="opacity-50 data-[state=active]:opacity-100" aria-hidden="true" />
                  {t.l}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-8 shadow-lg shadow-slate-200/20">
                  <h3 className="font-display font-bold text-2xl text-slate-800 flex items-center gap-2">
                    <Zap className="text-indigo-500" size={24} aria-hidden="true" /> Profile Details
                  </h3>
                  <dl className="mt-4 grid grid-cols-1 gap-4 text-sm">
                    <div className="p-3 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Education</dt>
                      <dd className="mt-1 text-slate-700 font-medium">{p.education || "—"}</dd>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Profession</dt>
                      <dd className="mt-1 text-slate-700 font-medium">{p.profession || "—"}</dd>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Tags</dt>
                      <dd className="mt-1 flex flex-wrap gap-1.5">
                        {p.tags?.length ? p.tags.map(tag => (
                          <span key={tag} className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                            {tag}
                          </span>
                        )) : "—"}
                      </dd>
                    </div>
                  </dl>
                </div>

                {(p.contact_email || p.contact_phone || p.official_website) && (
                  <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-8 shadow-lg shadow-slate-200/20">
                    <h3 className="font-display font-bold text-2xl text-slate-800 flex items-center gap-2">
                      <Mail className="text-indigo-500" size={24} aria-hidden="true" /> Contact
                    </h3>
                    <div className="mt-4 space-y-3 text-sm">
                      {p.contact_email && (
                        <a href={`mailto:${p.contact_email}`} className="flex items-center gap-2 p-3 rounded-xl hover:bg-indigo-50 transition-colors group">
                          <Mail size={16} className="text-indigo-400 group-hover:text-indigo-600 shrink-0" aria-hidden="true" />
                          <span className="text-slate-600 group-hover:text-indigo-600 transition-colors break-all">{p.contact_email}</span>
                        </a>
                      )}
                      {p.contact_phone && (
                        <a href={`tel:${p.contact_phone}`} className="flex items-center gap-2 p-3 rounded-xl hover:bg-indigo-50 transition-colors group">
                          <Phone size={16} className="text-indigo-400 group-hover:text-indigo-600 shrink-0" aria-hidden="true" />
                          <span className="text-slate-600 group-hover:text-indigo-600 transition-colors">{p.contact_phone}</span>
                        </a>
                      )}
                      {p.official_website && (
                        <a href={ensureUrl(p.official_website)} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 rounded-xl hover:bg-indigo-50 transition-colors group">
                          <Globe size={16} className="text-indigo-400 group-hover:text-indigo-600 shrink-0" aria-hidden="true" />
                          <span className="text-slate-600 group-hover:text-indigo-600 transition-colors">Official Website</span>
                          <ExternalLink size={12} className="text-slate-400 group-hover:text-indigo-600" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {p.social_links && (p.social_links.twitter || p.social_links.facebook || p.social_links.instagram || p.social_links.youtube) && (
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-8 mt-6 shadow-lg shadow-slate-200/20">
                  <h3 className="font-display font-bold text-2xl text-slate-800 flex items-center gap-2">
                    <Heart className="text-pink-500" size={24} aria-hidden="true" /> Social Media
                  </h3>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {p.social_links.twitter && (
                      <a
                        href={ensureUrl(p.social_links.twitter)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 font-bold uppercase text-xs text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1"
                      >
                        <Twitter size={14} className="text-indigo-400 shrink-0" aria-hidden="true" /> Twitter
                      </a>
                    )}
                    {p.social_links.facebook && (
                      <a
                        href={ensureUrl(p.social_links.facebook)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 font-bold uppercase text-xs text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1"
                      >
                        <Facebook size={14} className="text-blue-400 shrink-0" aria-hidden="true" /> Facebook
                      </a>
                    )}
                    {p.social_links.instagram && (
                      <a
                        href={ensureUrl(p.social_links.instagram)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 font-bold uppercase text-xs text-slate-600 hover:bg-pink-50 hover:border-pink-200 hover:text-pink-600 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1"
                      >
                        <Instagram size={14} className="text-pink-400 shrink-0" aria-hidden="true" /> Instagram
                      </a>
                    )}
                    {p.social_links.youtube && (
                      <a
                        href={ensureUrl(p.social_links.youtube)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 font-bold uppercase text-xs text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1"
                      >
                        <Youtube size={14} className="text-red-400 shrink-0" aria-hidden="true" /> YouTube
                      </a>
                    )}
                  </div>
                </div>
              )}

              {(p.party_history || []).length > 0 && (
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-8 mt-6 shadow-lg shadow-slate-200/20">
                  <h3 className="font-display font-bold text-2xl text-slate-800 flex items-center gap-2">
                    <AwardIcon className="text-amber-500" size={24} aria-hidden="true" /> Party History
                  </h3>
                  <div className="mt-4 space-y-4">
                    {p.party_history.map((ph, i) => (
                      <div key={ph.id} className="flex gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="flex flex-col items-center pt-1" aria-hidden="true">
                          <div className={`w-3 h-3 rounded-full ${ph.end_date ? "bg-slate-300" : "bg-emerald-500"} shadow-sm`} />
                          {i < p.party_history.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
                        </div>
                        <div className="pb-4 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base text-slate-800">{ph.party}</span>
                            {!ph.end_date && (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono text-slate-400 mt-1">
                            {ph.start_date || "—"} → {ph.end_date || "Present"}
                          </div>
                          {ph.note && <p className="text-sm text-slate-600 mt-1.5">{ph.note}</p>}
                          {ph.source_url && (
                            <a
                              href={ensureUrl(ph.source_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center gap-1 mt-1.5 hover:underline"
                            >
                              Source <ExternalLink size={10} aria-hidden="true" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(p.position_history || []).length > 0 && (
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-8 mt-6 shadow-lg shadow-slate-200/20">
                  <h3 className="font-display font-bold text-2xl text-slate-800 flex items-center gap-2">
                    <Briefcase className="text-blue-500" size={24} aria-hidden="true" /> Position History
                  </h3>
                  <div className="mt-4 space-y-4">
                    {p.position_history.map((ph) => {
                      const location = [ph.constituency_name, ph.city_name, ph.state_name, ph.country_name].filter(Boolean).join(", ");
                      return (
                        <div key={ph.id} className="border-b border-slate-100 last:border-b-0 pb-4 last:pb-0 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base text-slate-800">{ph.position}</span>
                            {ph.party && <span className="text-sm text-slate-500">· {ph.party}</span>}
                            {ph.is_current && (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                                Current
                              </span>
                            )}
                          </div>
                          {location && (
                            <div className="flex items-center gap-1 text-sm text-slate-600 mt-1">
                              <MapPin size={12} className="text-indigo-400 shrink-0" aria-hidden="true" /> {location}
                            </div>
                          )}
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
            </TabsContent>

            {/* Promises Tab */}
            <TabsContent value="promises" className="pt-6">
              <PromiseProgress promises={p.promises || []} />
              <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
                <h3 className="font-display font-bold text-2xl text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="text-indigo-500" size={24} aria-hidden="true" /> Promises
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to="/how-promises-are-tracked"
                    className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors hover:underline flex items-center gap-1"
                  >
                    How we track promises <ExternalLink size={12} aria-hidden="true" />
                  </Link>
                  {isAuthed && (
                    <AddPromiseDialog
                      politicianId={p.id}
                      onAdded={(promise) => setP({ ...p, promises: [promise, ...(p.promises || [])] })}
                    />
                  )}
                </div>
              </div>
              {(p.promises || []).length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-10 text-center text-slate-500">
                  No promises logged yet
                </div>
              ) : (
                <div className="space-y-4">
                  {p.promises.map((pr) => (
                    <PromiseCardBrutal
                      key={pr.id}
                      promise={pr}
                      currentUser={user}
                      onDelete={(pid) =>
                        setP({ ...p, promises: p.promises.filter((x) => x.id !== pid) })
                      }
                      onUpdate={(updated) =>
                        setP({ ...p, promises: p.promises.map((x) => (x.id === updated.id ? updated : x)) })
                      }
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Wealth Tab */}
            <TabsContent value="wealth" className="pt-6">
              <WealthChart entries={p.wealth || []} currency={p.currency} />
              <WealthTable entries={p.wealth || []} currency={p.currency} />
            </TabsContent>

            {/* Relatives Tab */}
            <TabsContent value="relatives" className="pt-6">
              {(p.relatives || []).length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-10 text-center text-slate-500">
                  No relatives on record
                </div>
              ) : (
                <Accordion type="multiple" className="border border-slate-200/50 rounded-2xl bg-white/80 backdrop-blur-sm overflow-hidden shadow-lg shadow-slate-200/20">
                  {p.relatives.map((r, index) => (
                    <AccordionItem key={r.id} value={r.id} className="border-b border-slate-100/50 last:border-b-0">
                      <AccordionTrigger className="px-6 py-4 hover:no-underline font-bold uppercase tracking-wider text-left text-slate-800 hover:bg-indigo-50/30 transition-colors" data-testid={`relative-${r.id}`}>
                        <div className="flex-1 flex items-center justify-between gap-4 pr-4 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{r.name}</span>
                            {r.is_political && (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full normal-case border border-indigo-200">
                                Politically Active
                              </span>
                            )}
                          </div>
                          <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200">{r.relationship}</span>
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
                                className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors mt-2 hover:underline"
                              >
                                View {r.linked_politician_name || "linked"} profile <ExternalLink size={12} aria-hidden="true" />
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
            </TabsContent>

            {/* Bio Tab */}
            <TabsContent value="bio" className="pt-6">
              {p.bio_html ? (
                isFullHtmlDocument(p.bio_html) ? (
                  <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">
                    <iframe
                      ref={bioIframeRef}
                      srcDoc={p.bio_html}
                      title={`${p.name} - Biography`}
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
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div
                    className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-8 w-full prose prose-neutral prose-headings:font-display prose-headings:uppercase prose-a:text-indigo-600 max-w-none shadow-lg shadow-slate-200/20"
                    dangerouslySetInnerHTML={{ __html: p.bio_html }}
                  />
                )
              ) : (
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-10 text-center text-slate-500">
                  No bio or article added yet
                </div>
              )}

              {(p.media || []).length > 0 && (
                <div className="mt-8 w-full">
                  <h3 className="font-display font-bold text-2xl text-slate-800 mb-4 flex items-center gap-2">
                    <ImageIcon className="text-purple-500" size={24} aria-hidden="true" /> Attachments
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {p.media.map((m, index) => {
                      const Icon = mediaIcon(m.file_type);
                      return (
                        <a
                          key={m.id}
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-4 flex flex-col items-center gap-2 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
                          data-testid={`media-${m.id}`}
                        >
                          {m.file_type === "image" ? (
                            <img
                              src={m.url}
                              alt={m.filename}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-24 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-24 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                              <Icon size={32} className="text-indigo-500" aria-hidden="true" />
                            </div>
                          )}
                          <span className="text-xs text-slate-500 truncate w-full font-medium">{m.filename}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PublicLayout>
  );
}
