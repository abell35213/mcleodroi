# P2 IT Questionnaire: ROI Builder Distribution and Security

Status: Draft for McLeod IT and product-owner confirmation.

## Hosting and network

1. What hosting platform is approved for an internal McLeod line-of-business web application?
2. Is Azure the preferred or required environment, or are other platforms approved?
3. Which environments are required before production: development, test, staging, production?
4. What network restrictions are required for application access: public internet with SSO, VPN, private endpoint, IP allowlist, or another model?
5. Are outbound connections from the application restricted?
6. Are there required data regions for application runtime, database, storage, logs, and backups?

## Microsoft Entra ID and SSO

1. Can McLeod IT create and approve a Microsoft Entra app registration for the ROI Builder?
2. Which SSO protocol and library pattern is preferred for Next.js applications: OpenID Connect/OAuth 2.0 via an approved library, SAML, or another standard?
3. Are group claims available for application role mapping?
4. Should application roles be assigned through Entra groups, application roles, an internal admin screen, or a combination?
5. What Conditional Access policies apply to this application?
6. Is MFA required for all users?
7. Are guest users or external users permitted, or must access be limited to McLeod employees only?
8. What session lifetime, idle timeout, and reauthentication requirements apply?

## Data services

1. Which managed PostgreSQL service is approved?
2. Are private endpoints, firewall rules, or VNet integration required for PostgreSQL?
3. What database backup schedule, point-in-time restore window, and retention period are required?
4. Which private object storage service is approved for generated presentations and uploaded customer logos?
5. Are private endpoints or storage firewall rules required for object storage?
6. Are signed URLs permitted, or must all downloads be proxied through the application after authorization?
7. Are customer logos and generated PPTX/PDF/HTML outputs considered confidential customer data?

## Encryption, secrets, and keys

1. What encryption-at-rest requirements apply to PostgreSQL, object storage, backups, and logs?
2. Are customer-managed keys required, or are platform-managed keys acceptable?
3. Which secrets-management service is approved?
4. Who owns secret rotation, and what rotation frequency is required?
5. Are local developer secrets allowed in `.env` files, or must local development use a managed vault workflow?

## Endpoint and distribution

1. Is Edge PWA installation approved for internal users?
2. Can IT publish or pin the ROI Builder PWA through Microsoft Edge management or Company Portal?
3. Is Intune available if a desktop fallback or shortcut deployment is required?
4. Are there endpoint restrictions that affect browser storage, downloads, file associations, or PWA installation?
5. Are downloaded PPTX/PDF/HTML files allowed on managed endpoints, and are DLP controls required?

## Logging, monitoring, and audit

1. Which logging and monitoring platform should receive application, infrastructure, and security events?
2. Should logs be forwarded to a SIEM?
3. What events must be audited: sign-in, role changes, analysis create/update/delete, presentation generation, file download, admin changes, support access?
4. What log retention period is required?
5. Are customer names or analysis details allowed in logs, or must logs avoid business data?
6. What alerting and escalation path is required for failures or suspected misuse?

## Compliance, testing, and change management

1. Are vulnerability scanning, dependency scanning, container scanning, or SAST tools required before pilot?
2. Is penetration testing required before pilot or before broader rollout?
3. What change-management approval is required for pilot deployment and production releases?
4. What incident-response process applies to application or data issues?
5. Are there contractual, regulatory, or customer-data restrictions that affect ROI analyses, uploaded logos, or generated presentations?
6. Who provides first-line support, application support, infrastructure support, and data-restore support?
7. What business-continuity and disaster-recovery targets apply: RTO, RPO, backup retention, and restore-test cadence?
