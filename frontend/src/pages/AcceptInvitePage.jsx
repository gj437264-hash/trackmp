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
      <div className="min-h-screen bg-surfaceAlt flex items-center justify-center px-4">
        <div className="brutal-card p-8 max-w-md">
          <h1 className="font-display font-black text-2xl uppercase">Missing Invitation Token</h1>
          <p className="mt-3 text-sm text-neutral-700">The invitation link is malformed.</p>
          <Link to="/" className="brutal-btn-primary mt-6 inline-flex">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surfaceAlt flex items-center justify-center px-4 py-10 animate-fade-slide-up">
      <div className="w-full max-w-md brutal-card p-8">
        <div className="label-eyebrow">/// Activate Account</div>
        <h1 className="mt-2 font-display font-black text-3xl uppercase tracking-tighter">Set Your Password</h1>
        {invitation ? (
          <p className="mt-3 text-sm">
            For <span className="font-bold font-mono">{invitation.email}</span> ({invitation.full_name})
          </p>
        ) : !err ? (
          <div className="mt-4 label-eyebrow">Verifying invitation…</div>
        ) : null}

        {err && !invitation && (
          <div className="mt-4 border-2 border-danger bg-danger/10 p-3 text-sm font-bold text-danger">{err}</div>
        )}

        {invitation && (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label-eyebrow block mb-2">New Password</label>
              <input
                data-testid="invite-password"
                type="password"
                required
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="brutal-input"
                minLength={8}
              />
            </div>
            <div>
              <label className="label-eyebrow block mb-2">Confirm Password</label>
              <input
                data-testid="invite-password2"
                type="password"
                required
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                className="brutal-input"
                minLength={8}
              />
            </div>
            {err && <div className="border-2 border-danger bg-danger/10 p-3 text-sm font-bold text-danger">{err}</div>}
            <button
              data-testid="invite-submit"
              disabled={busy}
              type="submit"
              className="brutal-btn-primary w-full disabled:opacity-50"
            >
              {busy ? "Activating…" : "Activate Account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
