# Hotel Management System
## Project Proposal and Development Requirements

**Prepared for:** Hotel Owners and Management  
**Purpose:** Approval in principle and funding authorization  
**Status:** Proposal for implementation and production readiness

---

## 1. Executive Summary

Hotel operations rely on coordinated, accurate information across reservations, front desk, housekeeping, food and beverage, billing, and finance. When these activities are managed through disconnected tools or manual records, staff spend time reconciling information, managers have limited visibility into current performance, and errors can affect both guest service and revenue.

This proposal seeks approval and funding to complete and implement an integrated Hotel Management System (HMS). The project already has a software foundation: a browser-based staff interface and public booking experience, supported by a Django API and separate operational modules. The proposed investment will turn that foundation into a secure, reliable, tested, and supportable system for day-to-day hotel operations.

The system is intended to provide one operational view of rooms, guests, reservations, charges, payments, restaurant orders, inventory, housekeeping, and end-of-day reporting. The recommended approach is a controlled, phased implementation: confirm business processes and compliance needs, complete and harden the software, test it with hotel staff and verified payment integrations, then launch with training and operational support.

**Decision requested:** Approve the project in principle and authorize a discovery and detailed costing phase. Release implementation funding against an agreed scope, budget, delivery plan, and acceptance criteria. No cost estimate is stated here because supplier quotations, infrastructure choices, payment-provider terms, and the final approved scope have not yet been established.

## 2. Business Case

An integrated HMS can support the hotel by:

- Reducing duplicate entry and manual handoffs between departments.
- Giving front-desk and management staff a shared view of room availability, reservations, and guest stays.
- Improving the consistency of folios, payments, cashier handovers, and daily financial reporting.
- Helping housekeeping and kitchen teams prioritize current work.
- Making operational and revenue information more timely and easier to review.
- Providing a foundation for direct online bookings and future integrations.

These are expected benefits, not guaranteed savings. Baseline measures should be collected before rollout and compared with agreed targets after launch.

## 3. Proposed Solution and Current Foundation

The current project contains a React and TypeScript web interface and a Django REST API. The interface includes a public booking entry point and authenticated staff workspace. The codebase has modules for:

- Dashboard and hotel settings.
- Rooms, rates, occupancy calendar, reservations, and guest records.
- Housekeeping and maintenance workflows.
- Folios, invoices, cashier shifts, and payment records.
- Restaurant point of sale, kitchen tickets, and inventory.
- Night audit, operational reporting, and audit-related functions.
- Staff accounts and role categories.

The backend currently uses SQLite in its checked-in settings, while the project includes PostgreSQL support in its dependencies and configuration examples. The configured payment service includes development/stub behavior. These details mean the existing code is a starting point, not evidence that production hosting, payment processing, security controls, or regulatory acceptance are complete.

The project should therefore proceed through verification and readiness work before the hotel relies on it for live guest, financial, or operational records.

## 4. Objectives and Measures of Success

The project objectives are to:

1. Establish a single, dependable workflow for the hotel’s approved core operations.
2. Protect guest and financial information through appropriate access controls and operating procedures.
3. Provide accurate, reconcilable records for reservations, charges, payments, and business-date close.
4. Train relevant staff and establish ongoing support and ownership.

Before implementation begins, management should approve measurable targets. Suggested measures include:

- Reservation and room-status discrepancies.
- Time required to complete check-in, check-out, and cashier reconciliation.
- Proportion of eligible charges and payments recorded in the HMS.
- Night-audit completion time and unresolved exceptions.
- Housekeeping task completion and room-readiness turnaround.
- Staff adoption, training completion, and support requests after launch.

Targets and baseline values should be set during discovery rather than assumed in advance.

## 5. Scope

### Proposed initial scope

- **Property setup:** rooms, room types, rates, taxes, service charges, business date, and operating rules.
- **Reservations and guests:** direct booking intake, reservation lifecycle, guest profiles, availability, arrivals, departures, cancellations, and no-shows.
- **Front office and rooms:** room status, occupancy visibility, check-in/check-out, and guest folios.
- **Housekeeping and maintenance:** task assignment, status tracking, and room-readiness coordination.
- **Billing and cashiering:** charges, payments, receipts/invoices, cashier shift opening and closing, and discrepancy recording.
- **Food and beverage:** restaurant orders, kitchen workflow, room-charge posting where approved, and sales reporting.
- **Inventory:** stock records and operational inventory workflows, with procurement controls confirmed during discovery.
- **Management reporting:** agreed operational, revenue, payment, and night-audit reports with defined reconciliation rules.
- **Staff administration:** accounts, approved roles, onboarding/offboarding, and responsibility separation.
- **Launch readiness:** hosting, backups, recovery procedures, training, support, and handover documentation.

### Items requiring separate confirmation

Third-party booking channel connections, accounting/payroll integrations, card-terminal integrations, production mobile applications, multi-property support, and advanced purchasing or forecasting are not assumed to be included. Owners should approve these as separate scope items if required.

## 6. Requirements

### Functional requirements

The delivered system must:

- Maintain availability and prevent conflicting room reservations for the same dates.
- Record reservation source, status, guest details, room assignment, dates, and applicable rate/charge breakdown.
- Support authorized staff workflows for arrivals, departures, cancellations, and no-shows.
- Track room status and housekeeping work so staff can identify rooms that are not ready.
- Maintain guest folios with itemized charges, payment status, balances, and a traceable link to the originating transaction where applicable.
- Record payment method, amount, status, reference, and responsible staff member; distinguish pending, completed, failed, and refunded transactions.
- Support cashier shift handover and record closing totals and discrepancies.
- Track restaurant orders through the kitchen workflow and post approved room charges accurately.
- Provide role-appropriate dashboards and reports, including a documented night-audit close and business-date process.
- Preserve an attributable history for sensitive changes to reservations, charges, payments, and business-date close.
- Provide usable error handling and prevent incomplete or invalid transactions from silently appearing as successful.

### Non-functional requirements

The system must:

- Be deployed on supported production infrastructure with a managed relational database and documented capacity assumptions.
- Use encrypted connections, secure credential storage, restricted network access, and production-appropriate security configuration.
- Enforce individual staff accounts, least-privilege access, and prompt removal or suspension of access when roles change.
- Have monitored backup and restore procedures, with recovery objectives agreed by management and verified through restore testing.
- Provide acceptable response times under an agreed peak-use workload and support the hotel’s operating schedule.
- Work on the browsers and devices selected by the hotel; essential workflows should be usable on the front-desk and back-office equipment in scope.
- Have documented release, incident, maintenance, and support procedures.
- Protect the confidentiality and integrity of guest and financial data, and retain records according to applicable hotel policy and legal requirements.

### Security and compliance requirements

Before production use, the implementation must replace development settings with secure production configuration. The current code settings include development-oriented values, including debug mode, permissive host/CORS configuration, a hard-coded development secret, and SQLite. These must not be carried into production.

The project must also:

- Verify authentication and authorization behavior for every staff role and sensitive action.
- Decide whether multi-factor authentication is required and implement it if approved; a stored account flag alone is not proof of an operational MFA control.
- Confirm applicable Ethiopian tax, privacy, record-retention, and payment-provider requirements with qualified stakeholders.
- Validate tax and service-charge calculations and report outputs against approved finance rules.
- Use only verified production payment-provider integrations. Development stubs must remain isolated from live transactions.
- Establish data-access, audit-review, incident-response, and breach-escalation procedures.

This proposal does not assert legal or tax compliance. The hotel should obtain appropriate professional review before launch.

## 7. Recommended Delivery Approach

| Phase | Main activities | Exit condition |
| --- | --- | --- |
| 1. Discovery and design | Confirm processes, users, roles, reports, integrations, policies, data migration needs, hosting, and success measures. | Owners approve requirements, scope, risks, delivery plan, and detailed budget. |
| 2. Completion and configuration | Close approved functional gaps; configure property, rates, taxes, roles, and operational rules; prepare production architecture. | Requirements are implemented or explicitly deferred; configuration is reviewed by process owners. |
| 3. Verification and readiness | Test workflows, permissions, calculations, integrations, backup/restore, performance, and failure/recovery scenarios; prepare operational and training materials. | Named business owners accept test evidence; critical defects and launch risks are resolved or formally accepted. |
| 4. Pilot and training | Train a small group; run the system alongside existing processes for agreed workflows; reconcile results and collect feedback. | Pilot results meet agreed measures and department leads approve rollout. |
| 5. Controlled rollout and support | Migrate approved data, launch by department or workflow, monitor incidents and adoption, and provide a defined stabilization period. | Operations are stable; support and ownership are transferred to named hotel personnel or provider. |

The existing records should not be treated as production data unless their accuracy, ownership, and migration suitability are verified. Any migration should include reconciliation and a rollback plan.

## 8. Governance, Roles, and Responsibilities

- **Owners/sponsor:** approve investment, scope, risk tolerance, and major changes; review benefits.
- **Hotel manager/project sponsor:** prioritize operations, resolve cross-department decisions, and approve business readiness.
- **Department leads:** validate requirements, workflows, reports, user acceptance, and training for their teams.
- **Finance lead:** approve financial rules, tax/service-charge treatment, payment reconciliation, and audit outputs.
- **Implementation team/provider:** deliver the agreed software, security controls, deployment, testing evidence, documentation, and handover.
- **System administrator:** manage approved accounts, configuration, monitoring, and access reviews.

A named owner should be assigned for ongoing data stewardship, system administration, vendor escalation, and post-launch support.

## 9. Key Risks and Mitigations

| Risk | Proposed mitigation |
| --- | --- |
| Current software foundation is mistaken for production-ready software | Conduct a documented readiness assessment and require phase exit approval before live use. |
| Incorrect room, rate, tax, or payment configuration affects service or revenue | Obtain department and finance sign-off; test representative cases and reconcile reports before launch. |
| Unauthorized access or exposure of guest/financial data | Harden deployment, verify permissions, secure secrets, use encrypted connections, and review access regularly. |
| Payment provider or external service is unavailable or not production-enabled | Confirm provider requirements early, test end-to-end with the provider, and define a safe manual contingency process. |
| Staff adoption is limited by unfamiliar workflows | Involve staff in discovery and pilot, provide role-based training, and maintain a feedback/support channel. |
| Data migration or launch interrupts operations | Validate source data, rehearse migration, keep a rollback path, and choose a low-risk rollout window. |
| Costs or scope expand during implementation | Approve a baseline scope and budget; assess change requests for cost, schedule, and operational impact. |

## 10. Funding and Procurement

Detailed funding should be established after discovery and supplier/hosting quotations. The approved budget should separately identify:

- Software completion, configuration, testing, and deployment.
- Hosting, database, monitoring, backup, and recovery services.
- Payment-provider onboarding, transaction costs, and supported hardware.
- Data preparation and migration.
- Staff training, launch support, and ongoing maintenance.
- Contingency for approved scope or infrastructure changes.

The proposal does not provide unsupported price or return-on-investment figures. A funding decision should be based on a costed plan and the hotel’s baseline operational measures. Any business case for savings or revenue improvement should state its assumptions and measurement period.

## 11. Acceptance and Owner Decision

Production launch should require, at minimum:

- Written approval of the requirements and configured business rules.
- Successful end-to-end acceptance tests for each in-scope department.
- Verified access controls and production security configuration.
- Reconciled reservation, folio, payment, tax, and night-audit test results.
- Confirmed payment-provider readiness for any live electronic payments.
- Successful backup restoration test and approved continuity procedures.
- Staff training completion and named operational/support owners.
- A documented pilot outcome and go-live approval.

**Requested owner action:** Approve the project in principle, appoint a sponsor and department representatives, and authorize the discovery/costing phase. Following delivery of the costed implementation plan, approve, revise, or decline the full implementation funding request.
