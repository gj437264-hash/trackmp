import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SignupPage() {
  const [countries, setCountries] = useState([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    api.get("/ref/countries").then((r) => setCountries(r.data.items || []));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api.post("/signup-requests", {
        full_name: fullName.trim(),
        email: email.trim(),
        country_code: country,
      });
      toast.success("Request submitted.");
      nav("/thank-you", { replace: true });
    } catch (e2) {
      const msg = formatApiError(e2);
      setErr(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-surfaceAlt flex items-center justify-center px-4 py-10 animate-fade-slide-up">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-6">
          <span className="w-8 h-8 bg-klein grid place-items-center text-white font-black">T</span>
          <span className="font-display font-black text-xl uppercase">TrackMP</span>
        </Link>
        <div className="brutal-card p-8">
          <div className="label-eyebrow">/// Request Access</div>
          <h1 className="mt-2 font-display font-black text-3xl md:text-4xl uppercase tracking-tighter">
            Get On The Ledger
          </h1>
          <p className="mt-3 text-sm text-neutral-700">
            All access is moderated. Submit a request and an administrator will review it.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label-eyebrow block mb-2">Full Name</label>
              <input
                data-testid="signup-name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="brutal-input"
                maxLength={200}
              />
            </div>
            <div>
              <label className="label-eyebrow block mb-2">Email</label>
              <input
                data-testid="signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="brutal-input"
              />
            </div>
            <div>
              <label className="label-eyebrow block mb-2">Country</label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger data-testid="signup-country" className="brutal-input">
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
              <div className="border-2 border-danger bg-danger/10 p-3 text-sm font-bold text-danger" data-testid="signup-error">
                {err}
              </div>
            )}
            <button
              type="submit"
              disabled={busy || !country}
              className="brutal-btn-primary w-full disabled:opacity-50"
              data-testid="signup-submit"
            >
              {busy ? "Submitting…" : "Submit Request"}
            </button>
          </form>
          <div className="mt-6 pt-6 border-t-2 border-black text-sm">
            Already approved?{" "}
            <Link to="/login" className="font-bold underline hover:text-klein">
              Sign in →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
