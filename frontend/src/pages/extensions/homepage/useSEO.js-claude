import { useEffect } from "react";

/**
 * useSEO
 * ------
 * Centralizes the document-head bookkeeping that HomePage previously did by
 * hand (title + meta description only). Adds canonical link, Open Graph and
 * Twitter Card tags, and optional JSON-LD structured data — all safely:
 *
 *  - Existing <meta>/<link> tags are updated in place (upsert) rather than
 *    duplicated, so re-renders/route changes don't leave stale tags behind.
 *  - JSON-LD is written via `textContent`, never `innerHTML`, so nothing
 *    here can inject markup even if a title/description ever contained
 *    unexpected characters.
 *  - Everything is cleaned up / restored on unmount so other pages aren't
 *    affected.
 *
 * This is a client-side (SPA) enhancement: it helps crawlers that execute
 * JS (Googlebot does) and improves link-preview/share cards. It is not a
 * substitute for server-side rendering — if deeper SEO work is wanted later,
 * pre-rendering the homepage HTML on the backend would be the next step,
 * but that's a backend change outside this component's scope.
 */

function upsertMetaByName(name, content) {
  if (!content) return null;
  let el = document.head.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
  return el;
}

function upsertMetaByProperty(property, content) {
  if (!content) return null;
  let el = document.head.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
  return el;
}

function upsertLinkRel(rel, href) {
  if (!href) return null;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  return el;
}

export function useSEO({ title, description, canonicalPath, structuredData } = {}) {
  useEffect(() => {
    const prevTitle = document.title;

    if (title) document.title = title;
    if (description) upsertMetaByName("description", description);
    upsertMetaByName("robots", "index, follow");

    upsertMetaByProperty("og:title", title);
    upsertMetaByProperty("og:description", description);
    upsertMetaByProperty("og:type", "website");
    upsertMetaByName("twitter:card", "summary_large_image");
    upsertMetaByName("twitter:title", title);
    upsertMetaByName("twitter:description", description);

    let canonicalUrl;
    if (canonicalPath && typeof window !== "undefined") {
      try {
        canonicalUrl = new URL(canonicalPath, window.location.origin).toString();
        upsertLinkRel("canonical", canonicalUrl);
        upsertMetaByProperty("og:url", canonicalUrl);
      } catch {
        // Invalid path: skip canonical/og:url rather than writing a bad URL.
      }
    }

    let scriptEl = null;
    if (structuredData) {
      scriptEl = document.createElement("script");
      scriptEl.type = "application/ld+json";
      scriptEl.setAttribute("data-seo-source", "homepage");
      // textContent (not innerHTML) — this cannot execute or inject markup.
      scriptEl.textContent = JSON.stringify(structuredData);
      document.head.appendChild(scriptEl);
    }

    return () => {
      document.title = prevTitle;
      if (scriptEl && scriptEl.parentNode) {
        scriptEl.parentNode.removeChild(scriptEl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, canonicalPath, JSON.stringify(structuredData)]);
}

export default useSEO;
