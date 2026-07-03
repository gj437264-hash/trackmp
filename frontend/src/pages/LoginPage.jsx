import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

const SOCIALS = [
  { id: "google", label: "Google", svg: <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg> },
  { id: "facebook", label: "Facebook", svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12a12 12 0 1 0-13.88 11.86v-8.39H7.08V12h3.04V9.36c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.95.93-1.95 1.88V12h3.32l-.53 3.47h-2.79v8.39A12 12 0 0 0 24 12z"/></svg> },
  { id: "apple", label: "Apple", svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="#000"><path d="M16.365 1.43c0 1.14-.42 2.22-1.19 3.05-.85.9-2.16 1.6-3.41 1.5-.13-1.12.41-2.29 1.16-3.05.83-.87 2.25-1.5 3.44-1.5zM20.5 17.5c-.35.79-.53 1.15-.98 1.85-.63.96-1.51 2.16-2.6 2.17-.97.01-1.22-.63-2.54-.62-1.32 0-1.6.62-2.57.63-1.09.01-1.92-1.08-2.55-2.04-1.75-2.67-1.94-5.8-.86-7.46.77-1.18 1.98-1.87 3.12-1.87 1.16 0 1.89.63 2.85.63.93 0 1.5-.63 2.84-.63 1.02 0 2.1.56 2.87 1.52-2.52 1.38-2.11 4.99.42 5.82z"/></svg> },
  { id: "microsoft", label: "Microsoft", svg: <svg width="18" height="18" viewBox="0 0 23 23"><path fill="#F35325" d="M0 0h11v11H0z"/><path fill="#81BC06" d="M12 0h11v11H12z"/><path fill="#05A6F0" d="M0 12h11v11H0z"/><path fill="#FFBA08" d="M12 12h11v11H12z"/></svg> },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      const target = from || (["super_admin", "admin"].includes(user.role) ? "/dashboard" : "/");
      nav(target, { replace: true });
    }
  }, [user, from, nav]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await login(email.trim(), password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      toast.error(res.error);
    } else {
      toast.success("Welcome back.");
    }
  };

  return (
    <div className="min-h-screen bg-surfaceAlt flex items-center justify-center px-4 py-10 animate-fade-slide-up">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-6" data-testid="brand-link-login">
          <span className="w-8 h-8 bg-klein grid place-items-center text-white font-black">T</span>
          <span className="font-display font-black text-xl uppercase">TrackMP</span>
        </Link>
        <div className="brutal-card p-8">
          <div className="label-eyebrow">/// Access Console</div>
          <h1 className="mt-2 font-display font-black text-3xl md:text-4xl uppercase tracking-tighter">
            Sign In
          </h1>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label-eyebrow block mb-2">Email</label>
              <input
                data-testid="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="brutal-input"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label-eyebrow block mb-2">Password</label>
              <input
                data-testid="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="brutal-input"
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div data-testid="login-error" className="border-2 border-danger bg-danger/10 p-3 text-sm font-bold text-danger">
                {error}
              </div>
            )}
            <button
              data-testid="login-submit"
              type="submit"
              disabled={busy}
              className="brutal-btn-primary w-full disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-[2px] bg-black" />
            <div className="label-eyebrow">Or continue with</div>
            <div className="flex-1 h-[2px] bg-black" />
          </div>

          <TooltipProvider>
            <div className="grid grid-cols-4 gap-2 mt-4">
              {SOCIALS.map((s) => (
                <Tooltip key={s.id}>
                  <TooltipTrigger asChild>
                    <button
                      data-testid={`social-${s.id}`}
                      disabled
                      className="border-2 border-black h-12 grid place-items-center opacity-50 cursor-not-allowed grayscale bg-white"
                      aria-label={`Sign in with ${s.label} — coming soon`}
                    >
                      {s.svg}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="rounded-none border-2 border-black bg-black text-white font-bold uppercase text-xs">
                    {s.label} — Coming Soon
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>

          <div className="mt-6 pt-6 border-t-2 border-black flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="font-bold uppercase text-xs tracking-wider hover:text-klein" data-testid="forgot-password-link">
              Forgot Password?
            </Link>
            <Link to="/signup" className="font-bold uppercase text-xs tracking-wider hover:text-klein" data-testid="signup-link">
              Request Access →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
