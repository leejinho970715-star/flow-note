# Flownote Studio · four-product release

## Product scope

- Flownote: existing report/project workspace.
- AgencyFlow: existing design pin feedback, project/customer/quote workspace.
- Follonote (팔로노트): company contacts, consultation notes, opportunity stages and entered amounts, dated follow-ups.
- Crewmemo (크루메모): announcements, shared events, internal approval with a different assigned reviewer, assigned tasks.

Studio is now a dedicated orange landing with actual fictional-sample screenshots in laptop/browser mockups, four detailed product sections, scoped implementation process, proposed pricing, FAQ and a manual Telegram inquiry draft. GSAP ScrollTrigger is bundled locally; native scrolling and reduced-motion preference are preserved. Connector/ribbon illustration assets are not used.

## Deployment

`FLOWNOTE_TARGET=company npm run build:vercel` builds the Studio static landing plus the Next.js exported `/follonote/`, `/crewmemo/` and workspace routes. The existing Flownote and AgencyFlow Vercel projects keep their separate entry points. Studio sitemap lists only public homes; workspaces have noindex metadata and robots exclusions. Every product has separate favicon/OG metadata. Public assets contain only fictional sample data.

## Data and access

Migration `20261028164110_studio_crm_groupware.sql` was applied after explicit CEO approval. Nine `studio_*` tables and `studio_command` reuse existing `af_orgs`, `af_members` and trial writability checks. Existing commands/tables were not replaced. All reads require internal staff membership; clients cannot read CRM or internal team content. Direct client DML is revoked. Command authorization checks confirmed non-anonymous Auth users, organization membership, trial expiry and scoped foreign keys. Approval decisions require a different assigned reviewer, and are immutable after a decision. The trial deadline is shared with the common AgencyFlow company, not restarted per product.

Browser demos use localStorage and synthetic identities, clearly separated from cloud mode. Demo role switching does not grant production permissions. Cloud mode uses the same real Supabase SDK/session and validated RPCs. Product data does not automatically synchronize across the four products. Shared identity does not imply cross-domain browser single sign-on.

## Verification and limits

- Node tests include CRM archive guards and assigned-reviewer approval locks.
- `supabase/tests/studio_workflow.sql` passed against the actual DB: contact/deal/follow-up/note/notice/event/task/approval creation, staff reads, denial of client and cross-company reads/writes, direct DML denial, self/wrong/repeated approval denial and expired-trial read-only. All fixtures were rolled back.
- Supabase security advisor returned no warnings after the migration.
- Browser checks: customer creation and consultation record persist through reload; assigned sample reviewer approves a request and the final state hides decision controls.
- Responsive DOM audit uses real fixed-width browser iframes because the IAB viewport override did not affect existing tab dimensions. Landing checked at 320/360/390/430/768/1024/1280 frame widths; new product homes and dashboards at 320/390/768. Page scroll width equals viewport client width; no long paragraphs below 100px width. Landing rendered text has minimum 14px.
- Two Studio auth callback URLs were explicitly approved and saved alongside the two existing Flownote/AgencyFlow callbacks.
- SMTP, real public signup email round-trip, subscription payments, automatic reminders, external data synchronization, payroll, attendance, accounting, contract e-signing and chat are not complete. The new apps have not been tested with a new permanent customer Auth account. DB integration tests do not establish production load capacity or paid readiness.

New product names are working brands, not a representation of trademark clearance. All costs on Studio are proposals subject to scope confirmation; opportunity totals are entered values, not revenue forecasts.
