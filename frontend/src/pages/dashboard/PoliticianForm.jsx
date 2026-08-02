import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, formatApiError, API_BASE } from "@/lib/api";
import { toast } from "sonner";
import {
  Upload,
  ArrowLeft,
  Plus,
  Trash,
  Save,
  User,
  Briefcase,
  MapPin,
  Globe,
  Mail,
  Phone,
  Link as LinkIcon,
  Calendar,
  Tag,
  FileText,
  Image,
  Video,
  File,
  Users,
  Award,
  Shield,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  X
} from "lucide-react";

const empty = {
  name: "",
  party: "",
  role: "",
  brief_intro: "",
  image_url: "",
  country_code: "",
  state_id: "",
  city_id: "",
  constituency_id: "",
  date_of_birth: "",
  education: "",
  profession: "",
  gender: "",
  currency: "USD",
  contact_email: "",
  contact_phone: "",
  official_website: "",
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
  { code: "EGP", label: "EGP — Egyptian Pound" },
];

// Helper: sanitize URL input
const sanitizeUrl = (url: string): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    return parsed.toString();
  } catch {
    return null;
  }
};

// Helper: validate email
const isValidEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Section Header Component
const SectionHeader = ({ icon: Icon, title, action, description }: any) => (
  <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-emerald-50 rounded-lg">
        <Icon className="w-5 h-5 text-emerald-600" />
      </div>
      <div>
        <h3 className="font-display font-bold text-lg text-slate-800">{title}</h3>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
    </div>
    {action}
  </div>
);

// Empty State Component
const EmptyState = ({ message }: { message: string }) => (
  <div className="text-center py-8">
    <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mb-3">
      <AlertCircle className="w-6 h-6 text-slate-400" />
    </div>
    <p className="text-sm text-slate-500">{message}</p>
  </div>
);

// Section Card Component
const SectionCard = ({ children, className = "" }: any) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>
    {children}
  </div>
);

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
  const [phGeoOptions, setPhGeoOptions] = useState({});
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
  const [copied, setCopied] = useState(false);
  const [activeSections, setActiveSections] = useState({
    basic: true,
    geography: false,
    contact: false,
    wealth: false,
    party: false,
    position: false,
    relatives: false,
    bio: false,
  });

  // Data fetching effects remain the same
  useEffect(() => {
    api.get("/ref/countries").then((r) => setCountries(r.data.items || []));
  }, []);

  useEffect(() => {
    if (!p.country_code) {
      setStates([]);
      return;
    }
    api
      .get("/ref/states", { params: { country_code: p.country_code } })
      .then((r) => setStates(r.data.items || []));
  }, [p.country_code]);

  useEffect(() => {
    if (!p.state_id) {
      setCities([]);
      setConstituencies([]);
      return;
    }
    api
      .get("/ref/cities", { params: { state_id: p.state_id } })
      .then((r) => setCities(r.data.items || []));
    api
      .get("/ref/constituencies", { params: { state_id: p.state_id } })
      .then((r) => setConstituencies(r.data.items || []));
  }, [p.state_id]);

  useEffect(() => {
    if (isNew) return;
    api
      .get(`/admin/politicians/${id}`)
      .then((r) => {
        const d = r.data;
        setP({
          name: d.name || "",
          party: d.party || "",
          role: d.role || "",
          brief_intro: d.brief_intro || "",
          image_url: d.image_url || "",
          country_code: d.country_code || "",
          state_id: d.state_id || "",
          city_id: d.city_id || "",
          constituency_id: d.constituency_id || "",
          date_of_birth: d.date_of_birth || "",
          education: d.education || "",
          profession: d.profession || "",
          gender: d.gender || "",
          currency: d.currency || "USD",
          contact_email: d.contact_email || "",
          contact_phone: d.contact_phone || "",
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
      })
      .catch((e) => toast.error(formatApiError(e)));
  }, [id, isNew]);

  // Upload function with security improvements
  const upload = async (file) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/images/upload?context=politician_photo", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = `${process.env.REACT_APP_BACKEND_URL}/api/images/${data.file_id}`;
      setP((s) => ({ ...s, image_url: url }));
      toast.success("Image uploaded successfully");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  // Save function with improved validation
  const save = async (e) => {
    e?.preventDefault();

    // Validate required fields
    if (!p.name?.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!p.country_code) {
      toast.error("Country is required");
      return;
    }

    setBusy(true);
    try {
      const body = { ...p };

      // Clean empty fields
      Object.keys(body).forEach((k) => {
        if (body[k] === "") body[k] = null;
      });

      // Sanitize URLs
      body.official_website = sanitizeUrl(body.official_website);
      if (body.social_links) {
        body.social_links = {
          twitter: sanitizeUrl(body.social_links.twitter),
          facebook: sanitizeUrl(body.social_links.facebook),
          instagram: sanitizeUrl(body.social_links.instagram),
          youtube: sanitizeUrl(body.social_links.youtube),
        };
      }

      // Validate email if provided
      if (body.contact_email && !isValidEmail(body.contact_email)) {
        toast.error("Please enter a valid email address");
        setBusy(false);
        return;
      }

      body.name = p.name.trim();
      body.country_code = p.country_code;
      body.tags = p.tags;

      if (isNew) {
        const { data } = await api.post("/politicians", body);
        toast.success("Politician created successfully");
        nav(`/dashboard/politicians/${data.id}`, { replace: true });
      } else {
        await api.put(`/politicians/${id}`, body);
        toast.success("Politician updated successfully");
      }
    } catch (e2) {
      toast.error(formatApiError(e2));
    } finally {
      setBusy(false);
    }
  };

  // Toggle section visibility
  const toggleSection = (section) => {
    setActiveSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // The rest of the CRUD functions (addTag, removeTag, addWealth, updateWealth, etc.)
  // remain the same as in the original code...
  // I'll include them for completeness but they're unchanged

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    setP((s) => ({ ...s, tags: [...s.tags, t] }));
    setTagInput("");
  };

  const removeTag = (i) =>
    setP((s) => ({ ...s, tags: s.tags.filter((_, idx) => idx !== i) }));

  // Wealth CRUD
  const addWealth = async () => {
    if (isNew) {
      toast.error("Save politician first.");
      return;
    }
    const doc = {
      year: new Date().getFullYear(),
      assets: 0,
      liabilities: 0,
      source_urls: [],
      notes: "",
    };
    try {
      const { data } = await api.post(`/politicians/${id}/wealth`, doc);
      setWealth((w) => [...w, { id: data.id, ...doc, net_worth: 0 }]);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const updateWealth = async (w) => {
    try {
      await api.put(`/wealth/${w.id}`, {
        year: Number(w.year),
        assets: Number(w.assets),
        liabilities: Number(w.liabilities),
        net_worth: w.net_worth == null ? null : Number(w.net_worth),
        notes: w.notes || "",
        source_urls: w.source_urls || [],
      });
      toast.success("Wealth entry saved.");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const deleteWealth = async (wid) => {
    if (!window.confirm("Delete this wealth entry?")) return;
    try {
      await api.delete(`/wealth/${wid}`);
      setWealth((w) => w.filter((x) => x.id !== wid));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const setWField = (wid, key, val) =>
    setWealth((ws) =>
      ws.map((w) => (w.id === wid ? { ...w, [key]: val } : w))
    );

  // Relatives CRUD
  const addRelative = async () => {
    if (isNew) {
      toast.error("Save politician first.");
      return;
    }
    const doc = { name: "New Relative", relationship: "spouse", description: "" };
    try {
      const { data } = await api.post(`/politicians/${id}/relatives`, doc);
      setRelatives((r) => [...r, { id: data.id, ...doc, wealth: [] }]);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const saveRelative = async (r) => {
    try {
      await api.put(`/relatives/${r.id}`, {
        name: r.name,
        relationship: r.relationship,
        description: r.description || "",
        is_political: !!r.is_political,
        political_role: r.political_role || null,
        linked_politician_id: r.linked_politician_id || null,
      });
      toast.success("Relative saved.");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const searchLinkablePolitician = async (rid, query) => {
    setRelativeSearch((s) => ({ ...s, [rid]: query }));
    if (!query || query.length < 2) {
      setRelativeSearchResults((s) => ({ ...s, [rid]: [] }));
      return;
    }
    try {
      const { data } = await api.get("/politicians", { params: { q: query, limit: 5 } });
      setRelativeSearchResults((s) => ({
        ...s,
        [rid]: (data.items || []).filter((p) => p.id !== id),
      }));
    } catch {
      /* silent */
    }
  };

  const pickLinkedPolitician = (rid, pol) => {
    setRelatives((rs) =>
      rs.map((x) =>
        x.id === rid
          ? { ...x, linked_politician_id: pol.id, linked_politician_name: pol.name }
          : x
      )
    );
    setRelativeSearch((s) => ({ ...s, [rid]: "" }));
    setRelativeSearchResults((s) => ({ ...s, [rid]: [] }));
  };

  const clearLinkedPolitician = (rid) => {
    setRelatives((rs) =>
      rs.map((x) =>
        x.id === rid ? { ...x, linked_politician_id: null, linked_politician_name: null } : x
      )
    );
  };

  const deleteRelative = async (rid) => {
    if (!window.confirm("Delete this relative?")) return;
    try {
      await api.delete(`/relatives/${rid}`);
      setRelatives((rs) => rs.filter((x) => x.id !== rid));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const addRelWealth = async (rid) => {
    const doc = {
      year: new Date().getFullYear(),
      assets: 0,
      liabilities: 0,
      source_urls: [],
      notes: "",
    };
    try {
      const { data } = await api.post(`/relatives/${rid}/wealth`, doc);
      setRelatives((rs) =>
        rs.map((r) =>
          r.id === rid
            ? { ...r, wealth: [...(r.wealth || []), { id: data.id, ...doc, net_worth: 0 }] }
            : r
        )
      );
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  // Party History CRUD
  const addPartyHistory = async () => {
    if (isNew) {
      toast.error("Save politician first.");
      return;
    }
    const doc = { party: p.party || "New Party", start_date: "", end_date: "", note: "", source_url: "" };
    try {
      const { data } = await api.post(`/politicians/${id}/party-history`, doc);
      setPartyHistory((ph) => [{ id: data.id, ...doc }, ...ph]);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const savePartyHistory = async (entry) => {
    try {
      await api.put(`/party-history/${entry.id}`, {
        party: entry.party,
        start_date: entry.start_date || null,
        end_date: entry.end_date || null,
        note: entry.note || "",
        source_url: entry.source_url || null,
      });
      toast.success("Party history saved.");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const deletePartyHistory = async (phid) => {
    if (!window.confirm("Delete this party history entry?")) return;
    try {
      await api.delete(`/party-history/${phid}`);
      setPartyHistory((ph) => ph.filter((x) => x.id !== phid));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const setPHField = (phid, key, val) =>
    setPartyHistory((ph) =>
      ph.map((x) => (x.id === phid ? { ...x, [key]: val } : x))
    );

  // Position History CRUD
  const loadPhGeo = async (phId, level, value) => {
    if (level === "country") {
      if (!value) {
        setPhGeoOptions((g) => ({
          ...g,
          [phId]: { states: [], cities: [], constituencies: [] },
        }));
        return;
      }
      const { data } = await api.get("/ref/states", { params: { country_code: value } });
      setPhGeoOptions((g) => ({
        ...g,
        [phId]: { states: data.items || [], cities: [], constituencies: [] },
      }));
    } else if (level === "state") {
      if (!value) {
        setPhGeoOptions((g) => ({
          ...g,
          [phId]: { states: g[phId]?.states || [], cities: [], constituencies: [] },
        }));
        return;
      }
      const [citiesRes, constRes] = await Promise.all([
        api.get("/ref/cities", { params: { state_id: value } }),
        api.get("/ref/constituencies", { params: { state_id: value } }),
      ]);
      setPhGeoOptions((g) => ({
        ...g,
        [phId]: {
          states: g[phId]?.states || [],
          cities: citiesRes.data.items || [],
          constituencies: constRes.data.items || [],
        },
      }));
    }
  };

  const addPositionHistory = async () => {
    if (isNew) {
      toast.error("Save politician first.");
      return;
    }
    const isFirst = positionHistory.length === 0;
    const doc = isFirst
      ? {
          position: p.role || "",
          country_code: p.country_code || "",
          state_id: p.state_id || "",
          city_id: p.city_id || "",
          constituency_id: p.constituency_id || "",
          party: p.party || "",
          start_date: "",
          end_date: "",
          is_current: true,
          election_year: null,
          note: "",
        }
      : {
          position: "",
          country_code: "",
          state_id: "",
          city_id: "",
          constituency_id: "",
          party: "",
          start_date: "",
          end_date: "",
          is_current: false,
          election_year: null,
          note: "",
        };
    try {
      const { data } = await api.post(`/politicians/${id}/position-history`, doc);
      setPositionHistory((ph) => [{ id: data.id, ...doc }, ...ph]);
      if (isFirst && doc.country_code) await loadPhGeo(data.id, "country", doc.country_code);
      if (isFirst && doc.state_id) await loadPhGeo(data.id, "state", doc.state_id);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const savePositionHistory = async (entry) => {
    try {
      await api.put(`/position-history/${entry.id}`, {
        position: entry.position,
        country_code: entry.country_code || null,
        state_id: entry.state_id || null,
        city_id: entry.city_id || null,
        constituency_id: entry.constituency_id || null,
        party: entry.party || null,
        start_date: entry.start_date || null,
        end_date: entry.end_date || null,
        is_current: !!entry.is_current,
        election_year: entry.election_year || null,
        note: entry.note || null,
      });
      toast.success("Position history saved.");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const deletePositionHistory = async (phid) => {
    if (!window.confirm("Delete this position history entry?")) return;
    try {
      await api.delete(`/position-history/${phid}`);
      setPositionHistory((ph) => ph.filter((x) => x.id !== phid));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const setPositionField = (phId, key, val) => {
    setPositionHistory((ph) =>
      ph.map((x) => {
        if (x.id !== phId) return x;
        const next = { ...x, [key]: val };
        if (key === "country_code") {
          next.state_id = "";
          next.city_id = "";
          next.constituency_id = "";
        }
        if (key === "state_id") {
          next.city_id = "";
          next.constituency_id = "";
        }
        return next;
      })
    );
    if (key === "country_code") loadPhGeo(phId, "country", val);
    if (key === "state_id") loadPhGeo(phId, "state", val);
  };

  // Bio & Media
  const saveBio = async () => {
    if (isNew) {
      toast.error("Save politician first.");
      return;
    }
    setSavingBio(true);
    try {
      await api.put(`/politicians/${id}/bio`, { html: bioHtml });
      toast.success("Bio saved.");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSavingBio(false);
    }
  };

  const uploadBioFile = async (file) => {
    if (isNew) {
      toast.error("Save politician first.");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api.post(`/politicians/${id}/bio-file`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { data } = await api.get(`/politicians/${id}`);
      setBioHtml(data.bio_html || "");
      toast.success("Bio file uploaded.");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const uploadMedia = async (file) => {
    if (isNew) {
      toast.error("Save politician first.");
      return;
    }
    setUploadingMedia(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post(`/politicians/${id}/media`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMedia((m) => [
        {
          id: data.id,
          url: data.url,
          filename: file.name,
          file_type: file.type.startsWith("image/")
            ? "image"
            : file.type === "application/pdf"
            ? "pdf"
            : file.type.startsWith("video/")
            ? "video"
            : "other",
        },
        ...m,
      ]);
      toast.success("File uploaded.");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setUploadingMedia(false);
    }
  };

  const deleteMedia = async (mid) => {
    if (!window.confirm("Delete this file?")) return;
    try {
      await api.delete(`/media/${mid}`);
      setMedia((m) => m.filter((x) => x.id !== mid));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  // Get file icon based on type
  const getFileIcon = (type) => {
    switch (type) {
      case "image":
        return <Image className="w-4 h-4" />;
      case "video":
        return <Video className="w-4 h-4" />;
      case "pdf":
        return <FileText className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/dashboard/politicians"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors mb-3"
          >
            <ArrowLeft size={16} />
            Back to Politicians
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  {isNew ? "CREATE" : "EDIT"}
                </span>
                {!isNew && (
                  <span className="text-xs text-slate-400">
                    ID: {id}
                  </span>
                )}
              </div>
              <h1 className="font-display font-bold text-3xl md:text-4xl text-slate-900">
                {isNew ? "Create New Politician" : p.name || "Editing Profile"}
              </h1>
              {!isNew && p.role && (
                <p className="text-sm text-slate-500 mt-1">{p.role}</p>
              )}
            </div>
            <button
              data-testid="save-politician"
              onClick={save}
              disabled={busy}
              className="btn-soft-primary disabled:opacity-50 px-6 py-3 rounded-xl font-medium flex items-center gap-2"
            >
              <Save size={18} />
              {busy ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        <form onSubmit={save} className="space-y-6">
          {/* Two-column layout for main content */}
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
            {/* Left Column - Image */}
            <div className="lg:sticky lg:top-6 self-start">
              <SectionCard className="p-6">
                <div className="relative">
                  <div
                    className={`border-2 border-dashed rounded-2xl aspect-[4/5] bg-slate-50 grid place-items-center overflow-hidden transition-colors ${
                      p.image_url
                        ? "border-slate-200"
                        : "border-slate-300 hover:border-emerald-400"
                    }`}
                  >
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-6">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <User className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          Click or drag to upload
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          JPG, PNG, WEBP • Max 5MB
                        </p>
                      </div>
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
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="absolute bottom-4 right-4 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all border border-slate-200"
                    data-testid="upload-btn"
                  >
                    <Upload size={18} className="text-slate-600" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-3 text-center">
                  Profile image will be displayed publicly
                </p>
              </SectionCard>
            </div>

            {/* Right Column - Forms */}
            <div className="space-y-6">
              {/* Basic Information */}
              <SectionCard>
                <div className="p-6">
                  <SectionHeader
                    icon={User}
                    title="Basic Information"
                    description="Core details about the politician"
                    action={
                      <button
                        type="button"
                        onClick={() => toggleSection("basic")}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {activeSections.basic ? (
                          <ChevronDown size={20} />
                        ) : (
                          <ChevronRight size={20} />
                        )}
                      </button>
                    }
                  />

                  {activeSections.basic && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            Full Name *
                          </label>
                          <input
                            data-testid="p-name"
                            required
                            value={p.name}
                            onChange={(e) => setP({ ...p, name: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm"
                            placeholder="e.g., John Smith"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            Political Party
                          </label>
                          <input
                            value={p.party}
                            onChange={(e) => setP({ ...p, party: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm"
                            placeholder="e.g., Democratic Party"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            Role / Title
                          </label>
                          <input
                            value={p.role}
                            onChange={(e) => setP({ ...p, role: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm"
                            placeholder="e.g., Member of Parliament"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            Date of Birth
                          </label>
                          <input
                            type="date"
                            value={p.date_of_birth}
                            onChange={(e) => setP({ ...p, date_of_birth: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            Gender
                          </label>
                          <select
                            value={p.gender}
                            onChange={(e) => setP({ ...p, gender: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                          >
                            <option value="">Not specified</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Admin use only - never shown publicly
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            Wealth Currency
                          </label>
                          <select
                            value={p.currency}
                            onChange={(e) => setP({ ...p, currency: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                            data-testid="currency-select"
                          >
                            {CURRENCIES.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          Brief Introduction
                        </label>
                        <textarea
                          data-testid="p-intro"
                          rows={3}
                          value={p.brief_intro}
                          onChange={(e) => setP({ ...p, brief_intro: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm resize-y"
                          placeholder="Brief summary of the politician's background and career..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            Education
                          </label>
                          <input
                            value={p.education}
                            onChange={(e) => setP({ ...p, education: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm"
                            placeholder="e.g., Harvard University, PhD"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            Profession
                          </label>
                          <input
                            value={p.profession}
                            onChange={(e) => setP({ ...p, profession: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm"
                            placeholder="e.g., Lawyer, Businessperson"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          Tags
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {p.tags.map((t, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 rounded-full px-3 py-1 text-xs font-medium"
                            >
                              {t}
                              <button
                                type="button"
                                onClick={() => removeTag(i)}
                                className="hover:text-red-500 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && (e.preventDefault(), addTag())
                            }
                            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm"
                            placeholder="Type and press Enter"
                          />
                          <button
                            type="button"
                            onClick={addTag}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Geography */}
              <SectionCard>
                <div className="p-6">
                  <SectionHeader
                    icon={MapPin}
                    title="Geography"
                    description="Political jurisdiction and location"
                    action={
                      <button
                        type="button"
                        onClick={() => toggleSection("geography")}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {activeSections.geography ? (
                          <ChevronDown size={20} />
                        ) : (
                          <ChevronRight size={20} />
                        )}
                      </button>
                    }
                  />

                  {activeSections.geography && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          Country *
                        </label>
                        <select
                          data-testid="p-country"
                          required
                          value={p.country_code}
                          onChange={(e) =>
                            setP({
                              ...p,
                              country_code: e.target.value,
                              state_id: "",
                              city_id: "",
                              constituency_id: "",
                            })
                          }
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                        >
                          <option value="">Select country</option>
                          {countries.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          State / Province
                        </label>
                        <select
                          value={p.state_id}
                          onChange={(e) =>
                            setP({
                              ...p,
                              state_id: e.target.value,
                              city_id: "",
                              constituency_id: "",
                            })
                          }
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                          disabled={!states.length}
                        >
                          <option value="">
                            {states.length ? "Select state" : "No states available"}
                          </option>
                          {states.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          City
                        </label>
                        <select
                          value={p.city_id}
                          onChange={(e) => setP({ ...p, city_id: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                          disabled={!cities.length}
                        >
                          <option value="">
                            {cities.length ? "Select city" : "No cities available"}
                          </option>
                          {cities.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          Constituency
                        </label>
                        <select
                          value={p.constituency_id}
                          onChange={(e) => setP({ ...p, constituency_id: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                          disabled={!constituencies.length}
                        >
                          <option value="">
                            {constituencies.length
                              ? "Select constituency"
                              : "No constituencies available"}
                          </option>
                          {constituencies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Contact & Online */}
              <SectionCard>
                <div className="p-6">
                  <SectionHeader
                    icon={Globe}
                    title="Contact & Online"
                    description="How to reach and connect"
                    action={
                      <button
                        type="button"
                        onClick={() => toggleSection("contact")}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {activeSections.contact ? (
                          <ChevronDown size={20} />
                        ) : (
                          <ChevronRight size={20} />
                        )}
                      </button>
                    }
                  />

                  {activeSections.contact && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            Email Address
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="email"
                              value={p.contact_email}
                              onChange={(e) => setP({ ...p, contact_email: e.target.value })}
                              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm"
                              placeholder="office@example.gov"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            Phone Number
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              value={p.contact_phone}
                              onChange={(e) => setP({ ...p, contact_phone: e.target.value })}
                              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm"
                              placeholder="+1 234 567 8900"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          Official Website
                        </label>
                        <div className="relative">
                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            value={p.official_website}
                            onChange={(e) => setP({ ...p, official_website: e.target.value })}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm"
                            placeholder="https://example.com"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            Twitter / X
                          </label>
                          <input
                            value={p.social_links.twitter}
                            onChange={(e) =>
                              setP({
                                ...p,
                                social_links: { ...p.social_links, twitter: e.target.value },
                              })
                            }
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm"
                            placeholder="https://twitter.com/..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            Facebook
                          </label>
                          <input
                            value={p.social_links.facebook}
                            onChange={(e) =>
                              setP({
                                ...p,
                                social_links: { ...p.social_links, facebook: e.target.value },
                              })
                            }
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm"
                            placeholder="https://facebook.com/..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            Instagram
                          </label>
                          <input
                            value={p.social_links.instagram}
                            onChange={(e) =>
                              setP({
                                ...p,
                                social_links: { ...p.social_links, instagram: e.target.value },
                              })
                            }
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm"
                            placeholder="https://instagram.com/..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            YouTube
                          </label>
                          <input
                            value={p.social_links.youtube}
                            onChange={(e) =>
                              setP({
                                ...p,
                                social_links: { ...p.social_links, youtube: e.target.value },
                              })
                            }
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm"
                            placeholder="https://youtube.com/..."
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>
          </div>

          {/* Extended sections - only visible when editing existing politician */}
          {!isNew && (
            <div className="space-y-6">
              {/* Wealth History */}
              <SectionCard>
                <div className="p-6">
                  <SectionHeader
                    icon={TrendingUp}
                    title="Wealth History"
                    description="Financial disclosure records"
                    action={
                      <button
                        onClick={addWealth}
                        className="btn-soft-secondary text-xs px-4 py-2 flex items-center gap-1.5"
                        data-testid="add-wealth"
                      >
                        <Plus size={14} /> Add Entry
                      </button>
                    }
                  />

                  {wealth.length === 0 ? (
                    <EmptyState message="No wealth entries recorded yet" />
                  ) : (
                    <div className="space-y-3">
                      {wealth.map((w) => (
                        <div
                          key={w.id}
                          className="bg-slate-50 rounded-xl p-4 grid grid-cols-1 md:grid-cols-[100px_repeat(4,1fr)_100px] gap-3 items-end"
                        >
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                              Year
                            </label>
                            <input
                              type="number"
                              value={w.year}
                              onChange={(e) =>
                                setWField(w.id, "year", Number(e.target.value))
                              }
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                              Assets
                            </label>
                            <input
                              type="number"
                              value={w.assets}
                              onChange={(e) =>
                                setWField(w.id, "assets", Number(e.target.value))
                              }
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                              Liabilities
                            </label>
                            <input
                              type="number"
                              value={w.liabilities}
                              onChange={(e) =>
                                setWField(w.id, "liabilities", Number(e.target.value))
                              }
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                              Net Worth
                            </label>
                            <input
                              type="number"
                              value={w.net_worth ?? ""}
                              onChange={(e) =>
                                setWField(
                                  w.id,
                                  "net_worth",
                                  e.target.value === "" ? null : Number(e.target.value)
                                )
                              }
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                              placeholder="Auto"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                              Sources
                            </label>
                            <input
                              value={(w.source_urls || []).join(", ")}
                              onChange={(e) =>
                                setWField(
                                  w.id,
                                  "source_urls",
                                  e.target.value
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter(Boolean)
                                )
                              }
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                              placeholder="URL1, URL2"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateWealth(w)}
                              className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                            >
                              <Save size={14} />
                            </button>
                            <button
                              onClick={() => deleteWealth(w.id)}
                              className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Party History */}
              <SectionCard>
                <div className="p-6">
                  <SectionHeader
                    icon={Award}
                    title="Party History"
                    description="Political party affiliations over time"
                    action={
                      <button
                        onClick={addPartyHistory}
                        className="btn-soft-secondary text-xs px-4 py-2 flex items-center gap-1.5"
                        data-testid="add-party-history"
                      >
                        <Plus size={14} /> Add Entry
                      </button>
                    }
                  />

                  {partyHistory.length === 0 ? (
                    <EmptyState message="No party history recorded" />
                  ) : (
                    <div className="space-y-3">
                      {partyHistory.map((ph) => (
                        <div
                          key={ph.id}
                          className="bg-slate-50 rounded-xl p-4 space-y-3"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px_1fr_120px] gap-3">
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                Party
                              </label>
                              <input
                                value={ph.party}
                                onChange={(e) => setPHField(ph.id, "party", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                Start Date
                              </label>
                              <input
                                type="date"
                                value={ph.start_date || ""}
                                onChange={(e) => setPHField(ph.id, "start_date", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                End Date
                              </label>
                              <input
                                type="date"
                                value={ph.end_date || ""}
                                onChange={(e) => setPHField(ph.id, "end_date", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                                placeholder="Ongoing"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                Note
                              </label>
                              <input
                                value={ph.note || ""}
                                onChange={(e) => setPHField(ph.id, "note", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                                placeholder="e.g., Defected, expelled"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => savePartyHistory(ph)}
                                className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                              >
                                <Save size={14} />
                              </button>
                              <button
                                onClick={() => deletePartyHistory(ph.id)}
                                className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                              >
                                <Trash size={14} />
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                              Source URL
                            </label>
                            <input
                              value={ph.source_url || ""}
                              onChange={(e) => setPHField(ph.id, "source_url", e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                              placeholder="https://..."
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Position History */}
              <SectionCard>
                <div className="p-6">
                  <SectionHeader
                    icon={Briefcase}
                    title="Position History"
                    description="Government and political positions held"
                    action={
                      <button
                        onClick={addPositionHistory}
                        className="btn-soft-secondary text-xs px-4 py-2 flex items-center gap-1.5"
                        data-testid="add-position-history"
                      >
                        <Plus size={14} /> Add Entry
                      </button>
                    }
                  />

                  {positionHistory.length === 0 ? (
                    <EmptyState message="No position history recorded" />
                  ) : (
                    <div className="space-y-4">
                      {positionHistory.map((ph) => {
                        const geoRaw = phGeoOptions[ph.id] || {};
                        const geo = {
                          states: geoRaw.states || [],
                          cities: geoRaw.cities || [],
                          constituencies: geoRaw.constituencies || [],
                        };
                        return (
                          <div
                            key={ph.id}
                            className="bg-slate-50 rounded-xl p-5 space-y-3"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                  Position
                                </label>
                                <input
                                  value={ph.position}
                                  onChange={(e) =>
                                    setPositionField(ph.id, "position", e.target.value)
                                  }
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                                  placeholder="MP, MLA, Mayor..."
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                  Party
                                </label>
                                <input
                                  value={ph.party || ""}
                                  onChange={(e) =>
                                    setPositionField(ph.id, "party", e.target.value)
                                  }
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                  Election Year
                                </label>
                                <input
                                  type="number"
                                  value={ph.election_year || ""}
                                  onChange={(e) =>
                                    setPositionField(
                                      ph.id,
                                      "election_year",
                                      e.target.value ? Number(e.target.value) : null
                                    )
                                  }
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div>
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                  Country
                                </label>
                                <select
                                  value={ph.country_code || ""}
                                  onChange={(e) =>
                                    setPositionField(ph.id, "country_code", e.target.value)
                                  }
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                                >
                                  <option value="">—</option>
                                  {countries.map((c) => (
                                    <option key={c.code} value={c.code}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                  State
                                </label>
                                <select
                                  value={ph.state_id || ""}
                                  onChange={(e) =>
                                    setPositionField(ph.id, "state_id", e.target.value)
                                  }
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                                  disabled={!geo.states.length}
                                >
                                  <option value="">—</option>
                                  {geo.states.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                  City
                                </label>
                                <select
                                  value={ph.city_id || ""}
                                  onChange={(e) =>
                                    setPositionField(ph.id, "city_id", e.target.value)
                                  }
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                                  disabled={!geo.cities.length}
                                >
                                  <option value="">—</option>
                                  {geo.cities.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                  Constituency
                                </label>
                                <select
                                  value={ph.constituency_id || ""}
                                  onChange={(e) =>
                                    setPositionField(ph.id, "constituency_id", e.target.value)
                                  }
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                                  disabled={!geo.constituencies.length}
                                >
                                  <option value="">—</option>
                                  {geo.constituencies.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                              <div>
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                  Start Date
                                </label>
                                <input
                                  type="date"
                                  value={ph.start_date || ""}
                                  onChange={(e) =>
                                    setPositionField(ph.id, "start_date", e.target.value)
                                  }
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                  End Date
                                </label>
                                <input
                                  type="date"
                                  value={ph.end_date || ""}
                                  onChange={(e) =>
                                    setPositionField(ph.id, "end_date", e.target.value)
                                  }
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                                  disabled={!!ph.is_current}
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!!ph.is_current}
                                    onChange={(e) =>
                                      setPositionField(ph.id, "is_current", e.target.checked)
                                    }
                                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <span className="text-xs font-medium text-slate-600">
                                    Currently Holding
                                  </span>
                                </label>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => savePositionHistory(ph)}
                                  className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                                >
                                  <Save size={14} />
                                </button>
                                <button
                                  onClick={() => deletePositionHistory(ph.id)}
                                  className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                >
                                  <Trash size={14} />
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                Notes
                              </label>
                              <input
                                value={ph.note || ""}
                                onChange={(e) =>
                                  setPositionField(ph.id, "note", e.target.value)
                                }
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                                placeholder="Optional context"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Relatives */}
              <SectionCard>
                <div className="p-6">
                  <SectionHeader
                    icon={Users}
                    title="Relatives"
                    description="Family members and their relationships"
                    action={
                      <button
                        onClick={addRelative}
                        className="btn-soft-secondary text-xs px-4 py-2 flex items-center gap-1.5"
                        data-testid="add-relative"
                      >
                        <Plus size={14} /> Add Relative
                      </button>
                    }
                  />

                  {relatives.length === 0 ? (
                    <EmptyState message="No relatives added yet" />
                  ) : (
                    <div className="space-y-4">
                      {relatives.map((r) => (
                        <div
                          key={r.id}
                          className="bg-slate-50 rounded-xl p-5 space-y-4"
                        >
                          {r.is_reciprocal && (
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 rounded-full px-3 py-1 inline-block">
                              Auto-linked — edit from {r.linked_politician_name || "the original"}'s profile
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_2fr_auto] gap-3 items-end">
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                Name
                              </label>
                              <input
                                value={r.name}
                                onChange={(e) =>
                                  setRelatives((rs) =>
                                    rs.map((x) =>
                                      x.id === r.id ? { ...x, name: e.target.value } : x
                                    )
                                  )
                                }
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                Relationship
                              </label>
                              <input
                                value={r.relationship}
                                onChange={(e) =>
                                  setRelatives((rs) =>
                                    rs.map((x) =>
                                      x.id === r.id
                                        ? { ...x, relationship: e.target.value }
                                        : x
                                    )
                                  )
                                }
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                Description
                              </label>
                              <input
                                value={r.description || ""}
                                onChange={(e) =>
                                  setRelatives((rs) =>
                                    rs.map((x) =>
                                      x.id === r.id
                                        ? { ...x, description: e.target.value }
                                        : x
                                    )
                                  )
                                }
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                              />
                            </div>
                            {!r.is_reciprocal && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveRelative(r)}
                                  className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                                >
                                  <Save size={14} />
                                </button>
                                <button
                                  onClick={() => deleteRelative(r.id)}
                                  className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                >
                                  <Trash size={14} />
                                </button>
                              </div>
                            )}
                          </div>

                          {!r.is_reciprocal && (
                            <div className="pt-4 border-t border-slate-200 space-y-3">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!r.is_political}
                                  onChange={(e) =>
                                    setRelatives((rs) =>
                                      rs.map((x) =>
                                        x.id === r.id
                                          ? { ...x, is_political: e.target.checked }
                                          : x
                                      )
                                    )
                                  }
                                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-xs font-medium text-slate-600">
                                  Politically Active
                                </span>
                              </label>

                              {r.is_political && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                      Political Role
                                    </label>
                                    <input
                                      value={r.political_role || ""}
                                      onChange={(e) =>
                                        setRelatives((rs) =>
                                          rs.map((x) =>
                                            x.id === r.id
                                              ? { ...x, political_role: e.target.value }
                                              : x
                                          )
                                        )
                                      }
                                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                                      placeholder="e.g., MP for District 4"
                                    />
                                  </div>
                                  <div className="relative">
                                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                      Link to Politician
                                    </label>
                                    {r.linked_politician_id ? (
                                      <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200">
                                        <span className="flex-1 text-sm text-slate-800">
                                          {r.linked_politician_name || r.linked_politician_id}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => clearLinkedPolitician(r.id)}
                                          className="text-red-500 hover:text-red-600 transition-colors"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <input
                                          value={relativeSearch[r.id] || ""}
                                          onChange={(e) =>
                                            searchLinkablePolitician(r.id, e.target.value)
                                          }
                                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                                          placeholder="Search politicians..."
                                        />
                                        {(relativeSearchResults[r.id] || []).length > 0 && (
                                          <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
                                            {relativeSearchResults[r.id].map((pol) => (
                                              <button
                                                type="button"
                                                key={pol.id}
                                                onClick={() =>
                                                  pickLinkedPolitician(r.id, pol)
                                                }
                                                className="block w-full text-left px-4 py-2 hover:bg-slate-50 text-sm text-slate-700 transition-colors"
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

                          <div className="pl-6 border-l-4 border-emerald-400 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-600">
                                Wealth History for {r.name}
                              </span>
                              <button
                                onClick={() => addRelWealth(r.id)}
                                className="text-xs px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Plus size={12} /> Entry
                              </button>
                            </div>

                            {(r.wealth || []).length === 0 ? (
                              <p className="text-xs text-slate-400">No wealth entries</p>
                            ) : (
                              <div className="space-y-2">
                                {r.wealth.map((w) => (
                                  <div
                                    key={w.id}
                                    className="bg-white rounded-lg p-3 grid grid-cols-1 md:grid-cols-[80px_repeat(3,1fr)_100px] gap-2 items-end"
                                  >
                                    <div>
                                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                        Year
                                      </label>
                                      <input
                                        type="number"
                                        value={w.year}
                                        onChange={(e) =>
                                          setRelatives((rs) =>
                                            rs.map((x) =>
                                              x.id === r.id
                                                ? {
                                                    ...x,
                                                    wealth: x.wealth.map((y) =>
                                                      y.id === w.id
                                                        ? { ...y, year: Number(e.target.value) }
                                                        : y
                                                    ),
                                                  }
                                                : x
                                            )
                                          )
                                        }
                                        className="w-full px-2 py-1.5 rounded border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                        Assets
                                      </label>
                                      <input
                                        type="number"
                                        value={w.assets}
                                        onChange={(e) =>
                                          setRelatives((rs) =>
                                            rs.map((x) =>
                                              x.id === r.id
                                                ? {
                                                    ...x,
                                                    wealth: x.wealth.map((y) =>
                                                      y.id === w.id
                                                        ? { ...y, assets: Number(e.target.value) }
                                                        : y
                                                    ),
                                                  }
                                                : x
                                            )
                                          )
                                        }
                                        className="w-full px-2 py-1.5 rounded border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                        Liabilities
                                      </label>
                                      <input
                                        type="number"
                                        value={w.liabilities}
                                        onChange={(e) =>
                                          setRelatives((rs) =>
                                            rs.map((x) =>
                                              x.id === r.id
                                                ? {
                                                    ...x,
                                                    wealth: x.wealth.map((y) =>
                                                      y.id === w.id
                                                        ? {
                                                            ...y,
                                                            liabilities: Number(e.target.value),
                                                          }
                                                        : y
                                                    ),
                                                  }
                                                : x
                                            )
                                          )
                                        }
                                        className="w-full px-2 py-1.5 rounded border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                        Sources
                                      </label>
                                      <input
                                        value={(w.source_urls || []).join(",")}
                                        onChange={(e) =>
                                          setRelatives((rs) =>
                                            rs.map((x) =>
                                              x.id === r.id
                                                ? {
                                                    ...x,
                                                    wealth: x.wealth.map((y) =>
                                                      y.id === w.id
                                                        ? {
                                                            ...y,
                                                            source_urls: e.target.value
                                                              .split(",")
                                                              .map((s) => s.trim())
                                                              .filter(Boolean),
                                                          }
                                                        : y
                                                    ),
                                                  }
                                                : x
                                            )
                                          )
                                        }
                                        className="w-full px-2 py-1.5 rounded border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm bg-white"
                                      />
                                    </div>
                                    <div className="flex gap-1.5">
                                      <button
                                        onClick={() => updateWealth(w)}
                                        className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded transition-colors"
                                      >
                                        <Save size={12} />
                                      </button>
                                      <button
                                        onClick={() =>
                                          deleteWealth(w.id).then(() =>
                                            setRelatives((rs) =>
                                              rs.map((x) =>
                                                x.id === r.id
                                                  ? {
                                                      ...x,
                                                      wealth: x.wealth.filter(
                                                        (y) => y.id !== w.id
                                                      ),
                                                    }
                                                  : x
                                              )
                                            )
                                          )
                                        }
                                        className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded transition-colors"
                                      >
                                        <Trash size={12} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Bio & Media */}
              <SectionCard>
                <div className="p-6">
                  <SectionHeader
                    icon={FileText}
                    title="Bio & Media"
                    description="Biographical content and attachments"
                  />

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        Bio / Article (HTML)
                      </label>
                      <textarea
                        value={bioHtml}
                        onChange={(e) => setBioHtml(e.target.value)}
                        rows={8}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none text-sm font-mono resize-y"
                        placeholder="<p>Write or paste HTML here...</p>"
                        data-testid="bio-html-input"
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          onClick={saveBio}
                          disabled={savingBio}
                          className="btn-soft-primary text-xs disabled:opacity-50 px-4 py-2 rounded-lg flex items-center gap-1.5"
                          data-testid="save-bio-btn"
                        >
                          <Save size={14} />
                          {savingBio ? "Saving..." : "Save Bio"}
                        </button>
                        <input
                          ref={bioFileRef}
                          type="file"
                          accept=".html,.htm"
                          onChange={(e) =>
                            e.target.files?.[0] && uploadBioFile(e.target.files[0])
                          }
                          className="hidden"
                          data-testid="bio-file-input"
                        />
                        <button
                          type="button"
                          onClick={() => bioFileRef.current?.click()}
                          className="btn-soft-secondary text-xs px-4 py-2 rounded-lg flex items-center gap-1.5"
                          data-testid="upload-bio-file-btn"
                        >
                          <Upload size={14} /> Upload HTML
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-semibold text-slate-600">
                          Attachments
                        </label>
                        <input
                          ref={mediaFileRef}
                          type="file"
                          accept="image/*,application/pdf,video/*"
                          onChange={(e) =>
                            e.target.files?.[0] && uploadMedia(e.target.files[0])
                          }
                          className="hidden"
                          data-testid="media-file-input"
                        />
                        <button
                          type="button"
                          onClick={() => mediaFileRef.current?.click()}
                          disabled={uploadingMedia}
                          className="btn-soft-secondary text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                          data-testid="upload-media-btn"
                        >
                          <Upload size={14} />
                          {uploadingMedia ? "Uploading..." : "Upload File"}
                        </button>
                      </div>

                      {media.length === 0 ? (
                        <div className="text-center py-6">
                          <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mb-3">
                            <File className="w-6 h-6 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-500">No attachments yet</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {media.map((m) => (
                            <div
                              key={m.id}
                              className="bg-slate-50 rounded-xl p-3 hover:shadow-md transition-shadow relative group"
                            >
                              <a
                                href={m.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  {getFileIcon(m.file_type)}
                                  <span className="text-xs font-medium text-slate-700 truncate flex-1">
                                    {m.filename}
                                  </span>
                                </div>
                                <span className="text-[10px] uppercase text-slate-400">
                                  {m.file_type}
                                </span>
                                <ExternalLink className="absolute top-2 right-2 w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </a>
                              <button
                                onClick={() => deleteMedia(m.id)}
                                className="absolute bottom-2 right-2 p-1 bg-red-50 text-red-500 hover:bg-red-100 rounded transition-colors opacity-0 group-hover:opacity-100"
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
                </div>
              </SectionCard>
            </div>
          )}
        </form>
      </div>
    </DashboardLayout>
  );
}
