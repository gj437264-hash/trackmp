import React, { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { PublicLayout } from "@/components/PublicLayout";

// Constants for better maintainability
const STATS = [
  { value: "12K+", label: "Promises Tracked", color: "text-emerald-600", icon: "📋", ariaLabel: "Over 12,000 promises tracked" },
  { value: "847", label: "Representatives", color: "text-amber-600", icon: "👥", ariaLabel: "847 representatives monitored" },
  { value: "94%", label: "Verification Rate", color: "text-blue-600", icon: "✅", ariaLabel: "94 percent verification rate" },
  { value: "36", label: "States Covered", color: "text-slate-800", icon: "📍", ariaLabel: "36 states covered" }
];

const EXPLORE_ITEMS = [
  {
    number: "01",
    title: "Politician Profiles",
    description: "Explore biographies, political careers, positions held, affiliations, constituencies, and other publicly available information.",
    icon: "👤",
    color: "emerald"
  },
  {
    number: "02",
    title: "Promises & Commitments",
    description: "Follow political promises and commitments and, where reliable information is available, track their status over time.",
    icon: "📜",
    color: "amber"
  },
  {
    number: "03",
    title: "Elections & Political History",
    description: "Understand elections, offices, parties, constituencies, and significant milestones in a politician's public career.",
    icon: "🗳️",
    color: "blue"
  },
  {
    number: "04",
    title: "Public Records",
    description: "Organize relevant public information and records so users can better understand the context behind a politician's profile.",
    icon: "📁",
    color: "purple"
  },
  {
    number: "05",
    title: "Wealth & Asset History",
    description: "Where public records are available, present financial and asset information as historical data rather than isolated figures.",
    icon: "💰",
    color: "rose"
  },
  {
    number: "06",
    title: "Sources & Media",
    description: "Connect profiles with relevant sources, documents, images, video, and other material that can help users investigate further.",
    icon: "📰",
    color: "indigo"
  }
];

const PRINCIPLES = [
  {
    title: "Public information",
    description: "Focus on information that is legitimately available through public records and reliable public sources.",
    icon: "🔍"
  },
  {
    title: "Source-aware",
    description: "Where practical, information should be connected to its source so users can investigate the underlying material.",
    icon: "📎"
  },
  {
    title: "Context matters",
    description: "Numbers, statements, events, and records should be understood in their historical and political context.",
    icon: "🧩"
  },
  {
    title: "Structured information",
    description: "Consistent data structures make it easier to compare records, discover relationships, and follow changes over time.",
    icon: "📊"
  },
  {
    title: "Transparency over speculation",
    description: "TrackMP should distinguish documented information from interpretation, assumptions, or unverified claims.",
    icon: "🔮"
  },
  {
    title: "Designed for citizens",
    description: "Complex political information should be presented in a way that is understandable and useful to ordinary users.",
    icon: "👥"
  }
];

const FLOW_STEPS = [
  { step: "01", title: "Politician", icon: "👤", color: "emerald" },
  { step: "02", title: "Political career & offices", icon: "🏛️", color: "blue" },
  { step: "03", title: "Elections & promises", icon: "🗳️", color: "amber" },
  { step: "04", title: "Public records & history", icon: "📚", color: "purple" },
  { step: "05", title: "Sources & evidence", icon: "📎", color: "rose" }
];

const HASH_TAGS = [
  { text: "#Accountability", variant: "slate" },
  { text: "#EvidenceBased", variant: "emerald" },
  { text: "#CitizenOversight", variant: "blue" },
  { text: "#PoliticalTransparency", variant: "amber" },
  { text: "#DemocracyInAction", variant: "purple" },
  { text: "#FactOverOpinion", variant: "dark" },
  { text: "#LegislativeAudit", variant: "teal" }
];

// Interactive Counter Component
const AnimatedCounter = ({ target, label, color, icon, ariaLabel }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const counterRef = useCallback((node) => {
    if (node) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(node);
    }
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    let step = 0;
    
    const timer = setInterval(() => {
      step++;
      current += increment;
      if (step >= steps) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [isVisible, target]);

  const displayValue = typeof target === 'string' && target.includes('+') 
    ? `${count}+` 
    : target === 94 
      ? `${Math.min(count, 94)}%` 
      : count;

  return (
    <div
      ref={counterRef}
      className="group p-6 rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-100 shadow-sm hover:shadow-2xl hover:border-emerald-200/80 transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] cursor-default relative overflow-hidden"
      aria-label={ariaLabel}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
      <div className="relative">
        <div className="text-3xl mb-2 opacity-60 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 inline-block">{icon}</div>
        <div className={`text-3xl sm:text-4xl font-display font-black tracking-tight ${color} group-hover:scale-105 transition-transform origin-left`}>
          {displayValue}
        </div>
        <div className="text-xs text-slate-400 uppercase tracking-wider mt-2 font-semibold group-hover:text-slate-600 transition-colors">{label}</div>
        <div className="absolute bottom-2 right-2 w-16 h-16 bg-gradient-to-r from-emerald-500/5 to-blue-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
      </div>
    </div>
  );
};

export default function AboutPage() {
  const [animatedSections, setAnimatedSections] = useState({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setAnimatedSections(prev => ({ 
              ...prev, 
              [entry.target.dataset.section]: true 
            }));
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('[data-section]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <PublicLayout>
      <Helmet>
        <title>About TrackMP | Political Transparency & Accountability Platform</title>
        <meta 
          name="description" 
          content="Learn about TrackMP, a global political transparency and accountability platform that helps citizens research politicians, public records, promises, elections, and political careers." 
        />
        <meta property="og:title" content="About TrackMP | Political Transparency & Accountability" />
        <meta property="og:description" content="Making political information easier to understand, follow, and verify. TrackMP helps citizens research politicians and their public records." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://trackmp.com/about" />
      </Helmet>

      <style>{`
        @keyframes float {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(30px, -30px) scale(1.5); }
        }
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes floatUpDown {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.1); }
        }
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 300% auto;
          animation: gradientMove 4s ease infinite;
        }
        .animate-rotate-slow {
          animation: rotateSlow 20s linear infinite;
        }
        .animate-float-updown {
          animation: floatUpDown 4s ease-in-out infinite;
        }
        .animate-slide-up {
          animation: slideUp 0.6s ease-out forwards;
        }
        .card-glow {
          position: relative;
          overflow: hidden;
        }
        .card-glow::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle at 30% 30%, rgba(16, 185, 129, 0.05), transparent 50%);
          animation: rotateSlow 30s linear infinite;
          pointer-events: none;
        }
        .card-glow:hover::before {
          opacity: 1;
        }
      `}</style>

      {/* Background Effects */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none -z-20" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)',
        backgroundSize: '24px 24px'
      }} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-20 relative antialiased text-slate-800">

        {/* Animated gradient orbs */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse mix-blend-multiply" style={{ animationDuration: '8s' }} />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-400/15 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse mix-blend-multiply" style={{ animationDuration: '10s', animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-amber-400/15 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse mix-blend-multiply" style={{ animationDuration: '12s', animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse mix-blend-multiply" style={{ animationDuration: '14s', animationDelay: '0.5s' }} />

        {/* HERO SECTION */}
        <section aria-labelledby="hero-title" className="relative mb-20">
          {/* Decorative animated elements */}
          <div className="absolute -top-20 -right-20 w-72 h-72 md:w-96 md:h-96 opacity-20 pointer-events-none">
            <svg viewBox="0 0 400 400" className="w-full h-full animate-rotate-slow">
              <circle cx="200" cy="200" r="180" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400/30" />
              <circle cx="200" cy="200" r="140" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-400/30" />
              <circle cx="200" cy="200" r="100" fill="none" stroke="currentColor" strokeWidth="1" className="text-amber-400/30" />
            </svg>
          </div>

          <div className="absolute -top-16 -left-16 w-64 h-64 md:w-80 md:h-80 text-slate-300/20 pointer-events-none select-none animate-float-updown">
            <svg viewBox="0 0 400 400" aria-hidden="true" className="w-full h-full">
              <line x1="200" y1="40" x2="200" y2="330" stroke="currentColor" strokeWidth="3" />
              <circle cx="200" cy="40" r="12" fill="currentColor" className="text-emerald-500/40" />
              <path d="M 130 330 L 270 330 L 245 360 L 155 360 Z" fill="none" stroke="currentColor" strokeWidth="3" />
              <circle cx="200" cy="90" r="10" fill="currentColor" className="text-emerald-500/50 animate-pulse" />
              <line x1="80" y1="90" x2="320" y2="90" stroke="currentColor" strokeWidth="4" />
              <line x1="80" y1="90" x2="50" y2="180" stroke="currentColor" strokeWidth="2" />
              <line x1="80" y1="90" x2="110" y2="180" stroke="currentColor" strokeWidth="2" />
              <path d="M 40 180 A 40 30 0 0 0 120 180 Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
              <line x1="320" y1="90" x2="290" y2="180" stroke="currentColor" strokeWidth="2" />
              <line x1="320" y1="90" x2="350" y2="180" stroke="currentColor" strokeWidth="2" />
              <path d="M 280 180 A 40 30 0 0 0 360 180 Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
            </svg>
          </div>

          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200/60 backdrop-blur-sm hover:bg-emerald-100 transition-colors cursor-default group">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              About TrackMP
              <span className="w-1 h-1 rounded-full bg-emerald-300"></span>
              <span className="text-[10px] text-emerald-500 font-mono">v2.0</span>
            </div>
            
            <h1 id="hero-title" className="mt-6 font-display font-black text-5xl sm:text-6xl md:text-7xl tracking-tight text-slate-900 leading-[0.95]">
              Making political information
              <span className="block bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 bg-clip-text text-transparent">
                easier to understand.
              </span>
            </h1>
            
            <p className="mt-8 text-lg sm:text-xl text-slate-600 leading-relaxed font-normal max-w-2xl">
              TrackMP is a global political transparency and accountability platform designed to help people research politicians, understand their public records, and follow political careers over time.
            </p>

            {/* Interactive CTA Buttons */}
            <div className="mt-8 flex flex-wrap gap-4">
              <a 
                href="/search" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.97] group"
              >
                <span>Explore the Data</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <a 
                href="#explore" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.97] group"
              >
                <span>Learn More</span>
                <svg className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </a>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {HASH_TAGS.map((tag, index) => (
                <span
                  key={index}
                  className={`text-xs px-3 py-1.5 rounded-full border backdrop-blur-sm font-medium transition-all duration-300 hover:scale-105 cursor-default ${
                    tag.variant === 'slate' ? 'bg-slate-100/80 text-slate-600 border-slate-200/50 hover:bg-slate-200/80' :
                    tag.variant === 'emerald' ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200/50 hover:bg-emerald-100/80' :
                    tag.variant === 'blue' ? 'bg-blue-50/80 text-blue-700 border-blue-200/50 hover:bg-blue-100/80' :
                    tag.variant === 'amber' ? 'bg-amber-50/80 text-amber-700 border-amber-200/50 hover:bg-amber-100/80' :
                    tag.variant === 'purple' ? 'bg-purple-50/80 text-purple-700 border-purple-200/50 hover:bg-purple-100/80' :
                    tag.variant === 'dark' ? 'bg-slate-900 text-white shadow-2xs hover:bg-slate-800' :
                    'bg-teal-50 text-teal-700 border-teal-200/50 hover:bg-teal-100/80'
                  }`}
                >
                  {tag.text}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* WHAT IS TRACKMP */}
        <section data-section="what-is" className="mb-24">
          <div className={`grid grid-cols-1 md:grid-cols-[1.15fr_0.85fr] gap-12 md:gap-14 items-start transition-all duration-1000 ${animatedSections['what-is'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2 flex items-center gap-2">
                <span className="w-6 h-0.5 bg-emerald-500 rounded-full"></span>
                What is TrackMP
              </span>
              <h2 className="font-display font-black text-3xl md:text-4xl text-slate-900 tracking-tight mb-6">
                Politics should be <span className="text-emerald-600">easier to research</span>.
              </h2>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>
                  Information about politicians is often spread across government records, election results, news reports, official statements, public documents, and other sources.
                </p>
                <p>
                  TrackMP aims to bring relevant public information together in a structured and accessible format, making it easier to understand the people who represent communities and participate in public life.
                </p>
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200/50">
                  <p className="text-sm text-emerald-800 font-medium">
                    💡 The goal is not simply to create another directory of politicians. TrackMP is being designed as a place where public records, political history, promises, elections, and other relevant information can be connected and followed over time.
                  </p>
                </div>
              </div>
            </div>

            <aside className="p-8 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-slate-200/60 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-2xl shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
                      🎯
                    </div>
                  </div>
                  <div>
                    <strong className="block text-xl text-slate-900 mb-3">Our goal</strong>
                    <p className="text-slate-600 leading-relaxed">
                      Help citizens move from scattered information to a clearer picture of a politician's public record.
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Always evolving
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* STATISTICAL SNAPSHOT */}
        <section aria-label="Platform Statistics" className="mb-24">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">/// Platform Impact</span>
            <h2 className="font-display font-black text-3xl md:text-4xl text-slate-900 tracking-tight">
              TrackMP <span className="text-emerald-600">by the numbers</span>
            </h2>
            <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
              Real-time metrics showing our commitment to transparency and accountability
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {STATS.map((stat, i) => (
              <AnimatedCounter
                key={i}
                target={stat.value === "12K+" ? 12000 : stat.value === "94%" ? 94 : stat.value === "847" ? 847 : 36}
                label={stat.label}
                color={stat.color}
                icon={stat.icon}
                ariaLabel={stat.ariaLabel}
              />
            ))}
          </div>
        </section>

        {/* WHAT YOU CAN EXPLORE */}
        <section id="explore" data-section="explore" aria-labelledby="explore-title" className="mb-24">
          <div className="mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-emerald-500 rounded-full"></span>
              Explore
            </span>
            <h2 id="explore-title" className="font-display font-black text-3xl md:text-4xl text-slate-900 tracking-tight">
              What you can <span className="text-emerald-600">explore</span>
            </h2>
            <p className="mt-3 text-lg text-slate-600 max-w-2xl">
              TrackMP is built around connected information rather than isolated facts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {EXPLORE_ITEMS.map((item, index) => (
              <div
                key={index}
                className={`group relative p-6 rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-100 shadow-sm hover:shadow-2xl hover:border-${item.color}-200/80 transition-all duration-500 hover:-translate-y-2 overflow-hidden card-glow cursor-default ${
                  animatedSections['explore'] ? 'animate-slide-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`absolute top-0 left-0 w-full h-1 bg-${item.color}-500 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className={`absolute -top-12 -right-12 w-32 h-32 bg-${item.color}-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700`} />
                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-3xl group-hover:scale-110 transition-transform duration-300 inline-block">
                      {item.icon}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      {item.number}
                    </div>
                  </div>
                  <h3 className={`font-display font-bold text-xl text-slate-900 mb-2 group-hover:text-${item.color}-700 transition-colors`}>
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                  <div className={`absolute bottom-3 right-3 w-12 h-12 bg-${item.color}-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700`} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section data-section="flow" aria-labelledby="flow-title" className="mb-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8 md:p-12 rounded-3xl relative overflow-hidden shadow-2xl shadow-slate-900/20">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500 animate-gradient" />
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          
          <div className="relative">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 block mb-2 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-emerald-400 rounded-full"></span>
              How It Works
            </span>
            <h2 id="flow-title" className="font-display font-black text-3xl md:text-4xl tracking-tight">
              From information to <span className="text-emerald-400">context</span>
            </h2>
            <p className="mt-3 text-slate-400 max-w-2xl">
              The value of TrackMP comes from connecting information that is often difficult to understand when viewed separately.
            </p>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6">
              {FLOW_STEPS.map((item, index) => (
                <div
                  key={index}
                  className={`group relative p-6 rounded-xl bg-white/5 border border-white/10 hover:border-${item.color}-400/50 transition-all duration-500 hover:bg-white/10 hover:-translate-y-1 cursor-default ${
                    animatedSections['flow'] ? 'animate-slide-up' : 'opacity-0'
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`absolute -top-3 left-4 px-2 bg-slate-800 text-xs font-bold text-${item.color}-400`}>
                    {item.step}
                  </div>
                  <div className="text-3xl mb-2 opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">
                    {item.icon}
                  </div>
                  <strong className="block text-sm leading-relaxed mt-2 group-hover:text-white transition-colors">
                    {item.title}
                  </strong>
                  <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-${item.color}-400/20 group-hover:h-1 transition-all duration-300`} />
                </div>
              ))}
            </div>

            <div className="mt-8 p-5 border-l-4 border-emerald-500 bg-white/5 rounded-r-xl text-slate-400 text-sm transition-all duration-300 hover:bg-white/10">
              <span className="text-emerald-400 font-semibold">💡 Note:</span> TrackMP is intended to help users investigate and understand public information. Information should be evaluated in context and checked against the underlying source material where possible.
            </div>
          </div>
        </section>

        {/* PRINCIPLES */}
        <section data-section="principles" aria-labelledby="principles-title" className="mb-24">
          <div className="mb-12 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">/// Core Values</span>
            <h2 id="principles-title" className="font-display font-black text-3xl md:text-4xl text-slate-900 tracking-tight">
              Principles behind <span className="text-emerald-600">TrackMP</span>
            </h2>
            <p className="mt-3 text-lg text-slate-600 max-w-2xl mx-auto">
              A transparency platform is only useful when the information is presented responsibly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRINCIPLES.map((principle, index) => (
              <div
                key={index}
                className={`group p-6 rounded-xl bg-white/90 backdrop-blur-sm border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 hover:border-emerald-200/50 cursor-default ${
                  animatedSections['principles'] ? 'animate-slide-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300 inline-block">
                  {principle.icon}
                </div>
                <h3 className="font-display font-bold text-lg text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors">
                  {principle.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">{principle.description}</p>
                <div className="mt-3 w-8 h-0.5 bg-emerald-500/30 group-hover:w-12 transition-all duration-300" />
              </div>
            ))}
          </div>
        </section>

        {/* VISION */}
        <section data-section="vision" aria-label="Vision" className="mb-24">
          <div className={`grid grid-cols-1 md:grid-cols-[1.15fr_0.85fr] gap-12 md:gap-14 items-start transition-all duration-1000 ${animatedSections['vision'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2 flex items-center gap-2">
                <span className="w-6 h-0.5 bg-emerald-500 rounded-full"></span>
                Our Vision
              </span>
              <h2 className="font-display font-black text-3xl md:text-4xl text-slate-900 tracking-tight mb-6">
                A <span className="text-emerald-600">global view</span> of political accountability.
              </h2>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>
                  TrackMP is being designed with a global scope. Over time, the platform can connect politicians with countries, political parties, elections, constituencies, public records, promises, and other political entities.
                </p>
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200/50">
                  <p className="text-sm text-blue-800 font-medium">
                    🚀 This connected approach can make TrackMP more than a collection of individual profiles. It can become a searchable public information layer for understanding political activity across countries and over time.
                  </p>
                </div>
              </div>
            </div>

            <aside className="p-8 rounded-2xl bg-gradient-to-br from-blue-50 via-white to-indigo-50 border border-slate-200/60 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-2xl shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                      🌍
                    </div>
                  </div>
                  <div>
                    <strong className="block text-xl text-slate-900 mb-3">Long-term vision</strong>
                    <p className="text-slate-600 leading-relaxed">
                      Build a structured, searchable, and source-aware record of public political information that helps people make better-informed decisions.
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-blue-600 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                      Building for the future
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* CTA / SUPPORT SECTION */}
        <section aria-labelledby="support-title" className="p-8 md:p-12 rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-blue-50 border border-slate-200/60 shadow-lg hover:shadow-2xl transition-all duration-500 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-400/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          
          <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 block mb-2 flex items-center gap-2">
                <span className="w-6 h-0.5 bg-emerald-500 rounded-full"></span>
                Get Started
              </span>
              <h2 id="support-title" className="font-display font-black text-2xl md:text-3xl text-slate-900 tracking-tight">
                Explore the <span className="text-emerald-600">public record</span>.
              </h2>
              <p className="mt-3 text-slate-600 leading-relaxed max-w-2xl">
                Research politicians, elections, promises, and political history through TrackMP.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <span className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-default">
                  ✨ 100% independent
                </span>
                <span className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors cursor-default">
                  🔒 No corporate funding
                </span>
                <span className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200 hover:bg-purple-100 transition-colors cursor-default">
                  ❤️ Citizen-powered
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-self-start md:justify-self-end">
              <a
                href="/search"
                className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-display font-bold uppercase text-xs tracking-wider rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-2xl hover:shadow-emerald-600/30 active:scale-[0.97] transition-all duration-300 whitespace-nowrap group hover:-translate-y-0.5"
              >
                <span>Explore TrackMP</span>
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <a
                href="/donate"
                className="inline-flex items-center justify-center px-6 py-4 bg-white hover:bg-slate-50 text-slate-700 font-display font-bold uppercase text-xs tracking-wider rounded-xl border border-slate-200 shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-300 whitespace-nowrap group hover:-translate-y-0.5"
              >
                <span>Support Us</span>
                <span className="ml-2 group-hover:scale-110 transition-transform inline-block">❤️</span>
              </a>
            </div>
          </div>
        </section>

        {/* FOOTER NOTE */}
        <div className="mt-12 pt-8 border-t border-slate-200/60 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400 font-mono">
          <span>© 2026 TrackMP. Public information, organized for transparency and research.</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live
            </span>
            <span className="text-slate-300">|</span>
            <span className="hover:text-slate-600 transition-colors cursor-default">v2.0</span>
          </div>
        </div>

      </main>
    </PublicLayout>
  );
}
