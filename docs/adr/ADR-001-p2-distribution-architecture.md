# ADR-001: P2 Distribution Architecture

Status: PROPOSED

Date: 2026-07-13

## Context

The McLeod ROI Builder Phase 1 MVP is a local-first Next.js App Router application with TypeScript, Prisma, SQLite, local customer-logo storage, and local generated PPTX/PDF/HTML presentation artifacts. It has no authentication, no multi-user ownership model, no centralized backup, and no private object storage. Phase 1 validates the deterministic ROI methodology and presentation-generation workflow but is not a production distribution architecture.

P2 must decide how to operate the application for an internal pilot and eventual broader rollout without prematurely implementing production infrastructure in this decision phase.

## Decision

Recommend a secure hosted internal web application installed by users as a Microsoft Edge PWA as the primary P2 target architecture.

The hosted architecture should use:

- Next.js server deployment on an IT-approved hosting platform.
- PostgreSQL instead of SQLite.
- Microsoft Entra ID authentication.
- Application-level role-based authorization.
- Explicit user, team, and analysis ownership.
- Private object storage for uploaded logos and generated PPTX/PDF/HTML artifacts.
- HTTPS-only access.
- Centralized secrets management, logging, monitoring, backups, retention, and audit controls.
- Edge PWA installation for app-like access while preserving centralized web deployment and updates.

Fallback: use a tightly scoped local/Electron or local desktop pilot only if IT approval for hosted infrastructure blocks pilot timing and product leadership accepts the temporary operational risk. The fallback must be time-boxed, limited to a small pilot, and designed with an explicit migration path to hosted PostgreSQL/object storage.

## Considered options

### Option A: Hosted web app plus Edge PWA

A centrally hosted Next.js application with managed PostgreSQL, private object storage, Entra SSO, centralized backups, monitoring, and Edge PWA installation.

### Option B: Electron desktop application

An Electron wrapper that bundles the Next.js/Node runtime, uses local SQLite and local file storage, and is distributed through Intune or Company Portal.

### Option C: Hybrid pilot

A limited local/Electron pilot followed by the hosted architecture as the production target.

## Tradeoffs

| Option | Strengths | Weaknesses |
| --- | --- | --- |
| Hosted web app plus Edge PWA | Best fit for security, centralized updates, backup, sharing, manager visibility, auditability, and production scalability. Reuses most Phase 1 application logic. | Requires IT approvals for hosting, Entra app registration, PostgreSQL, object storage, secrets, monitoring, and deployment. Offline use is limited. |
| Electron desktop app | Strong offline behavior and potentially simpler small-user local pilot if no server environment is available. | Adds packaging, code-signing, local backup, endpoint support, version drift, migration, and local data-protection burden. Weak fit for sharing, manager visibility, central audit, and centralized backups. |
| Hybrid pilot | Can unblock a very small pilot if hosted approvals are delayed while preserving hosted target architecture. | Risks building disposable packaging work, delaying production foundations, and creating migration/support obligations. |

## Consequences

- P2 implementation should prioritize hosted production foundations instead of desktop packaging.
- Phase 1 SQLite must be migrated to PostgreSQL before multi-user production use.
- Generated PPTX files and uploaded logos must move from local directories to private object storage.
- Download endpoints must authorize each request against authenticated user ownership or manager/team permissions.
- Entra-based identity and role mapping must be designed before introducing multi-user data.
- Edge PWA installation can be handled as distribution/user-experience work after secure hosted deployment exists.
- Electron should not be built unless hosted approval delays make a temporary pilot fallback necessary.

## Unresolved questions

- Approved hosting platform, regions, network boundaries, and environment count.
- Entra app-registration ownership, SSO requirements, MFA, Conditional Access, and group-claim availability.
- Role source of truth and manager/team mapping source.
- PostgreSQL and object-storage service approvals.
- Signed URL versus application-proxied download policy.
- Logging/SIEM requirements and audit-event retention.
- Backup retention, restore testing, RTO, and RPO.
- Data-retention requirements for analyses, uploaded logos, snapshots, and generated files.
- Pilot size, production user count, and support ownership.
- Regulatory, contractual, or customer-data restrictions.

## Approval status

PROPOSED. This ADR is not approved for implementation until reviewed and accepted by the product owner and McLeod IT/security stakeholders.

## Required approvers

- Product owner for ROI Builder.
- McLeod IT application/platform owner.
- McLeod identity/security owner for Entra and Conditional Access.
- McLeod data/storage owner for PostgreSQL, object storage, backup, and retention.
- Support/change-management owner for pilot and rollout operations.
