# TrackMP — Product Requirements Document (Living)

## Original Problem Statement
TrackMP Phase 2: A politician transparency platform (React + FastAPI + MongoDB) with
role-based governance (super_admin/admin/user), moderated signups with magic-link invites,
structured reference data (Countries → States → Cities → Constituencies), politician profiles
with brief_intro + image upload + relatives with per-relative wealth history, email service
abstraction (LogEmailProvider default, Resend/SendGrid-ready), social sign-in scaffolding
(disabled buttons), append-only audit log, and soft deletes with a Trash UI for restore/purge.

## Users
- **Super Admin** `admin@trackmp.com`: full platform control, admin management, audit review, trash.
- **Admin**: reference data + politician content management (no admin management).
- **Approved User**: read-only access after signup approval.
- **Public visitor**: view politician profiles, submit signup requests.

## Static Core Requirements
- RBAC (super_admin, admin, user), FastAPI dependency guards, React role gating.
- Moderated signup workflow with magic-link invitation (24h, single-use).
- Reference Data CRUD (Countries seeded on first boot; States/Cities/Constituencies user-managed).
- Politician profiles: brief_intro, image upload (UploadService → LocalDiskUploadProvider),
  wealth history (year, assets, liabilities, net_worth, notes, source_urls), relatives with
  their own nested wealth history.
- EmailService abstraction; LogEmailProvider default (writes to `email_logs` + console).
- Social sign-in scaffolding (Google, Facebook, Apple, Microsoft) — visible but disabled with tooltip.
- Audit log: append-only `audit_events` with actor/action/entity_type/entity_id/changed_fields/ip/timestamp.
- Soft deletes on politicians, users, relatives, wealth records, constituencies, countries, states, cities.
- Super Admin Trash UI: restore or purge (purge requires exact-name confirmation).

## Status (2026-02)
- ✅ Backend fully implemented in modular files (db, security, services, models, routes, server).
- ✅ 249 ISO countries seeded idempotently at startup.
- ✅ Super admin auto-promoted on startup.
- ✅ JWT auth with cookies + Bearer fallback; magic-link invitation; password reset.
- ✅ Full public directory + politician detail with tabs (Overview, Wealth chart+table, Relatives accordions).
- ✅ Dashboard: Overview, Politicians CRUD w/ dependent geo dropdowns + image upload,
  Reference Data manager, Signup Queue (approve/reject → email log), Admins CRUD,
  Audit Log with filters, Trash with typed-name purge confirmation.
- ✅ Social sign-in buttons rendered but disabled with tooltip.
- ✅ Swiss brutalist theme (Archivo/IBM Plex Sans/Mono, Klein blue, sharp corners, brutal shadows).

## Backlog (P1 / P2)
- P1: Rejection email to signup applicants (currently silent per user choice).
- P1: Bulk import of politicians / wealth from CSV.
- P1: Per-country flag icons on politician cards.
- P2: SES/Resend integration (drop-in via EmailService.set_provider).
- P2: S3/R2/GCS storage (drop-in via UploadService.set_provider).
- P2: Real Google/Facebook/Apple/Microsoft OAuth (via AuthProviderRegistry).
- P2: Audit log retention policy (currently keeps forever).
- P2: TypeScript migration.

## Architecture
- **Backend**: FastAPI + Motor + PyJWT + bcrypt. All routes prefixed `/api`.
  Modules: `server.py`, `db.py`, `security.py`, `services.py`, `models.py`, `routes.py`, `countries.py`.
- **Frontend**: React 19 + React Router v7 + Axios + shadcn/ui + Tailwind + Recharts + sonner.
- **Database**: MongoDB. Global read filter `deleted_at: null` applied in every query.
- **Storage**: Local disk via `UploadService` (LocalDiskUploadProvider). Files served at `/api/uploads/*`.
- **Email**: `LogEmailProvider` writes to DB `email_logs` + console.

## Next Actions
- Optional: Add public-facing rejection notifications.
- Optional: Add per-entity trash filter shortcuts on the Trash page.
- Optional: Enable one social provider (Google) for a real Emergent-managed auth path.
