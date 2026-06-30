import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PoliticianCard from "@/components/PoliticianCard";
import { Search, Plus } from "lucide-react";

const SORTS = [
  ["recent", "Recently added"],
  ["name", "Name (A-Z)"],
  ["tenure_long", "Longest in position"],
  ["tenure_short", "Newest in position"],
  ["rating", "Highest public rating"],
  ["delivered", "Most delivered"],
  ["promises", "Most promises"],
  ["wealth", "Highest net worth"],
];

const FILTERS = ["country", "state", "city", "party", "position"];

export default function Feed() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [filters, setFilters] = useState({ country: "", state: "", city: "", party: "", position: "", constituency: "" });
  const [distinct, setDistinct] = useState({ country: [], state: [], city: [], party: [], position: [] });

  const load = async () => {
    setLoading(true);
    try {
      const params = { sort };
      if (q) params.q = q;
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const { data } = await api.get("/politicians", { params });
      setItems(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { api.get("/filters/distinct").then(({ data }) => setDistinct(data)).catch(() => {}); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [sort]);

  const setF = (k) => (v) => setFilters({ ...filters, [k]: v === "all" ? "" : v });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <span className="text-xs uppercase tracking-wider font-medium text-zinc-500">The ledger</span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mt-1">Politicians</h1>
          <p className="text-zinc-600 mt-2">Search by name, country, state, city, constituency, position.</p>
        </div>
        <Button asChild data-testid="feed-add-btn" className="bg-zinc-900 hover:bg-zinc-800">
          <Link to="/politicians/new"><Plus className="h-4 w-4 mr-1" /> Add politician</Link>
        </Button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="border border-zinc-200 rounded-md bg-white p-4 grid md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
        <div className="relative md:col-span-3 lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input data-testid="feed-search-input" placeholder="Search name, party, constituency, position..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {FILTERS.map((k) => (
          <Select key={k} value={filters[k] || "all"} onValueChange={setF(k)}>
            <SelectTrigger data-testid={`feed-${k}-filter`}><SelectValue placeholder={k[0].toUpperCase() + k.slice(1)} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {k}s</SelectItem>
              {(distinct[k] || []).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        ))}
        <Input data-testid="feed-constituency-filter" placeholder="Constituency" value={filters.constituency} onChange={(e) => setFilters({ ...filters, constituency: e.target.value })} />
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger data-testid="feed-sort-filter"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            {SORTS.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button data-testid="feed-search-btn" type="submit" variant="outline">Apply</Button>
      </form>

      {loading ? (
        <div className="text-center py-20 text-zinc-500">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-zinc-300 rounded-md">
          <p className="text-zinc-600">No politicians found yet.</p>
          <Button asChild data-testid="feed-empty-add-btn" className="mt-4 bg-zinc-900 hover:bg-zinc-800">
            <Link to="/politicians/new">Be the first to add one</Link>
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="feed-list">
          {items.map(p => <PoliticianCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
