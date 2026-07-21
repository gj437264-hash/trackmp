import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, formatApiError, API_BASE } from "@/lib/api";
import { toast } from "sonner";
import { Upload, ArrowLeft, Plus, Trash, Save } from "lucide-react";

const empty = {
  name: "", party: "", role: "", brief_intro: "", image_url: "",
  country_code: "", state_id: "", city_id: "", constituency_id: "",
  date_of_birth: "", education: "", profession: "", gender: "", currency: "USD",
  contact_email: "", contact_phone: "", official_website: "",
  social_links: { twitter: "", facebook: "", instagram: "", youtube: "" },
  tags: [],
};

const CURRENCIES = [
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "INR", label: "INR — Indian Rupee" },
  { code: "JPY", label: "JPY — Japanese Yen" },
  { code: "CNY", label: "CNY — Chinese Yuan" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
  { code: "CHF", label: "CHF — Swiss Franc" },
  { code: "BRL", label: "BRL — Brazilian Real" },
  { code: "ZAR", label: "ZAR — South African Rand" },
  { code: "NGN", label: "NGN — Nigerian Naira" },
  { code: "PKR", label: "PKR — Pakistani Rupee" },
  { code: "BDT", label: "BDT — Bangladeshi Taka" },
  { code: "MXN", label: "MXN — Mexican Peso" },
  { code: "RUB", label: "RUB — Russian Ruble" },
  { code: "KRW", label: "KRW — South Korean Won" },
  { code: "IDR", label: "IDR — Indonesian Rupiah" },
  { code: "SAR", label: "SAR — Saudi Riyal" },
  { code: "AED", label: "AED — UAE Dirham" },
  { code: "ARS", label: "ARS — Argentine Peso" },
  { code: "VND", label: "VND — Vietnamese Dong" },
  { code: "PHP", label: "PHP — Philippine Peso" },
  { code: "SGD", label: "SGD — Singapore Dollar" },
  { code: "MYR", label: "MYR — Malaysian Ringgit" },
  { code: "LKR", label: "LKR — Sri Lankan Rupee" },
  { code: "ILS", label: "ILS — Israeli New Shekel" },
  { code: "BTN", label: "BTN — Bhutanese Ngultrum" },
  { code: "NPR", label: "NPR — Nepalese Rupee" },
  { code: "CLP", label: "CLP — Chilean Peso" },
  { code: "EGP", label: "EGP — Egyptian Pound" }
];

export default function PoliticianForm() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const nav = useNavigate();

  const [p, setP] = useState(empty);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [constituencies, setConstituencies] = useState([]);
  const [wealth, setWealth] = useState([]);
  const [relatives, setRelatives] = useState([]);
  const [partyHistory, setPartyHistory] = useState([]);
  const [positionHistory, setPositionHistory] = useState([]);
  const [phGeoOptions, setPhGeoOptions] = useState({}); // { [entryId]: { states: [], cities: [], constituencies: [] } }
  const [busy, setBusy] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [relativeSearch, setRelativeSearch] = useState({});
  const [relativeSearchResults, setRelativeSearchResults] = useState({});
  const fileRef = useRef(null);
  const bioFileRef = useRef(null);
  const mediaFileRef = useRef(null);
  const [bioHtml, setBioHtml] = useState("");
  const [media, setMedia] = useState([]);
  const [savingBio, setSavingBio] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  useEffect(() => { api.get("/ref/countries").then((r) => setCountries(r.data.items || [])); }, []);

  useEffect(() => {
    if (!p.country_code) { setStates([]); return; }
    api.get("/ref/states", { params: { country_code: p.country_code } }).then((r) => setStates(r.data.items || []));
  }, [p.country_code]);
  useEffect(() => {
    if (!p.state_id) { setCities([]); setConstituencies([]); return; }
    api.get("/ref/cities", { params: { state_id: p.state_id } }).then((r) => setCities(r.data.items || []));
    api.get("/ref/constituencies", { params: { state_id: p.state_id } }).then((r) => setConstituencies(r.data.items || []));
  }, [p.state_id]);

  useEffect(() => {
    if (isNew) return;
    api.get(`/admin/politicians/${id}`).then((r) => {
      const d = r.data;
      setP({
        name: d.name || "", party: d.party || "", role: d.role || "",
        brief_intro: d.brief_intro || "", image_url: d.image_url || "",
        country_code: d.country_code || "",
        state_id: d.state_id || "", city_id: d.city_id || "", constituency_id: d.constituency_id || "",
        date_of_birth: d.date_of_birth || "", education: d.education || "",
        profession: d.profession || "", gender: d.gender || "", currency: d.currency || "USD",
        contact_email: d.contact_email || "", contact_phone: d.contact_phone || "",
        official_website: d.official_website || "",
        social_links: {
          twitter: d.social_links?.twitter || "",
          facebook: d.social_links?.facebook || "",
          instagram: d.social_links?.instagram || "",
          youtube: d.social_links?.youtube || "",
        },
        tags: d.tags || [],
      });
      setWealth(d.wealth || []);
      setRelatives(d.relatives || []);
      setPartyHistory(d.party_history || []);
      setPositionHistory(d.position_history || []);
      setBioHtml(d.bio_html || "");
      setMedia(d.media || []);
    }).catch((e) => toast.error(formatApiError(e)));
  }, [id, isNew]);

//  const upload = async (file) => {
//    const fd = new FormData(); fd.append("file", file);
//    try {
//      const { data } = await api.post("/upload/image", fd, { headers: { "Content-Type": "multipart/form-data" } });
//      const url = data.url.startsWith("http") ? data.url : `${process.env.REACT_APP_BACKEND_URL}${data.url}`;
//      setP((s) => ({ ...s, image_url: url }));
//      toast.success("Uploaded.");
//    } catch (e) { toast.error(formatApiError(e)); }
//  };
  const upload = async (file) => {
    const fd = new FormData(); fd.append("file", file);
    try {
      const { data } = await api.post("/images/upload?context=politician_photo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      // Built from file_id rather than trusting a "url" field in the
      // response, since the router doesn't know its own mount prefix.
      const url = `${process.env.REACT_APP_BACKEND_URL}/api/images/${data.file_id}`;
      setP((s) => ({ ...s, image_url: url }));
      toast.success("Uploaded.");
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const save = async (e) => {
    e?.preventDefault();
    setBusy(true);
    try {
      const body = { ...p };
      Object.keys(body).forEach((k) => { if (body[k] === "") body[k] = null; });
      const normalizeUrl = (u) => {
       if (!u) return u;
       return /^https?:\/\//i.test(u) ? u : `https://${u}`;
      };
      body.official_website = normalizeUrl(body.official_website);
      if (body.social_links) {
        body.social_links = {
          twitter: normalizeUrl(body.social_links.twitter),
          facebook: normalizeUrl(body.social_links.facebook),
          instagram: normalizeUrl(body.social_links.instagram),
          youtube: normalizeUrl(body.social_links.youtube),
        };
      }
      body.name = p.name;
      body.country_code = p.country_code;
      body.tags = p.tags;
      if (isNew) {
        const { data } = await api.post("/politicians", body);
        toast.success("Politician created.");
        nav(`/dashboard/politicians/${data.id}`, { replace: true });
      } else {
        await api.put(`/politicians/${id}`, body);
        toast.success("Saved.");
      }
    } catch (e2) { toast.error(formatApiError(e2)); }
    finally { setBusy(false); }
  };

  const addTag = () => {
    const t = tagInput.trim(); if (!t) return;
    setP((s) => ({ ...s, tags: [...s.tags, t] }));
    setTagInput("");
  };
  const removeTag = (i) => setP((s) => ({ ...s, tags: s.tags.filter((_, idx) => idx !== i) }));

  // Wealth CRUD
  const addWealth = async () => {
    if (isNew) { toast.error("Save politician first."); return; }
    const doc = { year: new Date().getFullYear(), assets: 0, liabilities: 0, source_urls: [], notes: "" };
    try {
      const { data } = await api.post(`/politicians/${id}/wealth`, doc);
      setWealth((w) => [...w, { id: data.id, ...doc, net_worth: 0 }]);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const updateWealth = async (w) => {
    try {
      await api.put(`/wealth/${w.id}`, {
        year: Number(w.year), assets: Number(w.assets), liabilities: Number(w.liabilities),
        net_worth: w.net_worth == null ? null : Number(w.net_worth),
        notes: w.notes || "", source_urls: w.source_urls || [],
      });
      toast.success("Wealth entry saved.");
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const deleteWealth = async (wid) => {
    if (!window.confirm("Delete this wealth entry?")) return;
    try { await api.delete(`/wealth/${wid}`); setWealth((w) => w.filter((x) => x.id !== wid)); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const setWField = (wid, key, val) => setWealth((ws) => ws.map((w) => w.id === wid ? { ...w, [key]: val } : w));

  // Relatives CRUD
  const addRelative = async () => {
    if (isNew) { toast.error("Save politician first."); return; }
    const doc = { name: "New Relative", relationship: "spouse", description: "" };
    try {
      const { data } = await api.post(`/politicians/${id}/relatives`, doc);
      setRelatives((r) => [...r, { id: data.id, ...doc, wealth: [] }]);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const saveRelative = async (r) => {
    try {
      await api.put(`/relatives/${r.id}`, {
        name: r.name, relationship: r.relationship, description: r.description || "",
        is_political: !!r.is_political, political_role: r.political_role || null,
        linked_politician_id: r.linked_politician_id || null,
      });
      toast.success("Relative saved.");
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const searchLinkablePolitician = async (rid, query) => {
    setRelativeSearch((s) => ({ ...s, [rid]: query }));
    if (!query || query.length < 2) {
      setRelativeSearchResults((s) => ({ ...s, [rid]: [] }));
      return;
    }
    try {
      const { data } = await api.get("/politicians", { params: { q: query, limit: 5 } });
      setRelativeSearchResults((s) => ({ ...s, [rid]: (data.items || []).filter((p) => p.id !== id) }));
    } catch { /* silent */ }
  };
  const pickLinkedPolitician = (rid, pol) => {
    setRelatives((rs) => rs.map((x) => x.id === rid ? { ...x, linked_politician_id: pol.id, linked_politician_name: pol.name } : x));
    setRelativeSearch((s) => ({ ...s, [rid]: "" }));
    setRelativeSearchResults((s) => ({ ...s, [rid]: [] }));
  };
  const clearLinkedPolitician = (rid) => {
    setRelatives((rs) => rs.map((x) => x.id === rid ? { ...x, linked_politician_id: null, linked_politician_name: null } : x));
  };
  const deleteRelative = async (rid) => {
    if (!window.confirm("Delete this relative?")) return;
    try { await api.delete(`/relatives/${rid}`); setRelatives((rs) => rs.filter((x) => x.id !== rid)); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const addRelWealth = async (rid) => {
    const doc = { year: new Date().getFullYear(), assets: 0, liabilities: 0, source_urls: [], notes: "" };
    try {
      const { data } = await api.post(`/relatives/${rid}/wealth`, doc);
      setRelatives((rs) => rs.map((r) => r.id === rid ? { ...r, wealth: [...(r.wealth || []), { id: data.id, ...doc, net_worth: 0 }] } : r));
    } catch (e) { toast.error(formatApiError(e)); }
  };
  // Party History CRUD
  const addPartyHistory = async () => {
    if (isNew) { toast.error("Save politician first."); return; }
    const doc = { party: p.party || "New Party", start_date: "", end_date: "", note: "", source_url: "" };
    try {
      const { data } = await api.post(`/politicians/${id}/party-history`, doc);
      setPartyHistory((ph) => [{ id: data.id, ...doc }, ...ph]);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const savePartyHistory = async (entry) => {
    try {
      await api.put(`/party-history/${entry.id}`, {
        party: entry.party, start_date: entry.start_date || null, end_date: entry.end_date || null,
        note: entry.note || "", source_url: entry.source_url || null,
      });
      toast.success("Party history saved.");
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const deletePartyHistory = async (phid) => {
    if (!window.confirm("Delete this party history entry?")) return;
    try { await api.delete(`/party-history/${phid}`); setPartyHistory((ph) => ph.filter((x) => x.id !== phid)); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const setPHField = (phid, key, val) => setPartyHistory((ph) => ph.map((x) => x.id === phid ? { ...x, [key]: val } : x));
  // Position History CRUD
  const loadPhGeo = async (phId, level, value) => {
    if (level === "country") {
      if (!value) { setPhGeoOptions((g) => ({ ...g, [phId]: { states: [], cities: [], constituencies: [] } })); return; }
      const { data } = await api.get("/ref/states", { params: { country_code: value } });
      setPhGeoOptions((g) => ({ ...g, [phId]: { states: data.items || [], cities: [], constituencies: [] } }));
    } else if (level === "state") {
      if (!value) {
        setPhGeoOptions((g) => ({ ...g, [phId]: { states: g[phId]?.states || [], cities: [], constituencies: [] } }));
        return;
      }
      const [citiesRes, constRes] = await Promise.all([
        api.get("/ref/cities", { params: { state_id: value } }),
        api.get("/ref/constituencies", { params: { state_id: value } }),
      ]);
      setPhGeoOptions((g) => ({
        ...g,
        [phId]: { states: g[phId]?.states || [], cities: citiesRes.data.items || [], constituencies: constRes.data.items || [] },
      }));
    }
  };
  const addPositionHistory = async () => {
    if (isNew) { toast.error("Save politician first."); return; }
    const isFirst = positionHistory.length === 0;
    const doc = isFirst
      ? {
          position: p.role || "", country_code: p.country_code || "", state_id: p.state_id || "",
          city_id: p.city_id || "", constituency_id: p.constituency_id || "", party: p.party || "",
          start_date: "", end_date: "", is_current: true, election_year: null, note: "",
        }
      : {
          position: "", country_code: "", state_id: "", city_id: "", constituency_id: "", party: "",
          start_date: "", end_date: "", is_current: false, election_year: null, note: "",
        };
    try {
      const { data } = await api.post(`/politicians/${id}/position-history`, doc);
      setPositionHistory((ph) => [{ id: data.id, ...doc }, ...ph]);
      if (isFirst && doc.country_code) await loadPhGeo(data.id, "country", doc.country_code);
      if (isFirst && doc.state_id) await loadPhGeo(data.id, "state", doc.state_id);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const savePositionHistory = async (entry) => {
    try {
      await api.put(`/position-history/${entry.id}`, {
        position: entry.position, country_code: entry.country_code || null,
        state_id: entry.state_id || null, city_id: entry.city_id || null,
        constituency_id: entry.constituency_id || null, party: entry.party || null,
        start_date: entry.start_date || null, end_date: entry.end_date || null,
        is_current: !!entry.is_current, election_year: entry.election_year || null,
        note: entry.note || null,
      });
      toast.success("Position history saved.");
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const deletePositionHistory = async (phid) => {
    if (!window.confirm("Delete this position history entry?")) return;
    try { await api.delete(`/position-history/${phid}`); setPositionHistory((ph) => ph.filter((x) => x.id !== phid)); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const setPositionField = (phId, key, val) => {
    setPositionHistory((ph) => ph.map((x) => {
      if (x.id !== phId) return x;
      const next = { ...x, [key]: val };
      if (key === "country_code") { next.state_id = ""; next.city_id = ""; next.constituency_id = ""; }
      if (key === "state_id") { next.city_id = ""; next.constituency_id = ""; }
      return next;
    }));
    if (key === "country_code") loadPhGeo(phId, "country", val);
    if (key === "state_id") loadPhGeo(phId, "state", val);
  };

  // Bio & Media
  const saveBio = async () => {
    if (isNew) { toast.error("Save politician first."); return; }
    setSavingBio(true);
    try {
      await api.put(`/politicians/${id}/bio`, { html: bioHtml });
      toast.success("Bio saved.");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSavingBio(false); }
  };
  const uploadBioFile = async (file) => {
    if (isNew) { toast.error("Save politician first."); return; }
    const fd = new FormData(); fd.append("file", file);
    try {
      await api.post(`/politicians/${id}/bio-file`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      const { data } = await api.get(`/politicians/${id}`);
      setBioHtml(data.bio_html || "");
      toast.success("Bio file uploaded.");
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const uploadMedia = async (file) => {
    if (isNew) { toast.error("Save politician first."); return; }
    setUploadingMedia(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const { data } = await api.post(`/politicians/${id}/media`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setMedia((m) => [{ id: data.id, url: data.url, filename: file.name, file_type: file.type.startsWith("image/") ? "image" : file.type === "application/pdf" ? "pdf" : file.type.startsWith("video/") ? "video" : "other" }, ...m]);
      toast.success("File uploaded.");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setUploadingMedia(false); }
  };
  const deleteMedia = async (mid) => {
    if (!window.confirm("Delete this file?")) return;
    try { await api.delete(`/media/${mid}`); setMedia((m) => m.filter((x) => x.id !== mid)); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10">
        <Link to="/dashboard/politicians" className="soft-label mb-0 inline-flex items-center gap-2 hover:text-emerald-600 transition-colors">
          <ArrowLeft size={12} /> Politicians
        </Link>
        <div className="mt-4 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="soft-label mb-0">/// {isNew ? "Create" : "Edit"}</div>
            <h1 className="mt-2 font-display font-black text-4xl text-slate-900">
              {isNew ? "New Politician" : p.name || "Editing"}
            </h1>
          </div>
          <button data-testid="save-politician" onClick={save} disabled={busy} className="btn-soft-primary disabled:opacity-50">
            <Save size={16} className="mr-2" /> {busy ? "Saving…" : "Save"}
          </button>
        </div>

        <form onSubmit={save} className="mt-8 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Image + upload */}
          <div className="soft-card p-4">
            <div className="border-2 border-dashed border-slate-300 rounded-2xl aspect-[4/5] bg-slate-50 grid place-items-center overflow-hidden">
              {p.image_url ? (
                <img src={p.image_url} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-slate-400 uppercase text-xs font-bold tracking-wider p-6">Drag image or click upload</div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
              className="hidden"
              data-testid="image-file"
            />
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-soft-secondary w-full mt-4 text-xs" data-testid="upload-btn">
              <Upload size={12} className="mr-2" /> Upload Image
            </button>
          </div>

          {/* Main fields */}
          <div className="space-y-4">
            <div className="soft-card p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="soft-label">Name *</label>
                  <input data-testid="p-name" required value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} className="soft-input" />
                </div>
                <div>
                  <label className="soft-label">Party</label>
                  <input value={p.party} onChange={(e) => setP({ ...p, party: e.target.value })} className="soft-input" />
                </div>
                <div>
                  <label className="soft-label">Role / Title</label>
                  <input value={p.role} onChange={(e) => setP({ ...p, role: e.target.value })} className="soft-input" />
                </div>
                <div>
                  <label className="soft-label">Date of Birth</label>
                  <input type="date" value={p.date_of_birth} onChange={(e) => setP({ ...p, date_of_birth: e.target.value })} className="soft-input" />
                </div>
                <div>
                  <label className="soft-label">Gender (Admin Only)</label>
                  <select value={p.gender} onChange={(e) => setP({ ...p, gender: e.target.value })} className="soft-input">
                    <option value="">Not specified</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Used only to infer relative relationship terms. Never shown publicly.</p>
                </div>
                <div>
                  <label className="soft-label">Wealth Currency</label>
                  <select value={p.currency} onChange={(e) => setP({ ...p, currency: e.target.value })} className="soft-input" data-testid="currency-select">
                    {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Used to display wealth/net worth figures on this profile.</p>
                </div>
              </div>
              <div>
                <label className="soft-label">Brief Intro</label>
                <textarea data-testid="p-intro" rows={3} value={p.brief_intro} onChange={(e) => setP({ ...p, brief_intro: e.target.value })} className="soft-input" />
              </div>
              <div>
                <label className="soft-label">Education</label>
                <input value={p.education} onChange={(e) => setP({ ...p, education: e.target.value })} className="soft-input" />
              </div>
              <div>
                <label className="soft-label">Profession</label>
                <input value={p.profession} onChange={(e) => setP({ ...p, profession: e.target.value })} className="soft-input" />
              </div>
              <div>
                <label className="soft-label">Tags</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {p.tags.map((t, i) => (
                    <span key={i} className="inline-flex items-center gap-2 border border-slate-200 bg-slate-50 rounded-full px-3 py-1 text-xs font-bold uppercase text-slate-700">
                      {t}
                      <button type="button" onClick={() => removeTag(i)} className="text-rose-500">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} className="soft-input" placeholder="Type and press Enter" />
                  <button type="button" onClick={addTag} className="btn-soft-secondary text-xs px-4">Add</button>
                </div>
              </div>
            </div>

          <div className="soft-card p-6 space-y-4">
            <div className="soft-label mb-0">/// Geography</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="soft-label">Country *</label>
                  <select data-testid="p-country" required value={p.country_code} onChange={(e) => setP({ ...p, country_code: e.target.value, state_id: "", city_id: "", constituency_id: "" })} className="soft-input">
                    <option value="">Select country</option>
                    {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="soft-label">State</label>
                  <select value={p.state_id} onChange={(e) => setP({ ...p, state_id: e.target.value, city_id: "", constituency_id: "" })} className="soft-input" disabled={!states.length}>
                    <option value="">{states.length ? "Select state" : "No states — add via Reference Data"}</option>
                    {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="soft-label">City</label>
                  <select value={p.city_id} onChange={(e) => setP({ ...p, city_id: e.target.value })} className="soft-input" disabled={!cities.length}>
                    <option value="">{cities.length ? "Select city" : "No cities"}</option>
                    {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="soft-label">Constituency</label>
                  <select value={p.constituency_id} onChange={(e) => setP({ ...p, constituency_id: e.target.value })} className="soft-input" disabled={!constituencies.length}>
                    <option value="">{constituencies.length ? "Select constituency" : "No constituencies"}</option>
                    {constituencies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="soft-card p-6 space-y-4">
              <div className="soft-label mb-0">/// Contact & Online</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="soft-label">Contact Email</label>
                  <input type="email" value={p.contact_email} onChange={(e) => setP({ ...p, contact_email: e.target.value })} className="soft-input" placeholder="office@example.gov" />
                </div>
                <div>
                  <label className="soft-label">Contact Phone</label>
                  <input value={p.contact_phone} onChange={(e) => setP({ ...p, contact_phone: e.target.value })} className="soft-input" />
                </div>
                <div className="md:col-span-2">
                  <label className="soft-label">Official Website</label>
                  <input value={p.official_website} onChange={(e) => setP({ ...p, official_website: e.target.value })} className="soft-input" placeholder="https://..." />
                </div>
                <div>
                  <label className="soft-label">Twitter / X</label>
                  <input value={p.social_links.twitter} onChange={(e) => setP({ ...p, social_links: { ...p.social_links, twitter: e.target.value } })} className="soft-input" placeholder="https://twitter.com/..." />
                </div>
                <div>
                  <label className="soft-label">Facebook</label>
                  <input value={p.social_links.facebook} onChange={(e) => setP({ ...p, social_links: { ...p.social_links, facebook: e.target.value } })} className="soft-input" placeholder="https://facebook.com/..." />
                </div>
                <div>
                  <label className="soft-label">Instagram</label>
                  <input value={p.social_links.instagram} onChange={(e) => setP({ ...p, social_links: { ...p.social_links, instagram: e.target.value } })} className="soft-input" placeholder="https://instagram.com/..." />
                </div>
                <div>
                  <label className="soft-label">YouTube</label>
                  <input value={p.social_links.youtube} onChange={(e) => setP({ ...p, social_links: { ...p.social_links, youtube: e.target.value } })} className="soft-input" placeholder="https://youtube.com/..." />
                </div>
              </div>
            </div>
          </div>
        </form>

        {!isNew && (
          <>
            {/* Wealth history */}
            <div className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-2xl text-slate-800">Wealth History</h2>
                <button onClick={addWealth} className="btn-soft-secondary text-xs px-4 py-2" data-testid="add-wealth"><Plus size={12} className="mr-1" /> Add Entry</button>
              </div>
              <div className="space-y-3">
                {wealth.map((w) => (
                  <div key={w.id} className="soft-card p-4 grid grid-cols-1 md:grid-cols-[100px_repeat(4,1fr)_120px] gap-3 items-end">
                    <div>
                      <label className="soft-label text-[10px] mb-1">Year</label>
                      <input type="number" value={w.year} onChange={(e) => setWField(w.id, "year", Number(e.target.value))} className="soft-input" />
                    </div>
                    <div>
                      <label className="soft-label text-[10px] mb-1">Assets</label>
                      <input type="number" value={w.assets} onChange={(e) => setWField(w.id, "assets", Number(e.target.value))} className="soft-input" />
                    </div>
                    <div>
                      <label className="soft-label text-[10px] mb-1">Liabilities</label>
                      <input type="number" value={w.liabilities} onChange={(e) => setWField(w.id, "liabilities", Number(e.target.value))} className="soft-input" />
                    </div>
                    <div>
                      <label className="soft-label text-[10px] mb-1">Net Worth</label>
                      <input type="number" value={w.net_worth ?? ""} onChange={(e) => setWField(w.id, "net_worth", e.target.value === "" ? null : Number(e.target.value))} className="soft-input" placeholder="Auto" />
                    </div>
                    <div>
                      <label className="soft-label text-[10px] mb-1">Sources (comma-sep)</label>
                      <input value={(w.source_urls || []).join(", ")} onChange={(e) => setWField(w.id, "source_urls", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} className="soft-input" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateWealth(w)} className="btn-soft-primary text-xs px-3 py-2"><Save size={12} /></button>
                      <button onClick={() => deleteWealth(w.id)} className="btn-soft-danger px-3 py-2"><Trash size={12} /></button>
                    </div>
                  </div>
                ))}
                {!wealth.length && <div className="soft-card p-6 text-center text-slate-400 uppercase text-xs font-bold tracking-wider">No wealth entries. Add one above.</div>}
              </div>
            </div>

            {/* Party History */}
            <div className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-2xl text-slate-800">Party History</h2>
                <button onClick={addPartyHistory} className="btn-soft-secondary text-xs px-4 py-2" data-testid="add-party-history"><Plus size={12} className="mr-1" /> Add Entry</button>
              </div>
              <div className="space-y-3">
                {partyHistory.map((ph) => (
                  <div key={ph.id} className="soft-card p-4 grid grid-cols-1 md:grid-cols-[1fr_140px_140px_1fr_140px] gap-3 items-end">
                    <div>
                      <label className="soft-label text-[10px] mb-1">Party</label>
                      <input value={ph.party} onChange={(e) => setPHField(ph.id, "party", e.target.value)} className="soft-input" />
                    </div>
                    <div>
                      <label className="soft-label text-[10px] mb-1">Start Date</label>
                      <input type="date" value={ph.start_date || ""} onChange={(e) => setPHField(ph.id, "start_date", e.target.value)} className="soft-input" />
                    </div>
                    <div>
                      <label className="soft-label text-[10px] mb-1">End Date</label>
                      <input type="date" value={ph.end_date || ""} onChange={(e) => setPHField(ph.id, "end_date", e.target.value)} className="soft-input" placeholder="Ongoing" />
                    </div>
                    <div>
                      <label className="soft-label text-[10px] mb-1">Note</label>
                      <input value={ph.note || ""} onChange={(e) => setPHField(ph.id, "note", e.target.value)} className="soft-input" placeholder="e.g. Defected, expelled" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => savePartyHistory(ph)} className="btn-soft-primary text-xs px-3 py-2"><Save size={12} /></button>
                      <button onClick={() => deletePartyHistory(ph.id)} className="btn-soft-danger px-3 py-2"><Trash size={12} /></button>
                    </div>
                    <div className="md:col-span-5">
                      <label className="soft-label text-[10px] mb-1">Source URL</label>
                      <input value={ph.source_url || ""} onChange={(e) => setPHField(ph.id, "source_url", e.target.value)} className="soft-input" placeholder="https://..." />
                    </div>
                  </div>
                ))}
                {!partyHistory.length && <div className="soft-card p-6 text-center text-slate-400 uppercase text-xs font-bold tracking-wider">No party history recorded.</div>}
              </div>
            </div>

            {/* Position History */}
            <div className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-2xl text-slate-800">Position History</h2>
                <button onClick={addPositionHistory} className="btn-soft-secondary text-xs px-4 py-2" data-testid="add-position-history"><Plus size={12} className="mr-1" /> Add Entry</button>
              </div>
              <div className="space-y-4">
                {positionHistory.map((ph) => {
                  const geoRaw = phGeoOptions[ph.id] || {};
                  const geo = { states: geoRaw.states || [], cities: geoRaw.cities || [], constituencies: geoRaw.constituencies || [] };
                  return (
                    <div key={ph.id} className="soft-card p-5 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="soft-label text-[10px] mb-1">Position</label>
                          <input value={ph.position} onChange={(e) => setPositionField(ph.id, "position", e.target.value)} className="soft-input" placeholder="MP, MLA, Mayor..." />
                        </div>
                        <div>
                          <label className="soft-label text-[10px] mb-1">Party</label>
                          <input value={ph.party || ""} onChange={(e) => setPositionField(ph.id, "party", e.target.value)} className="soft-input" />
                        </div>
                        <div>
                          <label className="soft-label text-[10px] mb-1">Election Year</label>
                          <input type="number" value={ph.election_year || ""} onChange={(e) => setPositionField(ph.id, "election_year", e.target.value ? Number(e.target.value) : null)} className="soft-input" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="soft-label text-[10px] mb-1">Country</label>
                          <select value={ph.country_code || ""} onChange={(e) => setPositionField(ph.id, "country_code", e.target.value)} className="soft-input">
                            <option value="">—</option>
                            {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="soft-label text-[10px] mb-1">State</label>
                          <select value={ph.state_id || ""} onChange={(e) => setPositionField(ph.id, "state_id", e.target.value)} className="soft-input" disabled={!geo.states.length}>
                            <option value="">—</option>
                            {geo.states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="soft-label text-[10px] mb-1">City</label>
                          <select value={ph.city_id || ""} onChange={(e) => setPositionField(ph.id, "city_id", e.target.value)} className="soft-input" disabled={!geo.cities.length}>
                            <option value="">—</option>
                            {geo.cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="soft-label text-[10px] mb-1">Constituency</label>
                          <select value={ph.constituency_id || ""} onChange={(e) => setPositionField(ph.id, "constituency_id", e.target.value)} className="soft-input" disabled={!geo.constituencies.length}>
                            <option value="">—</option>
                            {geo.constituencies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div>
                          <label className="soft-label text-[10px] mb-1">Start Date</label>
                          <input type="date" value={ph.start_date || ""} onChange={(e) => setPositionField(ph.id, "start_date", e.target.value)} className="soft-input" />
                        </div>
                        <div>
                          <label className="soft-label text-[10px] mb-1">End Date</label>
                          <input type="date" value={ph.end_date || ""} onChange={(e) => setPositionField(ph.id, "end_date", e.target.value)} className="soft-input" disabled={!!ph.is_current} placeholder={ph.is_current ? "Ongoing" : ""} />
                        </div>
                        <div>
                          <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={!!ph.is_current} onChange={(e) => setPositionField(ph.id, "is_current", e.target.checked)} />
                            <span className="soft-label mb-0">Currently Holding</span>
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => savePositionHistory(ph)} className="btn-soft-primary text-xs px-3 py-2"><Save size={12} /></button>
                          <button onClick={() => deletePositionHistory(ph.id)} className="btn-soft-danger px-3 py-2"><Trash size={12} /></button>
                        </div>
                      </div>
                      <div>
                        <label className="soft-label text-[10px] mb-1">Notes</label>
                        <input value={ph.note || ""} onChange={(e) => setPositionField(ph.id, "note", e.target.value)} className="soft-input" placeholder="Optional context" />
                      </div>
                    </div>
                  );
                })}
                {!positionHistory.length && <div className="soft-card p-6 text-center text-slate-400 uppercase text-xs font-bold tracking-wider">No position history recorded.</div>}
              </div>
            </div>

            {/* Relatives */}
            <div className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-2xl text-slate-800">Relatives</h2>
                <button onClick={addRelative} className="btn-soft-secondary text-xs px-4 py-2" data-testid="add-relative"><Plus size={12} className="mr-1" /> Add Relative</button>
              </div>
              <div className="space-y-4">
                {relatives.map((r) => (
                  <div key={r.id} className="soft-card p-6">
                    {r.is_reciprocal && (
                      <div className="mb-4 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 rounded-full px-3 py-1 inline-block">
                        Auto-linked — edit from {r.linked_politician_name || "the original"}'s profile
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_2fr_auto] gap-3 items-end">
                      <div>
                        <label className="soft-label">Name</label>
                        <input value={r.name} onChange={(e) => setRelatives((rs) => rs.map((x) => x.id === r.id ? { ...x, name: e.target.value } : x))} className="soft-input" />
                      </div>
                      <div>
                        <label className="soft-label">Relationship</label>
                        <input value={r.relationship} onChange={(e) => setRelatives((rs) => rs.map((x) => x.id === r.id ? { ...x, relationship: e.target.value } : x))} className="soft-input" />
                      </div>
                      <div>
                        <label className="soft-label">Description</label>
                        <input value={r.description || ""} onChange={(e) => setRelatives((rs) => rs.map((x) => x.id === r.id ? { ...x, description: e.target.value } : x))} className="soft-input" />
                      </div>
                      <div className="flex gap-2">
                        {!r.is_reciprocal && (
                          <>
                            <button onClick={() => saveRelative(r)} className="btn-soft-primary text-xs px-3 py-2"><Save size={12} /></button>
                            <button onClick={() => deleteRelative(r.id)} className="btn-soft-danger px-3 py-2"><Trash size={12} /></button>
                          </>
                        )}
                      </div>
                    </div>

                    {!r.is_reciprocal && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <label className="inline-flex items-center gap-2 mb-3">
                        <input
                          type="checkbox"
                          checked={!!r.is_political}
                          onChange={(e) => setRelatives((rs) => rs.map((x) => x.id === r.id ? { ...x, is_political: e.target.checked } : x))}
                        />
                        <span className="soft-label mb-0">Politically Active</span>
                      </label>

                      {r.is_political && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="soft-label">Political Role</label>
                            <input
                              value={r.political_role || ""}
                              onChange={(e) => setRelatives((rs) => rs.map((x) => x.id === r.id ? { ...x, political_role: e.target.value } : x))}
                              className="soft-input"
                              placeholder="e.g. MP for District 4"
                            />
                          </div>
                          <div className="relative">
                            <label className="soft-label">Link to Politician Profile</label>
                            {r.linked_politician_id ? (
                              <div className="flex items-center gap-2 soft-input">
                                <span className="flex-1 text-sm text-slate-800">{r.linked_politician_name || r.linked_politician_id}</span>
                                <button type="button" onClick={() => clearLinkedPolitician(r.id)} className="text-rose-500 text-xs font-bold">×</button>
                              </div>
                            ) : (
                              <>
                                <input
                                  value={relativeSearch[r.id] || ""}
                                  onChange={(e) => searchLinkablePolitician(r.id, e.target.value)}
                                  className="soft-input"
                                  placeholder="Search politicians..."
                                />
                                {(relativeSearchResults[r.id] || []).length > 0 && (
                                  <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-2xl mt-1 shadow-soft-lg max-h-48 overflow-y-auto">
                                    {relativeSearchResults[r.id].map((pol) => (
                                      <button
                                        type="button"
                                        key={pol.id}
                                        onClick={() => pickLinkedPolitician(r.id, pol)}
                                        className="block w-full text-left px-4 py-2 hover:bg-slate-50 text-sm text-slate-700"
                                      >
                                        {pol.name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    )}
                    <div className="mt-6 pl-6 border-l-4 border-emerald-500">
                      <div className="flex items-center justify-between mb-2">
                        <div className="soft-label mb-0">Wealth History for {r.name}</div>
                        <button onClick={() => addRelWealth(r.id)} className="btn-soft-secondary text-xs px-3 py-1.5"><Plus size={10} className="mr-1" /> Entry</button>
                      </div>
                      {(r.wealth || []).length === 0 ? (
                        <div className="text-slate-400 uppercase text-xs font-bold tracking-wider">No entries</div>
                      ) : (
                        <div className="space-y-2">
                          {r.wealth.map((w) => (
                            <div key={w.id} className="border border-slate-200 rounded-2xl p-3 grid grid-cols-1 md:grid-cols-[80px_repeat(3,1fr)_120px] gap-2 items-end bg-slate-50">
                              <div>
                                <label className="soft-label text-[10px] mb-1">Year</label>
                                <input type="number" value={w.year} onChange={(e) => setRelatives((rs) => rs.map((x) => x.id === r.id ? { ...x, wealth: x.wealth.map((y) => y.id === w.id ? { ...y, year: Number(e.target.value) } : y) } : x))} className="soft-input" />
                              </div>
                              <div>
                                <label className="soft-label text-[10px] mb-1">Assets</label>
                                <input type="number" value={w.assets} onChange={(e) => setRelatives((rs) => rs.map((x) => x.id === r.id ? { ...x, wealth: x.wealth.map((y) => y.id === w.id ? { ...y, assets: Number(e.target.value) } : y) } : x))} className="soft-input" />
                              </div>
                              <div>
                                <label className="soft-label text-[10px] mb-1">Liab.</label>
                                <input type="number" value={w.liabilities} onChange={(e) => setRelatives((rs) => rs.map((x) => x.id === r.id ? { ...x, wealth: x.wealth.map((y) => y.id === w.id ? { ...y, liabilities: Number(e.target.value) } : y) } : x))} className="soft-input" />
                              </div>
                              <div>
                                <label className="soft-label text-[10px] mb-1">Sources</label>
                                <input value={(w.source_urls || []).join(",")} onChange={(e) => setRelatives((rs) => rs.map((x) => x.id === r.id ? { ...x, wealth: x.wealth.map((y) => y.id === w.id ? { ...y, source_urls: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } : y) } : x))} className="soft-input" />
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => updateWealth(w)} className="btn-soft-primary text-xs px-3 py-2"><Save size={12} /></button>
                                <button onClick={() => deleteWealth(w.id).then(() => setRelatives((rs) => rs.map((x) => x.id === r.id ? { ...x, wealth: x.wealth.filter((y) => y.id !== w.id) } : x)))} className="btn-soft-danger px-3 py-2"><Trash size={12} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {!relatives.length && <div className="soft-card p-6 text-center text-slate-400 uppercase text-xs font-bold tracking-wider">No relatives yet.</div>}
              </div>
            </div>

            {/* Bio & Media */}
            <div className="mt-10">
              <h2 className="font-display font-bold text-2xl text-slate-800 mb-4">Bio & Media</h2>
              <div className="soft-card p-5 space-y-3">
                <label className="soft-label">Bio / Article (HTML)</label>
                <textarea
                  value={bioHtml}
                  onChange={(e) => setBioHtml(e.target.value)}
                  rows={10}
                  className="soft-input font-mono text-xs"
                  placeholder="<p>Write or paste HTML here...</p>"
                  data-testid="bio-html-input"
                />
                <div className="flex flex-wrap gap-2">
                  <button onClick={saveBio} disabled={savingBio} className="btn-soft-primary text-xs disabled:opacity-50" data-testid="save-bio-btn">
                    <Save size={12} className="mr-2" /> {savingBio ? "Saving…" : "Save Bio"}
                  </button>
                  <input
                    ref={bioFileRef}
                    type="file"
                    accept=".html,.htm"
                    onChange={(e) => e.target.files?.[0] && uploadBioFile(e.target.files[0])}
                    className="hidden"
                    data-testid="bio-file-input"
                  />
                  <button type="button" onClick={() => bioFileRef.current?.click()} className="btn-soft-secondary text-xs" data-testid="upload-bio-file-btn">
                    <Upload size={12} className="mr-2" /> Upload HTML File
                  </button>
                </div>
              </div>

              <div className="soft-card p-5 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <label className="soft-label mb-0">Attachments (images, PDF, video)</label>
                  <input
                    ref={mediaFileRef}
                    type="file"
                    accept="image/*,application/pdf,video/*"
                    onChange={(e) => e.target.files?.[0] && uploadMedia(e.target.files[0])}
                    className="hidden"
                    data-testid="media-file-input"
                  />
                  <button type="button" onClick={() => mediaFileRef.current?.click()} disabled={uploadingMedia} className="btn-soft-secondary text-xs disabled:opacity-50" data-testid="upload-media-btn">
                    <Upload size={12} className="mr-2" /> {uploadingMedia ? "Uploading…" : "Upload File"}
                  </button>
                </div>
                {media.length === 0 ? (
                  <div className="text-center text-slate-400 uppercase text-xs font-bold tracking-wider py-6">No attachments yet</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {media.map((m) => (
                      <div key={m.id} className="border border-slate-200 rounded-xl p-3 relative">
                        <a href={m.url} target="_blank" rel="noreferrer" className="block text-xs truncate text-slate-700 hover:text-emerald-600 transition-colors">
                          {m.filename}
                        </a>
                        <span className="text-[10px] uppercase text-slate-400">{m.file_type}</span>
                        <button
                          onClick={() => deleteMedia(m.id)}
                          className="absolute top-1 right-1 text-rose-500 hover:opacity-70"
                          data-testid={`delete-media-${m.id}`}
                        >
                          <Trash size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};
