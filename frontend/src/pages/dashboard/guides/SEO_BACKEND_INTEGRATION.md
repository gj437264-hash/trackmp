# Backend Integration — SEO Metadata Route

## 1. Create the file

Copy `backend/addon_routes/seo_metadata.py` from this bundle into
`/opt/trackmp/backend/addon_routes/seo_metadata.py` on your machine.

## 2. Register the router in `server.py`

Add the import next to the other addon_routes imports:

```python
from addon_routes.seo_metadata import router as seo_metadata_router
```

Add the include next to the other `app.include_router(...)` calls:

```python
app.include_router(seo_metadata_router)
```

## 3. Add indexes in `server.py`'s `_create_indexes`

```python
await db.seo_configs.create_index([("content_type", 1), ("content_id", 1)], unique=True)
await db.seo_configs.create_index("content_type")
```

## 4. One thing to verify: `require_section("seo_management")`

Every other addon route calls `require_section("...")` with a section
name that already corresponds to an existing dashboard nav item
(`"politicians"`, etc.). This new route uses `"seo_management"` —
matching the section key already wired into the frontend's
`DashboardLayout.jsx` nav item and `canAccessSection()` check.

**Check this in `security.py`:** if `require_section` accepts any string
and just checks `user.role == "super_admin" or user.permissions.get(section)`
generically, nothing else is needed. If instead it validates the section
name against a fixed enum/list of known sections, add `"seo_management"`
to that list — otherwise every request will 403 even for super admins.
I don't have `security.py`, so this is the one thing I can't confirm from
here; if `yarn`/requests come back with 403 or 500 on
`/api/admin/seo/...` even as super_admin, this is almost certainly why —
paste `security.py`'s `require_section` and I'll adjust.

## 5. What's real now vs. still mocked

| Piece | Status |
|---|---|
| Listing/searching Politicians, Countries, Articles, Static Pages | **Real** (existing endpoints) |
| Fetching a single item's detail for the editor header | **Real** for Politicians (existing endpoint) and Static Pages (frontend config); **real, assumption-based** for Articles (`GET /admin/articles/:id` — see caveat below); **real via fallback** for Countries (no single-item endpoint exists, so it scans the list) |
| Reading/writing the actual SEO config (title, description, canonical, slug, robots, OG, Twitter, structured data) | **Real** — this is what `seo_metadata.py` implements |
| Generated/default title & description | **Real, computed server-side** on every GET from the live content record — never stored, so it can't go stale |

**Remaining caveat, unchanged from before:** the Articles detail endpoint
(`GET /admin/articles/:id`) is still an assumption — I don't have
`ArticleEditor.jsx`. If it's wrong, the SEO editor for Articles will
still work correctly (it falls back to scanning the article list), it's
just one extra request under the hood until confirmed.

## 6. Testing checklist

1. Rebuild frontend (`yarn build` or `yarn start`) and backend restart.
2. Open SEO Management → Politicians → pick one → edit title → Save.
   Reload the page — the custom title should persist (no more "resets on
   reload" mock behavior).
3. Switch to Countries → pick one → note the "Public page not built yet"
   label instead of a link → edit → Save → reload → persists.
4. Switch to Static Pages → Home → edit → Save → reload → persists.
5. Confirm a non-super-admin without the `seo_management` permission
   entry gets a 403 from `/api/admin/seo/...` directly (not just a
   hidden nav item) — this is the real enforcement point, the nav item
   hiding is cosmetic only.
