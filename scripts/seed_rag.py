#!/usr/bin/env python3
"""
Seed knowledge_chunks with realistic RAG vectors for Acme Inc employees.
Uses gemini-embedding-001 (768d) via Gemini REST API.
Inserts via Supabase REST API with service role key.

Run: python3 scripts/seed_rag.py
"""

import os
import re
import json
import uuid
import time
import requests
from datetime import datetime
from pathlib import Path

# ── CONFIG — read from .env ───────────────────────────────────────────
def load_env(path: str) -> dict:
    env = {}
    for line in Path(path).read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env

_env = load_env(Path(__file__).parent.parent / ".env")

SUPABASE_URL      = _env.get("VITE_SUPABASE_URL", "https://kroqooyprcvzzgkclvmy.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = _env["VITE_SUPABASE_SERVICE_ROLE_KEY"]
GEMINI_API_KEY    = _env["GEMINI_API_KEY"]
TENANT_ID = "demo"

EMBED_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"gemini-embedding-001:embedContent?key={GEMINI_API_KEY}"
)

# ── KNOWLEDGE CHUNKS ──────────────────────────────────────────────────
# Format: (domain, source, source_type, content, metadata_dict)
CHUNKS = [
    # ── IT ────────────────────────────────────────────────────────────
    (
        "IT", "IT-WF-0042", "resolved_workflow",
        """Employee: How do I set up VPN access for remote work?

Resolution: VPN access was provisioned via Cisco AnyConnect.
Steps taken:
1. IT confirmed employee eligibility for VPN (full-time staff, approved by manager Marcus).
2. Cisco AnyConnect client downloaded from IT portal at https://intranet.acmecorp.com/it/vpn.
3. VPN profile pushed to employee device via MDM (Jamf).
4. Employee authenticated using corporate SSO credentials + MFA token.
5. Connection tested — employee confirmed access to internal file shares and dev environments.
6. IT ticket closed.

Common issues: If MFA token is not received, check Okta Verify app is enrolled. For Windows, ensure AnyConnect version ≥ 4.10.""",
        {"employee": "Jordan Lee", "dept": "IT", "ticket_id": "IT-WF-0042", "resolution_days": 1},
    ),
    (
        "IT", "IT-WF-0055", "resolved_workflow",
        """Employee: I need a new laptop for my development work. My current MacBook Pro is 4 years old and struggling with Docker containers.

Resolution: New MacBook Pro 14" M3 Pro was provisioned.
Steps taken:
1. Hardware request submitted and approved by IT Manager (James Wilson) + Cost Center owner.
2. Procurement ordered from Apple Business — delivery 3 business days.
3. Old MacBook wiped via MDM enrollment + FileVault key escrowed.
4. New device enrolled in Jamf MDM, corporate apps pushed: Slack, Zoom, VS Code, Docker Desktop, 1Password.
5. Employee's GitHub SSH key migrated, dev environment verified functional.
6. Old device returned to IT for refurbishment.

Policy: Laptop refresh eligible after 3 years for engineering roles. Requires manager approval + cost center code.""",
        {"employee": "Jordan Lee", "dept": "IT", "ticket_id": "IT-WF-0055", "resolution_days": 4},
    ),
    (
        "IT", "IT-WF-0078", "resolved_workflow",
        """Employee: I need access to the AWS production environment for our new deployment pipeline.

Resolution: AWS IAM role with read-only prod access granted.
Steps taken:
1. Access request reviewed — employee is DevOps Engineer, access justified for deployment monitoring.
2. Manager (David Chen, Operations) approved.
3. Security review by Priya Singh — confirmed no access to PII or financial data in prod account.
4. AWS IAM role 'acme-devops-prod-readonly' assigned to employee's SSO identity.
5. Access verified — employee can view CloudWatch logs, EC2 instances, S3 (read-only).
6. Privileged access logged to PAM system.

Note: Write access to production requires CISO approval. Break-glass access available for incidents via PAM vault.""",
        {"employee": "James Wilson", "dept": "IT", "ticket_id": "IT-WF-0078", "resolution_days": 2},
    ),
    (
        "IT", "IT-WF-0091", "resolved_workflow",
        """Employee: Password reset needed — locked out of corporate account after too many failed attempts.

Resolution: Password reset completed via IT helpdesk with identity verification.
Steps taken:
1. Employee called IT helpdesk (x4357) — identity verified via employee ID + manager callback.
2. AD account unlocked via Active Directory Users and Computers.
3. Temporary password issued; employee forced to change on next login.
4. MFA re-enrolled in Okta Verify — previous MFA device deregistered (reported as lost).
5. Employee confirmed access restored to email, Slack, and corporate apps.
6. Security incident report filed per policy (potential MFA device loss).

Self-service: Employees can reset passwords at https://passwordreset.acmecorp.com using MFA verification without IT.""",
        {"employee": "Rachel Foster", "dept": "IT", "ticket_id": "IT-WF-0091", "resolution_days": 0},
    ),
    (
        "IT", "IT-WF-0103", "resolved_workflow",
        """Employee: Need Salesforce CRM access for the new marketing campaign tracking project.

Resolution: Salesforce license assigned, Marketing Cloud user role provisioned.
Steps taken:
1. Access request submitted by Rachel Foster, approved by Marketing Director.
2. Salesforce admin confirmed available license in pool (Marketing Cloud Growth edition).
3. User account created in Salesforce with 'Marketing User' profile.
4. Single Sign-On configured — employee can access via Okta tile.
5. Intro training video sent: https://trailhead.salesforce.com/en/content/learn/modules/lex_implementation_basics
6. Access reviewed — scope limited to Marketing campaigns, no access to Finance or Sales pipeline data.

License cost: $150/month allocated to Marketing cost center CC-MKT-04.""",
        {"employee": "Rachel Foster", "dept": "IT", "ticket_id": "IT-WF-0103", "resolution_days": 1},
    ),

    # ── HR ─────────────────────────────────────────────────────────────
    (
        "HR", "HR-WF-0019", "resolved_workflow",
        """Employee: I need to request 5 days of PTO for a family vacation from March 24-28.

Resolution: PTO request approved and recorded in HRIS.
Steps taken:
1. Employee submitted PTO request via HR portal — 5 days, March 24-28.
2. Manager (David Chen) approved within 24 hours — coverage arranged with Jordan Lee.
3. PTO recorded in Workday: current balance was 15 days, deducted to 10 days remaining.
4. Calendar block added to company calendar; out-of-office auto-reply configured.
5. Employee notified of approval via email and Slack.

PTO Policy: Full-time employees accrue 1.25 days/month (15 days/year). Requests >5 days require 2 weeks advance notice. Rollover cap: 5 days maximum.""",
        {"employee": "Aisha Johnson", "dept": "HR", "ticket_id": "HR-WF-0019", "resolution_days": 1},
    ),
    (
        "HR", "HR-WF-0033", "resolved_workflow",
        """Employee: I recently moved and need to update my home address for payroll and benefits.

Resolution: Address updated in Workday and benefits carrier records.
Steps taken:
1. Employee submitted address change form via HR portal with new address and effective date.
2. HR verified identity — employee ID matched.
3. Address updated in Workday (payroll system) — effective immediately.
4. Benefits carrier (Aetna health, Fidelity 401k) notified via HR EDI feed — 24-48hr propagation.
5. New state payroll tax withholding calculated — employee moved from TX to CA, state tax withholding updated.
6. Employee confirmed W-2 address update for upcoming tax season.

Note: Employees moving to a different state must update within 10 business days per policy. State tax changes may affect net pay.""",
        {"employee": "Maya Patel", "dept": "HR", "ticket_id": "HR-WF-0033", "resolution_days": 1},
    ),
    (
        "HR", "HR-WF-0047", "resolved_workflow",
        """Employee: What are my health insurance options during open enrollment? I want to understand the difference between the HMO and PPO plans.

Resolution: Benefits explanation provided; employee selected PPO plan.
Steps taken:
1. HR scheduled 30-minute benefits consultation with Maya Patel (HR Business Partner).
2. Plan comparison provided:
   - HMO (Aetna HMO Gold): Lower premium $180/mo employee, requires referrals, in-network only, $20 copay
   - PPO (Aetna PPO Platinum): Higher premium $320/mo employee, no referrals, in/out network, $40 copay, $1,500 deductible
   - HDHP (Aetna HDHP): Lowest premium $95/mo, $3,000 deductible, HSA eligible ($3,850 annual contribution limit)
3. Employee selected PPO for family coverage — dependent children added.
4. Enrollment confirmed in Aetna portal; effective April 1.
5. Dental and vision auto-renewed (Delta Dental + VSP).

Open enrollment: November 1-15 annually. Life events (birth, marriage, move) allow mid-year changes within 30 days.""",
        {"employee": "Carlos Rodriguez", "dept": "HR", "ticket_id": "HR-WF-0047", "resolution_days": 2},
    ),
    (
        "HR", "HR-WF-0061", "resolved_workflow",
        """Employee: We have a new hire starting on April 7. What does the onboarding process look like?

Resolution: New hire onboarding workflow initiated for incoming Software Engineer.
Steps taken:
1. Hiring manager (Jordan Lee) submitted new hire details — name, start date, department, role, cost center.
2. IT notified: laptop order placed (MacBook Pro M3), accounts pre-created in AD, email, Slack, GitHub.
3. HR sent welcome email with Day 1 schedule, building access instructions, parking pass.
4. Facilities prepared workstation in Engineering area, building access badge issued.
5. Day 1 agenda: HR orientation 9-10am (benefits, policies), IT setup 10am-12pm, team lunch 12pm, manager 1:1 2pm.
6. 30-60-90 day plan template sent to hiring manager.
7. Required training assigned in LMS: Security Awareness, Code of Conduct, Harassment Prevention.

New hire checklist: https://intranet.acmecorp.com/hr/new-hire-checklist""",
        {"employee": "Maya Patel", "dept": "HR", "ticket_id": "HR-WF-0061", "resolution_days": 1},
    ),

    # ── Finance ────────────────────────────────────────────────────────
    (
        "Finance", "FIN-WF-0028", "resolved_workflow",
        """Employee: I need to submit an expense report for $847.50 in client entertainment expenses from last week's customer dinner.

Resolution: Expense report submitted and approved in Concur.
Steps taken:
1. Employee submitted expense report in Concur with receipts — client dinner, 6 attendees, business purpose documented.
2. Itemization: Dinner $620, Uber to restaurant $42.50, Uber return $48, parking $37 (total $847.50 — under $1,000 single-receipt limit).
3. Manager (David Chen) approved within 48 hours.
4. Finance reviewed for policy compliance: client entertainment requires attendee list + business purpose ✓.
5. Reimbursement processed to direct deposit — 3-5 business days.
6. Expense coded to: Cost Center CC-OPS-02, GL Account 6050 (Client Entertainment).

Policy: Client entertainment >$500 requires VP approval. Alcohol expenses are reimbursable up to 30% of meal cost.""",
        {"employee": "Carlos Rodriguez", "dept": "Finance", "ticket_id": "FIN-WF-0028", "resolution_days": 3},
    ),
    (
        "Finance", "FIN-WF-0041", "resolved_workflow",
        """Employee: How do I get budget approval for a new $15,000 software tool for the Finance team?

Resolution: Capital expenditure request submitted and approved through Finance committee.
Steps taken:
1. Employee completed Business Case template: tool name (Adaptive Planning), vendor, cost, ROI justification.
2. Finance Manager reviewed — tool replaces manual Excel budgeting, estimated 40 hours/month saved.
3. CapEx request submitted to Finance Committee (monthly review cycle).
4. Vendor security review by Priya Singh — SOC 2 Type II certified, data residency confirmed US.
5. IT compatibility review — SaaS tool, no on-prem requirements, SSO integration available.
6. Finance Committee approved at March meeting — PO raised, net-60 payment terms negotiated.
7. IT initiated SSO setup; 5 Finance team licenses provisioned.

Note: Software >$10,000 requires CapEx treatment (amortized over 3 years). <$10,000 can be OpEx (immediate expense).""",
        {"employee": "Carlos Rodriguez", "dept": "Finance", "ticket_id": "FIN-WF-0041", "resolution_days": 14},
    ),

    # ── Legal ──────────────────────────────────────────────────────────
    (
        "Legal", "LGL-WF-0015", "resolved_workflow",
        """Employee: I need an NDA reviewed and signed before a vendor meeting next Tuesday.

Resolution: NDA reviewed, redlined, and executed within 2 business days.
Steps taken:
1. Employee submitted vendor NDA via Legal portal — attached PDF, vendor contact details, meeting date.
2. Sarah Kim (Associate Counsel) reviewed — identified 3 issues: unlimited liability clause, IP ownership ambiguity, 5-year term too long.
3. Redlines sent to vendor: reduced liability to $500k cap, clarified pre-existing IP carve-out, reduced term to 2 years.
4. Vendor accepted all redlines — counter-signed same day.
5. Executed NDA stored in ContractWorks (contract management system) under vendor record.
6. Employee notified — ready for Tuesday meeting.

Note: All NDAs must go through Legal regardless of dollar value. Standard Acme NDA template is pre-approved for counter-party use (ask Legal for template).""",
        {"employee": "Sarah Kim", "dept": "Legal", "ticket_id": "LGL-WF-0015", "resolution_days": 2},
    ),
    (
        "Legal", "LGL-WF-0029", "resolved_workflow",
        """Employee: Is our new AI tool compliant with GDPR and CCPA data privacy requirements?

Resolution: Privacy impact assessment completed — tool approved with conditions.
Steps taken:
1. Sarah Kim conducted Data Privacy Impact Assessment (DPIA) for new AI analytics tool.
2. Data flows mapped: tool processes employee email metadata (not content), no PII transmitted to vendor.
3. GDPR analysis: data is pseudonymized, processing basis is legitimate interest, vendor is EU-US DPF certified.
4. CCPA analysis: no sale of personal data, opt-out mechanism available, privacy notice updated.
5. Vendor DPA (Data Processing Agreement) signed.
6. Conditions: employee privacy notice updated on intranet, IT to enable audit logging of all data access.
7. Legal signed off — tool approved for deployment with 6-month review.

Contact Legal before deploying any tool that processes employee, customer, or partner personal data.""",
        {"employee": "Sarah Kim", "dept": "Legal", "ticket_id": "LGL-WF-0029", "resolution_days": 5},
    ),

    # ── Facilities ─────────────────────────────────────────────────────
    (
        "Facilities", "FAC-WF-0022", "resolved_workflow",
        """Employee: The projector in Conference Room B is broken and we have a client presentation tomorrow morning.

Resolution: Projector replaced within 4 hours; backup AV setup provided.
Steps taken:
1. Marcus Thompson (Office Manager) received emergency ticket at 2pm.
2. Facilities tested Room B projector — HDMI board failure, not repairable same-day.
3. Spare 75" Samsung smart display wheeled in from storage room — HDMI + wireless casting supported.
4. IT cable management done — Room B fully functional by 6pm.
5. Projector sent for repair; new EPSON EB-X51 ordered as permanent replacement (3-day delivery).
6. Client presentation went ahead successfully next morning.

For AV issues before events: contact Facilities at facilities@acmecorp.com or ext. 4200 with ≥2 hours notice for same-day support.""",
        {"employee": "Marcus Thompson", "dept": "Facilities", "ticket_id": "FAC-WF-0022", "resolution_days": 0},
    ),
    (
        "Facilities", "FAC-WF-0036", "resolved_workflow",
        """Employee: I'd like to book a standing desk and request an ergonomic assessment for my workstation.

Resolution: Standing desk provisioned; ergonomic assessment completed.
Steps taken:
1. Employee submitted ergonomic request via Facilities portal — wrist pain, current desk not height-adjustable.
2. Marcus Thompson scheduled ergonomic assessment with certified consultant (next day, 30 minutes).
3. Assessment findings: monitor too low (neck strain), keyboard angle causing wrist flexion, chair armrests wrong height.
4. Recommendations: standing desk converter ($350), monitor riser, ergonomic keyboard + mouse.
5. Facilities approved budget from Wellness allocation — all items ordered.
6. Setup completed by Facilities within 3 business days. Follow-up check scheduled in 2 weeks.

Ergonomic assessments available to all employees at no cost — request via Facilities portal. Budget up to $500 per employee for approved ergonomic equipment.""",
        {"employee": "Marcus Thompson", "dept": "Facilities", "ticket_id": "FAC-WF-0036", "resolution_days": 3},
    ),

    # ── Security ───────────────────────────────────────────────────────
    (
        "Security", "SEC-WF-0018", "resolved_workflow",
        """Employee: I received a suspicious phishing email claiming to be from our CEO asking me to buy gift cards urgently.

Resolution: Phishing email quarantined; incident documented; company-wide alert sent.
Steps taken:
1. Employee reported email via 'Report Phishing' button in Outlook — quarantined immediately.
2. Priya Singh (Security Analyst) analyzed headers: spoofed sender, originating from malicious domain registered yesterday.
3. Email scanning rule updated to block domain across all mailboxes.
4. Confirmed no employee clicked links or responded — no compromise.
5. Company-wide security awareness notice sent with phishing indicators.
6. Incident documented in security log (Severity: Medium, Outcome: Contained).

CEO fraud / gift card scams are common. Acme will NEVER ask employees to purchase gift cards via email. When in doubt, call the person directly before taking any action. Forward suspicious emails to security@acmecorp.com.""",
        {"employee": "Priya Singh", "dept": "Security", "ticket_id": "SEC-WF-0018", "resolution_days": 0},
    ),
    (
        "Security", "SEC-WF-0031", "resolved_workflow",
        """Employee: How do I request access to a confidential project folder in SharePoint that I need for my work?

Resolution: SharePoint access granted after approval workflow.
Steps taken:
1. Employee submitted access request — SharePoint site 'Project Nexus', read-only requested.
2. Priya Singh reviewed: Project Nexus is classified Confidential — requires DLP policy review.
3. Access request sent to Project Nexus owner (David Chen) — approved for project duration only.
4. Time-limited access granted: 90 days, auto-expire. Employee notified.
5. DLP policy confirmed: SharePoint content labeled Confidential cannot be downloaded to personal devices.
6. Access logged in PAM audit trail.

Access requests to Confidential/Restricted SharePoint sites must go through Security review. Permanent access requires quarterly access reviews. Time-limited access (30/60/90 days) is preferred.""",
        {"employee": "Priya Singh", "dept": "Security", "ticket_id": "SEC-WF-0031", "resolution_days": 1},
    ),

    # ── Operations ─────────────────────────────────────────────────────
    (
        "Operations", "OPS-WF-0024", "resolved_workflow",
        """Employee: We need to onboard a new software vendor (DataSync Pro). What's the vendor approval process?

Resolution: Vendor approved after security and legal review; contract executed.
Steps taken:
1. David Chen submitted vendor onboarding request — DataSync Pro, data integration SaaS, estimated $24k/year.
2. Legal review (Sarah Kim): MSA, DPA, SLA reviewed. 3 redlines negotiated: liability cap, data deletion timeline, SLA penalties.
3. Security review (Priya Singh): SOC 2 Type II ✓, pen test report reviewed, API security assessed.
4. Finance approved budget allocation from Operations budget.
5. IT assessed integration requirements — REST API, OAuth 2.0, no special network access needed.
6. Vendor approved — PO raised, contracts executed and stored in ContractWorks.
7. IT provisioned API credentials; integration deployed to staging for testing.

Vendor onboarding SLA: 10 business days (simple), 20 business days (complex/high-risk). Requires Legal + Security sign-off for all vendors handling company data.""",
        {"employee": "David Chen", "dept": "Operations", "ticket_id": "OPS-WF-0024", "resolution_days": 12},
    ),
    (
        "Operations", "OPS-WF-0039", "resolved_workflow",
        """Employee: I need to understand our disaster recovery plan and what my team's role is during an incident.

Resolution: DR plan reviewed; team roles documented and tabletop exercise scheduled.
Steps taken:
1. David Chen requested DR plan review for Operations team.
2. IT provided current DR documentation — RTO 4 hours, RPO 1 hour for critical systems.
3. Operations team roles defined: David Chen = Incident Commander, James Wilson = Infrastructure Lead, Priya Singh = Security Lead.
4. Communication tree documented: David → VP Operations → CEO for Severity 1 incidents.
5. Tabletop exercise scheduled for April 15 — scenario: ransomware attack affecting core ERP.
6. Action items: update emergency contact list, test backup restoration monthly, document manual fallback procedures.

DR Plan: https://intranet.acmecorp.com/operations/dr-plan (Confidential). Incident reporting: security@acmecorp.com or call the 24/7 hotline at x4911.""",
        {"employee": "David Chen", "dept": "Operations", "ticket_id": "OPS-WF-0039", "resolution_days": 5},
    ),

    # ── Marketing ──────────────────────────────────────────────────────
    (
        "Marketing", "MKT-WF-0017", "resolved_workflow",
        """Employee: I need the latest brand assets (logo, color palette, fonts) for a new product launch presentation.

Resolution: Brand asset package sent and Figma access provisioned.
Steps taken:
1. Rachel Foster (Brand Manager) confirmed request — new hire preparing executive presentation.
2. Brand asset package sent: logos (SVG, PNG, EPS), color codes (primary: #E8A020, secondary: #1A2B4A, white: #FFFFFF), typography (Montserrat headings, Open Sans body).
3. Requestor added to Acme Brand Figma workspace with viewer access.
4. Brand guidelines document shared: https://intranet.acmecorp.com/marketing/brand-guidelines
5. Presentation template (PowerPoint + Google Slides) shared from Brand drive.

Always use approved brand assets. Do not use older logo versions (pre-2024 rebrand). For custom design requests, contact Marketing ≥5 business days before deadline.""",
        {"employee": "Rachel Foster", "dept": "Marketing", "ticket_id": "MKT-WF-0017", "resolution_days": 1},
    ),

    # ── Cross-domain system docs ───────────────────────────────────────
    (
        "IT", "SYS-DOC-001", "system_doc",
        """Acme Inc IT Systems Catalog — Quick Reference

Critical Systems:
- Email: Microsoft 365 (Outlook) — support: it@acmecorp.com
- Chat: Slack (workspace: acmecorp.slack.com)
- Video: Microsoft Teams + Zoom (both supported)
- File Storage: SharePoint / OneDrive (M365), Google Drive (Marketing only)
- HR System: Workday (payroll, PTO, benefits, org chart)
- IT Ticketing: ServiceNow (submit tickets via https://acme.service-now.com)
- Identity: Okta SSO + Microsoft Azure AD
- Password Manager: 1Password (teams plan — contact IT for invite)
- Code: GitHub (Enterprise) — access via SSO
- Cloud: AWS (primary), Azure (M365 + some workloads)
- ERP: SAP S/4HANA
- CRM: Salesforce (Sales + Marketing teams)
- Project Management: Jira (Engineering), Monday.com (Operations), Asana (Marketing)

IT Helpdesk: ext. 4357 | it@acmecorp.com | ServiceNow portal
Hours: Mon-Fri 8am-6pm ET. After-hours emergency: ext. 4911.""",
        {"type": "reference", "category": "systems_catalog"},
    ),
    (
        "HR", "SYS-DOC-002", "system_doc",
        """Acme Inc HR Policies Quick Reference

PTO & Time Off:
- Full-time: 15 days PTO + 10 federal holidays + 2 floating holidays
- Accrual: 1.25 days/month (capped at 20 days balance)
- Rollover: max 5 days to next year
- Submit requests ≥1 week in advance (≥2 weeks for 5+ day blocks)

Payroll:
- Pay schedule: Bi-weekly (every other Friday)
- Direct deposit setup: Workday > Payroll > Banking
- Paystubs available in Workday

Benefits:
- Health: Aetna HMO Gold, PPO Platinum, HDHP (with HSA)
- Dental: Delta Dental PPO
- Vision: VSP
- 401(k): Fidelity — 4% company match, immediate vesting
- Life Insurance: 2x annual salary (company paid)
- EAP: Magellan (mental health, counseling — 6 free sessions/year)

Open enrollment: November 1-15 annually.

HR Contact: hr@acmecorp.com | Maya Patel: m.patel@acmecorp.com | ext. 4100""",
        {"type": "reference", "category": "hr_policies"},
    ),
    (
        "Security", "SYS-DOC-003", "system_doc",
        """Acme Inc Security Policies — Employee Guide

Password Requirements:
- Minimum 12 characters, uppercase + lowercase + number + special char
- Changed every 90 days (enforced by Okta)
- No reuse of last 12 passwords
- MFA required for all corporate systems

Device Policy:
- Corporate laptops: FileVault (Mac) or BitLocker (Windows) encryption required
- Personal devices: can access email/Slack via Outlook/Slack apps only
- No corporate data on personal devices without MDM enrollment
- Lost/stolen device: report within 1 hour to security@acmecorp.com or ext. 4911

Data Classification:
- Public: OK to share externally (marketing materials, published content)
- Internal: Acme employees only
- Confidential: Need-to-know, requires manager approval to share
- Restricted: Legal/Finance/HR sensitive, limited distribution list

Incident Reporting:
- Phishing: Click 'Report Phishing' in Outlook
- Security concern: security@acmecorp.com | Priya Singh: p.singh@acmecorp.com
- Emergency: ext. 4911 (24/7)

Annual security training required by March 31 each year.""",
        {"type": "reference", "category": "security_policies"},
    ),
]


def embed_text(text: str) -> list[float]:
    """Embed text using Gemini embedding-001 at 768 dimensions."""
    # Gemini embedding-001 has a ~2048 token limit; truncate to ~2500 chars to stay safe
    text = text[:2500]
    payload = {
        "model": "models/gemini-embedding-001",
        "content": {"parts": [{"text": text}]},
        "taskType": "RETRIEVAL_DOCUMENT",
        "outputDimensionality": 768,
    }
    resp = requests.post(EMBED_URL, json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()["embedding"]["values"]


def insert_chunk(domain, source, source_type, content, metadata):
    """Insert a knowledge chunk into Supabase via REST API."""
    embedding = embed_text(content)

    row = {
        "id": str(uuid.uuid4()),
        "tenant_id": TENANT_ID,
        "domain": domain,
        "source": source,
        "source_type": source_type,
        "content": content,
        "embedding": embedding,
        "metadata": metadata,
    }

    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/knowledge_chunks",
        headers={
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        json=row,
        timeout=30,
    )
    resp.raise_for_status()
    return row["id"]


def main():
    print(f"Seeding {len(CHUNKS)} knowledge chunks for tenant '{TENANT_ID}'...\n")

    success = 0
    failed = 0

    for i, chunk in enumerate(CHUNKS, 1):
        domain, source, source_type, content, metadata = chunk
        label = f"[{i:02d}/{len(CHUNKS)}] {source} ({domain})"
        try:
            chunk_id = insert_chunk(domain, source, source_type, content, metadata)
            print(f"  ✓ {label} → {chunk_id[:8]}...")
            success += 1
        except Exception as e:
            print(f"  ✗ {label} — ERROR: {e}")
            failed += 1

        # Respect Gemini rate limits (60 RPM on free tier)
        if i < len(CHUNKS):
            time.sleep(1.1)

    print(f"\n{'─'*50}")
    print(f"Done. {success} inserted, {failed} failed.")
    print(f"Tenant: {TENANT_ID} | Total chunks in DB: {success}")


if __name__ == "__main__":
    main()
