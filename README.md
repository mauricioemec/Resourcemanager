# Resource Management Platform — Gestão de Recursos

Plataforma de **gestão de recursos para organização matricial e regional** de uma
empresa de engenharia. Consolida a **demanda** de recursos de todos os projetos,
a **capacidade** disponível e a **alocação** real — e visualiza **gap** e
**utilização** por região, por disciplina, por projeto e numa **visão global**.

> A platform to manage engineering resources across a matrix + regional
> organization: demand vs. capacity vs. allocation, with gap/utilization
> dashboards by region, discipline, project and a consolidated global view.
> The UI is **bilingual (PT/EN)** — switch in the sidebar.

## Stack

- **Next.js 14** (App Router, TypeScript) — full-stack, single codebase
- **Prisma + SQLite** — zero-infra local database
- **Recharts** + a hand-rolled **Heatmap** (CSS grid) for dense matrices
- **Tailwind CSS**

## Run online (GitHub Codespaces)

The fastest way to try it — no local setup, shareable link:

1. On the repo page, click the green **`<> Code`** button → **Codespaces** → **Create codespace on main**.
2. Wait for the automatic setup (`npm install` + seed + `npm run dev`). The web app opens on the forwarded **port 3000**.
3. To share with others, open the **Ports** tab, right-click port 3000 → **Port Visibility → Public**, then copy the `…-3000.app.github.dev` URL.

The `.devcontainer/` config handles install, seeding and starting the dev server automatically.

## Quick start (local)

```bash
npm install
npm run db:reset   # creates SQLite DB + seeds realistic estimated data
npm run dev        # http://localhost:3000  → /dashboard
```

`npm run db:reset` runs `prisma db push` then the deterministic seed. The seed
is **reproducible** (fixed RNG seed + fixed Jan-2026 anchor, 24-month horizon),
so the charts look identical on every run.

### Scripts

| Script | Action |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build (generates Prisma client + type-checks) |
| `npm run db:push` | Sync schema → SQLite |
| `npm run db:seed` | Seed estimated data |
| `npm run db:reset` | Drop DB, push schema, reseed |

## Domain model (the matrix)

Three time-phased facts stored as **one row per month** (`monthKey` = `YYYYMM`):

- **Demand** — what projects need (hours/FTE, by discipline, by month)
- **Capacity** — what's available (by region × discipline × month; seeded from the roster)
- **Allocation** — who is committed (resource → project, by month)

Derived metrics: **Gap** = Demand − Capacity · **Utilization** = Allocated ÷ Capacity ·
**Fill rate** = Allocated ÷ Demand.

Entities: `Region`, `Discipline`, `Project`, `Resource`, `Demand`, `Capacity`,
`Allocation` (see `prisma/schema.prisma`).

## Modules / views

- **Global View** (`/dashboard`) — KPIs, Region × Discipline gap heatmap,
  demand-vs-capacity over 24 months, utilization trend, demand by discipline,
  top overloaded cells.
- **Regions** (`/regions`, `/regions/[id]`) — CRUD; per-region Discipline × Month
  heatmap, staffing curve, roster.
- **Disciplines** (`/disciplines`, `/disciplines/[id]`) — CRUD; Region × Month
  heatmap, demand/capacity/allocation by region.
- **Projects** (`/projects`, `/projects/[id]`) — CRUD + filters; staffing curve,
  demand vs allocation, assigned resources.
- **Resources** (`/resources`, `/resources/[id]`) — CRUD + filters; per-person
  monthly utilization, project breakdown.
- **Allocation & Demand** (`/allocations`) — editable monthly grid (discipline ×
  month) per project with bulk upsert; the dashboards reflect edits.

## Seed data (estimated)

5 regions, 10 disciplines, ~42 projects, 360 resources, ~2.5k demand rows,
~14k allocation rows. Demand follows **bell/trapezoid staffing curves** per
project archetype; demand is intentionally scaled so a few disciplines
(Mechanical, Piping, Process) run a **shortage** (red) and others
(Environmental, Geotechnical) run a **surplus** (green). A deterministic greedy
allocator assigns resources by priority, preferring the local region.

## Key files

- `prisma/schema.prisma` — data model
- `prisma/seed.ts` + `prisma/seed/*` — deterministic estimated data
- `src/lib/queries/*` — aggregation layer (rollup, heatmap, trend, staffing, KPIs)
- `src/components/charts/*` — Heatmap + Recharts wrappers
- `src/app/*` — pages; `src/actions/*` — server actions (CRUD + bulk upsert)
