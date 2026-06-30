---
name: legal-docs
description: Rules for drafting the client-facing documents and policies for I Got A Dom (document-cleanup + web-design services). Enforces client ownership, plain English, mandatory not-legal-advice disclaimer, and hard no-regulated-data guardrails. Use when writing any contract, policy, or package.
---

# /legal-docs — drafting client documents the honest way

Core values, non-negotiable in every doc: **honesty, transparency, client ownership.**
Output goes in `vault/legal/` (markdown), plain language a normal person can read.

## ⚠️ Mandatory on every document
> **This is a plain-language template, not legal advice.** I Got A Dom is not a law
> firm and does not provide legal, tax, medical, or financial advice. Have a licensed
> attorney in your state review and adapt before relying on it.

Never present a draft as final/binding. Flag anywhere a lawyer should weigh in.

## Ownership (the whole point)
- **Default: the CLIENT owns everything** at the end. For web design, ownership of the
  final deliverables **transfers to the client on final payment** (assignment of IP +
  delivery of all files/source). The operator keeps no ownership and no hostage-ware.
- **Domain & hosting: the client owns the accounts.** Prefer the client registers the
  domain in their own registrar account. If the operator must buy it, the client is the
  **registrant**, and there's a written transfer + full credential handover at project end.
- Include an ownership-handover checklist (files, source, domain, hosting, logins).

## Hard guardrail: NO regulated / sensitive data
The operator is a one-person, low-cost service and must **stay out of regulated zones.**
Every services/acceptable-use policy must explicitly **refuse** to accept:
- **Health/medical records or anything identifying a patient** (HIPAA PHI) — keeps the operator from becoming a HIPAA "business associate".
- **Social Security numbers**, government IDs, and similar high-risk PII.
- **Full payment-card numbers / bank-account credentials** (PCI / GLBA).
- **Student education records** (FERPA).
- **Attorney-client / privileged legal documents.**
Policy language: "If your document contains any of the above, redact it first or don't
send it — I can't accept it." Plus: data is used only to do the job, kept briefly, then
deleted; never shared/sold; confidential between operator and client.

## The document set to produce
1. **Web Design Agreement** — scope, timeline, deposit/payment, revisions, kill/late fee, IP assignment on final payment, client-owns-domain clause, no-sensitive-data clause, not-advice disclaimer.
2. **Domain & Hosting Ownership policy + handover checklist.**
3. **Sensitive-Information / Acceptable-Use policy** (the refusal list above).
4. **Privacy + Confidentiality policy** (what's collected, kept how long, deleted, never shared).
5. **Service packages** — 2–4 transparent, ownership-forward tiers; domain/hosting bundled at cost or client-provided, stated plainly.

## Style
Short sentences. First person ("I"/"you"). No legalese where plain words work. Match the
brand voice in `vault/wiki/`. Base claims on the deep-research report (cite it); don't invent law.
