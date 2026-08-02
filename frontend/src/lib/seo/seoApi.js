import { api } from "@/lib/api";
import { getContentType } from "./contentTypes";

/**
 * SEO Data Layer
 * -----------------------------------------------------------------------
 * Everything in this file is now REAL — it calls the backend addon route
 * at backend/addon_routes/seo_metadata.py (GET/PUT /api/admin/seo/...).
 *
 * The content-item search/list/detail functions (searchContentItems,
 * getContentItemDetail) call the pre-existing admin list endpoints
 * (/admin/politicians, /ref/countries, /admin/articles) — no new backend
 * code was needed for those. Only the SEO config itself (getSEOConfig /
 * saveSEOConfig) needed a new backend route, since no such concept
 * existed before this feature.
 */

/**
 * Fetch the SEO configuration for one content item.
 * REAL — calls the backend addon route addon_routes/seo_metadata.py.
 * The backend itself computes `generated_value` for title/description
 * from the live content record, so this always reflects the current
 * politician/article/country data even if it changed since the config
 * was last saved.
 */
export async function getSEOConfig(contentType, itemId) {
  const ct = getContentType(contentType);
  if (!ct) throw new Error(`Unknown content type: ${contentType}`);
  const { data } = await api.get(`${ct.seoEndpointBase}/${itemId}`);
  return data;
}

/**
 * Persist the SEO configuration for one content item.
 * REAL — calls the backend addon route addon_routes/seo_metadata.py.
 * Only `value`/`is_custom` are sent for title/description — the
 * generated_value the editor displayed is derived, not stored, and the
 * backend recomputes it fresh on the next GET.
 */
export async function saveSEOConfig(contentType, itemId, config) {
  const ct = getContentType(contentType);
  if (!ct) throw new Error(`Unknown content type: ${contentType}`);

  const payload = {
    basic: {
      title: { value: config.basic.title.value, is_custom: config.basic.title.is_custom },
      description: {
        value: config.basic.description.value,
        is_custom: config.basic.description.is_custom,
      },
      canonical_url: config.basic.canonical_url,
      slug: config.basic.slug,
      robots: config.basic.robots,
    },
    social: config.social,
    structured_data: config.structured_data,
  };

  const { data } = await api.put(`${ct.seoEndpointBase}/${itemId}`, payload);
  return data;
}

function localFilter(items, q, ct) {
  if (!q) return items;
  const needle = q.toLowerCase();
  return items.filter((item) => {
    const haystack = `${ct.getItemLabel(item)} ${ct.getItemSubLabel(item)}`.toLowerCase();
    return haystack.includes(needle);
  });
}

function localPaginate(items, page, limit) {
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
}

/**
 * Search content items for a given content type.
 *
 * Three behaviors, chosen per-type via registry flags, because each real
 * backend endpoint behaves differently:
 *
 *  - isStatic (e.g. static pages): no network call at all, filter/paginate
 *    the registry's fixed `items` array in memory.
 *  - serverSideQuery / serverSidePagination = true (e.g. politicians):
 *    send q/page/limit and trust the backend's filtered, paginated,
 *    totaled response.
 *  - serverSideQuery = true, serverSidePagination = false (e.g. articles):
 *    send q, trust the backend's filtering, but paginate the returned
 *    array ourselves since the backend returns everything that matches.
 *  - serverSideQuery = false (e.g. countries): backend has no search
 *    param at all — fetch everything once, then filter AND paginate
 *    ourselves.
 */
export async function searchContentItems(contentType, { q = "", page = 1, limit = 20 } = {}) {
  const ct = getContentType(contentType);
  if (!ct) throw new Error(`Unknown content type: ${contentType}`);

  if (ct.isStatic) {
    const filtered = localFilter(ct.items, q, ct);
    return { items: localPaginate(filtered, page, limit), total: filtered.length };
  }

  const params = {};
  if (ct.serverSidePagination) {
    params.page = page;
    params.limit = limit;
  }
  if (ct.serverSideQuery && q) {
    params.q = q;
  }

  const { data } = await api.get(ct.searchEndpoint, { params });
  let items = data.items || [];
  let total = data.total;

  if (!ct.serverSideQuery) {
    items = localFilter(items, q, ct);
  }
  if (!ct.serverSidePagination) {
    total = items.length;
    items = localPaginate(items, page, limit);
  }

  return { items, total: total ?? items.length };
}

/**
 * Fetch a single content item (name/role/title/etc — NOT the SEO config,
 * see getSEOConfig below) so the editor header/previews have something to
 * show. Tries the registry's detail endpoint first; if that's missing,
 * wrong, or 404s, falls back to scanning a full list for a matching id —
 * this covers content types with no single-item endpoint (Countries) and
 * protects against an unconfirmed endpoint guess (Articles) silently
 * breaking the page.
 */
export async function getContentItemDetail(contentType, itemId) {
  const ct = getContentType(contentType);
  if (!ct) throw new Error(`Unknown content type: ${contentType}`);

  if (ct.isStatic) {
    const found = ct.items.find((item) => String(ct.getItemId(item)) === String(itemId));
    if (!found) throw new Error(`Unknown ${contentType} item: ${itemId}`);
    return found;
  }

  if (ct.getDetailEndpoint) {
    try {
      const { data } = await api.get(ct.getDetailEndpoint(itemId));
      return data;
    } catch {
      // fall through to list scan below
    }
  }

  const { items } = await searchContentItems(contentType, { limit: 500 });
  const found = items.find((item) => String(ct.getItemId(item)) === String(itemId));
  if (!found) throw new Error(`Could not find ${contentType} item ${itemId}`);
  return found;
}
