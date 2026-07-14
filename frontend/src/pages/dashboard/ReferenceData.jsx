import React, { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Trash, Plus, Search } from "lucide-react";

const TABS = [
  { key: "countries", label: "Countries" },
  { key: "states", label: "States" },
  { key: "cities", label: "Cities" },
  { key: "constituencies", label: "Constituencies" },
];

export default function ReferenceData() {
  const [tab, setTab] = useState("countries");
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [constituencies, setConstituencies] = useState([]);
  const [q, setQ] = useState("");
  const [pickedCountry, setPickedCountry] = useState("");
  const [pickedState, setPickedState] = useState("");
  const [pickedCity, setPickedCity] = useState("");

  const load = async () => {
    const { data } = await api.get("/ref/countries");
    setCountries(data.items || []);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!pickedCountry) { setStates([]); return; }
    api.get("/ref/states", { params: { country_code: pickedCountry } }).then((r) => setStates(r.data.items || []));
  }, [pickedCountry]);
  useEffect(() => {
    if (!pickedState) { setCities([]); return; }
    api.get("/ref/cities", { params: { state_id: pickedState } }).then((r) => setCities(r.data.items || []));
  }, [pickedState]);
  useEffect(() => {
    if (!pickedState) { setConstituencies([]); return; }
    api.get("/ref/constituencies", { params: { state_id: pickedState } }).then((r) => setConstituencies(r.data.items || []));
  }, [pickedState, pickedCity]);

  const filteredCountries = useMemo(() => {
    const query = q.toLowerCase();
    if (!query) return countries;
    return countries.filter((c) => c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query));
  }, [countries, q]);

  const del = async (kind, id, label) => {
    if (!window.confirm(`Move ${label} to Trash?`)) return;
    try {
      await api.delete(`/ref/${kind}/${id}`);
      toast.success("Moved to trash.");
      if (kind === "countries") load();
      else if (kind === "states") setStates((s) => s.filter((x) => x.id !== id));
      else if (kind === "cities") setCities((s) => s.filter((x) => x.id !== id));
      else setConstituencies((s) => s.filter((x) => x.id !== id));
    } catch (e2) { toast.error(formatApiError(e2)); }
  };

  const [newCountry, setNewCountry] = useState({ code: "", name: "" });
  const [newState, setNewState] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newCst, setNewCst] = useState("");

  const addCountry = async (e) => {
    e.preventDefault();
    try {
      await api.post("/ref/countries", { code: newCountry.code.toUpperCase(), name: newCountry.name });
      setNewCountry({ code: "", name: "" });
      load();
      toast.success("Country added.");
    } catch (e2) { toast.error(formatApiError(e2)); }
  };
  const addState = async (e) => {
    e.preventDefault();
    try {
      await api.post("/ref/states", { country_code: pickedCountry, name: newState });
      setNewState("");
      const r = await api.get("/ref/states", { params: { country_code: pickedCountry } });
      setStates(r.data.items || []);
      toast.success("State added.");
    } catch (e2) { toast.error(formatApiError(e2)); }
  };
  const addCity = async (e) => {
    e.preventDefault();
    try {
      await api.post("/ref/cities", { state_id: pickedState, name: newCity });
      setNewCity("");
      const r = await api.get("/ref/cities", { params: { state_id: pickedState } });
      setCities(r.data.items || []);
      toast.success("City added.");
    } catch (e2) { toast.error(formatApiError(e2)); }
  };
  const addCst = async (e) => {
    e.preventDefault();
    try {
      await api.post("/ref/constituencies", { state_id: pickedState, city_id: pickedCity || null, name: newCst });
      setNewCst("");
      const r = await api.get("/ref/constituencies", { params: { state_id: pickedState } });
      setConstituencies(r.data.items || []);
      toast.success("Constituency added.");
    } catch (e2) { toast.error(formatApiError(e2)); }
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10">
        <div className="soft-label mb-0">/// Structured Data</div>
        <h1 className="mt-2 font-display font-black text-4xl text-slate-900">Reference Data</h1>

        <div className="mt-6 border-b border-slate-200 flex flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              data-testid={`ref-tab-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`px-6 py-3 -mb-px border-b-2 font-bold uppercase text-sm tracking-wider transition-colors duration-200 ${
                tab === t.key ? "border-emerald-500 text-emerald-700" : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "countries" && (
          <div className="mt-6">
            <form onSubmit={addCountry} className="soft-card p-6 grid grid-cols-1 md:grid-cols-[120px_1fr_140px] gap-3 items-end">
              <div>
                <label className="soft-label">ISO Code</label>
                <input required maxLength={2} value={newCountry.code} onChange={(e) => setNewCountry({ ...newCountry, code: e.target.value })} className="soft-input uppercase" placeholder="US" />
              </div>
              <div>
                <label className="soft-label">Name</label>
                <input required value={newCountry.name} onChange={(e) => setNewCountry({ ...newCountry, name: e.target.value })} className="soft-input" />
              </div>
              <button className="btn-soft-primary" data-testid="add-country"><Plus size={14} className="mr-1" /> Add</button>
            </form>
            <div className="mt-6 relative max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter countries…" className="soft-input pl-10" />
            </div>
            <div className="mt-4 soft-table-wrap overflow-x-auto">
              <table className="w-full border-collapse soft-table">
                <thead>
                  <tr>
                    {["Code", "Name", ""].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCountries.slice(0, 300).map((c) => (
                    <tr key={c.id}>
                      <td className="font-mono font-bold">{c.code}</td>
                      <td>{c.name}</td>
                      <td className="text-right">
                        <button data-testid={`del-country-${c.code}`} onClick={() => del("countries", c.id, c.name)} className="btn-soft-danger px-3 py-1.5"><Trash size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "states" && (
          <div className="mt-6 space-y-4">
            <div className="max-w-xs">
              <label className="soft-label">Country</label>
              <select value={pickedCountry} onChange={(e) => setPickedCountry(e.target.value)} className="soft-input" data-testid="pick-country">
                <option value="">Select a country</option>
                {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
            {pickedCountry && (
              <>
                <form onSubmit={addState} className="soft-card p-6 grid grid-cols-1 md:grid-cols-[1fr_140px] gap-3 items-end">
                  <div>
                    <label className="soft-label">New State / Province</label>
                    <input required value={newState} onChange={(e) => setNewState(e.target.value)} className="soft-input" />
                  </div>
                  <button className="btn-soft-primary" data-testid="add-state"><Plus size={14} className="mr-1" /> Add</button>
                </form>
                <div className="soft-table-wrap overflow-x-auto">
                  <table className="w-full border-collapse soft-table">
                    <thead>
                      <tr>{["Name", ""].map((h) => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {states.map((s) => (
                        <tr key={s.id}>
                          <td>{s.name}</td>
                          <td className="text-right">
                            <button onClick={() => del("states", s.id, s.name)} className="btn-soft-danger px-3 py-1.5"><Trash size={12} /></button>
                          </td>
                        </tr>
                      ))}
                      {!states.length && <tr><td colSpan={2} className="p-6 text-center text-slate-400 uppercase text-xs font-bold tracking-wider">No states</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "cities" && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="soft-label">Country</label>
                <select value={pickedCountry} onChange={(e) => { setPickedCountry(e.target.value); setPickedState(""); }} className="soft-input">
                  <option value="">Select country</option>
                  {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="soft-label">State</label>
                <select value={pickedState} onChange={(e) => setPickedState(e.target.value)} className="soft-input" disabled={!pickedCountry}>
                  <option value="">Select state</option>
                  {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            {pickedState && (
              <>
                <form onSubmit={addCity} className="soft-card p-6 grid grid-cols-1 md:grid-cols-[1fr_140px] gap-3 items-end">
                  <div>
                    <label className="soft-label">New City</label>
                    <input required value={newCity} onChange={(e) => setNewCity(e.target.value)} className="soft-input" />
                  </div>
                  <button className="btn-soft-primary" data-testid="add-city"><Plus size={14} className="mr-1" /> Add</button>
                </form>
                <div className="soft-table-wrap overflow-x-auto">
                  <table className="w-full border-collapse soft-table">
                    <thead>
                      <tr>{["Name", ""].map((h) => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {cities.map((c) => (
                        <tr key={c.id}>
                          <td>{c.name}</td>
                          <td className="text-right">
                            <button onClick={() => del("cities", c.id, c.name)} className="btn-soft-danger px-3 py-1.5"><Trash size={12} /></button>
                          </td>
                        </tr>
                      ))}
                      {!cities.length && <tr><td colSpan={2} className="p-6 text-center text-slate-400 uppercase text-xs font-bold tracking-wider">No cities</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "constituencies" && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
              <div>
                <label className="soft-label">Country</label>
                <select value={pickedCountry} onChange={(e) => { setPickedCountry(e.target.value); setPickedState(""); setPickedCity(""); }} className="soft-input">
                  <option value="">Select</option>
                  {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="soft-label">State</label>
                <select value={pickedState} onChange={(e) => { setPickedState(e.target.value); setPickedCity(""); }} className="soft-input" disabled={!pickedCountry}>
                  <option value="">Select</option>
                  {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="soft-label">City (optional)</label>
                <select value={pickedCity} onChange={(e) => setPickedCity(e.target.value)} className="soft-input" disabled={!pickedState}>
                  <option value="">Any</option>
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            {pickedState && (
              <>
                <form onSubmit={addCst} className="soft-card p-6 grid grid-cols-1 md:grid-cols-[1fr_140px] gap-3 items-end">
                  <div>
                    <label className="soft-label">New Constituency</label>
                    <input required value={newCst} onChange={(e) => setNewCst(e.target.value)} className="soft-input" />
                  </div>
                  <button className="btn-soft-primary" data-testid="add-cst"><Plus size={14} className="mr-1" /> Add</button>
                </form>
                <div className="soft-table-wrap overflow-x-auto">
                  <table className="w-full border-collapse soft-table">
                    <thead>
                      <tr>{["Name", ""].map((h) => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {constituencies.map((c) => (
                        <tr key={c.id}>
                          <td>{c.name}</td>
                          <td className="text-right">
                            <button onClick={() => del("constituencies", c.id, c.name)} className="btn-soft-danger px-3 py-1.5"><Trash size={12} /></button>
                          </td>
                        </tr>
                      ))}
                      {!constituencies.length && <tr><td colSpan={2} className="p-6 text-center text-slate-400 uppercase text-xs font-bold tracking-wider">No constituencies</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
