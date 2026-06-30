import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import PromiseCard from "@/components/PromiseCard";
import StatusBadge, { STATUS_OPTIONS } from "@/components/StatusBadge";
import { MapPin, BadgeCheck, Star, Plus, Briefcase, MessageSquare, Trash2, ExternalLink, CheckCircle2, XCircle, Clock, CircleDashed, Pencil, Share2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_AVATAR = "https://images.pexels.com/photos/11655430/pexels-photo-11655430.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=400";

export default function PoliticianDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [pol, setPol] = useState(null);
  const [promises, setPromises] = useState([]);
  const [works, setWorks] = useState([]);
  const [comments, setComments] = useState([]);
  const [tab, setTab] = useState("promises");

  const loadAll = async () => {
    const [p, pr, wk, cm] = await Promise.all([
      api.get(`/politicians/${id}`),
      api.get(`/politicians/${id}/promises`),
      api.get(`/politicians/${id}/works`),
      api.get(`/politicians/${id}/comments`),
    ]);
    setPol(p.data); setPromises(pr.data); setWorks(wk.data); setComments(cm.data);
  };

  useEffect(() => { loadAll().catch(() => toast.error("Failed to load")); /* eslint-disable-next-line */ }, [id]);

  if (!pol) return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-zinc-500">Loading...</div>;

  const isAuthed = user && user !== false;
  const isAdmin = isAuthed && user.role === "admin";
  const canEdit = isAuthed && (user.id === pol.created_by || isAdmin);
  const total = pol.promises_count || 0;
  const deliveredPct = total ? Math.round((pol.delivered_count / total) * 100) : 0;

  const rate = async (score) => {
    if (!isAuthed) return toast.error("Please login to rate");
    try {
      const { data } = await api.post(`/politicians/${id}/rate`, { score });
      setPol(data);
      toast.success("Rating saved");
    } catch { toast.error("Rating failed"); }
  };

  const toggleVerify = async () => {
    try {
      const { data } = await api.patch(`/politicians/${id}/verify`, { verified: !pol.verified });
      setPol(data);
      toast.success(data.verified ? "Verified" : "Verification removed");
    } catch { toast.error("Failed"); }
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${pol.name} on TrackMP`, text: `${pol.name} — ${total} promises, ${deliveredPct}% delivered`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch { /* user cancelled share */ }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="border border-zinc-200 rounded-md p-6 sm:p-8 bg-white">
        <div className="flex flex-col sm:flex-row gap-6">
          <img
            src={pol.photo_url || DEFAULT_AVATAR}
            alt={pol.name}
            className="h-32 w-32 sm:h-40 sm:w-40 rounded-md object-cover border border-zinc-200 bg-zinc-100 shrink-0"
            onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 data-testid="pol-name" className="font-display text-3xl sm:text-4xl font-bold tracking-tight">{pol.name}</h1>
              {pol.verified && <BadgeCheck className="h-5 w-5 text-blue-600" />}
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-2 text-sm">
              <span className="px-2 py-0.5 border border-zinc-200 rounded bg-zinc-50">{pol.party}</span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-700">{pol.position}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-zinc-600 mt-2">
              <MapPin className="h-3.5 w-3.5" />
              {pol.constituency}, {pol.state}
            </div>
            {pol.bio && <p className="text-zinc-700 mt-4 leading-relaxed">{pol.bio}</p>}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button data-testid="pol-share-btn" size="sm" variant="outline" onClick={share}>
                <Share2 className="h-3.5 w-3.5 mr-1" /> Share
              </Button>
              {canEdit && (
                <Button data-testid="pol-edit-btn" size="sm" variant="outline" onClick={() => navigate(`/politicians/${id}/edit`)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
              )}
              {isAdmin && (
                <Button data-testid="pol-verify-btn" size="sm" variant={pol.verified ? "default" : "outline"} onClick={toggleVerify} className={pol.verified ? "bg-blue-600 hover:bg-blue-700" : ""}>
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" /> {pol.verified ? "Verified (remove)" : "Verify"}
                </Button>
              )}
            </div>

            <div className="mt-4 flex items-center gap-1">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  data-testid={`pol-rate-${n}`}
                  onClick={() => rate(n)}
                  className="p-1 hover:scale-110 transition-transform"
                  title={`Rate ${n}`}
                >
                  <Star className={`h-5 w-5 ${n <= Math.round(pol.rating_avg) ? "fill-amber-400 text-amber-400" : "text-zinc-300"}`} />
                </button>
              ))}
              <span className="ml-2 text-sm text-zinc-600 tabular-nums">
                {pol.rating_count > 0 ? `${pol.rating_avg} (${pol.rating_count} ratings)` : "No ratings yet"}
              </span>
            </div>
          </div>
        </div>

        {/* Score cards */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-200 border border-zinc-200 rounded-md overflow-hidden">
          <Stat label="Promises" value={total} Icon={null} />
          <Stat label="Delivered" value={pol.delivered_count} pct={deliveredPct} Icon={CheckCircle2} color="text-green-700" />
          <Stat label="In Progress / Pending" value={(pol.promises_count - pol.delivered_count - pol.broken_count)} Icon={Clock} color="text-amber-700" />
          <Stat label="Broken" value={pol.broken_count} Icon={XCircle} color="text-red-700" />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mt-8">
        <TabsList>
          <TabsTrigger data-testid="tab-promises" value="promises">Promises ({promises.length})</TabsTrigger>
          <TabsTrigger data-testid="tab-works" value="works">Work ({works.length})</TabsTrigger>
          <TabsTrigger data-testid="tab-comments" value="comments">Discussion ({comments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="promises" className="mt-6 space-y-4">
          {isAuthed && <AddPromise politicianId={id} onAdded={(p) => setPromises([p, ...promises])} />}
          {promises.length === 0 ? (
            <EmptyState text="No promises logged yet." />
          ) : promises.map((p) => (
            <PromiseCard key={p.id}
              promise={p}
              onChange={(updated) => setPromises(promises.map(x => x.id === updated.id ? updated : x))}
              onDelete={(pid) => setPromises(promises.filter(x => x.id !== pid))}
            />
          ))}
        </TabsContent>

        <TabsContent value="works" className="mt-6 space-y-4">
          {isAuthed && <AddWork politicianId={id} onAdded={(w) => setWorks([w, ...works])} />}
          {works.length === 0 ? <EmptyState text="No work entries yet." /> : works.map(w => (
            <WorkEntry key={w.id} work={w} user={user} onDelete={(wid) => setWorks(works.filter(x => x.id !== wid))} />
          ))}
        </TabsContent>

        <TabsContent value="comments" className="mt-6 space-y-4">
          {isAuthed && <AddComment politicianId={id} onAdded={(c) => setComments([c, ...comments])} />}
          {comments.length === 0 ? <EmptyState text="Start the discussion." /> : comments.map(c => (
            <CommentEntry key={c.id} comment={c} user={user} onDelete={(cid) => setComments(comments.filter(x => x.id !== cid))} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, pct, Icon, color }) {
  return (
    <div className="bg-white p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-zinc-500">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className={`font-display font-bold text-2xl mt-1 tabular-nums ${color || "text-zinc-950"}`}>
        {value}{pct != null && <span className="text-sm text-zinc-500 ml-2">{pct}%</span>}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="border border-dashed border-zinc-300 rounded-md text-center py-12 text-zinc-500">{text}</div>;
}

function AddPromise({ politicianId, onAdded }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", status: "pending", date_made: "", source_url: "" });
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/politicians/${politicianId}/promises`, form);
      onAdded(data);
      setForm({ title: "", description: "", status: "pending", date_made: "", source_url: "" });
      setOpen(false);
      toast.success("Promise added");
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="add-promise-trigger" variant="outline" className="w-full justify-start text-zinc-500">
          <Plus className="h-4 w-4 mr-2" /> Log a new promise...
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Log a promise</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title *</Label>
            <Input data-testid="promise-title-input" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="Build 50 new schools by 2026" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea data-testid="promise-desc-input" rows={3} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Context and details" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}>
                <SelectTrigger data-testid="promise-status-input"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date made</Label>
              <Input data-testid="promise-date-input" type="date" value={form.date_made} onChange={(e) => setForm({...form, date_made: e.target.value})} />
            </div>
          </div>
          <div>
            <Label>Source URL</Label>
            <Input data-testid="promise-source-input" value={form.source_url} onChange={(e) => setForm({...form, source_url: e.target.value})} placeholder="https://..." />
          </div>
        </div>
        <DialogFooter>
          <Button data-testid="promise-submit-btn" onClick={submit} disabled={saving || !form.title} className="bg-zinc-900 hover:bg-zinc-800">
            {saving ? "Saving..." : "Add promise"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddWork({ politicianId, onAdded }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", date: "", source_url: "" });
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/politicians/${politicianId}/works`, form);
      onAdded(data);
      setForm({ title: "", description: "", date: "", source_url: "" });
      setOpen(false);
      toast.success("Work added");
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="add-work-trigger" variant="outline" className="w-full justify-start text-zinc-500">
          <Plus className="h-4 w-4 mr-2" /> Log work or achievement...
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Log work / achievement</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title *</Label><Input data-testid="work-title-input" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} /></div>
          <div><Label>Description</Label><Textarea data-testid="work-desc-input" rows={3} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date</Label><Input data-testid="work-date-input" type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} /></div>
            <div><Label>Source URL</Label><Input data-testid="work-source-input" value={form.source_url} onChange={(e) => setForm({...form, source_url: e.target.value})} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button data-testid="work-submit-btn" onClick={submit} disabled={saving || !form.title} className="bg-zinc-900 hover:bg-zinc-800">
            {saving ? "Saving..." : "Add work"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WorkEntry({ work, user, onDelete }) {
  const canDelete = user && user !== false && (user.id === work.created_by || user.role === "admin");
  const remove = async () => {
    if (!window.confirm("Delete this entry?")) return;
    await api.delete(`/works/${work.id}`);
    onDelete(work.id);
  };
  return (
    <div data-testid={`work-card-${work.id}`} className="border border-zinc-200 rounded-md p-5 bg-white hover-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <Briefcase className="h-5 w-5 text-zinc-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-display font-semibold text-base text-zinc-950">{work.title}</h4>
            {work.description && <p className="text-sm text-zinc-700 mt-1.5 leading-relaxed">{work.description}</p>}
            <div className="mt-2 text-xs text-zinc-500 flex flex-wrap items-center gap-3">
              <span>by <span className="text-zinc-700 font-medium">{work.created_by_name}</span></span>
              {work.date && <span className="tabular-nums">{work.date}</span>}
              {work.source_url && <a className="text-blue-600 hover:underline inline-flex items-center gap-1" href={work.source_url} target="_blank" rel="noreferrer">Source <ExternalLink className="h-3 w-3" /></a>}
            </div>
          </div>
        </div>
        {canDelete && (
          <Button data-testid={`work-delete-${work.id}`} size="sm" variant="ghost" onClick={remove}><Trash2 className="h-3.5 w-3.5" /></Button>
        )}
      </div>
    </div>
  );
}

function AddComment({ politicianId, onAdded }) {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!body.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.post(`/politicians/${politicianId}/comments`, { body });
      onAdded(data); setBody("");
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };
  return (
    <div className="border border-zinc-200 rounded-md p-4 bg-white">
      <Textarea data-testid="comment-input" rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share your perspective..." />
      <div className="flex justify-end mt-2">
        <Button data-testid="comment-submit-btn" size="sm" onClick={submit} disabled={saving || !body.trim()} className="bg-zinc-900 hover:bg-zinc-800">
          <MessageSquare className="h-3.5 w-3.5 mr-1" /> Post
        </Button>
      </div>
    </div>
  );
}

function CommentEntry({ comment, user, onDelete }) {
  const canDelete = user && user !== false && (user.id === comment.created_by || user.role === "admin");
  const remove = async () => {
    if (!window.confirm("Delete comment?")) return;
    await api.delete(`/comments/${comment.id}`);
    onDelete(comment.id);
  };
  return (
    <div data-testid={`comment-card-${comment.id}`} className="border border-zinc-200 rounded-md p-4 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-zinc-900">{comment.created_by_name}</div>
          <p className="text-sm text-zinc-700 mt-1 leading-relaxed whitespace-pre-wrap">{comment.body}</p>
        </div>
        {canDelete && (
          <Button data-testid={`comment-delete-${comment.id}`} size="sm" variant="ghost" onClick={remove}><Trash2 className="h-3.5 w-3.5" /></Button>
        )}
      </div>
    </div>
  );
}
