# Mypremium CRM

The operating system for a used-car dealership. Inventory, sales pipeline,
agenda, targets, marketing attribution and a public storefront — one system,
one source of truth.

Built with Next.js 15, React 19, TypeScript, Prisma and PostgreSQL.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env        # then set DATABASE_URL and AUTH_SECRET

# 3. Create the schema and load the demo dealership
npm run db:setup      # db:push + db:seed, and says what is wrong when it fails

# 4. Run
npm run dev                 # http://localhost:3000
```

### Administrator

The seed also creates the platform administrator, `alexxalvesjr@gmail.com`,
with the `OWNER` role. `ADMIN_EMAIL` / `ADMIN_PASSWORD` override the defaults so
a real password never has to be committed.

To create or reset that account against a database that already holds real
data, run `npm run db:admin` — it is idempotent and touches nothing else, while
`db:seed` deletes every organization to rebuild the demo from scratch.

### Demo accounts

The seed creates a fully populated dealership (34 vehicles, 72 leads, 12 sales,
5 campaigns with 120 days of metrics). Password for all accounts:
**`Mypremium@2026`**

| Role | E-mail | What they see |
|---|---|---|
| Proprietário | `owner@mypremium.com` | Everything |
| Administrador | `admin@mypremium.com` | All modules + user management + audit log |
| Gerente | `gerente@mypremium.com` | Stock, pipeline, targets, marketing, CMS |
| Vendedor | `thiago@mypremium.com` | Own pipeline only; no costs or margins |
| Visualizador | `financeiro@mypremium.com` | Read-only |

Sign in as the salesperson and then the owner — the difference in what each one
can see is the clearest demonstration of the permission model.

---

## Modules

| Route | Module |
|---|---|
| `/dashboard` | KPIs, 12-month revenue/profit trend, goal pacing, ranking, agenda, activity |
| `/inventory` | Vehicle CRUD, gallery, filters, margin analysis, stock aging |
| `/crm` | Seven-stage Kanban, lead detail, timeline, tasks, contact actions |
| `/agenda` | Month/list calendar for visits, test drives and deliveries |
| `/goals` | Org + per-seller targets, attainment gauge, ranking, achievements |
| `/reports` | Revenue, margin, ROI, funnel, sources, aging, media return, exports |
| `/marketing` | Campaign performance: CPL, CPA, ROAS, CTR |
| `/users` | Team, permission matrix, audit log |
| `/settings` | Company data, brand, social links, profile |
| `/cms` | Storefront editor: hero, about, SEO, testimonials, services, FAQ |
| `/loja/[slug]` | Public storefront — listing, vehicle pages, enquiry form |

---

## Architecture

```
src/
├── app/
│   ├── (app)/          authenticated shell — one layout, all modules
│   ├── (auth)/         sign-in / sign-up
│   ├── (site)/loja/    public storefront per dealership
│   └── api/            auth, search, uploads, exports
├── components/
│   ├── ui/             design-system primitives
│   ├── charts/         validated chart palette + chart types
│   └── <feature>/      feature-scoped components
├── lib/
│   ├── domain/         business rules (profit, lead scoring, pipeline)
│   ├── validations/    Zod schemas — the contract for every mutation
│   ├── rbac.ts         permission catalogue
│   └── safe-action.ts  server-action pipeline
└── server/
    ├── repositories/   the only layer that builds queries
    ├── services/       cross-entity orchestration
    └── actions/        server actions
```

### Decisions worth knowing

**Tenancy is enforced in the repository, not the caller.** Every repository
method takes `organizationId` as its first argument and folds it into the
`where` clause. Mutations use `updateMany`/`deleteMany` with the tenant filter
rather than `update` by id, because the latter cannot be scoped. A route handler
that forgets to check still cannot read another dealership's data.

**Money is integer cents everywhere.** It becomes a decimal exactly once, in
`lib/format.ts`. No floating-point drift in a system whose whole job is margin.

**Profit has one definition.** `calculateProfit()` in `lib/domain/vehicle.ts` is
the only place it is computed, so the vehicle card, the dashboard and the
reports can never disagree.

**Server actions run a fixed pipeline.** `createAction()` composes
authenticate → authorise → rate-limit → validate → run → audit. A new action
cannot skip a step, and every failure maps to the same discriminated
`ActionResult` the client narrows.

**Permissions are declarative and shared.** `ROLE_PERMISSIONS` drives both the
UI and the server, so a hidden button and a rejected mutation can never
disagree. Salespeople are confined to their own pipeline at query, action and
route level; cost and margin are gated behind `vehicle:view_cost`.

**Storefront sync is a consequence, not a feature.** Public queries filter on
`published` and `status ∈ {AVAILABLE, RESERVED}`, and every mutation
revalidates both the back office and the storefront paths. Marking a car sold
removes it from the site and the sitemap in the same request.

**The chart palette was validated, not chosen.** Both light and dark step sets
were run through a six-check validator — lightness band, chroma floor,
adjacent-pair separation under protanopia/deuteranopia/tritanopia, a
normal-vision floor, and contrast against their own surface — and re-stepped
until every check passed. Re-validate before changing any `--chart-*` token.

---

## Security

| Concern | Approach |
|---|---|
| Authentication | Auth.js v5, JWT sessions, bcrypt (cost 12) |
| Authorisation | Role-based permission matrix, enforced server-side |
| Tenant isolation | Repository-level scoping on every query |
| Rate limiting | Per-user and per-IP windows; strict on auth, generous on reads |
| Input validation | Zod at every boundary, including query strings |
| SQL injection | Parameterised by Prisma; raw SQL uses `Prisma.sql` tagged templates |
| XSS | React escaping + an allow-list sanitiser for the one HTML field |
| CSV injection | Formula-leading cells neutralised on export |
| CSRF | Auth.js tokens; server actions are origin-checked by Next |
| Audit | Immutable log with actor, IP, user agent and redacted snapshots |
| Headers | CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` |
| Uploads | Authorised before bytes are accepted; type and size enforced |

The authenticated application is `Disallow`-ed in `robots.txt` and reports are
served `no-store`.

---

## Commands

```bash
npm run dev          # development server
npm run build        # production build (runs prisma generate first)
npm run start        # serve the production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run db:setup     # empty database → working login, in one command
npm run db:push      # sync schema without a migration
npm run db:migrate   # create a migration
npm run db:seed      # load the demo dealership (wipes existing data)
npm run db:admin     # create/reset the administrator, leaving all other data
npm run db:studio    # Prisma Studio
```

---

## Notes

**File uploads.** The gallery uses UploadThing. Without a token it falls back to
accepting image URLs, so the app is fully usable out of the box. To enable
uploads set `UPLOADTHING_TOKEN` and `NEXT_PUBLIC_UPLOADTHING_ENABLED="true"`.

**`@auth/core` is a direct dependency on purpose.** It pins a single copy so the
JWT module augmentation in `src/types/next-auth.d.ts` merges into the interface
`next-auth` actually uses. With two copies hoisted, every session claim silently
degrades to `unknown`.

**Typography** uses a system font stack (SF Pro / Segoe UI Variable / Inter),
which costs no network request and renders natively. Swap in `next/font` if you
want a fixed typeface across platforms.

**PDF export** goes through the browser's print pipeline against a dedicated
print stylesheet, so it renders the real page rather than a second layout that
drifts. Spreadsheet export is CSV with a UTF-8 BOM and `;` separators, which
Excel opens cleanly in pt-BR locales.

---

## Verified

`npm run typecheck`, `npm run lint` and `npm run build` all pass clean. The
running build was smoke-tested end to end: sign-in issues a session with tenant
and role claims; every module renders for a permitted role; restricted routes
redirect with no privileged data in the response body; the export endpoint
returns 403 for a salesperson; a sold vehicle 404s on the storefront and drops
out of the sitemap; and a vehicle slug from one dealership 404s under another's.
