import React, { useEffect, useState, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { 
  Trash2, Edit, Plus, X, Globe2, ShieldCheck, 
  Search, Filter, ChevronLeft, ChevronRight,
  Users, Mail, Calendar, UserCog, Lock, Unlock,
  CheckCircle, AlertCircle, MoreVertical, RefreshCw
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const SECTION_PERMISSIONS = [
  { key: "admins", label: "Admins", icon: "👤" },
  { key: "articles", label: "Articles", icon: "📝" },
  { key: "audit_log", label: "Audit Log", icon: "📋" },
  { key: "community_desk", label: "Community Desk", icon: "💬" },
  { key: "dashboard_home", label: "Dashboard Home", icon: "🏠" },
  { key: "politicians", label: "Politicians", icon: "👔" },
  { key: "reference_data", label: "Reference Data", icon: "📚" },
  { key: "signups", label: "Signup Queue", icon: "📥" },
  { key: "tickets", label: "Tickets", icon: "🎫" },
  { key: "trash", label: "Trash", icon: "🗑️" },
  { key: "visitors", label: "Visitors", icon: "👁️" }
];

const EMPTY_PERMISSIONS = SECTION_PERMISSIONS.reduce((acc, s) => ({ ...acc, [s.key]: true }), {});
const EMPTY_GEO_SCOPE = { unrestricted: true, rules: [] };

const LEVEL_LABELS = { country: "Country", state: "State", city: "City", constituency: "Constituency" };

// Enhanced permission panel with better UI
function AccessControlPanel({
  role, permissions, setPermissions, geoScope, setGeoScope,
  countries, states, cities, constituencies,
  draft, setDraft, onCountryChange, onStateChange,
}) {
  if (role === "super_admin") {
    return (
      <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <ShieldCheck size={20} className="text-indigo-600" />
        </div>
        <div>
          <p className="font-semibold text-indigo-900">Super Admin Access</p>
          <p className="text-sm text-indigo-700">Full system access with no restrictions</p>
        </div>
      </div>
    );
  }
  
  if (role === "user") {
    return (
      <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="p-2 bg-gray-100 rounded-lg">
          <Lock size={20} className="text-gray-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-700">User Access</p>
          <p className="text-sm text-gray-500">No dashboard access or permissions required</p>
        </div>
      </div>
    );
  }

  const addRule = () => {
    let value, label;
    if (draft.level === "country") { 
      value = draft.country_code; 
      label = countries.find((c) => c.code === value)?.name; 
    }
    if (draft.level === "state") { 
      value = draft.state_id; 
      label = states.find((s) => s.id === value)?.name; 
    }
    if (draft.level === "city") { 
      value = draft.city_id; 
      label = cities.find((c) => c.id === value)?.name; 
    }
    if (draft.level === "constituency") { 
      value = draft.constituency_id; 
      label = constituencies.find((c) => c.id === value)?.name; 
    }
    
    if (!value) { 
      toast.error("Please select a location first."); 
      return; 
    }
    
    if (geoScope.rules.some((r) => r.level === draft.level && r.value === value)) { 
      toast.error("This location is already added."); 
      return; 
    }
    
    setGeoScope({ 
      ...geoScope, 
      rules: [...geoScope.rules, { 
        level: draft.level, 
        value, 
        label: label || value,
        levelLabel: LEVEL_LABELS[draft.level]
      }] 
    });
  };

  const removeRule = (idx) => {
    const updatedRules = geoScope.rules.filter((_, i) => i !== idx);
    setGeoScope({ ...geoScope, rules: updatedRules });
  };

  const toggleAllPermissions = (checked) => {
    const newPermissions = {};
    SECTION_PERMISSIONS.forEach(s => {
      newPermissions[s.key] = checked;
    });
    setPermissions(newPermissions);
  };

  const selectedCount = Object.values(permissions).filter(v => v).length;

  return (
    <div className="space-y-6">
      {/* Section permissions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <UserCog size={16} className="text-gray-500" />
            Dashboard Section Access
          </label>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {selectedCount}/{SECTION_PERMISSIONS.length} selected
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <label className="flex items-center gap-2 text-sm bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer transition-all duration-200">
            <input
              type="checkbox"
              checked={selectedCount === SECTION_PERMISSIONS.length}
              onChange={(e) => toggleAllPermissions(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-medium text-gray-600">Select All</span>
          </label>
          
          {SECTION_PERMISSIONS.map((s) => (
            <label key={s.key} className="flex items-center gap-2 text-sm bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer transition-all duration-200">
              <input
                type="checkbox"
                checked={!!permissions[s.key]}
                onChange={(e) => setPermissions({ ...permissions, [s.key]: e.target.checked })}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>{s.icon}</span>
              <span className="text-gray-700">{s.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Geo scope */}
      <div className="border-t border-gray-200 pt-6">
        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
          <Globe2 size={16} className="text-gray-500" />
          Location Access
        </label>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={geoScope.unrestricted}
              onChange={(e) => setGeoScope({ ...geoScope, unrestricted: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-medium text-gray-700">Unrestricted Access</span>
            <span className="text-xs text-gray-500 ml-2">— can manage politicians in any location</span>
          </label>
        </div>

        {!geoScope.unrestricted && (
          <div className="mt-4 space-y-4">
            {geoScope.rules.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {geoScope.rules.map((r, i) => (
                  <span key={`${r.level}-${r.value}`} className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1.5 rounded-full border border-indigo-200/60">
                    <span className="text-indigo-400 font-normal">{r.levelLabel || LEVEL_LABELS[r.level]}:</span> 
                    <span>{r.label}</span>
                    <button 
                      type="button" 
                      onClick={() => removeRule(i)} 
                      className="hover:bg-indigo-200/60 rounded-full p-0.5 transition-colors ml-1"
                      aria-label={`Remove ${r.label}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select 
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                value={draft.level} 
                onChange={(e) => setDraft({ ...draft, level: e.target.value })}
              >
                {Object.entries(LEVEL_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              <select
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                value={draft.country_code}
                onChange={(e) => onCountryChange(e.target.value)}
              >
                <option value="">Select country</option>
                {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>

              <select
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-400"
                value={draft.state_id}
                onChange={(e) => onStateChange(e.target.value)}
                disabled={draft.level === "country" || !states.length}
              >
                <option value="">{draft.level === "country" ? "—" : "Select state"}</option>
                {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              {draft.level === "city" ? (
                <select 
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-400"
                  value={draft.city_id} 
                  onChange={(e) => setDraft({ ...draft, city_id: e.target.value })} 
                  disabled={!cities.length}
                >
                  <option value="">Select city</option>
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : draft.level === "constituency" ? (
                <select 
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-400"
                  value={draft.constituency_id} 
                  onChange={(e) => setDraft({ ...draft, constituency_id: e.target.value })} 
                  disabled={!constituencies.length}
                >
                  <option value="">Select constituency</option>
                  {constituencies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400">
                  Select location type
                </div>
              )}
            </div>

            <button 
              type="button" 
              onClick={addRule} 
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
            >
              <Plus size={16} /> Add Location
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const EMPTY_DRAFT = { level: "country", country_code: "", state_id: "", city_id: "", constituency_id: "" };

export default function Admins() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 50;

  const [form, setForm] = useState({ email: "", name: "", password: "" });
  const [editForm, setEditForm] = useState({ name: "", password: "", role: "admin" });

  const [createPermissions, setCreatePermissions] = useState({ ...EMPTY_PERMISSIONS });
  const [createGeoScope, setCreateGeoScope] = useState({ ...EMPTY_GEO_SCOPE });
  const [editPermissions, setEditPermissions] = useState({ ...EMPTY_PERMISSIONS });
  const [editGeoScope, setEditGeoScope] = useState({ ...EMPTY_GEO_SCOPE });

  const [countries, setCountries] = useState([]);
  const [createDraft, setCreateDraft] = useState({ ...EMPTY_DRAFT });
  const [createStates, setCreateStates] = useState([]);
  const [createCities, setCreateCities] = useState([]);
  const [createConstituencies, setCreateConstituencies] = useState([]);
  const [editDraft, setEditDraft] = useState({ ...EMPTY_DRAFT });
  const [editStates, setEditStates] = useState([]);
  const [editCities, setEditCities] = useState([]);
  const [editConstituencies, setEditConstituencies] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/admins", {
        params: {
          role: roleFilter || undefined,
          q: search || undefined,
          skip: page * PAGE_SIZE,
          limit: PAGE_SIZE,
        },
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search, page]);

  useEffect(() => { 
    load(); 
  }, [load]);

  useEffect(() => { 
    api.get("/ref/countries").then((r) => setCountries(r.data.items || [])); 
  }, []);

  const loadStatesFor = useCallback(async (countryCode, setter) => {
    if (!countryCode) { setter([]); return; }
    const { data } = await api.get("/ref/states", { params: { country_code: countryCode } });
    setter(data.items || []);
  }, []);

  const loadCitiesConstituenciesFor = useCallback(async (stateId, setCitiesFn, setConstFn) => {
    if (!stateId) { setCitiesFn([]); setConstFn([]); return; }
    const [c, k] = await Promise.all([
      api.get("/ref/cities", { params: { state_id: stateId } }),
      api.get("/ref/constituencies", { params: { state_id: stateId } }),
    ]);
    setCitiesFn(c.data.items || []);
    setConstFn(k.data.items || []);
  }, []);

  const onCreateCountryChange = async (code) => {
    setCreateDraft({ ...createDraft, country_code: code, state_id: "", city_id: "", constituency_id: "" });
    await loadStatesFor(code, setCreateStates);
    setCreateCities([]); setCreateConstituencies([]);
  };

  const onCreateStateChange = async (stateId) => {
    setCreateDraft({ ...createDraft, state_id: stateId, city_id: "", constituency_id: "" });
    await loadCitiesConstituenciesFor(stateId, setCreateCities, setCreateConstituencies);
  };

  const onEditCountryChange = async (code) => {
    setEditDraft({ ...editDraft, country_code: code, state_id: "", city_id: "", constituency_id: "" });
    await loadStatesFor(code, setEditStates);
    setEditCities([]); setEditConstituencies([]);
  };

  const onEditStateChange = async (stateId) => {
    setEditDraft({ ...editDraft, state_id: stateId, city_id: "", constituency_id: "" });
    await loadCitiesConstituenciesFor(stateId, setEditCities, setEditConstituencies);
  };

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/admins", { 
        ...form, 
        permissions: createPermissions, 
        geo_scope: createGeoScope 
      });
      toast.success("Admin created successfully.");
      setShowCreate(false);
      setForm({ email: "", name: "", password: "" });
      setCreatePermissions({ ...EMPTY_PERMISSIONS });
      setCreateGeoScope({ ...EMPTY_GEO_SCOPE });
      setCreateDraft({ ...EMPTY_DRAFT });
      load();
    } catch (e2) { 
      toast.error(formatApiError(e2)); 
    }
  };

  const doDelete = async (u) => {
    if (!window.confirm(`Are you sure you want to delete admin ${u.email}?`)) return;
    try { 
      await api.delete(`/admin/admins/${u.id}`); 
      toast.success("Admin deleted successfully.");
      load(); 
    } catch (e2) { 
      toast.error(formatApiError(e2)); 
    }
  };

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({ name: u.name || "", password: "", role: u.role });
    setEditPermissions({ ...EMPTY_PERMISSIONS, ...(u.permissions || {}) });
    setEditGeoScope(u.geo_scope || { ...EMPTY_GEO_SCOPE });
    setEditDraft({ ...EMPTY_DRAFT });
    setEditStates([]); setEditCities([]); setEditConstituencies([]);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      const body = { 
        name: editForm.name, 
        role: editForm.role, 
        permissions: editPermissions, 
        geo_scope: editGeoScope 
      };
      if (editForm.password) body.password = editForm.password;
      await api.put(`/admin/admins/${editUser.id}`, body);
      toast.success("Admin updated successfully.");
      setEditUser(null);
      load();
    } catch (e2) { 
      toast.error(formatApiError(e2)); 
    }
  };

  const getRoleBadge = (role) => {
    const styles = {
      super_admin: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white",
      admin: "bg-blue-600 text-white",
      user: "bg-gray-600 text-white"
    };
    return styles[role] || "bg-gray-600 text-white";
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-indigo-600 mb-1">
              <Users size={16} />
              <span>Personnel Management</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Admins</h1>
            <p className="text-gray-500 mt-1">Manage system administrators and their permissions</p>
          </div>
          <button 
            data-testid="create-admin-btn" 
            onClick={() => setShowCreate(true)} 
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/25 hover:shadow-xl hover:shadow-indigo-600/30"
          >
            <Plus size={18} /> New Admin
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={16} className="text-gray-400" />
              {[
                { key: "", label: "All" },
                { key: "super_admin", label: "Super Admins" },
                { key: "admin", label: "Admins" },
                { key: "user", label: "Users" },
              ].map((t) => (
                <button
                  key={t.key || "all"}
                  onClick={() => { setRoleFilter(t.key); setPage(0); }}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    roleFilter === t.key 
                      ? "bg-indigo-600 text-white shadow-sm" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            
            <div className="flex-1 w-full md:max-w-xs relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search by name or email..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
            
            <button 
              onClick={load} 
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Access</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center gap-3 text-gray-500">
                        <RefreshCw size={20} className="animate-spin" />
                        <span>Loading admins...</span>
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Users size={32} className="text-gray-300" />
                        <p>No admins found</p>
                        <p className="text-sm text-gray-400">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((u) => {
                    const grantedSections = SECTION_PERMISSIONS.filter((s) => u.permissions?.[s.key]).length;
                    const scopeLabel = u.role === "super_admin"
                      ? "Full Access"
                      : u.role === "user"
                        ? "No Access"
                        : u.geo_scope?.unrestricted
                          ? "Unrestricted"
                          : `${u.geo_scope?.rules?.length || 0} location${(u.geo_scope?.rules?.length || 0) === 1 ? "" : "s"}`;
                    
                    return (
                      <tr key={u.id} data-testid={`admin-row-${u.id}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">{u.name || "—"}</div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail size={12} />
                              <span>{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRoleBadge(u.role)}`}>
                            {u.role.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {u.role === "super_admin" ? (
                              <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                                <ShieldCheck size={14} />
                                <span className="text-xs font-medium">Full System Access</span>
                              </div>
                            ) : u.role === "user" ? (
                              <span className="text-xs text-gray-400">No dashboard access</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-700">{grantedSections}/{SECTION_PERMISSIONS.length} sections</span>
                                <span className="w-px h-4 bg-gray-300" />
                                <span className="text-xs text-gray-500">{scopeLabel}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar size={14} />
                            <span>{new Date(u.created_at).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {u.role !== "super_admin" ? (
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                data-testid={`edit-${u.id}`} 
                                onClick={() => openEdit(u)} 
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                aria-label={`Edit ${u.email}`}
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                data-testid={`delete-${u.id}`} 
                                onClick={() => doDelete(u)} 
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                aria-label={`Delete ${u.email}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                              <ShieldCheck size={12} /> Protected
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, total)} of {total} admins
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-medium text-gray-700">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Create Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
            <DialogHeader className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-blue-600">
              <DialogTitle className="text-2xl text-white font-bold">Create New Admin</DialogTitle>
              <p className="text-indigo-100 text-sm">Set up permissions and access control for the new admin</p>
            </DialogHeader>
            <form onSubmit={create} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                  <input 
                    data-testid="new-admin-email" 
                    type="email" 
                    required 
                    value={form.email} 
                    onChange={(e) => setForm({ ...form, email: e.target.value })} 
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="admin@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input 
                    data-testid="new-admin-name" 
                    required 
                    value={form.name} 
                    onChange={(e) => setForm({ ...form, name: e.target.value })} 
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input 
                  data-testid="new-admin-password" 
                  type="password" 
                  required 
                  minLength={8} 
                  value={form.password} 
                  onChange={(e) => setForm({ ...form, password: e.target.value })} 
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Minimum 8 characters"
                />
              </div>

              <hr className="border-gray-200" />

              <AccessControlPanel
                role="admin"
                permissions={createPermissions}
                setPermissions={setCreatePermissions}
                geoScope={createGeoScope}
                setGeoScope={setCreateGeoScope}
                countries={countries}
                states={createStates}
                cities={createCities}
                constituencies={createConstituencies}
                draft={createDraft}
                setDraft={setCreateDraft}
                onCountryChange={onCreateCountryChange}
                onStateChange={onCreateStateChange}
              />

              <DialogFooter className="gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowCreate(false)}
                  className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  data-testid="save-admin" 
                  type="submit" 
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200"
                >
                  Create Admin
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
            <DialogHeader className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-blue-600">
              <DialogTitle className="text-2xl text-white font-bold">Edit Admin</DialogTitle>
              <p className="text-indigo-100 text-sm">Modify admin details and permissions</p>
            </DialogHeader>
            {editUser && (
              <form onSubmit={saveEdit} className="p-6 space-y-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Mail size={16} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Editing</p>
                    <p className="text-sm text-gray-500">{editUser.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input 
                      required 
                      value={editForm.name} 
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} 
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                    <select 
                      value={editForm.role} 
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} 
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    >
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input 
                    type="password" 
                    value={editForm.password} 
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} 
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Leave blank to keep current password"
                  />
                </div>

                <hr className="border-gray-200" />

                <AccessControlPanel
                  role={editForm.role}
                  permissions={editPermissions}
                  setPermissions={setEditPermissions}
                  geoScope={editGeoScope}
                  setGeoScope={setEditGeoScope}
                  countries={countries}
                  states={editStates}
                  cities={editCities}
                  constituencies={editConstituencies}
                  draft={editDraft}
                  setDraft={setEditDraft}
                  onCountryChange={onEditCountryChange}
                  onStateChange={onEditStateChange}
                />

                <DialogFooter className="gap-2">
                  <button 
                    type="button" 
                    onClick={() => setEditUser(null)}
                    className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200"
                  >
                    Save Changes
                  </button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
