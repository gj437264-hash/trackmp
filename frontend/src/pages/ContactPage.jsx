import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/PublicLayout";
import { api, formatApiError } from "@/lib/api";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { loadRecaptcha, getRecaptchaToken } from "@/lib/recaptcha";

const empty = { first_name: "", last_name: "", email: "", country_code: "", subject: "", message: "" };

export default function ContactPage() {
  const [countries, setCountries] = useState([]);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [ticketNumber, setTicketNumber] = useState(null);

  useEffect(() => {
    loadRecaptcha().catch(() => {});
    api.get("/ref/countries").then((r) => setCountries(r.data.items || [])).catch(() => {});
  }, []);

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = "Required";
    if (!form.last_name.trim()) e.last_name = "Required";
    if (!form.email.trim()) e.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (!form.subject.trim()) e.subject = "Required";
    if (!form.message.trim()) e.message = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const captchaToken = await getRecaptchaToken("contact");
      const { data } = await api.post("/contact", {
        ...form,
        country_code: form.country_code || null,
        source_page: window.location.pathname,
        captcha_token: captchaToken,
      });
      setTicketNumber(data.ticket_number);
    } catch (e) {
      const msg = e?.message === "reCAPTCHA not loaded. Please refresh the page and try again."
        ? e.message
        : formatApiError(e);
      setErrors({ _global: msg });
    } finally {
      setBusy(false);
    }
  };

  if (ticketNumber) {
    return (
      <PublicLayout>
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <CheckCircle2 size={48} className="mx-auto text-emerald-600" />
          <h1 className="mt-6 font-display font-black text-3xl text-slate-900">Message Sent</h1>
          <p className="mt-3 text-slate-600">
            Thanks for reaching out. Your ticket number is
          </p>
          <div className="mt-2 font-mono text-2xl font-bold text-emerald-600" data-testid="ticket-number">{ticketNumber}</div>
          <p className="mt-4 text-sm text-slate-400">Keep this for reference if you follow up.</p>
          <Link to="/" className="btn-soft-primary inline-flex mt-8">
            <ArrowLeft size={16} className="mr-2" /> Back to Home
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-4 py-16">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
          /// Get in Touch
        </span>
        <h1 className="mt-4 font-display font-black text-4xl text-slate-900">Contact Us</h1>
        <p className="mt-3 text-slate-600">
          Questions, corrections, or feedback about the platform — we'd like to hear from you.
        </p>

        <form onSubmit={submit} className="mt-10 space-y-5">
          {errors._global && (
            <div className="border border-red-200 bg-red-50 text-red-600 text-sm rounded-2xl p-3">{errors._global}</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="soft-label">First Name *</label>
              <input
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="soft-input"
                data-testid="contact-first-name"
              />
              {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
            </div>
            <div>
              <label className="soft-label">Last Name *</label>
              <input
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="soft-input"
                data-testid="contact-last-name"
              />
              {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
            </div>
          </div>

          <div>
            <label className="soft-label">Email Address *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="soft-input"
              data-testid="contact-email"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="soft-label">Country</label>
            <select
              value={form.country_code}
              onChange={(e) => setForm({ ...form, country_code: e.target.value })}
              className="soft-input"
              data-testid="contact-country"
            >
              <option value="">Select country</option>
              {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="soft-label">Subject *</label>
            <input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="soft-input"
              data-testid="contact-subject"
            />
            {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
          </div>

          <div>
            <label className="soft-label">Message *</label>
            <textarea
              rows={6}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="soft-input"
              data-testid="contact-message"
            />
            {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message}</p>}
          </div>

          <button type="submit" disabled={busy} className="btn-soft-primary disabled:opacity-50" data-testid="contact-submit">
            {busy ? "Sending…" : "Send Message"}
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
      </div>
    </PublicLayout>
  );
}
