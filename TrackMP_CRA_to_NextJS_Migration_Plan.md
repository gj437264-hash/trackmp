# TrackMP — CRA → Next.js Migration Plan

**Scope of this document:** code/architecture migration plan and target file tree only. No code has been changed. A separate infra/deployment doc already exists in your repo at `frontend/src/pages/dashboard/guides/Next_js_Migration_Plan.html` (backup, test server, cutover, rollback) — this plan is meant to sit alongside it, not replace it. Where the two overlap I've flagged the differences.

---

## 1. What I found when analyzing the repo

**Stack today**
- `frontend/`: Create React App (via CRACO) + React 19 + React Router v7 (`BrowserRouter`, all client-side), Tailwind + shadcn/ui (Radix), TanStack Query, react-hook-form + zod, framer-motion, `react-helmet-async` for `<head>` tags, `axios` for API calls, custom `AuthContext` using `localStorage` token + cookie session.
- `backend/`: FastAPI + MongoDB (Motor/PyMongo), JWT auth, image upload router. **This does not change** — Next.js will consume the same REST API.
- `public/politicians/*`, `public/politicians-org/*` (**~5,670 folders**, each with a static `index.html`) plus `seo-tasks/` (a whole separate Python service with its own systemd unit/timer, lockfile, retry/notify logic) — this is a **static-HTML-snapshot pipeline built specifically to work around CRA having no SSR**. It pre-renders politician pages so crawlers/social scrapers see real HTML instead of an empty CSR shell.

**This second point is the real justification for the migration** — you're currently running a custom bolt-on rendering system to fake what Next.js gives you natively (SSR/SSG/ISR + `generateMetadata`). Migrating retires `seo-tasks/`, the systemd timer, and the 5,670 pre-generated HTML folders entirely.

**Other things the migration will touch**
- SEO is currently done two different ways in the same app: static `<head>` tags hardcoded in `public/index.html`, plus **one** page (`SeoHead.jsx`, used by the politician profile) using `react-helmet-async` for per-page/JSON-LD tags. Every other page (About, Articles, Search, Budget Analysis, etc.) has **no per-page meta tags at all** today.
- `next-themes` is already a dependency in `package.json` but isn't used — there's a hand-rolled `ThemeContext.jsx` doing the same job by touching `window`/`localStorage` directly. This needs an SSR-safe rewrite either way; may as well switch to the dependency that's already installed.
- Auth token is stored in `localStorage` (`trackmp_token`) with an `Authorization` header interceptor, as a *fallback* alongside cookie-based session auth (`withCredentials: true`, backend sets a cookie on login). `localStorage` doesn't exist on the server, so any Server Component or middleware that needs to know "is this user logged in" **must** go through the cookie, not this fallback.
- I found a fair number of leftover/duplicate files across the repo (`*-org`, `*.bak`, `*-claude`, `*-orgv1`, `*-v1`, `Navbar.js-leftover`) — these should be identified and excluded rather than migrated as-is (see §7).
- `test_import.csv`, `template.csv`, `export.csv` sit directly inside `src/pages/` — these are data files, not routes; they don't belong under `app/` in Next.js and should move to a `scripts/` or `fixtures/` folder, or be dropped.

---

## 2. Migration scope, phase by phase

| Phase | What happens | Risk |
|---|---|---|
| **0. Setup** | Scaffold Next.js 14/15 App Router project (`create-next-app`), port Tailwind config, shadcn components, path alias `@/*` → `src/*`, ESLint config. Keep backend untouched. | Low |
| **1. Static & config parity** | Move `public/*` assets, favicons, manifest, robots.txt (with domain fixed from `your-domain.com`), legal HTML pages. Recreate `next.config.js` with an `/api/*` rewrite to FastAPI. | Low |
| **2. Layouts & providers** | Convert `PublicLayout.jsx` / `DashboardLayout.jsx` into `layout.jsx` files per route group. Move `QueryClientProvider`, `AuthProvider`, theme provider into root layout, split client/server correctly. | Medium |
| **3. Route-by-route page migration** | Every CRA page becomes a folder under `app/` (mapping table in §3). Convert `useParams`/`useNavigate`/`useSearchParams` (react-router) → `params`/`useRouter`/`useSearchParams` (next/navigation). | Medium–High |
| **4. Data fetching split** | Public, crawlable pages (Home, Politician Profile, Article Detail, About, Promise Methodology) become **Server Components** that fetch on the server (`fetch`/server-side axios call) with ISR (`revalidate`). Interactive/authenticated pages (Search filters, dashboard, forms) stay **Client Components** using TanStack Query as today. | High — this is the core architectural change |
| **5. SEO/metadata migration** | Replace `react-helmet-async` and the static `<head>` block with Next's `generateMetadata()` per route + JSON-LD emitted server-side. Retire `seo-tasks/` static snapshot pipeline once SSR is verified in production (View Source test). | Medium |
| **6. Auth migration** | Move from `localStorage` token to **httpOnly cookie only**, add `middleware.ts` to gate `/dashboard/*` before render (no more flash-of-content-then-redirect), keep `AuthContext` for client-side UI state (name/role for nav, etc.) fed by a server-read cookie on first load. | Medium–High |
| **7. Cleanup** | Drop dead `-org`/`-claude`/`.bak` files, stray CSVs inside pages, `contexts-back/`, unused `PublicLayout.jsx-orgv1`, etc. — don't carry them into the new repo. | Low |
| **8. QA + cutover** | Use the existing test-server/backup/rollback plan in `Next_js_Migration_Plan.html` for the actual production switch. | — |

---

## 3. Route mapping (CRA `App.js` → Next.js App Router)

### Public / SEO-critical pages → Server Components (SSR/ISR)

| Current file | New route | Rendering |
|---|---|---|
| `pages/HomePage.jsx` | `app/page.jsx` | Server, `revalidate: 3600` (stats/homepage data change slowly) |
| `pages/AboutPage.jsx` | `app/about/page.jsx` | Server, static |
| `pages/PromiseMethodology.jsx` | `app/how-promises-are-tracked/page.jsx` | Server, static |
| `pages/PoliticianProfile.jsx` (+ `extensions/PoliticianProfile/*`) | `app/politicians/[id]/page.jsx` | Server, ISR `revalidate: 1800` + `generateMetadata` + JSON-LD (replaces `SeoHead.jsx`) |
| `pages/ArticlesPage.jsx` | `app/articles/page.jsx` | Server, ISR |
| `pages/ArticleDetail.jsx` | `app/articles/[id]/page.jsx` | Server, ISR + `generateMetadata` |
| `pages/BudgetAnalysisPage.jsx` | `app/budget-analysis/page.jsx` | Server (charts hydrate client-side, see §4) |

### Public but interactive / low-SEO-value → Client Components (CSR, same as today)

| Current file | New route |
|---|---|
| `pages/ContactPage.jsx` | `app/contact/page.jsx` |
| `pages/SubmitUpdatePage.jsx` | `app/submit-update/page.jsx` |
| `pages/YourVoicePage.jsx` | `app/your-voice/page.jsx` |
| `pages/SearchPage.jsx` | `app/search/page.jsx` (excluded via `robots.txt` today anyway) |

### Auth pages → route group `(auth)`, Client Components

| Current file | New route |
|---|---|
| `pages/LoginPage.jsx` | `app/(auth)/login/page.jsx` |
| `pages/SignupPage.jsx` | `app/(auth)/signup/page.jsx` |
| `pages/ThankYouPage.jsx` | `app/(auth)/thank-you/page.jsx` |
| `pages/AcceptInvitePage.jsx` | `app/(auth)/accept-invite/page.jsx` |
| `pages/PasswordPages.jsx` (`ForgotPasswordPage`) | `app/(auth)/forgot-password/page.jsx` |
| `pages/PasswordPages.jsx` (`ResetPasswordPage`) | `app/(auth)/reset-password/page.jsx` |

### Dashboard (admin) → route group `(dashboard)`, all Client Components, gated by `middleware.ts`

| Current file | New route | Guard |
|---|---|---|
| `pages/dashboard/DashboardHome.jsx` | `app/(dashboard)/dashboard/page.jsx` | admin, super_admin |
| `pages/dashboard/PoliticiansList.jsx` | `app/(dashboard)/dashboard/politicians/page.jsx` | admin, super_admin |
| `pages/extensions/DuplicatePoliticiansFinder.jsx` | `app/(dashboard)/dashboard/politicians/duplicates/page.jsx` | admin, super_admin |
| `pages/dashboard/PoliticianForm.jsx` | `app/(dashboard)/dashboard/politicians/[id]/page.jsx` | admin, super_admin |
| `pages/dashboard/VoiceModerationPage.jsx` | `app/(dashboard)/dashboard/voice/page.jsx` | admin, super_admin |
| `pages/dashboard/CommunityDesk.jsx` | `app/(dashboard)/dashboard/community/page.jsx` | admin, super_admin |
| `pages/dashboard/TicketDetail.jsx` | `app/(dashboard)/dashboard/community/[id]/page.jsx` | admin, super_admin |
| `pages/dashboard/Visitors.jsx` | `app/(dashboard)/dashboard/visitors/page.jsx` | admin, super_admin |
| `pages/dashboard/VisitorDetail.jsx` | `app/(dashboard)/dashboard/visitors/[id]/page.jsx` | admin, super_admin |
| `pages/dashboard/Articles.jsx` | `app/(dashboard)/dashboard/articles/page.jsx` | admin, super_admin |
| `pages/dashboard/ArticleEditor.jsx` | `app/(dashboard)/dashboard/articles/[id]/page.jsx` | admin, super_admin |
| `pages/dashboard/ReferenceData.jsx` | `app/(dashboard)/dashboard/reference/page.jsx` | admin, super_admin |
| `pages/dashboard/SEOManagement.jsx` | `app/(dashboard)/dashboard/seo/page.jsx` | admin, super_admin |
| `pages/dashboard/SEOEditor.jsx` | `app/(dashboard)/dashboard/seo/[contentType]/[itemId]/page.jsx` | admin, super_admin |
| `pages/dashboard/SignupQueue.jsx` | `app/(dashboard)/dashboard/signups/page.jsx` | **super_admin only** |
| `pages/dashboard/Admins.jsx` | `app/(dashboard)/dashboard/admins/page.jsx` | **super_admin only** |
| `pages/dashboard/AuditLog.jsx` | `app/(dashboard)/dashboard/audit/page.jsx` | **super_admin only** |
| `pages/dashboard/Trash.jsx` | `app/(dashboard)/dashboard/trash/page.jsx` | **super_admin only** |
| `*` (catch-all → redirect home) | `app/not-found.jsx` | — becomes a real 404 instead of a silent redirect (better for SEO — silent redirects to `/` on bad URLs create soft-404 issues in Search Console) |

**Not carried forward as routes:** `EditPolitician.js`, `MyContributions.js`, `NewPolitician.js`, `Register.js-bak` were never wired into `App.js`'s route table — they're orphaned. Confirm with you before dropping (§9).

---

## 4. Client vs. Server component classification (why it matters)

Next.js Server Components can't use `useState`, `useEffect`, browser APIs, or Context — anything using those needs `'use client'` at the top of the file. Rough breakdown:

**Must be Client Components** (`'use client'`):
- All of `components/ui/*` (46 shadcn/Radix components — dialogs, dropdowns, tabs, etc., all rely on browser interactivity)
- `context/AuthContext.js`, `context/ThemeContext.jsx` (→ `next-themes`), `components/ProtectedRoute.jsx` (superseded by `middleware.ts`, but a client-side role check stays for UI-level show/hide)
- `components/PageTransition.jsx`, `components/Motion.jsx` (framer-motion needs the browser)
- `components/ImageUploader.jsx`, all `react-hook-form` forms, reCAPTCHA usage
- The entire `(dashboard)` route group
- `lib/voiceApi.js`, `lib/mockDiscussions.js` consumers (interactive comment/voice UI)

**Convert to Server Components** (data fetched server-side, then a thin client "island" handles interactivity):
- `app/page.jsx` (Home) — static content + stats server-fetched; any counters/animations become a small client sub-component
- `app/politicians/[id]/page.jsx` — profile data fetched server-side for SEO; tabs (Promises, Wealth History, Media, Relatives) can stay as client sub-components hydrated with server-fetched initial data
- `app/articles/page.jsx`, `app/articles/[id]/page.jsx`
- `app/about/page.jsx`, `app/how-promises-are-tracked/page.jsx`

**Stays mixed:** `app/budget-analysis/page.jsx` — page shell server-rendered for SEO/meta, but `recharts` visualizations must live in a `'use client'` child component.

---

## 5. SEO & metadata changes (the main point of this migration)

- Replace the JSON-LD `<script>` blocks currently hardcoded into `public/index.html` (WebSite, Organization, BreadcrumbList) with `app/layout.jsx`'s `metadata` export + a small server component emitting the same schema — but with the real domain, not `your-domain.com` (currently a placeholder in **every** canonical/OG tag — needs to be fixed regardless of framework).
- Replace `pages/extensions/PoliticianProfile/SeoHead.jsx` (`react-helmet-async` + JSON-LD Person schema) with `generateMetadata()` in `app/politicians/[id]/page.jsx`, using the same fields (`brief_intro`, `image_url`, `social_links`, etc.) — logic is portable almost as-is, just moved from a component to a function.
- Add `generateMetadata()` to every other public page that currently has **no** per-page meta tags (About, Articles, Article Detail, Promise Methodology) — this is a net-new SEO improvement, not just parity.
- `robots.txt`/`sitemap.xml` generation: your Python `seo-tasks` sitemap generator (`seo_tasks/tasks/sitemap.py`) can keep running exactly as-is short-term (it writes static XML files under `public/`), since Next.js serves anything in `public/` unchanged. Medium-term, consider replacing it with Next's built-in `app/sitemap.js` / `app/robots.js` (dynamic, pulls straight from Mongo, no cron/systemd timer needed) — but that's a phase-2 decision, not required for cutover.
- Once SSR is confirmed working in production (View Source shows real politician data), retire: `seo-tasks/` (whole Python service + systemd `.service`/`.timer`), `public/politicians/*`, `public/politicians-org/*` (5,670 folders), and the `deployment_instructions.sh` steps tied to that pipeline.

---

## 6. Other concrete code changes required

| Area | Current | Next.js equivalent |
|---|---|---|
| Routing hooks | `useParams`, `useNavigate`, `useLocation`, `<Link>` from `react-router-dom` | `params` prop / `useParams`, `useRouter`, `usePathname`, `<Link>` from `next/link` (all from `next/navigation`) |
| Env vars | `process.env.REACT_APP_BACKEND_URL` | `process.env.NEXT_PUBLIC_BACKEND_URL` for client-exposed vars; server-only vars (no `NEXT_PUBLIC_` prefix) for anything used only in Server Components |
| Path alias | `craco.config.js` webpack alias `@` → `src`, `jsconfig.json` | `next.config.js` is unaffected; keep the same `@/*` → `./src/*` alias in `jsconfig.json` (or migrate to `tsconfig.json` if you want TypeScript — optional) |
| Images | Plain `<img>` tags, `public/images/*` | `next/image` for automatic optimization (needs `remotePatterns` config if politician photos are served from the backend's `UPLOAD_DIR`/`PUBLIC_UPLOAD_BASE`) |
| Lazy loading | `React.lazy` + `Suspense` in `App.js` | Automatic per-route code splitting; `next/dynamic` only needed for heavy client-only widgets (e.g., `recharts` charts) |
| Auth | `localStorage` token + `Authorization` header fallback | httpOnly cookie only; drop the `localStorage` fallback entirely so server-rendered pages and `middleware.ts` can read the session |
| Route protection | `ProtectedRoute.jsx` (client-side redirect, causes flash-of-content) | `middleware.ts` (server-side redirect before render) + keep a lightweight client role check for conditional UI |
| Bundle splitting | Custom `splitChunks` cache groups in `craco.config.js` (react/motion/charts/radix/lucide vendor chunks) | Not needed — Next.js handles per-route chunking automatically; this whole block is deleted |
| Theming | Hand-rolled `ThemeContext.jsx` touching `window`/`localStorage` directly (SSR-unsafe) | Switch to `next-themes` (already installed, unused) — it's SSR-safe out of the box |

---

## 7. Files to leave behind (not migrated)

These exist in the current repo but are dead weight — duplicate/backup/experimental copies. Recommend excluding all of them from the new project rather than copying and re-cleaning later:

```
App.js-org, App.js.bak, AuthContext.js.bak, index.css-orgv1, images.js-org,
Navbar.js-leftover, PublicLayout.jsx-orgv1, AboutPage.jsx-orgv1,
HomePage.jsx-claude, PoliticianProfile.jsx-claude,
dashboard/AuditLog.jsx-org, dashboard/PoliticiansList.jsx-org,
seo/contentTypes.js-v1, seo/seoApi.js-v1,
extensions/PoliticianProfile/Media/index.jsx-orgv1,
extensions/PoliticianProfile/Overview.jsx-claude,
extensions/PoliticianProfile/Promises/index.jsx-orgv1,
extensions/PoliticianProfile/SeoHead.jsx-claude,
extensions/homepage/Reveal.jsx-claude, extensions/homepage/homepage.css-claude,
extensions/homepage/useSEO.js-claude,
extensions/PoliticianProfile/ProfileHeader.jsx-clade,
pages/export.csv, pages/template.csv, pages/test_import.csv,
context/contexts-back/*, public/index.html-default,
public/cookie-policy.html-orgv1, index.html-default
```
Also orphaned (never referenced by any route in `App.js` — confirm before dropping): `EditPolitician.js`, `MyContributions.js`, `NewPolitician.js`, `Register.js-bak`.

---

## 8. Target Next.js file/folder structure

```
trackmp-next/
├── .env.local                          # NEXT_PUBLIC_BACKEND_URL, RECAPTCHA keys, etc.
├── .eslintrc.json
├── next.config.js                      # /api/* rewrite → FastAPI, image remotePatterns
├── middleware.ts                       # gate /dashboard/* before render, role check via cookie
├── jsconfig.json                       # "@/*" -> "./src/*"
├── tailwind.config.js                  # ported as-is from CRA
├── postcss.config.js                   # ported as-is
├── package.json
│
├── public/
│   ├── favicon.ico, favicon-16x16.png, favicon-32x32.png
│   ├── apple-touch-icon.png, android-chrome-192x192.png, android-chrome-512x512.png
│   ├── site.webmanifest, robots.txt (domain fixed), llms.txt
│   ├── sitemap.xml, sitemap-static.xml(.gz), sitemap-politicians-1.xml(.gz)   # unchanged short-term, from seo-tasks
│   ├── cookie-policy.html, privacy-policy.html, terms-of-use.html, data-sourcing.html
│   └── images/                          # ported as-is
│
└── src/
    ├── app/
    │   ├── layout.jsx                   # root layout: <html>, providers, global metadata, JSON-LD (WebSite/Org/Breadcrumb)
    │   ├── globals.css                  # from index.css (theme CSS vars, Tailwind layers)
    │   ├── favicon.ico
    │   ├── not-found.jsx                # replaces the silent `*` → "/" redirect
    │   ├── error.jsx                    # global error boundary
    │   ├── loading.jsx                  # replaces the CRA <Suspense> LoadingFallback
    │   │
    │   ├── page.jsx                     # Home (Server) — was HomePage.jsx
    │   ├── HomeClient.jsx                # client sub-component: animated stats/counters (useCountUp)
    │   │
    │   ├── about/
    │   │   └── page.jsx                 # Server — was AboutPage.jsx
    │   ├── contact/
    │   │   └── page.jsx                 # Client — was ContactPage.jsx
    │   ├── submit-update/
    │   │   └── page.jsx                 # Client — was SubmitUpdatePage.jsx
    │   ├── your-voice/
    │   │   └── page.jsx                 # Client — was YourVoicePage.jsx
    │   ├── budget-analysis/
    │   │   ├── page.jsx                 # Server shell — was BudgetAnalysisPage.jsx
    │   │   └── BudgetCharts.jsx          # 'use client' — recharts
    │   ├── how-promises-are-tracked/
    │   │   └── page.jsx                 # Server — was PromiseMethodology.jsx
    │   ├── search/
    │   │   └── page.jsx                 # Client — was SearchPage.jsx (noindexed already)
    │   │
    │   ├── articles/
    │   │   ├── page.jsx                 # Server, list — was ArticlesPage.jsx
    │   │   └── [id]/
    │   │       └── page.jsx             # Server + generateMetadata — was ArticleDetail.jsx
    │   │
    │   ├── politicians/
    │   │   └── [id]/
    │   │       ├── page.jsx             # Server + generateMetadata + JSON-LD Person — was PoliticianProfile.jsx
    │   │       ├── ProfileHeader.jsx    # from extensions/PoliticianProfile/ProfileHeader.jsx
    │   │       ├── StatBox.jsx
    │   │       ├── Overview.jsx
    │   │       ├── utils.js
    │   │       ├── promises/
    │   │       │   ├── PromisesTab.jsx      # 'use client' — was Promises/index.jsx
    │   │       │   ├── PromiseCard.jsx
    │   │       │   ├── AddPromiseDialog.jsx
    │   │       │   ├── EditPromiseDialog.jsx
    │   │       │   ├── PromiseAttachments.jsx
    │   │       │   ├── PromiseProgress.jsx
    │   │       │   ├── sortUtils.js
    │   │       │   ├── filterUtils.js
    │   │       │   └── promiseStatus.js
    │   │       ├── wealth-history/
    │   │       │   ├── WealthHistoryTab.jsx  # 'use client' — was WealthHistory/index.jsx
    │   │       │   ├── WealthChart.jsx
    │   │       │   └── WealthTable.jsx
    │   │       ├── media/
    │   │       │   ├── MediaTab.jsx          # 'use client' — was Media/index.jsx
    │   │       │   └── BioContent.jsx
    │   │       └── relatives/
    │   │           └── RelativesTab.jsx      # 'use client' — was Relatives/index.jsx
    │   │
    │   ├── (auth)/
    │   │   ├── layout.jsx               # minimal auth layout (no navbar/footer chrome)
    │   │   ├── login/page.jsx           # Client — was LoginPage.jsx
    │   │   ├── signup/page.jsx          # Client — was SignupPage.jsx
    │   │   ├── thank-you/page.jsx       # Client — was ThankYouPage.jsx
    │   │   ├── accept-invite/page.jsx   # Client — was AcceptInvitePage.jsx
    │   │   ├── forgot-password/page.jsx # Client — was PasswordPages.jsx (ForgotPasswordPage)
    │   │   └── reset-password/page.jsx  # Client — was PasswordPages.jsx (ResetPasswordPage)
    │   │
    │   └── (dashboard)/
    │       ├── layout.jsx               # DashboardLayout.jsx → wraps all admin pages, role-aware nav
    │       └── dashboard/
    │           ├── page.jsx             # DashboardHome.jsx
    │           ├── politicians/
    │           │   ├── page.jsx         # PoliticiansList.jsx
    │           │   ├── duplicates/page.jsx  # DuplicatePoliticiansFinder.jsx
    │           │   └── [id]/page.jsx    # PoliticianForm.jsx (108K — largest page, consider splitting further)
    │           ├── voice/page.jsx       # VoiceModerationPage.jsx
    │           ├── community/
    │           │   ├── page.jsx         # CommunityDesk.jsx
    │           │   └── [id]/page.jsx    # TicketDetail.jsx
    │           ├── visitors/
    │           │   ├── page.jsx         # Visitors.jsx
    │           │   └── [id]/page.jsx    # VisitorDetail.jsx
    │           ├── articles/
    │           │   ├── page.jsx         # Articles.jsx
    │           │   └── [id]/page.jsx    # ArticleEditor.jsx
    │           ├── reference/page.jsx   # ReferenceData.jsx
    │           ├── seo/
    │           │   ├── page.jsx         # SEOManagement.jsx
    │           │   └── [contentType]/[itemId]/page.jsx  # SEOEditor.jsx
    │           ├── signups/page.jsx     # SignupQueue.jsx (super_admin)
    │           ├── admins/page.jsx      # Admins.jsx (super_admin)
    │           ├── audit/page.jsx       # AuditLog.jsx (super_admin)
    │           └── trash/page.jsx       # Trash.jsx (super_admin)
    │
    ├── components/
    │   ├── Navbar.jsx                   # 'use client'
    │   ├── Footer.jsx                   # 'use client' (extract from PublicLayout if inline today)
    │   ├── PublicLayoutClient.jsx        # 'use client' — interactive chrome used by app/layout.jsx
    │   ├── DashboardLayoutClient.jsx      # 'use client' — was DashboardLayout.jsx
    │   ├── ImageUploader.jsx             # 'use client'
    │   ├── Motion.jsx                    # 'use client'
    │   ├── PageTransition.jsx            # 'use client'
    │   ├── ScrollToTop.jsx               # 'use client' (or drop — Next.js scroll restoration differs)
    │   ├── Skeleton.jsx
    │   ├── PoliticianCard.jsx
    │   ├── PromiseCard.jsx
    │   ├── StatusBadge.jsx
    │   ├── ThemeToggle.jsx               # 'use client' — updated for next-themes
    │   ├── seo/
    │   │   ├── SEOField.jsx
    │   │   ├── SEOValidationPanel.jsx
    │   │   ├── SearchPreview.jsx
    │   │   ├── SocialPreview.jsx
    │   │   └── StructuredDataEditor.jsx
    │   └── ui/                          # shadcn/Radix — ported as-is, all 'use client'
    │       ├── accordion.jsx, alert-dialog.jsx, alert.jsx, aspect-ratio.jsx,
    │       ├── avatar.jsx, badge.jsx, breadcrumb.jsx, button.jsx, calendar.jsx,
    │       ├── card.jsx, carousel.jsx, checkbox.jsx, collapsible.jsx, command.jsx,
    │       ├── context-menu.jsx, dialog.jsx, drawer.jsx, dropdown-menu.jsx, form.jsx,
    │       ├── hover-card.jsx, input-otp.jsx, input.jsx, label.jsx, menubar.jsx,
    │       ├── navigation-menu.jsx, pagination.jsx, popover.jsx, progress.jsx,
    │       ├── radio-group.jsx, resizable.jsx, scroll-area.jsx, select.jsx,
    │       ├── separator.jsx, sheet.jsx, skeleton.jsx, slider.jsx, sonner.jsx,
    │       ├── switch.jsx, table.jsx, tabs.jsx, textarea.jsx, toast.jsx,
    │       └── toaster.jsx, toggle-group.jsx, toggle.jsx, tooltip.jsx    (46 files, unchanged)
    │
    ├── context/
    │   ├── AuthContext.jsx               # 'use client' — cookie-based, no localStorage fallback
    │   └── QueryProvider.jsx             # 'use client' — wraps TanStack QueryClientProvider
    │                                     # (ThemeContext.jsx removed — replaced by next-themes)
    │
    ├── hooks/
    │   └── use-toast.js
    │
    ├── lib/
    │   ├── api.js                       # baseURL from NEXT_PUBLIC_BACKEND_URL, cookie-only auth
    │   ├── server-api.js                 # NEW — server-side fetch helper for Server Components (no axios interceptor needed)
    │   ├── format.js
    │   ├── utils.js
    │   ├── avatar.js
    │   ├── anonId.js
    │   ├── recaptcha.js
    │   ├── voiceApi.js
    │   ├── countryCurrency.js
    │   ├── useCountUp.js
    │   ├── images.js
    │   ├── mockArticles.js, mockBudget.js, mockDiscussions.js
    │   └── seo/
    │       ├── contentTypes.js
    │       ├── seoValidation.js
    │       └── seoApi.js
    │
    └── constants/
        └── testIds/
            ├── index.js
            ├── auth.js
            └── home.js
```

**Removed entirely from the new project** (superseded by Next.js built-ins):
- `craco.config.js`, `craco.config.js-org`, `frontend/plugins/health-check/*` (webpack health-check plugin — replace with Next's own `/api/health` route if still needed)
- `components/ProtectedRoute.jsx` (logic moves into `middleware.ts`)
- `context/ThemeContext.jsx` (→ `next-themes`)
- `seo-tasks/` and `public/politicians/*`, `public/politicians-org/*` (once SSR is verified in prod — see §5)

---

## 9. What I need from you before/while building this

1. **Confirm the four orphaned pages** — `EditPolitician.js`, `MyContributions.js`, `NewPolitician.js`, `Register.js-bak` aren't wired into any route today. Drop them, or are they meant to be re-added somewhere?
2. **Real production domain** — every canonical/OG/JSON-LD URL currently says `your-domain.com`; I'll need the actual domain to bake into `generateMetadata`/`sitemap`.
3. **Auth cookie details** — confirm the backend's login cookie is (or can be made) httpOnly + `SameSite`-appropriate, since Next.js middleware/Server Components will read it directly instead of the `localStorage` fallback. If it isn't currently, that's a small FastAPI-side tweak needed alongside this migration.
4. **Image hosting** — where do politician/article photos actually live at runtime (`UPLOAD_DIR` served by FastAPI? S3/CDN via `boto3`?) — needed to configure `next/image`'s `remotePatterns` correctly.
5. **TypeScript or stay JS?** — plan above assumes plain JS (`.jsx`) to match your current codebase 1:1. Happy to do `.tsx` instead if you'd like type safety going forward — bigger effort, your call.
6. **Sitemap ownership** — keep the existing Python `seo-tasks` sitemap generator running as-is (fastest path), or would you like it replaced by a Next.js-native `app/sitemap.js` pulling live from Mongo (removes the systemd timer/lockfile machinery, but is new code to test)?
7. **Node/Next version target** — any constraint from your hosting environment (matches what's noted in the existing infra doc's "same versions on test server" step)?

Once you confirm these, I can start scaffolding the actual Next.js project and porting files folder-by-folder in the order laid out in §2.
