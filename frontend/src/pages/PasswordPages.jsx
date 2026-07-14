import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setDone(true);
    } catch (e2) { toast.error(formatApiError(e2)); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-white grid place-items-center px-4 py-10 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-slow mix-blend-multiply" />
      <div className="w-full max-w-md soft-card p-8 relative">
        <div className="soft-label mb-0">/// Recovery</div>
        <h1 className="mt-2 font-display font-black text-3xl text-slate-900">Reset Password</h1>
        {done ? (
          <div className="mt-6">
            <p className="text-sm text-slate-600">If an account exists, a reset link has been sent.</p>
            <Link to="/login" className="btn-soft-primary mt-6 w-full">Back to Sign In</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="soft-label">Email</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="soft-input" data-testid="forgot-email" />
            </div>
            <button disabled={busy} className="btn-soft-primary w-full disabled:opacity-50" data-testid="forgot-submit">
              {busy ? "Sending…" : "Send Reset Link"}
            </button>
            <Link to="/login" className="block text-center text-xs font-bold uppercase mt-2 text-slate-500 hover:text-emerald-600 transition-colors">Back</Link>
          </form>
        )}
      </div>
    </div>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (pw.length < 8) return setErr("Password must be 8+ characters.");
    if (pw !== pw2) return setErr("Passwords don't match.");
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, password: pw });
      setDone(true);
    } catch (e2) { setErr(formatApiError(e2)); }
    finally { setBusy(false); }
  };

  if (!token) return <div className="p-8 text-slate-600">Missing token.</div>;

  return (
    <div className="min-h-screen bg-white grid place-items-center px-4 py-10 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-slow mix-blend-multiply" />
      <div className="w-full max-w-md soft-card p-8 relative">
        <div className="soft-label mb-0">/// New Password</div>
        <h1 className="mt-2 font-display font-black text-3xl text-slate-900">Set New Password</h1>
        {done ? (
          <div className="mt-6">
            <p className="text-sm text-slate-600">Password updated. You can now sign in.</p>
            <Link to="/login" className="btn-soft-primary mt-6 w-full">Sign In</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div><label className="soft-label">New Password</label>
              <input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} className="soft-input" /></div>
            <div><label className="soft-label">Confirm</label>
              <input type="password" required minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} className="soft-input" /></div>
            {err && <div className="border border-red-200 bg-red-50 rounded-2xl p-3 text-sm font-bold text-red-600">{err}</div>}
            <button disabled={busy} className="btn-soft-primary w-full disabled:opacity-50">
              {busy ? "Updating…" : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
