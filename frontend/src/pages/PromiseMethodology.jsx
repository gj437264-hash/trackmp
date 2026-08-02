// src/pages/PromiseMethodology.jsx
import React from "react";
import { motion } from "framer-motion";
import { PublicLayout } from "@/components/PublicLayout";
import { FadeIn } from "@/components/Motion";
import {
  CircleDashed,
  PauseCircle,
  Clock,
  Scale,
  CheckCircle2,
  XCircle,
  FileText,
  Landmark,
  Gavel,
  Megaphone,
  Newspaper,
  ShieldCheck,
} from "lucide-react";

// Mirrors PROMISE_STATUS in PoliticianProfile.jsx exactly — keep these in sync,
// or better, extract both to a shared src/lib/promiseStatus.js and import in both places.
const PROMISE_STATUS = [
  {
    value: "pending",
    label: "Pending",
    Icon: CircleDashed,
    cls: "bg-slate-100 text-slate-700 border-slate-200",
    desc:
      "The commitment has been recorded from an official campaign statement, and the politician has taken office, but no legislative, executive, or budgetary step has been taken yet.",
    triggers: [
      "An official campaign platform statement, debate transcript, or rally speech recorded prior to taking office",
      "No bill, executive action, or budget line introduced since",
    ],
    metric: "Time elapsed since taking office without any administrative or legislative action.",
    example:
      "A pledge to cut small business tax by 2% stays Pending until a bill is introduced or a formal study is ordered.",
  },
  {
    value: "stalled",
    label: "Stalled",
    Icon: PauseCircle,
    cls: "bg-slate-200 text-slate-700 border-slate-300",
    desc:
      "Progress has effectively frozen. The commitment isn't dead, but nothing meaningful has moved it forward in some time.",
    triggers: [
      "A bill sits in committee well past a reasonable threshold with no hearing or vote",
      "An executive order is blocked by a court injunction with no active appeal",
      "A vote fails, but there's a stated intent to reintroduce or renegotiate later",
    ],
    metric: "Length of inaction, missed procedural deadlines, or repeated delays.",
    example:
      "A healthcare reform bill loses steam in committee amid internal disagreement over how to fund it.",
  },
  {
    value: "in_progress",
    label: "In Progress",
    Icon: Clock,
    cls: "bg-amber-100 text-amber-700 border-amber-200",
    desc:
      "Concrete, verifiable action is underway on the commitment — intent alone isn't enough to earn this status.",
    triggers: [
      "A bill has been introduced or formally referred to committee",
      "An executive order or administrative rule has been issued",
      "Funding for the commitment appears as a line item in a proposed budget",
    ],
    metric: "Committee progression, rulemaking stage, or budget approval milestones.",
    example:
      "A pledged infrastructure bill is drafted, introduced on the floor, and assigned to committee for review.",
  },
  {
    value: "compromised",
    label: "Compromised",
    Icon: Scale,
    cls: "bg-violet-100 text-violet-700 border-violet-200",
    desc:
      "Real policy action took place, but what actually passed is noticeably narrower or weaker than what was originally promised.",
    triggers: [
      "The final target is lower than what was pledged (e.g. a promised $15 minimum wage becomes $11)",
      "The scope shrinks (e.g. a universal benefit is limited to a specific group)",
      "Only part of a multi-part promise passes while the rest fails",
    ],
    metric: "The gap between the original pledge and the final enacted text.",
    example:
      "A candidate pledges universal paid sick leave, but the law that eventually passes only covers federal contractors.",
  },
  {
    value: "delivered",
    label: "Delivered",
    Icon: CheckCircle2,
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    desc:
      "The core intent of the commitment has been fully carried out, with no meaningful gap between what was promised and what happened.",
    triggers: [
      "A bill is passed and signed into law",
      "An executive order is fully carried out without being overturned",
      "A stated numeric target is verifiably reached, per official records",
    ],
    metric: "Official signature dates, gazette notifications, or regulatory implementation records.",
    example:
      "A pledge to remove a specific trade tariff is fulfilled once the official rate is published at zero.",
  },
  {
    value: "broken",
    label: "Broken",
    Icon: XCircle,
    cls: "bg-red-100 text-red-700 border-red-200",
    desc:
      "The commitment was formally rejected, reversed by the politician, struck down by a court, or simply left untouched through the end of the term.",
    triggers: [
      "The term ends with the relevant bill unpassed or defeated",
      "The politician votes against, or publicly reverses, their own earlier position",
      "A higher court strikes the policy down as unconstitutional",
    ],
    metric: "End-of-term deadlines or an explicit, on-record reversal.",
    example:
      "A candidate promises not to raise fuel taxes, then later votes for a budget that raises the national gas tax.",
  },
];

const SOURCE_HIERARCHY = [
  {
    title: "Manifestos & Official Party Documents",
    Icon: FileText,
    detail:
      "The starting point for any tracked promise: the official manifesto PDF or policy booklet released by the party, cited down to the page number so the original wording can always be checked independently.",
  },
  {
    title: "Government Notifications & Budgets",
    Icon: Landmark,
    detail:
      "Official notifications, budget allocations, and scheme dashboards are used as direct evidence of funding or implementation progress.",
  },
  {
    title: "Parliamentary & Assembly Records",
    Icon: Gavel,
    detail:
      "Where available, official questions and answers on the floor are used, especially when they contain figures or implementation details on the record.",
  },
  {
    title: "Official Press Releases",
    Icon: Megaphone,
    detail:
      "Government statements are treated as a starting point, not final proof — we check them against the underlying documents and real-world outcomes.",
  },
  {
    title: "Courts, Auditors & Statutory Bodies",
    Icon: ShieldCheck,
    detail:
      "Rulings, audit findings, and reports from recognized independent institutions carry substantial weight in resolving a promise's status.",
  },
  {
    title: "Independent Journalism",
    Icon: Newspaper,
    detail:
      "Credible reporting is used for context and to surface leads — it supplements, but doesn't replace, primary official evidence.",
  },
];

const MONITORING_PRINCIPLES = [
  {
    title: "Anchored to a Primary Source",
    body:
      "Every promise is linked to a specific, verifiable original statement — a speech, a manifesto page, an official post — before it's added to the tracker.",
  },
  {
    title: "Outcomes Over Effort",
    body:
      "Status reflects what actually happened, not how hard someone tried. A serious attempt that doesn't produce a result stays Stalled or ends up Broken — it's never marked Delivered.",
  },
  {
    title: "Built to Be Measurable",
    body:
      "Promises are framed around checkable outcomes from the start. A pledge to broadly 'improve the economy' isn't trackable on its own; 'bring unemployment below 4%' is.",
  },
  {
    title: "Every Status Change Is Documented",
    body:
      "A move from one stage to another is always tied to a specific reference — a bill number, court ruling, or official notification — so the full history stays auditable.",
  },
];

export default function PromiseMethodology() {
  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-white">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-500 to-emerald-400 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
          <FadeIn>
            <div className="relative max-w-5xl mx-auto px-6 py-20 text-center">
              <p className="uppercase tracking-widest text-emerald-50/90 text-xs font-bold mb-4">
                Methodology
              </p>
              <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-6">
                How We Track Political Promises
              </h1>
              <p className="max-w-2xl mx-auto text-emerald-50/90 text-lg leading-relaxed">
                Every commitment on TrackMP moves through a defined lifecycle,
                backed by documented evidence at each step. Here's how promises
                are sourced, how status is decided, and where the evidence
                comes from.
              </p>
            </div>
          </FadeIn>
        </section>

        {/* Lifecycle */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl font-bold text-slate-800 mb-3">
                The Six-Stage Lifecycle
              </h2>
              <p className="text-slate-500 max-w-2xl mx-auto">
                Every promise is evaluated against real legislative and
                executive action — never rhetoric alone.
              </p>
            </div>
          </FadeIn>

          <div className="space-y-6">
            {PROMISE_STATUS.map((stage, i) => (
              <motion.div
                key={stage.value}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-white/70 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-6 md:p-8 shadow-lg shadow-slate-200/20"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full border-2 ${stage.cls} shadow-sm`}
                  >
                    <stage.Icon size={12} /> {stage.label}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Stage {i + 1}
                  </span>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  {stage.desc}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="bg-slate-50/80 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Enters this stage when
                    </p>
                    <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                      {stage.triggers.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-slate-50/80 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      How it's measured
                    </p>
                    <p className="text-sm text-slate-700">{stage.metric}</p>
                  </div>
                  <div className="bg-slate-50/80 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Example
                    </p>
                    <p className="text-sm text-slate-700">{stage.example}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Sources */}
        <section className="bg-gradient-to-br from-emerald-50/60 to-teal-50/40 py-16">
          <div className="max-w-5xl mx-auto px-6">
            <FadeIn>
              <div className="text-center mb-12">
                <h2 className="font-display text-3xl font-bold text-slate-800 mb-3">
                  Where Our Evidence Comes From
                </h2>
                <p className="text-slate-500 max-w-2xl mx-auto">
                  We prioritize primary, official documentation and treat
                  secondary reporting as supporting context, not proof on its
                  own.
                </p>
              </div>
            </FadeIn>

            <div className="space-y-4">
              {SOURCE_HIERARCHY.map((source, i) => (
                <motion.div
                  key={source.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex gap-4 items-start bg-white/70 backdrop-blur-sm border border-slate-200/50 rounded-xl p-5 shadow-sm"
                >
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-soft-emerald">
                    <source.Icon size={18} />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-slate-800">
                      {source.title}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                      {source.detail}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Principles */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl font-bold text-slate-800 mb-3">
                Our Core Principles
              </h2>
              <p className="text-slate-500 max-w-2xl mx-auto">
                These rules guide every status assignment and keep tracking
                consistent across politicians and parties.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {MONITORING_PRINCIPLES.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-white/70 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-6 shadow-lg shadow-slate-200/20"
              >
                <h3 className="font-display text-lg font-bold text-slate-800 mb-2">
                  {p.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {p.body}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-6 pb-20">
          <FadeIn>
            <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white p-10 text-center shadow-soft-emerald">
              <h2 className="font-display text-2xl font-bold mb-3">
                Spotted an outdated or incorrect status?
              </h2>
              <p className="text-emerald-50/90 mb-6">
                Every entry can be challenged with documentation. Help us keep
                the record accurate.
              </p>
              <a
                href="/submit-update"
                className="inline-block bg-white text-emerald-700 font-bold px-6 py-3 rounded-full hover:bg-emerald-50 transition-colors shadow"
              >
                Submit an Update
              </a>
            </div>
          </FadeIn>
        </section>
      </div>
    </PublicLayout>
  );
}
