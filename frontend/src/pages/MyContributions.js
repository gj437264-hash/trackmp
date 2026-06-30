import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import PoliticianCard from "@/components/PoliticianCard";
import StatusBadge from "@/components/StatusBadge";
import { Briefcase, ScrollText, ArrowRight } from "lucide-react";

export default function MyContributions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ politicians: [], promises: [], works: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user === false) { navigate("/login"); return; }
    if (!user) return;
    api.get("/me/contributions").then(({ data }) => setData(data)).finally(() => setLoading(false));
  }, [user, navigate]);

  if (!user || user === false) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <span className="text-xs uppercase tracking-wider font-medium text-zinc-500">Your record</span>
      <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mt-1">My contributions</h1>
      <p className="text-zinc-600 mt-2">Everything you&apos;ve added to the public ledger.</p>

      {loading ? (
        <div className="text-center py-20 text-zinc-500">Loading...</div>
      ) : (
        <Tabs defaultValue="politicians" className="mt-8">
          <TabsList>
            <TabsTrigger data-testid="my-tab-politicians" value="politicians">Politicians ({data.politicians.length})</TabsTrigger>
            <TabsTrigger data-testid="my-tab-promises" value="promises">Promises ({data.promises.length})</TabsTrigger>
            <TabsTrigger data-testid="my-tab-works" value="works">Work ({data.works.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="politicians" className="mt-6">
            {data.politicians.length === 0 ? (
              <div className="border border-dashed border-zinc-300 rounded-md p-12 text-center">
                <p className="text-zinc-600">You haven&apos;t added any politicians yet.</p>
                <Button asChild data-testid="my-empty-add-btn" className="mt-4 bg-zinc-900 hover:bg-zinc-800">
                  <Link to="/politicians/new">Add the first one</Link>
                </Button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {data.politicians.map(p => <PoliticianCard key={p.id} p={p} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="promises" className="mt-6 space-y-3">
            {data.promises.length === 0 ? (
              <div className="border border-dashed border-zinc-300 rounded-md p-12 text-center text-zinc-600">No promises logged yet.</div>
            ) : data.promises.map(p => (
              <Link key={p.id} to={`/politicians/${p.politician_id}`} data-testid={`my-promise-${p.id}`} className="block border border-zinc-200 rounded-md p-4 bg-white hover-lift">
                <div className="flex items-start gap-3">
                  <ScrollText className="h-4 w-4 text-zinc-400 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <h4 className="font-semibold text-zinc-950 flex-1">{p.title}</h4>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">for <span className="text-zinc-700 font-medium">{p.politician_name}</span></div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-400" />
                </div>
              </Link>
            ))}
          </TabsContent>

          <TabsContent value="works" className="mt-6 space-y-3">
            {data.works.length === 0 ? (
              <div className="border border-dashed border-zinc-300 rounded-md p-12 text-center text-zinc-600">No work entries logged yet.</div>
            ) : data.works.map(w => (
              <Link key={w.id} to={`/politicians/${w.politician_id}`} data-testid={`my-work-${w.id}`} className="block border border-zinc-200 rounded-md p-4 bg-white hover-lift">
                <div className="flex items-start gap-3">
                  <Briefcase className="h-4 w-4 text-zinc-400 mt-1" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-zinc-950">{w.title}</h4>
                    <div className="text-xs text-zinc-500 mt-1">for <span className="text-zinc-700 font-medium">{w.politician_name}</span></div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-400" />
                </div>
              </Link>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
