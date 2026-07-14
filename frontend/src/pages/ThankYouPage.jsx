import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-10 animate-fade-slide-up relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-slow mix-blend-multiply" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-slow [animation-delay:1s] mix-blend-multiply" />

      <div className="w-full max-w-lg soft-card p-10 text-center relative">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white grid place-items-center shadow-soft-emerald">
          <CheckCircle2 size={32} strokeWidth={2.5} />
        </div>
        <div className="soft-label mt-6 mb-0">/// Request Received</div>
        <h1 className="mt-3 font-display font-black text-4xl text-slate-900">
          Thank You.
        </h1>
        <p className="mt-4 text-slate-600 leading-relaxed">
          Your request is now in our moderation queue. When an administrator approves it,
          you&apos;ll receive an invitation email with a magic link to activate your account
          (valid for 24 hours).
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="btn-soft-secondary" data-testid="ty-home">Browse the Directory</Link>
          <Link to="/login" className="btn-soft-primary" data-testid="ty-login">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
