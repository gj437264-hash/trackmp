import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-surfaceAlt flex items-center justify-center px-4 py-10 animate-fade-slide-up">
      <div className="w-full max-w-lg brutal-card p-10 text-center">
        <div className="mx-auto w-16 h-16 border-2 border-black bg-klein text-white grid place-items-center">
          <CheckCircle2 size={32} strokeWidth={2.5} />
        </div>
        <div className="label-eyebrow mt-6">/// Request Received</div>
        <h1 className="mt-3 font-display font-black text-4xl uppercase tracking-tighter">
          Thank You.
        </h1>
        <p className="mt-4 text-neutral-700 leading-relaxed">
          Your request is now in our moderation queue. When an administrator approves it,
          you&apos;ll receive an invitation email with a magic link to activate your account
          (valid for 24 hours).
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="brutal-btn-secondary" data-testid="ty-home">Browse the Directory</Link>
          <Link to="/login" className="brutal-btn-primary" data-testid="ty-login">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
