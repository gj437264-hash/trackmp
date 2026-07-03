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
    <div className="min-h-screen bg-surfaceAlt grid place-items-center px-4 py-10">
      <div className="w-full max-w-md brutal-card p-8">
        <div className="label-eyebrow">/// Recovery</div>
        <h1 className="mt-2 font-display font-black text-3xl uppercase tracking-tighter">Reset Password</h1>
        {done ? (
          <div className="mt-6">
            <p className="text-sm">If an account exists, a reset link has been sent.</p>
            <Link to="/login" className="brutal-btn-primary mt-6 w-full">Back to Sign In</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label-eyebrow block mb-2">Email</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="brutal-input" data-testid="forgot-email" />
            </div>
            <button disabled={busy} className="brutal-btn-primary w-full disabled:opacity-50" data-testid="forgot-submit">
              {busy ? "Sending…" : "Send Reset Link"}
            </button>
            <Link to="/login" className="block text-center text-xs font-bold uppercase mt-2 hover:text-klein">Back</Link>
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

  if (!token) return <div className="p-8">Missing token.</div>;

  return (
    <div className="min-h-screen bg-surfaceAlt grid place-items-center px-4 py-10">
      <div className="w-full max-w-md brutal-card p-8">
        <div className="label-eyebrow">/// New Password</div>
        <h1 className="mt-2 font-display font-black text-3xl uppercase tracking-tighter">Set New Password</h1>
        {done ? (
          <div className="mt-6">
            <p className="text-sm">Password updated. You can now sign in.</p>
            <Link to="/login" className="brutal-btn-primary mt-6 w-full">Sign In</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div><label className="label-eyebrow block mb-2">New Password</label>
              <input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} className="brutal-input" /></div>
            <div><label className="label-eyebrow block mb-2">Confirm</label>
              <input type="password" required minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} className="brutal-input" /></div>
            {err && <div className="border-2 border-danger bg-danger/10 p-3 text-sm font-bold text-danger">{err}</div>}
            <button disabled={busy} className="brutal-btn-primary w-full disabled:opacity-50">
              {busy ? "Updating…" : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
