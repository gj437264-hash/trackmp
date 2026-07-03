import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, formatApiError, API_BASE } from "@/lib/api";
import { toast } from "sonner";
import { Upload, ArrowLeft, Plus, Trash, Save } from "lucide-react";

const empty = {
  name: "", party: "", role: "", brief_intro: "", image_url: "",
  country_code: "", state_id: "", city_id: "", constituency_id: "",
  date_of_birth: "", education: "", tags: [],
};

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
  const [busy, setBusy] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const fileRef = useRef(null);

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
    api.get(`/politicians/${id}`).then((r) => {
      const d = r.data;
      setP({
        name: d.name || "", party: d.party || "", role: d.role || "",
        brief_intro: d.brief_intro || "", image_url: d.image_url || "",
        country_code: d.country_code || "",
        state_id: d.state_id || "", city_id: d.city_id || "", constituency_id: d.constituency_id || "",
        date_of_birth: d.date_of_birth || "", education: d.education || "", tags: d.tags || [],
      });
      setWealth(d.wealth || []);
      setRelatives(d.relatives || []);
    }).catch((e) => toast.error(formatApiError(e)));
  }, [id, isNew]);

  const upload = async (file) => {
    const fd = new FormData(); fd.append("file", file);
    try {
      const { data } = await api.post("/upload/image", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const url = data.url.startsWith("http") ? data.url : `${process.env.REACT_APP_BACKEND_URL}${data.url}`;
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
    try { await api.put(`/relatives/${r.id}`, { name: r.name, relationship: r.relationship, description: r.description || "" }); toast.success("Relative saved."); }
    catch (e) { toast.error(formatApiError(e)); }
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

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10">
        <Link to="/dashboard/politicians" className="label-eyebrow inline-flex items-center gap-2 hover:text-klein">
          <ArrowLeft size={12} /> Politicians
        </Link>
        <div className="mt-4 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="label-eyebrow">/// {isNew ? "Create" : "Edit"}</div>
            <h1 className="mt-2 font-display font-black text-4xl uppercase tracking-tighter">
              {isNew ? "New Politician" : p.name || "Editing"}
            </h1>
          </div>
          <button data-testid="save-politician" onClick={save} disabled={busy} className="brutal-btn-primary disabled:opacity-50">
            <Save size={16} className="mr-2" /> {busy ? "Saving…" : "Save"}
          </button>
        </div>

        <form onSubmit={save} className="mt-8 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Image + upload */}
          <div className="brutal-card p-4">
            <div className="border-2 border-dashed border-black aspect-[4/5] bg-surfaceAlt grid place-items-center overflow-hidden">
              {p.image_url ? (
                <img src={p.image_url} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center label-eyebrow p-6">Drag image or click upload</div>
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
            <button type="button" onClick={() => fileRef.current?.click()} className="brutal-btn-secondary w-full mt-4 text-xs" data-testid="upload-btn">
              <Upload size={12} className="mr-2" /> Upload Image
            </button>
          </div>

          {/* Main fields */}
          <div className="space-y-4">
            <div className="brutal-card p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-eyebrow block mb-2">Name *</label>
                  <input data-testid="p-name" required value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} className="brutal-input" />
                </div>
                <div>
                  <label className="label-eyebrow block mb-2">Party</label>
                  <input value={p.party} onChange={(e) => setP({ ...p, party: e.target.value })} className="brutal-input" />
                </div>
                <div>
                  <label className="label-eyebrow block mb-2">Role / Title</label>
                  <input value={p.role} onChange={(e) => setP({ ...p, role: e.target.value })} className="brutal-input" />
                </div>
                <div>
                  <label className="label-eyebrow block mb-2">Date of Birth</label>
                  <input type="date" value={p.date_of_birth} onChange={(e) => setP({ ...p, date_of_birth: e.target.value })} className="brutal-input" />
                </div>
              </div>
              <div>
                <label className="label-eyebrow block mb-2">Brief Intro</label>
                <textarea data-testid="p-intro" rows={3} value={p.brief_intro} onChange={(e) => setP({ ...p, brief_intro: e.target.value })} className="brutal-input" />
              </div>
              <div>
                <label className="label-eyebrow block mb-2">Education</label>
                <input value={p.education} onChange={(e) => setP({ ...p, education: e.target.value })} className="brutal-input" />
              </div>
              <div>
                <label className="label-eyebrow block mb-2">Tags</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {p.tags.map((t, i) => (
                    <span key={i} className="inline-flex items-center gap-2 border-2 border-black px-2 py-1 text-xs font-bold uppercase">
                      {t}
                      <button type="button" onClick={() => removeTag(i)} className="text-danger">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} className="brutal-input" placeholder="Type and press Enter" />
                  <button type="button" onClick={addTag} className="brutal-btn-secondary text-xs px-4">Add</button>
                </div>
              </div>
            </div>

            <div className="brutal-card p-6 space-y-4">
              <div className="label-eyebrow">/// Geography</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-eyebrow block mb-2">Country *</label>
                  <select data-testid="p-country" required value={p.country_code} onChange={(e) => setP({ ...p, country_code: e.target.value, state_id: "", city_id: "", constituency_id: "" })} className="brutal-input">
                    <option value="">Select country</option>
                    {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-eyebrow block mb-2">State</label>
                  <select value={p.state_id} onChange={(e) => setP({ ...p, state_id: e.target.value, city_id: "", constituency_id: "" })} className="brutal-input" disabled={!states.length}>
                    <option value="">{states.length ? "Select state" : "No states — add via Reference Data"}</option>
                    {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-eyebrow block mb-2">City</label>
                  <select value={p.city_id} onChange={(e) => setP({ ...p, city_id: e.target.value })} className="brutal-input" disabled={!cities.length}>
                    <option value="">{cities.length ? "Select city" : "No cities"}</option>
                    {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-eyebrow block mb-2">Constituency</label>
                  <select value={p.constituency_id} onChange={(e) => setP({ ...p, constituency_id: e.target.value })} className="brutal-input" disabled={!constituencies.length}>
                    <option value="">{constituencies.length ? "Select constituency" : "No constituencies"}</option>
                    {constituencies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
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
                <h2 className="font-display font-black text-2xl uppercase">Wealth History</h2>
                <button onClick={addWealth} className="brutal-btn-secondary text-xs" data-testid="add-wealth"><Plus size={12} className="mr-1" /> Add Entry</button>
              </div>
              <div className="space-y-3">
                {wealth.map((w) => (
                  <div key={w.id} className="brutal-card p-4 grid grid-cols-1 md:grid-cols-[100px_repeat(4,1fr)_120px] gap-3 items-end">
                    <div>
                      <label className="label-eyebrow block mb-1 text-[10px]">Year</label>
                      <input type="number" value={w.year} onChange={(e) => setWField(w.id, "year", Number(e.target.value))} className="brutal-input" />
                    </div>
                    <div>
                      <label className="label-eyebrow block mb-1 text-[10px]">Assets</label>
                      <input type="number" value={w.assets} onChange={(e) => setWField(w.id, "assets", Number(e.target.value))} className="brutal-input" />
                    </div>
                    <div>
                      <label className="label-eyebrow block mb-1 text-[10px]">Liabilities</label>
                      <input type="number" value={w.liabilities} onChange={(e) => setWField(w.id, "liabilities", Number(e.target.value))} className="brutal-input" />
                    </div>
                    <div>
                      <label className="label-eyebrow block mb-1 text-[10px]">Net Worth</label>
                      <input type="number" value={w.net_worth ?? ""} onChange={(e) => setWField(w.id, "net_worth", e.target.value === "" ? null : Number(e.target.value))} className="brutal-input" placeholder="Auto" />
                    </div>
                    <div>
                      <label className="label-eyebrow block mb-1 text-[10px]">Sources (comma-sep)</label>
                      <input value={(w.source_urls || []).join(", ")} onChange={(e) => setWField(w.id, "source_urls", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} className="brutal-input" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateWealth(w)} className="brutal-btn-primary text-xs px-3 py-2"><Save size={12} /></button>
                      <button onClick={() => deleteWealth(w.id)} className="brutal-btn-danger text-xs px-3 py-2"><Trash size={12} /></button>
                    </div>
                  </div>
                ))}
                {!wealth.length && <div className="brutal-card p-6 text-center label-eyebrow">No wealth entries. Add one above.</div>}
              </div>
            </div>

            {/* Relatives */}
            <div className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-black text-2xl uppercase">Relatives</h2>
                <button onClick={addRelative} className="brutal-btn-secondary text-xs" data-testid="add-relative"><Plus size={12} className="mr-1" /> Add Relative</button>
              </div>
              <div className="space-y-4">
                {relatives.map((r) => (
                  <div key={r.id} className="brutal-card p-6">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_2fr_auto] gap-3 items-end">
                      <div>
                        <label className="label-eyebrow block mb-1">Name</label>
                        <input value={r.name} onChange={(e) => setRelatives((rs) => rs.map((x) => x.id === r.id ? { ...x, name: e.target.value } : x))} className="brutal-input" />
                      </div>
                      <div>
                        <label className="label-eyebrow block mb-1">Relationship</label>
                        <input value={r.relationship} onChange={(e) => setRelatives((rs) => rs.map((x) => x.id === r.id ? { ...x, relationship: e.target.value } : x))} className="brutal-input" />
                      </div>
                      <div>
                        <label className="label-eyebrow block mb-1">Description</label>
                        <input value={r.description || ""} onChange={(e) => setRelatives((rs) => rs.map((x) => x.id === r.id ? { ...x, description: e.target.value } : x))} className="brutal-input" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveRelative(r)} className="brutal-btn-primary text-xs px-3 py-2"><Save size={12} /></button>
                        <button onClick={() => deleteRelative(r.id)} className="brutal-btn-danger text-xs px-3 py-2"><Trash size={12} /></button>
                      </div>
                    </div>
                    <div className="mt-6 pl-6 border-l-4 border-klein">
                      <div className="flex items-center justify-between mb-2">
                        <div className="label-eyebrow">Wealth History for {r.name}</div>
                        <button onClick={() => addRelWealth(r.id)} className="brutal-btn-secondary text-xs px-3 py-1.5"><Plus size={10} className="mr-1" /> Entry</button>
                      </div>
                      {(r.wealth || []).length === 0 ? (
                        <div className="label-eyebrow text-neutral-500 text-xs">No entries</div>
                      ) : (
                        <div className="space-y-2">
                          {r.wealth.map((w) => (
                            <div key={w.id} className="border border-neutral-400 p-3 grid grid-cols-1 md:grid-cols-[80px_repeat(3,1fr)_120px] gap-2 items-end bg-surfaceAlt">
                              <div>
                                <label className="label-eyebrow block mb-1 text-[10px]">Year</label>
                                <input type="number" value={w.year} onChange={(e) => setRelatives((rs) => rs.map((x) => x.id === r.id ? { ...x, wealth: x.wealth.map((y) => y.id === w.id ? { ...y, year: Number(e.target.value) } : y) } : x))} className="brutal-input" />
                              </div>
                              <div>
                                <label className="label-eyebrow block mb-1 text-[10px]">Assets</label>
                                <input type="number" value={w.assets} onChange={(e) => setRelatives((rs) => rs.map((x) => x.id === r.id ? { ...x, wealth: x.wealth.map((y) => y.id === w.id ? { ...y, assets: Number(e.target.value) } : y) } : x))} className="brutal-input" />
                              </div>
                              <div>
                                <label className="label-eyebrow block mb-1 text-[10px]">Liab.</label>
                                <input type="number" value={w.liabilities} onChange={(e) => setRelatives((rs) => rs.map((x) => x.id === r.id ? { ...x, wealth: x.wealth.map((y) => y.id === w.id ? { ...y, liabilities: Number(e.target.value) } : y) } : x))} className="brutal-input" />
                              </div>
                              <div>
                                <label className="label-eyebrow block mb-1 text-[10px]">Sources</label>
                                <input value={(w.source_urls || []).join(",")} onChange={(e) => setRelatives((rs) => rs.map((x) => x.id === r.id ? { ...x, wealth: x.wealth.map((y) => y.id === w.id ? { ...y, source_urls: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } : y) } : x))} className="brutal-input" />
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => updateWealth(w)} className="brutal-btn-primary text-xs px-3 py-2"><Save size={12} /></button>
                                <button onClick={() => deleteWealth(w.id).then(() => setRelatives((rs) => rs.map((x) => x.id === r.id ? { ...x, wealth: x.wealth.filter((y) => y.id !== w.id) } : x)))} className="brutal-btn-danger text-xs px-3 py-2"><Trash size={12} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {!relatives.length && <div className="brutal-card p-6 text-center label-eyebrow">No relatives yet.</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
