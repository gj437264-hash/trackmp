import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [invitation, setInvitation] = useState(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    if (!token) return;
    api
      .get(`/auth/invitation/${token}`)
      .then((r) => setInvitation(r.data))
      .catch((e) => setErr(formatApiError(e)));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (pw.length < 8) { setErr("Password must be at least 8 characters."); return; }
    if (pw !== pw2) { setErr("Passwords do not match."); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/auth/register-magic", { token, password: pw });
      setUser({ id: data.id, email: data.email, name: data.name, role: data.role });
      toast.success("Account activated.");
      nav("/", { replace: true });
    } catch (e2) {
      setErr(formatApiError(e2));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-slow mix-blend-multiply" />
        <div className="soft-card p-8 max-w-md relative">
          <h1 className="font-display font-black text-2xl text-slate-900">Missing Invitation Token</h1>
          <p className="mt-3 text-sm text-slate-600">The invitation link is malformed.</p>
          <Link to="/" className="btn-soft-primary mt-6 inline-flex">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-10 animate-fade-slide-up relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-slow mix-blend-multiply" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-slow [animation-delay:1s] mix-blend-multiply" />

      <div className="w-full max-w-md soft-card p-8 relative">
        <div className="soft-label mb-0">/// Activate Account</div>
        <h1 className="mt-2 font-display font-black text-3xl text-slate-900">Set Your Password</h1>
        {invitation ? (
          <p className="mt-3 text-sm text-slate-600">
            For <span className="font-bold font-mono text-slate-800">{invitation.email}</span> ({invitation.full_name})
          </p>
        ) : !err ? (
          <div className="mt-4 soft-label mb-0">Verifying invitation…</div>
        ) : null}

        {err && !invitation && (
          <div className="mt-4 border border-red-200 bg-red-50 rounded-2xl p-3 text-sm font-bold text-red-600">{err}</div>
        )}

        {invitation && (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="soft-label">New Password</label>
              <input
                data-testid="invite-password"
                type="password"
                required
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="soft-input"
                minLength={8}
              />
            </div>
            <div>
              <label className="soft-label">Confirm Password</label>
              <input
                data-testid="invite-password2"
                type="password"
                required
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                className="soft-input"
                minLength={8}
              />
            </div>
            {err && <div className="border border-red-200 bg-red-50 rounded-2xl p-3 text-sm font-bold text-red-600">{err}</div>}
            <button
              data-testid="invite-submit"
              disabled={busy}
              type="submit"
              className="btn-soft-primary w-full disabled:opacity-50"
            >
              {busy ? "Activating…" : "Activate Account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
