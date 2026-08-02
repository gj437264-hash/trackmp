import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import * as Tabs from "@radix-ui/react-tabs";
import {
  ArrowLeft,
  Save,
  ExternalLink,
  Search as SearchIcon,
  Share2,
  Braces,
  Loader2,
  Info,
} from "lucide-react";

import { getContentType } from "@/lib/seo/contentTypes";
import { getSEOConfig, saveSEOConfig, getContentItemDetail } from "@/lib/seo/seoApi";
import { validateSEOConfig, RANGES, getLengthStatus, isValidHttpUrl, isValidSlug } from "@/lib/seo/seoValidation";
import { SEOTemplateField, SEOPlainField } from "@/components/seo/SEOField";
import { SearchPreview } from "@/components/seo/SearchPreview";
import { SocialPreview } from "@/components/seo/SocialPreview";
import { SEOValidationPanel } from "@/components/seo/SEOValidationPanel";
import { StructuredDataEditor } from "@/components/seo/StructuredDataEditor";

const SITE_DOMAIN = "trackmp.com"; // TODO: source from env/config once available

export default function SEOEditor() {
  const { contentType: contentTypeKey, itemId } = useParams();
  const nav = useNavigate();
  const contentType = getContentType(contentTypeKey);

  const [item, setItem] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load the underlying content item (REAL endpoint) and its SEO config
  // (MOCKED endpoint — see lib/seo/seoApi.js) in parallel.
  const load = useCallback(async () => {
    if (!contentType) return;
    setLoading(true);
    try {
      const loadedItem = await getContentItemDetail(contentType.key, itemId);
      const loadedConfig = await getSEOConfig(contentType.key, itemId);

      setItem(loadedItem);
      setConfig(loadedConfig);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, [contentType, itemId]);

  useEffect(() => {
    load();
  }, [load]);

  const validation = useMemo(() => (config ? validateSEOConfig(config) : null), [config]);

  const updateBasic = (patch) => setConfig((c) => ({ ...c, basic: { ...c.basic, ...patch } }));
  const updateSocial = (section, patch) =>
    setConfig((c) => ({
      ...c,
      social: { ...c.social, [section]: { ...c.social[section], ...patch } },
    }));

  const save = async () => {
    setSaving(true);
    try {
      const saved = await saveSEOConfig(contentType.key, itemId, config);
      setConfig(saved);
      toast.success("SEO configuration saved.");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  if (!contentType) {
    return (
      <DashboardLayout>
        <div className="p-10 text-center text-slate-500">Unknown content type "{contentTypeKey}".</div>
      </DashboardLayout>
    );
  }

  if (loading || !config) {
    return (
      <DashboardLayout>
        <div className="p-12 flex items-center justify-center gap-3 text-slate-400">
          <Loader2 size={22} className="animate-spin" />
          <span className="text-xs font-bold uppercase tracking-wider">Loading SEO configuration...</span>
        </div>
      </DashboardLayout>
    );
  }

  const resolvedTitle = config.basic.title.is_custom
    ? config.basic.title.value
    : config.basic.title.generated_value;
  const resolvedDescription = config.basic.description.is_custom
    ? config.basic.description.value
    : config.basic.description.generated_value;
  const publicPath = contentType.getPublicPath(item);
  const canonicalDisplay = config.basic.canonical_url || `https://${SITE_DOMAIN}${publicPath}`;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            to={`/dashboard/seo?type=${contentType.key}`}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors mb-3"
          >
            <ArrowLeft size={16} />
            Back to {contentType.label}
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                {contentType.label.toUpperCase()} SEO
              </span>
              <h1 className="font-display font-bold text-3xl md:text-4xl text-slate-900 mt-2">
                {contentType.getItemLabel(item)}
              </h1>
              {contentType.hasPublicPage === false ? (
                <span
                  className="inline-flex items-center gap-1.5 text-sm text-slate-400 mt-1"
                  title="This content type doesn't have a live public page yet — you can still draft SEO metadata ahead of time."
                >
                  <ExternalLink size={14} /> Public page not built yet
                </span>
              ) : (
                <Link
                  to={publicPath}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600 mt-1"
                >
                  <ExternalLink size={14} /> View public page
                </Link>
              )}
            </div>
            <button
              onClick={save}
              disabled={saving}
              className="btn-soft-primary disabled:opacity-50 px-6 py-3 rounded-xl font-medium flex items-center gap-2"
              data-testid="save-seo-config"
            >
              <Save size={18} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
          {config.meta.is_mocked && (
            <div className="mt-4 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <Info size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                This data is stored locally for preview purposes only — the backend for SEO
                configuration hasn't been built yet, so nothing here persists across a page reload.
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* Main editor column */}
          <div>
            <Tabs.Root defaultValue="basic">
              <Tabs.List className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5 w-fit" aria-label="SEO sections">
                <TabTrigger value="basic" icon={SearchIcon} label="Basic SEO" />
                <TabTrigger value="social" icon={Share2} label="Social Sharing" />
                <TabTrigger value="structured" icon={Braces} label="Structured Data" />
              </Tabs.List>

              <Tabs.Content value="basic" className="space-y-5">
                <div className="soft-card p-5 space-y-5">
                  <SEOTemplateField
                    label="SEO Title"
                    hint="Recommended 30–60 characters — practical guidance, not a hard rule."
                    field={config.basic.title}
                    status={getLengthStatus(resolvedTitle, RANGES.title)}
                    maxLength={RANGES.title.hardMax}
                    onFieldChange={(nextField) => updateBasic({ title: nextField })}
                    testId="seo-title-field"
                  />
                  <SEOTemplateField
                    label="Meta Description"
                    hint="Recommended 70–160 characters — practical guidance, not a hard rule."
                    field={config.basic.description}
                    status={getLengthStatus(resolvedDescription, RANGES.description)}
                    maxLength={RANGES.description.hardMax}
                    multiline
                    onFieldChange={(nextField) => updateBasic({ description: nextField })}
                    testId="seo-description-field"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <SEOPlainField
                      label="Canonical URL"
                      placeholder={`https://${SITE_DOMAIN}${publicPath}`}
                      value={config.basic.canonical_url}
                      onChange={(v) => updateBasic({ canonical_url: v })}
                      status={
                        config.basic.canonical_url
                          ? isValidHttpUrl(config.basic.canonical_url)
                            ? "good"
                            : "invalid"
                          : "missing"
                      }
                      testId="seo-canonical-field"
                    />
                    <SEOPlainField
                      label="URL Slug"
                      placeholder="narendra-modi"
                      value={config.basic.slug}
                      onChange={(v) => updateBasic({ slug: v })}
                      status={
                        config.basic.slug ? (isValidSlug(config.basic.slug) ? "good" : "invalid") : "missing"
                      }
                      testId="seo-slug-field"
                    />
                  </div>

                  <div>
                    <span className="soft-label">Robots Directives</span>
                    <div className="flex gap-4 mt-2">
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={config.basic.robots.index}
                          onChange={(e) =>
                            updateBasic({ robots: { ...config.basic.robots, index: e.target.checked } })
                          }
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        Allow indexing
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={config.basic.robots.follow}
                          onChange={(e) =>
                            updateBasic({ robots: { ...config.basic.robots, follow: e.target.checked } })
                          }
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        Allow following links
                      </label>
                    </div>
                  </div>
                </div>
              </Tabs.Content>

              <Tabs.Content value="social" className="space-y-5">
                <div className="soft-card p-5 space-y-4">
                  <h3 className="font-display font-bold text-slate-800">Open Graph (Facebook, LinkedIn...)</h3>
                  <SEOPlainField
                    label="OG Title"
                    placeholder={resolvedTitle}
                    value={config.social.og.title}
                    onChange={(v) => updateSocial("og", { title: v })}
                    testId="og-title-field"
                  />
                  <SEOPlainField
                    label="OG Description"
                    placeholder={resolvedDescription}
                    value={config.social.og.description}
                    onChange={(v) => updateSocial("og", { description: v })}
                    testId="og-description-field"
                  />
                  <SEOPlainField
                    label="OG Image URL"
                    placeholder="https://.../image.jpg"
                    value={config.social.og.image_url}
                    onChange={(v) => updateSocial("og", { image_url: v })}
                    status={
                      config.social.og.image_url
                        ? isValidHttpUrl(config.social.og.image_url)
                          ? "good"
                          : "invalid"
                        : "missing"
                    }
                    testId="og-image-field"
                  />
                </div>

                <div className="soft-card p-5 space-y-4">
                  <h3 className="font-display font-bold text-slate-800">Twitter / X</h3>
                  <SEOPlainField
                    label="Twitter Title"
                    placeholder={config.social.og.title || resolvedTitle}
                    value={config.social.twitter.title}
                    onChange={(v) => updateSocial("twitter", { title: v })}
                    testId="twitter-title-field"
                  />
                  <SEOPlainField
                    label="Twitter Description"
                    placeholder={config.social.og.description || resolvedDescription}
                    value={config.social.twitter.description}
                    onChange={(v) => updateSocial("twitter", { description: v })}
                    testId="twitter-description-field"
                  />
                  <SEOPlainField
                    label="Twitter Image URL"
                    placeholder="https://.../image.jpg"
                    value={config.social.twitter.image_url}
                    onChange={(v) => updateSocial("twitter", { image_url: v })}
                    status={
                      config.social.twitter.image_url && !isValidHttpUrl(config.social.twitter.image_url)
                        ? "invalid"
                        : undefined
                    }
                    testId="twitter-image-field"
                  />
                </div>
              </Tabs.Content>

              <Tabs.Content value="structured">
                <StructuredDataEditor
                  contentType={contentType}
                  structuredData={config.structured_data}
                  onChange={(sd) => setConfig((c) => ({ ...c, structured_data: sd }))}
                />
              </Tabs.Content>
            </Tabs.Root>
          </div>

          {/* Right rail: previews + validation */}
          <div className="space-y-5">
            <SEOValidationPanel score={validation.score} issues={validation.issues} />
            <SearchPreview title={resolvedTitle} url={canonicalDisplay} description={resolvedDescription} />
            <SocialPreview
              title={config.social.og.title || resolvedTitle}
              description={config.social.og.description || resolvedDescription}
              imageUrl={config.social.og.image_url}
              domain={SITE_DOMAIN}
              platform="Facebook / LinkedIn"
            />
            <SocialPreview
              title={config.social.twitter.title || config.social.og.title || resolvedTitle}
              description={config.social.twitter.description || config.social.og.description || resolvedDescription}
              imageUrl={config.social.twitter.image_url || config.social.og.image_url}
              domain={SITE_DOMAIN}
              platform="Twitter / X"
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function TabTrigger({ value, icon: Icon, label }) {
  return (
    <Tabs.Trigger
      value={value}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      <Icon size={15} />
      {label}
    </Tabs.Trigger>
  );
}
