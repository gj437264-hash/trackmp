// Overview.jsx — critical path. Kept eager (not lazy) since this is core SEO/textual content.
import React from "react";
import { Link } from "react-router-dom";
import {
  Zap, Mail, Phone, Globe, ExternalLink, Heart, Twitter, Facebook,
  Instagram, Youtube, AwardIcon, Briefcase, MapPin,
} from "lucide-react";
import { ensureUrl } from "./utils";

export default function Overview({ p }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section aria-labelledby="profile-details-heading" className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/30 transition-all hover:shadow-2xl">
          <h2 id="profile-details-heading" className="font-display font-bold text-2xl text-slate-900 flex items-center gap-2.5">
            <Zap className="text-indigo-600" size={24} aria-hidden="true" /> Profile Details
          </h2>
          <dl className="mt-6 grid grid-cols-1 gap-4 text-sm">
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Education</dt>
              <dd className="mt-1.5 text-slate-900 font-semibold text-base">{p.education || "—"}</dd>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Profession</dt>
              <dd className="mt-1.5 text-slate-900 font-semibold text-base">{p.profession || "—"}</dd>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Tags</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {p.tags?.length
                  ? p.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100 shadow-sm">
                        {tag}
                      </span>
                    ))
                  : <span className="text-slate-500">—</span>}
              </dd>
            </div>
          </dl>
        </section>

        {(p.contact_email || p.contact_phone || p.official_website) && (
          <section aria-labelledby="contact-heading" className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/30 transition-all hover:shadow-2xl">
            <h2 id="contact-heading" className="font-display font-bold text-2xl text-slate-900 flex items-center gap-2.5">
              <Mail className="text-indigo-600" size={24} aria-hidden="true" /> Contact Information
            </h2>
            <div className="mt-6 space-y-3 text-sm">
              {p.contact_email && (
                <a
                  href={`mailto:${p.contact_email}`}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-100 hover:bg-indigo-50/80 hover:border-indigo-200 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 group-hover:scale-110 transition-transform">
                    <Mail size={16} aria-hidden="true" />
                  </div>
                  <span className="text-slate-700 font-medium group-hover:text-indigo-700 break-all">{p.contact_email}</span>
                </a>
              )}
              {p.contact_phone && (
                <a
                  href={`tel:${p.contact_phone}`}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-100 hover:bg-indigo-50/80 hover:border-indigo-200 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 group-hover:scale-110 transition-transform">
                    <Phone size={16} aria-hidden="true" />
                  </div>
                  <span className="text-slate-700 font-medium group-hover:text-indigo-700">{p.contact_phone}</span>
                </a>
              )}
              {p.official_website && (
                <a
                  href={ensureUrl(p.official_website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-100 hover:bg-indigo-50/80 hover:border-indigo-200 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 group-hover:scale-110 transition-transform">
                      <Globe size={16} aria-hidden="true" />
                    </div>
                    <span className="text-slate-700 font-medium group-hover:text-indigo-700">Official Website</span>
                  </div>
                  <ExternalLink size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" aria-hidden="true" />
                </a>
              )}
            </div>
          </section>
        )}
      </div>

      {p.social_links && (p.social_links.twitter || p.social_links.facebook || p.social_links.instagram || p.social_links.youtube) && (
        <section aria-labelledby="social-heading" className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/30">
          <h2 id="social-heading" className="font-display font-bold text-2xl text-slate-900 flex items-center gap-2.5">
            <Heart className="text-pink-600" size={24} aria-hidden="true" /> Social Media Channels
          </h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {p.social_links.twitter && (
              <a
                href={ensureUrl(p.social_links.twitter)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 border border-slate-200/80 rounded-2xl px-5 py-3 font-bold uppercase text-xs text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Twitter size={16} className="text-indigo-500 shrink-0" aria-hidden="true" /> Twitter / X
              </a>
            )}
            {p.social_links.facebook && (
              <a
                href={ensureUrl(p.social_links.facebook)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 border border-slate-200/80 rounded-2xl px-5 py-3 font-bold uppercase text-xs text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Facebook size={16} className="text-blue-600 shrink-0" aria-hidden="true" /> Facebook
              </a>
            )}
            {p.social_links.instagram && (
              <a
                href={ensureUrl(p.social_links.instagram)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 border border-slate-200/80 rounded-2xl px-5 py-3 font-bold uppercase text-xs text-slate-700 hover:bg-pink-50 hover:border-pink-300 hover:text-pink-700 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                <Instagram size={16} className="text-pink-600 shrink-0" aria-hidden="true" /> Instagram
              </a>
            )}
            {p.social_links.youtube && (
              <a
                href={ensureUrl(p.social_links.youtube)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 border border-slate-200/80 rounded-2xl px-5 py-3 font-bold uppercase text-xs text-slate-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <Youtube size={16} className="text-red-600 shrink-0" aria-hidden="true" /> YouTube
              </a>
            )}
          </div>
        </section>
      )}

      {(p.party_history || []).length > 0 && (
        <section aria-labelledby="party-history-heading" className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/30">
          <h2 id="party-history-heading" className="font-display font-bold text-2xl text-slate-900 flex items-center gap-2.5">
            <AwardIcon className="text-amber-600" size={24} aria-hidden="true" /> Party History
          </h2>
          <ol className="mt-6 space-y-4">
            {p.party_history.map((ph, i) => (
              <li key={ph.id} className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50/80 transition-colors border border-transparent hover:border-slate-100">
                <div className="flex flex-col items-center pt-1.5" aria-hidden="true">
                  <div className={`w-3.5 h-3.5 rounded-full ${ph.end_date ? "bg-slate-300" : "bg-emerald-500 ring-4 ring-emerald-100"} shadow-sm`} />
                  {i < p.party_history.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 my-1" />}
                </div>
                <div className="pb-2 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-base text-slate-900">{ph.party}</span>
                    {!ph.end_date && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-sm">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-slate-500 mt-1">
                    {ph.start_date || "—"} → {ph.end_date || "Present"}
                  </p>
                  {ph.note && <p className="text-sm text-slate-700 mt-2 leading-relaxed">{ph.note}</p>}
                  {ph.source_url && (
                    <a
                      href={ensureUrl(ph.source_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1.5 mt-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                    >
                      Source Reference <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {(p.position_history || []).length > 0 && (
        <section aria-labelledby="position-history-heading" className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/30">
          <h2 id="position-history-heading" className="font-display font-bold text-2xl text-slate-900 flex items-center gap-2.5">
            <Briefcase className="text-blue-600" size={24} aria-hidden="true" /> Position & Office History
          </h2>
          <ol className="mt-6 space-y-4">
            {p.position_history.map((ph) => {
              const location = [ph.constituency_name, ph.city_name, ph.state_name, ph.country_name].filter(Boolean).join(", ");
              return (
                <li key={ph.id} className="border-b border-slate-100 last:border-b-0 pb-4 last:pb-0 p-4 rounded-2xl hover:bg-slate-50/80 transition-colors border border-transparent hover:border-slate-100">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-base text-slate-900">{ph.position}</span>
                    {ph.party && <span className="text-sm text-slate-600 font-medium">· {ph.party}</span>}
                    {ph.is_current && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-sm">
                        Current
                      </span>
                    )}
                  </div>
                  {location && (
                    <p className="flex items-center gap-1.5 text-sm text-slate-700 mt-1.5">
                      <MapPin size={14} className="text-indigo-500 shrink-0" aria-hidden="true" /> {location}
                    </p>
                  )}
                  <p className="text-xs font-mono text-slate-500 mt-1">
                    {ph.start_date || "—"} → {ph.end_date || (ph.is_current ? "Present" : "—")}
                    {ph.election_year && ` · Elected ${ph.election_year}`}
                  </p>
                  {ph.note && <p className="text-sm text-slate-700 mt-2 leading-relaxed">{ph.note}</p>}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {p.bio_text_summary && (
        <section aria-labelledby="bio-summary-heading" className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/30">
          <h2 id="bio-summary-heading" className="font-display font-bold text-2xl text-slate-900">Biography Summary</h2>
          <p className="mt-4 text-slate-700 leading-relaxed text-base">{p.bio_text_summary}</p>
          <Link
            to="#tab-bio"
            className="text-sm font-bold text-indigo-600 hover:text-indigo-800 mt-4 inline-flex items-center gap-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
          >
            Read full biography and media →
          </Link>
        </section>
      )}
    </div>
  );
}
