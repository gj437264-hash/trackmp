import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/PublicLayout";
import { api, formatApiError } from "@/lib/api";
import { CheckCircle2, ArrowLeft, ArrowRight, Plus, Trash, Upload } from "lucide-react";

const UPDATE_TYPES = [
  "Incorrect Information", "Missing Information", "New Position", "Previous Position",
  "Party Change", "Biography Update", "Contact Information", "Social Media", "Profile Photo", "Other",
];

const emptyVisitor = { first_name: "", last_name: "", email: "", country_code: "", organization: "" };
const emptyExisting = { politician_id: "", politician_name: "", update_type: "", description: "" };
const emptyNew = {
  full_name: "", gender: "", date_of_birth: "", country_code: "", state: "", city: "", constituency: "",
  party: "", current_position: "", previous_positions: "", biography: "",
  official_website: "", wikipedia: "", facebook: "", twitter: "", instagram: "", linkedin: "", youtube: "",
};

function StepHeader({ step, total, title }) {
  return (
    <div className="mb-8">
      <div className="soft-label mb-2">Step {step} of {total}</div>
      <h2 className="font-display font-bold text-2xl text-slate-800">{title}</h2>
      <div className="mt-4 h-1 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-emerald-600 to-teal-600 transition-all" style={{ width: `${(step / total) * 100}%` }} />
      </div>
    </div>
  );
}

function EvidenceStep({ urls, setUrls, files, setFiles, notes, setNotes }) {
  const addUrl = () => setUrls([...urls, ""]);
  const setUrl = (i, v) => setUrls(urls.map((u, idx) => idx === i ? v : u));
  const removeUrl = (i) => setUrls(urls.filter((_, idx) => idx !== i));
  const addFiles = (fileList) => setFiles([...files, ...Array.from(fileList)]);
  const removeFile = (i) => setFiles(files.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-5">
      <div>
        <label className="soft-label">Supporting Evidence (URLs)</label>
        <p className="text-xs text-slate-400 mb-3">Website, news links, government sources, Wikipedia, election commission pages, etc.</p>
        <div className="space-y-2">
          {urls.map((u, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={u}
                onChange={(e) => setUrl(i, e.target.value)}
                className="soft-input"
                placeholder="https://..."
                data-testid={`evidence-url-${i}`}
              />
              <button
                type="button"
                onClick={() => removeUrl(i)}
                className="inline-flex items-center justify-center px-3 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors duration-200"
              >
                <Trash size={14} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addUrl} className="btn-soft-secondary text-xs mt-2 px-4 py-2">
          <Plus size={12} className="mr-1" /> Add URL
        </button>
      </div>

      <div>
        <label className="soft-label">Upload Documents / Images</label>
        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={(e) => e.target.files?.length && addFiles(e.target.files)}
          className="block text-sm text-slate-600"
          data-testid="evidence-file-input"
        />
        {files.length > 0 && (
          <div className="mt-3 space-y-1">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-slate-50 rounded-2xl px-3 py-2">
                <span className="truncate text-slate-700">{f.name}</span>
                <button type="button" onClick={() => removeFile(i)} className="text-rose-500"><Trash size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="soft-label">Additional Notes</label>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="soft-input" data-testid="evidence-notes" />
      </div>
    </div>
  );
}

export default function SubmitUpdatePage() {
  const [requestType, setRequestType] = useState("");
  const [step, setStep] = useState(1);
  const [countries, setCountries] = useState([]);
  const [visitor, setVisitor] = useState(emptyVisitor);
  const [existing, setExisting] = useState(emptyExisting);
  const [newPol, setNewPol] = useState(emptyNew);
  const [evidenceUrls, setEvidenceUrls] = useState([""]);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ticketNumber, setTicketNumber] = useState(null);
  const [uploadWarning, setUploadWarning] = useState(false);

  useEffect(() => {
    api.get("/ref/countries").then((r) => setCountries(r.data.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!search || search.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      api.get("/politicians", { params: { q: search, limit: 6 } })
        .then((r) => setSearchResults(r.data.items || []))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const totalSteps = requestType === "add_new" ? 4 : 3;

  const canProceedStep1 = requestType && visitor.first_name.trim() && visitor.last_name.trim() && visitor.email.trim();
  const canProceedExistingStep2 = existing.politician_id && existing.update_type;
  const canProceedNewStep2 = newPol.full_name.trim() && newPol.country_code;

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const payload = requestType === "update_existing"
        ? {
            request_type: "update_existing",
            first_name: visitor.first_name, last_name: visitor.last_name, email: visitor.email,
            country_code: visitor.country_code || null, organization: visitor.organization || null,
            politician_id: existing.politician_id, update_type: existing.update_type,
            description: existing.description,
            evidence_urls: evidenceUrls.filter((u) => u.trim()),
            notes: notes || null,
          }
        : {
            request_type: "add_new",
            first_name: visitor.first_name, last_name: visitor.last_name, email: visitor.email,
            country_code: visitor.country_code || null, organization: visitor.organization || null,
            new_politician_data: newPol,
            evidence_urls: evidenceUrls.filter((u) => u.trim()),
            notes: notes || null,
          };
      const { data } = await api.post("/update-requests", payload);
      setTicketNumber(data.ticket_number);

      if (evidenceFiles.length > 0) {
        const results = await Promise.allSettled(
          evidenceFiles.map((f) => {
            const fd = new FormData();
            fd.append("file", f);
            return api.post(`/tickets/${data.ticket_id}/attachments`, fd, { headers: { "Content-Type": "multipart/form-data" } });
          })
        );
        if (results.some((r) => r.status === "rejected")) setUploadWarning(true);
      }
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  if (ticketNumber) {
    return (
      <PublicLayout>
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <CheckCircle2 size={48} className="mx-auto text-emerald-600" />
          <h1 className="mt-6 font-display font-black text-3xl text-slate-900">Submission Received</h1>
          <p className="mt-3 text-slate-600">Thank you for contributing. Your ticket number is</p>
          <div className="mt-2 font-mono text-2xl font-bold text-emerald-600" data-testid="ticket-number">{ticketNumber}</div>
          {uploadWarning && (
            <p className="mt-4 text-sm text-amber-600">Your submission was recorded, but one or more file attachments failed to upload. Our team will follow up if needed.</p>
          )}
          <Link to="/" className="btn-soft-primary inline-flex mt-8">
            <ArrowLeft size={16} className="mr-2" /> Back to Home
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-4 py-16">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
          /// Community Contribution
        </span>
        <h1 className="mt-4 font-display font-black text-4xl text-slate-900">Submit an Update</h1>
        <p className="mt-3 text-slate-600">Help us keep the record accurate — suggest a correction or add a missing politician.</p>

        {error && <div className="mt-6 border border-red-200 bg-red-50 text-red-600 text-sm rounded-2xl p-3">{error}</div>}

        {/* STEP 1: type + visitor info */}
        {step === 1 && (
          <div className="mt-10">
            <StepHeader step={1} total={totalSteps} title="What would you like to do?" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {[
                { v: "update_existing", l: "Update Existing Politician" },
                { v: "add_new", l: "Add New Politician" },
              ].map((opt) => (
                <label key={opt.v} className={`soft-card p-5 cursor-pointer flex items-center gap-3 transition-all duration-200 ${requestType === opt.v ? "ring-2 ring-emerald-500 border-emerald-200" : ""}`}>
                  <input type="radio" name="request_type" checked={requestType === opt.v} onChange={() => setRequestType(opt.v)} />
                  <span className="font-bold text-slate-800">{opt.l}</span>
                </label>
              ))}
            </div>

            <h3 className="font-display font-bold text-lg text-slate-800 mb-4">Your Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={visitor.first_name} onChange={(e) => setVisitor({ ...visitor, first_name: e.target.value })} placeholder="First Name *" className="soft-input" data-testid="visitor-first-name" />
              <input value={visitor.last_name} onChange={(e) => setVisitor({ ...visitor, last_name: e.target.value })} placeholder="Last Name *" className="soft-input" data-testid="visitor-last-name" />
              <input type="email" value={visitor.email} onChange={(e) => setVisitor({ ...visitor, email: e.target.value })} placeholder="Email *" className="soft-input" data-testid="visitor-email" />
              <select value={visitor.country_code} onChange={(e) => setVisitor({ ...visitor, country_code: e.target.value })} className="soft-input" data-testid="visitor-country">
                <option value="">Country</option>
                {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
              <input value={visitor.organization} onChange={(e) => setVisitor({ ...visitor, organization: e.target.value })} placeholder="Organization (optional)" className="soft-input md:col-span-2" data-testid="visitor-organization" />
            </div>

            <button
              type="button"
              disabled={!canProceedStep1}
              onClick={() => setStep(2)}
              className="btn-soft-primary mt-8 disabled:opacity-50"
              data-testid="step1-next"
            >
              Next <ArrowRight size={16} className="ml-2" />
            </button>
          </div>
        )}

        {/* UPDATE EXISTING FLOW */}
        {step === 2 && requestType === "update_existing" && (
          <div className="mt-10">
            <StepHeader step={2} total={totalSteps} title="What needs updating?" />
            <div className="space-y-4">
              <div className="relative">
                <label className="soft-label">Search Existing Politician *</label>
                {existing.politician_id ? (
                  <div className="flex items-center justify-between soft-input">
                    <span className="text-slate-800">{existing.politician_name}</span>
                    <button type="button" onClick={() => setExisting({ ...existing, politician_id: "", politician_name: "" })} className="text-rose-500 text-xs font-bold">Change</button>
                  </div>
                ) : (
                  <>
                    <input value={search} onChange={(e) => setSearch(e.target.value)} className="soft-input" placeholder="Type a name..." data-testid="politician-search" />
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-2xl mt-1 shadow-soft-lg max-h-56 overflow-y-auto">
                        {searchResults.map((p) => (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => { setExisting({ ...existing, politician_id: p.id, politician_name: p.name }); setSearch(""); setSearchResults([]); }}
                            className="block w-full text-left px-4 py-2 hover:bg-slate-50 text-sm text-slate-700"
                          >
                            {p.name} {p.party ? `· ${p.party}` : ""}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div>
                <label className="soft-label">Type of Update *</label>
                <select value={existing.update_type} onChange={(e) => setExisting({ ...existing, update_type: e.target.value })} className="soft-input" data-testid="update-type">
                  <option value="">Select type</option>
                  {UPDATE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="soft-label">Description</label>
                <textarea rows={5} value={existing.description} onChange={(e) => setExisting({ ...existing, description: e.target.value })} className="soft-input" data-testid="update-description" />
              </div>
            </div>
            <div className="flex gap-2 mt-8">
              <button type="button" onClick={() => setStep(1)} className="btn-soft-secondary">Back</button>
              <button type="button" disabled={!canProceedExistingStep2} onClick={() => setStep(3)} className="btn-soft-primary disabled:opacity-50">
                Next <ArrowRight size={16} className="ml-2" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && requestType === "update_existing" && (
          <div className="mt-10">
            <StepHeader step={3} total={totalSteps} title="Supporting Evidence" />
            <EvidenceStep urls={evidenceUrls} setUrls={setEvidenceUrls} files={evidenceFiles} setFiles={setEvidenceFiles} notes={notes} setNotes={setNotes} />
            <div className="flex gap-2 mt-8">
              <button type="button" onClick={() => setStep(2)} className="btn-soft-secondary">Back</button>
              <button type="button" disabled={busy} onClick={submit} className="btn-soft-primary disabled:opacity-50" data-testid="submit-update">
                {busy ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        )}

        {/* ADD NEW FLOW */}
        {step === 2 && requestType === "add_new" && (
          <div className="mt-10">
            <StepHeader step={2} total={totalSteps} title="Basic Details" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={newPol.full_name} onChange={(e) => setNewPol({ ...newPol, full_name: e.target.value })} placeholder="Full Name *" className="soft-input md:col-span-2" data-testid="new-full-name" />
              <select value={newPol.gender} onChange={(e) => setNewPol({ ...newPol, gender: e.target.value })} className="soft-input">
                <option value="">Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <input type="date" value={newPol.date_of_birth} onChange={(e) => setNewPol({ ...newPol, date_of_birth: e.target.value })} className="soft-input" placeholder="Date of Birth" />
              <select value={newPol.country_code} onChange={(e) => setNewPol({ ...newPol, country_code: e.target.value })} className="soft-input" data-testid="new-country">
                <option value="">Country *</option>
                {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
              <input value={newPol.state} onChange={(e) => setNewPol({ ...newPol, state: e.target.value })} placeholder="State" className="soft-input" />
              <input value={newPol.city} onChange={(e) => setNewPol({ ...newPol, city: e.target.value })} placeholder="City" className="soft-input" />
              <input value={newPol.constituency} onChange={(e) => setNewPol({ ...newPol, constituency: e.target.value })} placeholder="Constituency" className="soft-input" />
              <input value={newPol.party} onChange={(e) => setNewPol({ ...newPol, party: e.target.value })} placeholder="Political Party" className="soft-input" />
              <input value={newPol.current_position} onChange={(e) => setNewPol({ ...newPol, current_position: e.target.value })} placeholder="Current Position" className="soft-input md:col-span-2" />
              <textarea rows={2} value={newPol.previous_positions} onChange={(e) => setNewPol({ ...newPol, previous_positions: e.target.value })} placeholder="Previous Positions" className="soft-input md:col-span-2" />
              <textarea rows={5} value={newPol.biography} onChange={(e) => setNewPol({ ...newPol, biography: e.target.value })} placeholder="Biography" className="soft-input md:col-span-2" />
            </div>
            <div className="flex gap-2 mt-8">
              <button type="button" onClick={() => setStep(1)} className="btn-soft-secondary">Back</button>
              <button type="button" disabled={!canProceedNewStep2} onClick={() => setStep(3)} className="btn-soft-primary disabled:opacity-50">
                Next <ArrowRight size={16} className="ml-2" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && requestType === "add_new" && (
          <div className="mt-10">
            <StepHeader step={3} total={totalSteps} title="Links" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["official_website", "wikipedia", "facebook", "twitter", "instagram", "linkedin", "youtube"].map((key) => (
                <input
                  key={key}
                  value={newPol[key]}
                  onChange={(e) => setNewPol({ ...newPol, [key]: e.target.value })}
                  placeholder={key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  className="soft-input"
                />
              ))}
            </div>
            <div className="flex gap-2 mt-8">
              <button type="button" onClick={() => setStep(2)} className="btn-soft-secondary">Back</button>
              <button type="button" onClick={() => setStep(4)} className="btn-soft-primary">
                Next <ArrowRight size={16} className="ml-2" />
              </button>
            </div>
          </div>
        )}

        {step === 4 && requestType === "add_new" && (
          <div className="mt-10">
            <StepHeader step={4} total={totalSteps} title="Supporting Evidence" />
            <EvidenceStep urls={evidenceUrls} setUrls={setEvidenceUrls} files={evidenceFiles} setFiles={setEvidenceFiles} notes={notes} setNotes={setNotes} />
            <div className="flex gap-2 mt-8">
              <button type="button" onClick={() => setStep(3)} className="btn-soft-secondary">Back</button>
              <button type="button" disabled={busy} onClick={submit} className="btn-soft-primary disabled:opacity-50" data-testid="submit-update">
                {busy ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
