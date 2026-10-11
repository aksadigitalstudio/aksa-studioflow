# AKSA StudioFlow

A working creative agency workspace for AKSA Studio: projects, tasks, production time, versioned deliverables, client review and IDR invoices. React 19 + TypeScript + Vite, with a persistent browser demo and an optional Supabase backend.

## Run locally

Requires Node 22.18 or newer.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4300. For production: `npm run build`, then `npm run preview`. Deploy `dist/` as a static SPA. `vercel.json` handles deep links on Vercel. No paid APIs or external assets are needed.

## Demo Mode

With no Supabase environment variables, all records and uploads persist in IndexedDB on this browser and origin. Sample clients, team members, projects, deliverables, time entries, payments and invoices are clearly demo records. The identity selector lets you try owner, admin and assigned team experiences. Every visitor has independent data; a demo portal link works in the browser where its records were created. Demo Mode is a sandbox, not authentication for a shared business database. Use fictional information in a public demo.

Create a client, project and tasks; move tasks through Kanban; start/pause/stop a timer or add time manually; add a deliverable and V1; submit it for review. Open its client portal in another tab, request a revision, upload V2, submit again and explicitly approve it. Complete remaining tasks, create and issue an invoice, then record partial or final payment. Payment actions record bookkeeping only and do not transfer funds.

Configuration is centralized in `src/config.ts`. IDR and the five configured stages initialize every new workspace. Tax defaults to zero because no tax percentage was specified; you may configure it in Settings or on individual invoices. Hourly billing uses approved, unbilled time at the project's rate. Currency cannot be relabeled once financial records exist. Issued invoice agency/currency details are snapshotted; future invoices use updated Settings.

## Enable Supabase

1. Create a fresh Supabase project. Run `supabase/schema.sql` in its SQL editor. It creates normalized business entities, RPC validation, private file storage, request idempotency, database constraints and RLS.
2. Create an owner account using Supabase Auth's administrator UI. Add that account's UUID using the SQL editor:

```sql
insert into public.studio_owners(user_id) values ('OWNER_AUTH_USER_UUID');
```

3. Copy `.env.example` to `.env.local`; set the project URL and the **publishable / anon** client key. Never put a service-role key in browser variables or source. Set the same two variables in deployment environment settings and rebuild.
4. Sign in as the provisioned owner and select **Initialize workspace**. Live mode starts with empty business records, keeping sample data separate.
5. Provision team accounts in Supabase Auth, then use the SQL editor:

```sql
insert into public.profiles(id,name,role)
values ('TEAM_AUTH_USER_UUID','Team Name','TEAM MEMBER');
-- ADMIN is also supported. Assign members on the project form.
```

6. Create the client in StudioFlow, obtain its client UUID from the database, create the client's Auth account, then associate it explicitly:

```sql
insert into public.profiles(id,name,role,client_id)
values ('CLIENT_AUTH_USER_UUID','Client Contact','CLIENT','CLIENT_UUID');
```

Share that client's opaque portal URL and account access privately. Live portals require the authorized client's login; changing a URL cannot grant access to another client. Disable public signup in your Supabase Auth settings for this provisioned-account workflow. Password creation and distribution happen through your administrator process, not through this demo.

Management data is available only through scoped RPCs. Team members see assigned projects and cannot administer finances; client portals exclude internal notes, task discussions, unrelated projects and profitability. Public invoice URLs expose only one issued invoice, using an unpredictable bearer token. Treat invoice links as confidential. Private files can be read only by assigned team members or the owning client after submission. File URLs are signed for one hour and refreshed by workspace reloads.

Uploads support optimized PNG/JPEG/WebP images and PDF files up to 10 MB. Other creative formats can use HTTPS preview links. Versions and approval history are preserved. Invoices never become paid without recorded payment actions; collected revenue, invoiced revenue and outstanding balances remain separate.

## Verification

```sh
npm run build
npm run test:domain
npm run test:database
npm run test:ui
```

The database tests execute the actual migration/RPCs in PostgreSQL via PGlite with simulated Auth/Storage schemas. Browser tests use installed Google Chrome via Playwright and start their own local server. Set `TEST_BASE_URL` to test a deployed demo; tests use a fresh, isolated browser context and fictional records. Test outputs include screenshots, a printable invoice PDF and JSON results in `test-artifacts/` (ignored by Git).

Before using live client data, configure your Supabase project, provision accounts, set backup/retention practices and validate the live environment. The shipped public demo does not activate a shared backend or send real email.
