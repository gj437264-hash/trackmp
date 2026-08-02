import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, UserCog, ClipboardCheck, ArrowRight, ScanSearch } from "lucide-react";
import { loadRecaptcha, getRecaptchaToken } from "@/lib/recaptcha";

export default function SignupPage() {
  const [countries, setCountries] = useState([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    loadRecaptcha().catch(() => {});
    api.get("/ref/countries").then((r) => setCountries(r.data.items || []));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const captchaToken = await getRecaptchaToken("signup");

      await api.post("/signup-requests", {
        full_name: fullName.trim(),
        email: email.trim(),
        country_code: country,
        captcha_token: captchaToken,
      });
      toast.success("Request submitted.");
      nav("/thank-you", { replace: true });
    } catch (e2) {
      const msg = e2?.message === "reCAPTCHA not loaded. Please refresh the page and try again."
        ? e2.message
        : formatApiError(e2);
      setErr(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-10 animate-fade-slide-up relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-slow mix-blend-multiply" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-slow [animation-delay:1s] mix-blend-multiply" />

      <div className="w-full max-w-5xl relative">
        <Link to="/" className="flex items-center gap-2 mb-6">
          <span className="w-8 h-8 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl grid place-items-center text-white font-black shadow-soft-emerald">T</span>
          <span className="font-display font-black text-xl text-slate-800">TrackMP</span>
        </Link>

        <div className="soft-card p-0 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
            {/* Left: context & mission */}
            <div className="p-8 lg:p-10 lg:border-r border-slate-200">
              <div className="soft-label mb-0">/// Join the Team</div>
              <h1 className="mt-2 font-display font-black text-3xl md:text-4xl text-slate-900">
                Help Keep the Record Honest
              </h1>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                TrackMP is built and maintained by people who care about accountability — not by a
                newsroom or a government agency. If you're willing to help research, verify, and
                maintain politician records, we'd like to have you on the team.
              </p>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                This request grants <span className="font-bold text-slate-800">Moderator access</span> to
                the dashboard. Moderators are the reason the platform stays trustworthy — you'll help make
                sure every update follows our content rules, that claims are backed by a real source, and
                that the record stays accurate and transparent for everyone who relies on it.
              </p>

              <div className="mt-6 space-y-3 rounded-2xl bg-slate-50/80 border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <UserCog size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-800">Real dashboard access.</span> Create and edit
                    politician profiles, positions, and wealth history once you're approved.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <ScanSearch size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-800">Verify before you publish.</span> Moderators
                    check that submitted data follows platform rules and is backed by a credible source
                    before it goes live.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <ClipboardCheck size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-800">A quick human review.</span> We check every
                    request ourselves — it's not instant, but genuine interest goes a long way.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-800">Your edits, credited.</span> Everything you
                    contribute is logged and attributed to you in our audit trail.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200 hidden lg:block">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Just want to flag something you noticed — a missing politician or an outdated fact —
                  without requesting Moderator access? You can{" "}
                  <Link to="/submit-update" className="font-bold text-emerald-600 hover:text-emerald-700 underline inline-flex items-center gap-1">
                    submit an update
                    <ArrowRight size={12} />
                  </Link>{" "}
                  instead. No approval needed, and it still helps.
                </p>
              </div>
            </div>

            {/* Right: the form */}
            <div className="p-8 lg:p-10 bg-slate-50/40">
              <h2 className="font-display font-bold text-xl text-slate-800">Request Moderator Access</h2>
              <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                  <label className="soft-label">Full Name</label>
                  <input
                    data-testid="signup-name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="soft-input"
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="soft-label">Email</label>
                  <input
                    data-testid="signup-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="soft-input"
                  />
                  <p className="mt-1.5 text-[11px] text-slate-400">We'll send your decision and, if approved, an activation link here.</p>
                </div>
                <div>
                  <label className="soft-label">Country</label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger data-testid="signup-country" className="soft-input">
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {countries.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {err && (
                  <div className="border border-red-200 bg-red-50 rounded-2xl p-3 text-sm font-bold text-red-600" data-testid="signup-error">
                    {err}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={busy || !country}
                  className="btn-soft-primary w-full disabled:opacity-50"
                  data-testid="signup-submit"
                >
                  {busy ? "Submitting…" : "Request Moderator Access"}
                </button>

                <p className="text-[11px] text-slate-400 text-center">
                  This site is protected by reCAPTCHA and the Google{" "}
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="underline">
                    Privacy Policy
                  </a>{" "}
                  and{" "}
                  <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="underline">
                    Terms of Service
                  </a>{" "}
                  apply.
                </p>
              </form>

              {/* Lower-commitment alternative — mobile only, since desktop shows it on the left panel */}
              <div className="mt-6 pt-6 border-t border-slate-200 lg:hidden">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Just want to flag something you noticed, without requesting Moderator access? You can{" "}
                  <Link to="/submit-update" className="font-bold text-emerald-600 hover:text-emerald-700 underline inline-flex items-center gap-1">
                    submit an update
                    <ArrowRight size={12} />
                  </Link>{" "}
                  instead.
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200 text-sm text-slate-600">
                Already approved?{" "}
                <Link to="/login" className="font-bold underline text-emerald-600 hover:text-emerald-700">
                  Sign in →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
