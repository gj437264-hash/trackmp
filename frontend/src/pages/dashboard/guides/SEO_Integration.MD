# SEO Management — Integration Instructions

## 1. Files to create (copy as-is into your repo)

```
src/lib/seo/contentTypes.js
src/lib/seo/seoApi.js
src/lib/seo/seoValidation.js
src/components/seo/SEOField.jsx
src/components/seo/SearchPreview.jsx
src/components/seo/SocialPreview.jsx
src/components/seo/SEOValidationPanel.jsx
src/components/seo/StructuredDataEditor.jsx
src/pages/dashboard/SEOManagement.jsx
src/pages/dashboard/SEOEditor.jsx
```

## 2. Files to modify

### `src/App.js`
Add two lazy imports next to the other dashboard pages:

```js
const SEOManagement = lazy(() => import("@/pages/dashboard/SEOManagement"));
const SEOEditor = lazy(() => import("@/pages/dashboard/SEOEditor"));
```

Add two routes next to the other `/dashboard/*` routes (same `ADMIN_ROLES` guard as Politicians/Articles/Reference Data — SEO editing is an editorial task, not a super-admin-only one, matching how those three are currently gated):

```jsx
<Route path="/dashboard/seo" element={<ProtectedRoute roles={ADMIN_ROLES}><SEOManagement /></ProtectedRoute>} />
<Route path="/dashboard/seo/:contentType/:itemId" element={<ProtectedRoute roles={ADMIN_ROLES}><SEOEditor /></ProtectedRoute>} />
```

### `src/components/DashboardLayout.jsx`
Add one import:

```js
import { Search as SearchIcon } from "lucide-react"; // or reuse an existing icon import if you prefer, e.g. Sparkles
```
(Note: `Search` is already imported and used for the nav search box — import the icon under an alias to avoid a collision, as shown above.)

Add one entry to `NAVIGATION_ITEMS`, grouped under "Content" next to Politicians/Articles/Reference Data:

```js
{ id: "seo", to: "/dashboard/seo", label: "SEO Management", icon: SearchIcon, roles: ["super_admin", "admin"], section: "seo_management", group: "Content" },
```

If your backend's `user.permissions` object is used to scope non-super-admins to specific sections (as `canAccessSection` suggests), add `"seo_management"` to whichever permission sets should see this — no frontend code changes needed beyond the entry above, since `canAccessSection` already reads `user?.permissions?.[section]` generically.

## 3. Nothing else changes

`AuthContext.js`, `ProtectedRoute.jsx`, `lib/api.js`, and every existing dashboard page are untouched.

## 4. What's mocked right now vs. real

| Piece | Status |
|---|---|
| Searching/listing politicians for the SEO picker | **Real** — calls existing `GET /admin/politicians` |
| Fetching a politician's name/role for display in the editor | **Real** — calls existing `GET /admin/politicians/:id` |
| Reading a politician's SEO config | **Mocked** — in-memory store in `seoApi.js`, resets on reload |
| Saving a politician's SEO config | **Mocked** — same in-memory store |
| Default title/description templates | **Frontend-only** — `resolveTemplate()` in `contentTypes.js`; real generation logic should eventually live server-side too, this mirrors it for preview purposes |

Every mocked function in `seoApi.js` has the real `api.get/put` call written out in a comment directly above it — swapping mock for real is a one-line change per function, and no component that calls `seoApi.js` needs to change at all.

## 5. Adding a future content type (e.g. Countries)

1. Add one entry to `CONTENT_TYPES` in `contentTypes.js` (template provided inline in that file).
2. Nothing in `SEOManagement.jsx`, `SEOEditor.jsx`, or any `components/seo/*` file needs to change.

---

# Backend Requirements for Later (not implemented — for your backend team)

1. **`GET /admin/seo/{content_type}/{content_id}`** — return the SEO config document for one item, or a sensible generated-default object if none has been saved (mirroring `buildDefaultConfig` in `seoApi.js` so the frontend and backend defaults agree).
2. **`PUT /admin/seo/{content_type}/{content_id}`** — upsert the SEO config document (schema shown in `contentTypes.js`/`seoApi.js`).
3. **`GET /admin/seo/{content_type}`** *(optional, for a future "bulk SEO health" view)* — list all items of a type with their completeness score/flags, so admins can find missing SEO across thousands of records without opening each one.
4. **MongoDB collection**: e.g. `seo_configs`, unique-indexed on `(content_type, content_id)`.
5. **Authorization**: enforce the same admin-role checks as the corresponding content-management endpoints, and additionally scope by `user.permissions` (e.g. a country-scoped admin should only be able to edit SEO for content within their scope) — this cannot be enforced client-side and must be done server-side regardless of what the UI hides.
6. **Template rendering**: if default title/description templates should ever change server-side (e.g. for structured-data injection into rendered HTML `<head>`), the backend needs the same `{name}/{role}/{region}` token resolution implemented in `contentTypes.js::resolveTemplate`, so previews and live pages never disagree.
7. **Slug uniqueness validation**: if custom slugs are meant to affect real URLs, the backend needs a uniqueness check per content type — the frontend only checks slug *format*, not collisions.
8. **Rendering into the public site's `<head>`**: server-side (or build-time) logic to actually emit the saved title/meta/OG/Twitter/JSON-LD tags on the corresponding public pages — currently out of scope, this frontend only manages the *data*.
