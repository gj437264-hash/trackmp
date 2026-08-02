import { UserSquare2, Globe2, Newspaper, FileText } from "lucide-react";

/**
 * SEO Content Type Registry
 * -----------------------------------------------------------------------
 * This is the ONLY place "politicians" is wired into the SEO Management
 * feature. To support a new content type later (countries, parties,
 * elections, articles, ...), add one entry here — no other SEO component
 * needs to change.
 *
 * Each entry describes:
 *  - how to search/list items of that type (reuses REAL existing endpoints
 *    where possible, e.g. /admin/politicians)
 *  - how to read/write SEO config for that type (MOCKED for now — see
 *    lib/seo/seoApi.js — backend does not exist yet)
 *  - how to render an item in search results and previews
 *  - default metadata templates (for the "generated automatically" state)
 */
export const CONTENT_TYPES = {
  politicians: {
    key: "politicians",
    label: "Politicians",
    icon: UserSquare2,

    // REAL: reuses the existing admin politicians list endpoint, which
    // supports real server-side search AND real server-side pagination
    // (see PoliticiansList.jsx — it sends q/page/limit and trusts the
    // returned total).
    searchEndpoint: "/admin/politicians",
    serverSideQuery: true,
    serverSidePagination: true,

    // REAL: reuses the existing single-item endpoint (same one
    // PoliticianForm.jsx already calls) so the SEO editor can show the
    // item's name/role/etc. without duplicating any data-fetching logic.
    getDetailEndpoint: (itemId) => `/admin/politicians/${itemId}`,

    // MOCKED for now (see seoApi.js). This is the endpoint shape the
    // backend should eventually implement — see Section 9 of the writeup.
    seoEndpointBase: "/admin/seo/politicians",

    getItemId: (item) => item.id,
    getItemLabel: (item) => item.name,
    getItemSubLabel: (item) =>
      [item.role, item.country_code].filter(Boolean).join(" • ") || "—",
    getPublicPath: (item) => `/politicians/${item.id}`,

    // Template tokens are resolved against the raw content item.
    // {name}, {role}, {region}, {country} etc. — resolved in seoApi.js
    defaultTitleTemplate: "{name} | {role}, {region} | TrackMP",
    defaultDescriptionTemplate:
      "Track {name}'s promises, career history, and public record on TrackMP — independent political accountability tracking.",

    schemaType: "Person",
    structuredDataFields: [
      { key: "jobTitle", label: "Job Title", placeholder: "Prime Minister" },
      { key: "nationality", label: "Nationality", placeholder: "Indian" },
      { key: "birthDate", label: "Birth Date", placeholder: "YYYY-MM-DD" },
      {
        key: "sameAs",
        label: "Same As (social/official URLs)",
        placeholder: "https://twitter.com/...",
        isList: true,
      },
    ],
  },

  countries: {
    key: "countries",
    label: "Countries",
    icon: Globe2,

    // REAL: /ref/countries exists (backend routes.py), but it has no `q`
    // search param and returns everything in one call (capped at 500), so
    // search + pagination for this type happen CLIENT-SIDE in seoApi.js.
    searchEndpoint: "/ref/countries",
    serverSideQuery: false,
    serverSidePagination: false,

    // No single-country detail endpoint exists (only list/create/update/
    // delete-by-id in the backend). getContentItemDetail() in seoApi.js
    // automatically falls back to scanning the list by `code`, so no
    // getDetailEndpoint is defined here.

    // No public country-profile page exists yet (governance articles are
    // being planned, not built). The editor hides the "View public page"
    // link instead of pointing at a URL that would 404.
    hasPublicPage: false,
    seoEndpointBase: "/admin/seo/countries",

    getItemId: (item) => item.code,
    getItemLabel: (item) => item.name,
    getItemSubLabel: (item) => item.code,
    getPublicPath: (item) => `/countries/${item.code}`,

    defaultTitleTemplate: "{name} | Political Landscape & Governance | TrackMP",
    defaultDescriptionTemplate:
      "Explore how {name}'s government works — structure, key offices, and political accountability, tracked on TrackMP.",

    schemaType: "Country",
    structuredDataFields: [
      {
        key: "sameAs",
        label: "Same As (reference URLs — Wikipedia, official gov site, etc.)",
        placeholder: "https://en.wikipedia.org/wiki/...",
        isList: true,
      },
    ],
  },

  articles: {
    key: "articles",
    label: "Articles",
    icon: Newspaper,

    // REAL: Articles.jsx calls GET /admin/articles with q/tag params and
    // trusts the backend to filter, but the backend does not paginate
    // (Articles.jsx paginates the full result client-side) — so we mirror
    // that: serverSideQuery=true, serverSidePagination=false.
    searchEndpoint: "/admin/articles",
    serverSideQuery: true,
    serverSidePagination: false,

    // ASSUMPTION, not yet confirmed against ArticleEditor.jsx (we only
    // have Articles.jsx, the list page). If the real single-article fetch
    // uses a different path, update this one line — if it's wrong,
    // getContentItemDetail() in seoApi.js will transparently fall back to
    // scanning the article list instead of failing, so nothing breaks.
    getDetailEndpoint: (itemId) => `/admin/articles/${itemId}`,
    seoEndpointBase: "/admin/seo/articles",

    getItemId: (item) => item.id,
    getItemLabel: (item) => item.title,
    getItemSubLabel: (item) => [item.category, item.status].filter(Boolean).join(" • "),
    getPublicPath: (item) => `/articles/${item.id}`,

    defaultTitleTemplate: "{title} | TrackMP",
    defaultDescriptionTemplate: "{title} — read the full story on TrackMP.",

    schemaType: "NewsArticle",
    structuredDataFields: [
      { key: "author", label: "Author", placeholder: "Jane Doe" },
      { key: "datePublished", label: "Date Published", placeholder: "YYYY-MM-DD" },
    ],
  },

  // Static pages have no backend record at all — one fixed item per real
  // route. `isStatic: true` tells seoApi.js to skip the network entirely
  // and read/filter/paginate the `items` array below in memory.
  static_pages: {
    key: "static_pages",
    label: "Static Pages",
    icon: FileText,
    isStatic: true,
    seoEndpointBase: "/admin/seo/static_pages",
    items: [
      { id: "home", name: "Home Page", path: "/" },
      { id: "about", name: "About Us", path: "/about" },
      // Add FAQ / Privacy Policy here once those routes exist in App.js —
      // e.g. { id: "faq", name: "FAQ", path: "/faq" }. Nothing else needs
      // to change.
    ],
    getItemId: (item) => item.id,
    getItemLabel: (item) => item.name,
    getItemSubLabel: (item) => item.path,
    getPublicPath: (item) => item.path,
    defaultTitleTemplate: "{name} | TrackMP",
    defaultDescriptionTemplate:
      "{name} on TrackMP — independent political accountability tracking.",
    schemaType: "WebPage",
    structuredDataFields: [],
  },

  // ---------------------------------------------------------------------
  // FUTURE CONTENT TYPES — same shape as above. Nothing else in the SEO
  // feature needs to be touched to add one.
  // ---------------------------------------------------------------------
};

export const CONTENT_TYPE_LIST = Object.values(CONTENT_TYPES);

export function getContentType(key) {
  return CONTENT_TYPES[key] || null;
}

/** Resolves {token} placeholders in a template string against a content item. */
export function resolveTemplate(template, item, extra = {}) {
  if (!template) return "";
  const dict = {
    name: item?.name || item?.title || "",
    title: item?.title || item?.name || "",
    role: item?.role || "",
    region: item?.state_name || item?.country_code || "",
    country: item?.country_code || "",
    ...extra,
  };
  return template.replace(/\{(\w+)\}/g, (_, key) => dict[key] ?? "");
}
