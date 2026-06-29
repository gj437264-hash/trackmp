import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { ArrowRight, CheckCircle2, XCircle, Users, ScrollText, ShieldCheck, TrendingUp } from "lucide-react";

export default function Landing() {
  const [stats, setStats] = useState({ politicians: 0, promises: 0, delivered: 0, broken: 0, users: 0 });

  useEffect(() => {
    api.get("/stats/overview").then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-grid border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <span data-testid="hero-tag" className="inline-flex items-center gap-2 px-3 py-1 text-xs uppercase tracking-wider font-medium text-zinc-600 border border-zinc-300 rounded-full bg-white">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
              A community-built accountability ledger
            </span>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-zinc-950 mt-6 leading-[1.05]">
              Track every promise.<br />
              <span className="text-zinc-400">Hold every politician.</span>
            </h1>
            <p className="text-lg text-zinc-700 mt-6 max-w-2xl leading-relaxed">
              TrackMP is a public, crowdsourced platform where citizens document what politicians say, what they do, and the gap in between. Constituency by constituency.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild data-testid="hero-explore-btn" size="lg" className="bg-zinc-900 hover:bg-zinc-800">
                <Link to="/feed">Explore politicians <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild data-testid="hero-add-btn" size="lg" variant="outline">
                <Link to="/politicians/new">Add a politician</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-200">
          {[
            { label: "Politicians tracked", value: stats.politicians, Icon: Users },
            { label: "Promises recorded", value: stats.promises, Icon: ScrollText },
            { label: "Delivered", value: stats.delivered, Icon: CheckCircle2, color: "text-green-700" },
            { label: "Broken", value: stats.broken, Icon: XCircle, color: "text-red-700" },
          ].map((s, i) => (
            <div key={i} className="bg-white p-6 md:p-8">
              <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-wider">
                <s.Icon className="h-3.5 w-3.5" />
                {s.label}
              </div>
              <div className={`font-display font-bold text-4xl md:text-5xl mt-3 tabular-nums ${s.color || "text-zinc-950"}`} data-testid={`stat-${s.label.replace(/\s+/g, "-").toLowerCase()}`}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <span className="text-xs uppercase tracking-wider font-medium text-zinc-500">How it works</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight mt-2">Built by citizens. For citizens.</h2>
            <p className="text-zinc-700 mt-4 leading-relaxed">
              Anyone can add a politician, log promises they've made, attach sources, and track whether those promises are pending, in progress, delivered, or broken. The community votes. The record stays public.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { n: "01", t: "Add a politician", d: "Name, party, constituency, photo. Any registered user can contribute.", Icon: Users },
              { n: "02", t: "Log promises and work", d: "Each entry can include source URLs, dates, and a status.", Icon: ScrollText },
              { n: "03", t: "Track delivery", d: "Status moves from pending → in progress → delivered or broken.", Icon: TrendingUp },
              { n: "04", t: "Verify the record", d: "Comment, upvote credible entries, rate politicians on overall performance.", Icon: ShieldCheck },
            ].map((step) => (
              <div key={step.n} className="border border-zinc-200 rounded-md p-5 hover-lift bg-white">
                <div className="flex items-start gap-4">
                  <span className="font-mono text-sm text-zinc-400 mt-1">{step.n}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <step.Icon className="h-4 w-4 text-zinc-900" />
                      <h3 className="font-display font-semibold text-lg">{step.t}</h3>
                    </div>
                    <p className="text-zinc-600 text-sm mt-1">{step.d}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-200 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4" />
            <span className="font-display font-bold text-zinc-900">TrackMP</span>
          </div>
          <span>A public accountability project.</span>
        </div>
      </footer>
    </div>
  );
}
