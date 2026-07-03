import React from "react";
import { PublicLayout } from "@/components/PublicLayout";

export default function AboutPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
        <div className="label-eyebrow">/// Manifesto</div>
        <h1 className="mt-3 font-display font-black text-5xl md:text-7xl uppercase tracking-tighter leading-[0.9]">
          Transparency, By Construction.
        </h1>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="brutal-card p-6">
            <div className="label-eyebrow">01 · Public Ledger</div>
            <h3 className="mt-2 font-display font-black text-2xl uppercase">Every Politician. Every Record.</h3>
            <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
              A permanent, structured directory of elected officials — searchable by
              country, name, and constituency.
            </p>
          </div>
          <div className="brutal-card p-6">
            <div className="label-eyebrow">02 · Wealth History</div>
            <h3 className="mt-2 font-display font-black text-2xl uppercase">Track the money over time.</h3>
            <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
              Year-by-year assets, liabilities, and net worth for politicians and their
              relatives — with source links on every claim.
            </p>
          </div>
          <div className="brutal-card p-6">
            <div className="label-eyebrow">03 · Audited</div>
            <h3 className="mt-2 font-display font-black text-2xl uppercase">Every change is logged.</h3>
            <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
              Every edit is captured with the actor, timestamp, and diff. The audit log
              is append-only. Nothing disappears silently.
            </p>
          </div>
          <div className="brutal-card p-6">
            <div className="label-eyebrow">04 · Moderated</div>
            <h3 className="mt-2 font-display font-black text-2xl uppercase">Managed access.</h3>
            <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
              Reading is free and public. Contributing requires approval. This keeps the
              record clean, deliberate, and defensible.
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
