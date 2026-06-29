import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PoliticianCard from "@/components/PoliticianCard";
import { Search, Plus } from "lucide-react";

export default function Feed() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [state, setState] = useState("");
  const [party, setParty] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.q = q;
      if (sort) params.sort = sort;
      if (state) params.state = state;
      if (party) params.party = party;
      const { data } = await api.get("/politicians", { params });
      setItems(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [sort]);

  const states = [...new Set(items.map(i => i.state))].sort();
  const parties = [...new Set(items.map(i => i.party))].sort();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <span className="text-xs uppercase tracking-wider font-medium text-zinc-500">The ledger</span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mt-1">Politicians</h1>
          <p className="text-zinc-600 mt-2">Search by name, constituency, or party.</p>
        </div>
        <Button asChild data-testid="feed-add-btn" className="bg-zinc-900 hover:bg-zinc-800">
          <Link to="/politicians/new"><Plus className="h-4 w-4 mr-1" /> Add politician</Link>
        </Button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="border border-zinc-200 rounded-md bg-white p-4 grid md:grid-cols-[1fr_180px_180px_180px_auto] gap-3 mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input data-testid="feed-search-input" placeholder="Search name, party, constituency..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={state || "all"} onValueChange={(v) => setState(v === "all" ? "" : v)}>
          <SelectTrigger data-testid="feed-state-filter"><SelectValue placeholder="State" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states</SelectItem>
            {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={party || "all"} onValueChange={(v) => setParty(v === "all" ? "" : v)}>
          <SelectTrigger data-testid="feed-party-filter"><SelectValue placeholder="Party" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All parties</SelectItem>
            {parties.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger data-testid="feed-sort-filter"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently added</SelectItem>
            <SelectItem value="promises">Most promises</SelectItem>
            <SelectItem value="delivered">Most delivered</SelectItem>
            <SelectItem value="rating">Highest rated</SelectItem>
          </SelectContent>
        </Select>
        <Button data-testid="feed-search-btn" type="submit" variant="outline">Search</Button>
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
