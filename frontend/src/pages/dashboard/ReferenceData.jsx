import React, { useEffect, useMemo, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Trash, Plus, Search, RefreshCw } from "lucide-react";

const TABS = [
  { key: "countries", label: "Countries", icon: "🌍" },
  { key: "states", label: "States", icon: "🏛️" },
  { key: "cities", label: "Cities", icon: "🏙️" },
  { key: "constituencies", label: "Constituencies", icon: "🗳️" },
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
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoized data loaders
  const loadCountries = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/ref/countries");
      setCountries(data.items || []);
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCountries();
  }, [loadCountries]);

  // Optimized data fetching with abort controllers
  useEffect(() => {
    const controller = new AbortController();
    if (!pickedCountry) { 
      setStates([]); 
      return;
    }
    
    const fetchStates = async () => {
      try {
        const r = await api.get("/ref/states", { 
          params: { country_code: pickedCountry },
          signal: controller.signal 
        });
        setStates(r.data.items || []);
      } catch (error) {
        if (error.name !== 'AbortError') {
          toast.error(formatApiError(error));
        }
      }
    };
    
    fetchStates();
    return () => controller.abort();
  }, [pickedCountry]);

  useEffect(() => {
    const controller = new AbortController();
    if (!pickedState) { 
      setCities([]); 
      return;
    }
    
    const fetchCities = async () => {
      try {
        const r = await api.get("/ref/cities", { 
          params: { state_id: pickedState },
          signal: controller.signal 
        });
        setCities(r.data.items || []);
      } catch (error) {
        if (error.name !== 'AbortError') {
          toast.error(formatApiError(error));
        }
      }
    };
    
    fetchCities();
    return () => controller.abort();
  }, [pickedState]);

  useEffect(() => {
    const controller = new AbortController();
    if (!pickedState) { 
      setConstituencies([]); 
      return;
    }
    
    const fetchConstituencies = async () => {
      try {
        const r = await api.get("/ref/constituencies", { 
          params: { state_id: pickedState },
          signal: controller.signal 
        });
        setConstituencies(r.data.items || []);
      } catch (error) {
        if (error.name !== 'AbortError') {
          toast.error(formatApiError(error));
        }
      }
    };
    
    fetchConstituencies();
    return () => controller.abort();
  }, [pickedState]);

  const filteredCountries = useMemo(() => {
    const query = q.toLowerCase().trim();
    if (!query) return countries;
    return countries.filter((c) => 
      c.name.toLowerCase().includes(query) || 
      c.code.toLowerCase().includes(query)
    );
  }, [countries, q]);

  // Delete with optimistic updates and error recovery
  const del = async (kind, id, label, backupData) => {
    if (!window.confirm(`Move "${label}" to Trash?`)) return;
    
    const setterMap = {
      countries: setCountries,
      states: setStates,
      cities: setCities,
      constituencies: setConstituencies
    };
    
    const setData = setterMap[kind];
    if (!setData) return;
    
    // Optimistic update
    const previousData = backupData || [];
    setData(prev => prev.filter(x => x.id !== id));
    
    try {
      await api.delete(`/ref/${kind}/${id}`);
      toast.success(`"${label}" moved to trash successfully.`);
      
      // Refresh data if needed
      if (kind === "countries") {
        await loadCountries();
      }
    } catch (error) {
      // Rollback on error
      setData(previousData);
      toast.error(formatApiError(error));
    }
  };

  // Generic add handler with validation
  const handleAdd = async (endpoint, payload, setter, resetValue, successMessage, refreshFn) => {
    setIsSubmitting(true);
    try {
      await api.post(endpoint, payload);
      resetValue();
      if (refreshFn) {
        await refreshFn();
      } else if (setter) {
        const { data } = await api.get(endpoint, { 
          params: payload.state_id ? { state_id: payload.state_id } : 
                  payload.country_code ? { country_code: payload.country_code } : {}
        });
        setter(data.items || []);
      }
      toast.success(successMessage);
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const addCountry = (e) => {
    e.preventDefault();
    const [code, name] = [newCountry.code.toUpperCase().trim(), newCountry.name.trim()];
    if (!code || !name) {
      toast.error("Please fill in all fields.");
      return;
    }
    handleAdd(
      "/ref/countries",
      { code, name },
      null,
      () => setNewCountry({ code: "", name: "" }),
      "Country added successfully.",
      loadCountries
    );
  };

  const addState = (e) => {
    e.preventDefault();
    const name = newState.trim();
    if (!name) {
      toast.error("Please enter a state name.");
      return;
    }
    handleAdd(
      "/ref/states",
      { country_code: pickedCountry, name },
      setStates,
      () => setNewState(""),
      "State added successfully."
    );
  };

  const addCity = (e) => {
    e.preventDefault();
    const name = newCity.trim();
    if (!name) {
      toast.error("Please enter a city name.");
      return;
    }
    handleAdd(
      "/ref/cities",
      { state_id: pickedState, name },
      setCities,
      () => setNewCity(""),
      "City added successfully."
    );
  };

  const addCst = (e) => {
    e.preventDefault();
    const name = newCst.trim();
    if (!name) {
      toast.error("Please enter a constituency name.");
      return;
    }
    handleAdd(
      "/ref/constituencies",
      { state_id: pickedState, city_id: pickedCity || null, name },
      setConstituencies,
      () => setNewCst(""),
      "Constituency added successfully."
    );
  };

  const [newCountry, setNewCountry] = useState({ code: "", name: "" });
  const [newState, setNewState] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newCst, setNewCst] = useState("");

  const renderAddForm = (title, onSubmit, children, testId) => (
    <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-8 w-1 bg-emerald-500 rounded-full"></div>
        <h3 className="font-bold text-slate-700">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-3 items-end">
        {children}
      </div>
    </form>
  );

  const renderTable = (data, headers, onDelete, emptyMessage = "No items found", showCode = false) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length > 0 ? (
              data.slice(0, 300).map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors duration-150">
                  {headers.map((header, idx) => {
                    if (header === "") return null;
                    if (header === "Name") {
                      return <td key={idx} className="px-6 py-3 text-sm text-slate-700">{item.name}</td>;
                    }
                    if (header === "Code") {
                      return <td key={idx} className="px-6 py-3 text-sm font-mono font-bold text-emerald-600">{item.code}</td>;
                    }
                    if (header === "Actions") {
                      return (
                        <td key={idx} className="px-6 py-3 text-right">
                          <button 
                            onClick={() => onDelete(item.id, item.name || item.code, data)}
                            className="text-slate-400 hover:text-red-600 transition-colors duration-200 p-1 rounded hover:bg-red-50"
                            aria-label="Delete"
                          >
                            <Trash size={16} />
                          </button>
                        </td>
                      );
                    }
                    return null;
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-4xl">📭</div>
                    <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 uppercase tracking-wider">
              <span>/// Structured Data</span>
            </div>
            <h1 className="mt-1 font-display font-black text-4xl text-slate-900">Reference Data</h1>
            <p className="mt-1 text-slate-500">Manage your geographic reference data</p>
          </div>
          <button 
            onClick={() => {
              if (tab === "countries") {
                loadCountries();
              } else if (tab === "states" && pickedCountry) {
                const fetchStates = async () => {
                  try {
                    const r = await api.get("/ref/states", { params: { country_code: pickedCountry } });
                    setStates(r.data.items || []);
                    toast.success("States refreshed successfully.");
                  } catch (error) {
                    toast.error(formatApiError(error));
                  }
                };
                fetchStates();
              } else if (tab === "cities" && pickedState) {
                const fetchCities = async () => {
                  try {
                    const r = await api.get("/ref/cities", { params: { state_id: pickedState } });
                    setCities(r.data.items || []);
                    toast.success("Cities refreshed successfully.");
                  } catch (error) {
                    toast.error(formatApiError(error));
                  }
                };
                fetchCities();
              } else if (tab === "constituencies" && pickedState) {
                const fetchConstituencies = async () => {
                  try {
                    const r = await api.get("/ref/constituencies", { params: { state_id: pickedState } });
                    setConstituencies(r.data.items || []);
                    toast.success("Constituencies refreshed successfully.");
                  } catch (error) {
                    toast.error(formatApiError(error));
                  }
                };
                fetchConstituencies();
              } else {
                toast.info(`Select a ${tab === 'states' ? 'country' : tab === 'cities' || tab === 'constituencies' ? 'state' : ''} to refresh data.`);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 mb-8">
          <div className="flex flex-wrap gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                data-testid={`ref-tab-${t.key}`}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 ${
                  tab === t.key 
                    ? "bg-emerald-50 text-emerald-700 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {tab === "countries" && (
          <div className="space-y-6">
            {renderAddForm(
              "Add New Country",
              addCountry,
              <>
                <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-1.5">Code</label>
                    <input 
                      required 
                      maxLength={2} 
                      value={newCountry.code} 
                      onChange={(e) => setNewCountry({ ...newCountry, code: e.target.value.toUpperCase() })} 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-sm"
                      placeholder="US"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-1.5">Name</label>
                    <input 
                      required 
                      value={newCountry.name} 
                      onChange={(e) => setNewCountry({ ...newCountry, name: e.target.value })} 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-sm"
                      placeholder="United States"
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="add-country"
                >
                  {isSubmitting ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <Plus size={16} />
                  )}
                  Add
                </button>
              </>,
              "add-country"
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    value={q} 
                    onChange={(e) => setQ(e.target.value)} 
                    placeholder="Search countries by name or code..." 
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-sm"
                  />
                </div>
                <div className="text-sm text-slate-500">
                  {filteredCountries.length} countrie{filteredCountries.length !== 1 ? 's' : ''} found
                </div>
              </div>
            </div>

            {renderTable(
              filteredCountries,
              ["Name", "Code", "Actions"],
              (id, label) => del("countries", id, label, countries),
              "No countries found"
            )}
          </div>
        )}

        {tab === "states" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <label className="block text-sm font-bold text-slate-600 mb-1.5">Select Country</label>
              <select 
                value={pickedCountry} 
                onChange={(e) => setPickedCountry(e.target.value)} 
                className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-sm"
                data-testid="pick-country"
              >
                <option value="">Choose a country...</option>
                {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>

            {pickedCountry && (
              <>
                {renderAddForm(
                  "Add New State/Province",
                  addState,
                  <>
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-1.5">State Name</label>
                      <input 
                        required 
                        value={newState} 
                        onChange={(e) => setNewState(e.target.value)} 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-sm"
                        placeholder="Enter state name..."
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="add-state"
                    >
                      {isSubmitting ? <span className="animate-spin">⏳</span> : <Plus size={16} />}
                      Add
                    </button>
                  </>,
                  "add-state"
                )}
                {renderTable(
                  states,
                  ["Name", "Actions"],
                  (id, label) => del("states", id, label, states),
                  `No states found for ${countries.find(c => c.code === pickedCountry)?.name || 'this country'}`
                )}
              </>
            )}
          </div>
        )}

        {tab === "cities" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1.5">Country</label>
                  <select 
                    value={pickedCountry} 
                    onChange={(e) => { setPickedCountry(e.target.value); setPickedState(""); }} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-sm"
                  >
                    <option value="">Choose a country...</option>
                    {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1.5">State</label>
                  <select 
                    value={pickedState} 
                    onChange={(e) => setPickedState(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-sm disabled:bg-slate-50 disabled:cursor-not-allowed"
                    disabled={!pickedCountry}
                  >
                    <option value="">Choose a state...</option>
                    {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {pickedState && (
              <>
                {renderAddForm(
                  "Add New City",
                  addCity,
                  <>
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-1.5">City Name</label>
                      <input 
                        required 
                        value={newCity} 
                        onChange={(e) => setNewCity(e.target.value)} 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-sm"
                        placeholder="Enter city name..."
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="add-city"
                    >
                      {isSubmitting ? <span className="animate-spin">⏳</span> : <Plus size={16} />}
                      Add
                    </button>
                  </>,
                  "add-city"
                )}
                {renderTable(
                  cities,
                  ["Name", "Actions"],
                  (id, label) => del("cities", id, label, cities),
                  `No cities found for selected state`
                )}
              </>
            )}
          </div>
        )}

        {tab === "constituencies" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1.5">Country</label>
                  <select 
                    value={pickedCountry} 
                    onChange={(e) => { setPickedCountry(e.target.value); setPickedState(""); setPickedCity(""); }} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-sm"
                  >
                    <option value="">Choose a country...</option>
                    {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1.5">State</label>
                  <select 
                    value={pickedState} 
                    onChange={(e) => { setPickedState(e.target.value); setPickedCity(""); }} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-sm disabled:bg-slate-50 disabled:cursor-not-allowed"
                    disabled={!pickedCountry}
                  >
                    <option value="">Choose a state...</option>
                    {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1.5">City (Optional)</label>
                  <select 
                    value={pickedCity} 
                    onChange={(e) => setPickedCity(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-sm disabled:bg-slate-50 disabled:cursor-not-allowed"
                    disabled={!pickedState}
                  >
                    <option value="">All Cities</option>
                    {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {pickedState && (
              <>
                {renderAddForm(
                  "Add New Constituency",
                  addCst,
                  <>
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-1.5">Constituency Name</label>
                      <input 
                        required 
                        value={newCst} 
                        onChange={(e) => setNewCst(e.target.value)} 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-sm"
                        placeholder="Enter constituency name..."
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="add-cst"
                    >
                      {isSubmitting ? <span className="animate-spin">⏳</span> : <Plus size={16} />}
                      Add
                    </button>
                  </>,
                  "add-cst"
                )}
                {renderTable(
                  constituencies,
                  ["Name", "Actions"],
                  (id, label) => del("constituencies", id, label, constituencies),
                  `No constituencies found for selected ${pickedCity ? 'city' : 'state'}`
                )}
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
