# McLeod ROI Builder

McLeod ROI Builder is a local-first internal sales tool foundation for McLeod Software team members. The MVP will help sellers create customer-specific business impact analyses for Truckload (LoadMaster) and Brokerage (PowerBroker) opportunities.

## MVP purpose

The application will eventually support this workflow:

Create Analysis → Select Opportunities → Complete Assessment → Review Value Story → Generate Presentation

P1-1 establishes only the repository foundation and local application bootstrap.

## Technology stack

- Next.js App Router
- TypeScript with strict mode
- Tailwind CSS
- shadcn/ui-compatible folder structure (`components/ui`)
- SQLite
- Prisma
- Zod
- Vitest
- Playwright
- PptxGenJS dependency installed for future work only

## Local prerequisites

- Node.js 20 or newer
- npm

No Docker, cloud services, authentication provider, or external AI APIs are required.

## Fresh-clone setup

```bash
git clone <repository-url>
cd mcleodroi
npm install
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database setup

The app uses Prisma with a local SQLite database at `prisma/dev.db` by default. The development database URL is stored in `.env`:

```bash
DATABASE_URL="file:./dev.db"
```

Useful database commands:

```bash
npm run db:setup    # generate Prisma client and apply the initial migration
npm run db:generate # regenerate Prisma client
npm run db:migrate  # create/apply development migrations
npm run db:studio   # open Prisma Studio
```

## Development commands

```bash
npm run dev       # start the local Next.js app
npm run build     # create a production build
npm run lint      # run ESLint
npm run typecheck # run TypeScript without emitting files
npm run test      # run Vitest unit tests
npm run test:e2e  # run Playwright smoke tests
npm run verify    # lint, typecheck, unit tests, and build
```

## Current P1-1 scope

Implemented in this foundation task:

- Local Next.js App Router application shell
- Dashboard landing page for Business Impact Analyses
- Analysis workflow route shells
- Reusable typed workflow progress component
- Prisma SQLite setup with a minimal `Analysis` model
- Reusable Prisma client abstraction
- Zod create-analysis validation schema
- Unit tests for validation and workflow progress
- Playwright smoke test for the landing page

## Explicitly deferred functionality

P1-1 intentionally does **not** implement:

- ROI calculation formulas or Excel formula ports
- The 21 value module registry
- Value classification logic or overlap warnings
- LoadMaster or PowerBroker narrative registries
- Customer-specific narrative rendering
- PowerPoint or PDF generation
- Customer logo upload/rendering workflows
- Authentication, roles, or permissions
- CRM integrations
- AI or external benchmark services
- Cloud deployment, AWS, Postgres, Docker, Redis, or background workers

## P1-3 deterministic calculation engine

The calculation engine in `lib/calculations` provides pure TypeScript business validation and deterministic financial calculations for the 21 canonical value modules from `lib/modules`.

Key methodology rules:

- Percentage inputs use decimal representation: pass 2% as `0.02`, 17% as `0.17`, and 100% as `1`.
- `WEEKS_PER_MONTH` is fixed at `4.33` for the MVP methodology.
- Calculation functions preserve internal precision and do not perform display rounding.
- Capacity value is modeled recovered capacity; it is not automatically cash savings.
- Trailer avoided capital is reported as `informationalCapitalValue`, distinct from the recurring monthly equivalent.
- Driver turnover reports annual cost avoidance as `annualOnlyValue`; monthly equivalent is a derived metric only.

## Analysis Module Persistence and Aggregate Value Engine

The analysis domain persists only customer-specific state. Canonical value module metadata remains in the TypeScript registry under `lib/modules`; the database does not contain a `value_modules` table and does not duplicate module labels, input definitions, business applicability, value types, overlap groups, or category mappings.

Selected modules are stored per `Analysis` as `AnalysisModule` rows. Customer assumptions are normalized as `AnalysisModuleInput` key/value rows with one `numericValue` per canonical input key. P1-4 uses SQLite `Float`/REAL storage because the existing deterministic calculation engine uses JavaScript numbers; no Decimal arithmetic library is introduced in this phase.

Calculation results are intentionally not persisted. The analysis service reconstructs calculation inputs from persisted rows plus canonical registry defaults, calls `calculateValueModule(...)`, and derives module state from the current inputs. Default values are metadata only and are not automatically written as input rows. Trailer asset defaults use `asset_life_months = 60` and `residual_value_pct = 0.20`; Short Haul uses `transaction_cost_per_ticket = 0.25`.

Input saves use PATCH semantics: provided keys are inserted or updated, omitted keys remain unchanged, and clearing one field requires the explicit clear-input service. The service never treats a cleared or omitted input as zero.

Module status is derived centrally: `NOT_STARTED` means no customer inputs are persisted, `IN_PROGRESS` means inputs are partial or the deterministic calculation returns validation issues, and `COMPLETE` requires all required non-default inputs plus a successful calculation.

Aggregate totals include only selected modules that are `COMPLETE` with successful calculation outcomes. Monthly recurring totals sum only `financialOutputs.monthlyRecurringValue`; annual-only values such as Driver Turnover do not create synthetic monthly recurring totals. Total identified annual economic opportunity is `annualRecurringValueTotal + annualOnlyValueTotal`. Informational capital values, such as Trailer Asset Utilization avoided capital investment, are exposed separately and are excluded from total annual economic opportunity. Successful module value is also grouped by canonical `ValueType`.

Database-integrated Vitest coverage uses a temporary SQLite database per test file. Tests run `prisma migrate deploy` against that temporary database, instantiate an isolated Prisma client with the temporary datasource URL, reset data between tests, and remove the temporary database directory afterward.
