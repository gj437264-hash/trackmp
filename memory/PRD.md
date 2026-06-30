# TrackMP — Product Requirements (Living Doc)

## Original Problem Statement
> I wanna build a website like facebook but only for the politicians there will be profiles of politicians created by normal users, their location - constituency and their work and promisess they make and how they deliver it and a tracker to that work

## User Personas
1. **Concerned citizen** — wants to look up their local politician, see promises and delivery record.
2. **Civic contributor** — adds politicians, logs promises and work, attaches sources.
3. **Journalist / researcher** — uses the public ledger as a reference, comments on records.
4. **Admin** — moderates content, verifies politicians.

## Core Requirements
- Politician profiles: name, party, position, constituency, state, photo, bio (community-editable)
- Promises tracker with status: Pending / In Progress / Delivered / Broken
- Work / Achievements feed
- Comments per politician
- 1–5 star rating per user per politician
- Upvote / Downvote on promises
- Search & filter by name, party, state, constituency
- Sort by recency, promises count, delivery, rating
- JWT-based email/password auth

## Implemented (v1 — 2026-02)
- Backend (FastAPI + Motor/MongoDB): register/login/logout/me, politician CRUD, promise CRUD + status update + voting, work CRUD, comments CRUD, ratings, stats overview, admin seed, indexes.
- Frontend (React + Tailwind + shadcn): Landing, Login, Register, Feed (search/filter/sort), Politician detail (Promises/Work/Discussion tabs, dialogs for adding), Add Politician form, Navbar with auth state, Sonner toasts.
- Swiss/high-contrast design system per `/app/design_guidelines.json` (Cabinet Grotesk + Inter, tabular-nums, status badges).

## Implemented (v1.1 — 2026-02 — backlog clear)
- Edit politician page (`/politicians/:id/edit`) — reuses form, PUT endpoint.
- "My contributions" page (`/me`) — politicians, promises, work I authored.
- Admin verification toggle (`PATCH /api/politicians/:id/verify`) + blue check on profile.
- Share button (Web Share API with clipboard fallback) on politician detail.
- DEPLOYMENT.md — full self-host guide for Ubuntu/Debian VPS (Mongo + uvicorn systemd + nginx + Let's Encrypt).

## Backlog (P1) — remaining
- Photo upload via object storage (currently URL-based)
- Politician compare (side-by-side)
- Public share cards / OG meta image with delivery score

## Backlog (P2)
- Email notifications for status changes
- AI summary of a politician's track record
- Constituency map view
- Mobile PWA polish

## Next Tasks
- Validate end-to-end with testing agent
- Hook up object storage for image uploads
- Add "my contributions" page
