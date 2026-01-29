# Product + Engineering Spec (Codex)

AWS-first. Feature-flagged. Safe defaults OFF.

This document combines the Feature Flag Map, Config/Secrets, Killer Differentiators, and Quality
Scoring Questions. It is the source spec for Codex implementation.

---

## 1) Feature Flag Map (SSM Parameter Store)

All flags are strings: "true" | "false". Paths are per environment: /{project}/{env}/...

### A) Global apps

- features/enable_public_funnels
- features/enable_admin_console
- features/enable_portal

### B) Lead pipeline (core)

- features/enable_assignment_service
- features/enable_notification_service
- features/enable_disputes_and_credits
- features/enable_evidence_pack

### C) Channels

- features/enable_email_notifications
- features/enable_sms_notifications
- features/enable_twilio_sms
- features/enable_sns_sms

### D) Voice agent upsell (premium)

- features/enable_voice_agent
- features/enable_twilio_voice
- features/enable_elevenlabs
- features/enable_voice_worker_queue
- features/enable_bedrock_ai

### E) Security / edge (cost anchors OFF by default)

- features/enable_waf
- features/enable_admin_ip_allowlist
- features/enable_cloudfront_logs

### F) Exports & reporting

- features/enable_exports
- features/enable_pdf_exports
- features/enable_docx_exports
- features/enable_xlsx_exports

### G) Marketplace behavior (agents subscribe / recommended streams)

- features/enable_agent_recommendations
- features/enable_subscription_auto_assign
- features/enable_instant_connect

---

## 2) Config Parameters (SSM)

### A) Funnels config (JSON)

- funnels/config JSON includes per funnel:
  - funnelId (kebab-case)
  - displayName_en, displayName_es
  - allowedOrigins (array)
  - zipRequired (bool)
  - callEnabled (bool) default false
  - notificationEmail (optional)
  - voiceScriptPrompt (optional placeholder)
  - qualityOverrides (optional: weights/thresholds for scoring)

### B) Assignment config

- assignment/default_strategy = "zip_longest_prefix"
- assignment/unassigned_behavior = "queue" | "notify_ops_only"
- assignment/default_daily_cap (optional)
- assignment/max_fanout_per_request

### C) Notifications config

- notifications/internal_recipients_email (comma-separated)
- notifications/internal_recipients_sms (comma-separated E.164)
- notifications/from_email (SES sender)
- notifications/quiet_hours (JSON: timezone + blocked ranges)

### D) Portal policy

- portal/org_policy/default_visibility = "assigned_only" | "org_all"

### E) Anti-abuse / Quality scoring config

- quality/rate_limit_max
- quality/rate_limit_window_min
- quality/quarantine_threshold (0–100)
- quality/disposable_email_domains (csv or JSON)
- quality/spam_keywords (csv or JSON)
- quality/max_urls_in_message

---

## 3) Secrets (Secrets Manager Paths)

Only fetch secrets if the relevant feature flags are enabled. Degrade gracefully if missing.

- secrets/twilio { "accountSid":"PLACEHOLDER", "authToken":"PLACEHOLDER",
  "fromNumber":"+10000000000" }

- secrets/elevenlabs { "apiKey":"PLACEHOLDER", "voiceId":"PLACEHOLDER" }

- secrets/ses (optional) { "smtpUser":"PLACEHOLDER", "smtpPass":"PLACEHOLDER" }

---

## 4) Killer Differentiators (Product Features)

### A) Evidence Pack per lead (trust + proof)

For every lead store/show:

- capturedAt timestamp
- funnelId + pageVariant
- UTM/referrer/pageUrl
- consent record (checkbox value + timestamp + ipHash)
- verification signals (captcha token verified, email/phone validity)
- delivery logs: notification attempts + timestamps + failures
- assignment receipt: ruleId, assignedOrgId/userId, assignedAt
- dispute/credit link + policy

### B) Freshness SLA + Speed-to-Lead scoreboard

- record: deliveredAt, firstContactAttemptAt (sms/email/call), responseAt
- show agent/org leaderboard: median speed-to-lead, conversion outcomes
- optionally enforce SLA: if not contacted within X minutes -> reassign (feature flagged)

### C) Exclusive-by-default controls + proof

- offer modes per funnel/zip:
  - exclusive (one buyer) vs shared (cheaper)
- enforce territory caps + capacity
- show exclusivity proof inside Evidence Pack

### D) Marketplace recommendation engine (subscriptions)

- recommend "fresh lead streams" by:
  - funnel/niche + zip coverage + agent capacity + close-rate
- support subscriptions:
  - auto-assign leads that match subscription rules
  - pause/resume on caps or quiet hours
- admin sees allocation health and unassigned queue

### E) Compliance layer (trust)

- DNC workflows (lead-level and org-level)
- quiet hours
- audit trail for contact attempts
- consent logging

### F) Instant Connect (premium)

On lead submit:

- call agent and call lead, then bridge
- fallback to SMS/email if busy/no answer
- feature flag enable_instant_connect

### G) Quality scoring + auto-quarantine + auto-credit (premium trust)

- compute leadQualityScore (0–100)
- if below threshold: quarantine, notify ops only, optionally auto-credit
- store score + reasons in Evidence Pack

### H) Optional AI voice follow-up (premium upsell)

- Twilio + ElevenLabs
- per-funnel script prompt
- deterministic fallback if AI disabled
- optional Bedrock behind feature flag

### I) Portal onboarding (next killer)

- Admin-provisioned portal users only
- Cognito temp password emailed
- Portal user must reset password before first use
- Audit log for user creation + reset events

---

## 5) Quality Scoring: Form Questions & Signals

Goal: Ask a small number of questions that meaningfully predict intent & reduce spam. Supports base
fields across all funnels, per-funnel questions, and per-funnel scoring weights.

### A) Base fields (ALL funnels)

Required:

- Full Name
- Email
- ZIP Code

Optional:

- Phone (recommended)
- Preferred contact method: "Call" | "Text" | "Email"
- Best time to contact: "Morning" | "Afternoon" | "Evening" | "Anytime"
- "How soon do you need this?"
  - "ASAP" | "This week" | "This month" | "Just researching"
- Budget range (where applicable)
  - "Under $X" | "$X–$Y" | "$Y+" | "Not sure"
- Consent checkbox:
  - "I agree to be contacted by phone/text/email..." (store consent record)

Passive signals captured automatically (no user input):

- UTM source/medium/campaign
- referrer
- landing page variant
- ipHash + userAgent
- completion time (seconds from page load to submit)
- number of edits / backspaces (optional)
- captcha score/verification (if enabled)

### B) Universal quality questions

- "What are you looking for?" (short select)
- "Where is the service needed?" (ZIP already; optionally city/neighborhood)
- "Is this for you or someone else?" (self/other)
- "Are you the decision maker?" (yes/no)
- "Do you already have a provider?" (yes/no)
- "What’s the biggest priority?" (price/speed/quality/trust)

### C) Service-specific questions (examples)

Real Estate:

- "Buy or Sell?" (buy/sell/rent)
- "Price range" / "Home value range"
- "Pre-approved?" (yes/no)
- "Timeframe to move" (0–30d / 30–90d / 3–6m / browsing)

Life Insurance:

- "Coverage type" (term/whole/final expense)
- "Desired coverage amount" (range)
- "Age range" (range)
- "Tobacco use?" (yes/no)
- "Timeframe to purchase" (ASAP/30d/90d/research)

Roofing:

- "Roof issue type" (leak/storm damage/replace/inspection)
- "Insurance claim?" (yes/no/unsure)
- "Property type" (single family/multifamily/commercial)
- "Urgency" (emergency/soon/just quote)

Dentist:

- "Service needed" (cleaning/emergency/cosmetic/implants)
- "Insurance?" (yes/no)
- "Pain level/urgency" (none/low/high/emergency)
- "Preferred appointment window"

Plastic Surgeon / Medspa:

- "Procedure type" (select)
- "Consult timeline"
- "Budget range"
- "Have you done this before?" (yes/no)
- "Preferred consult type" (in-person/virtual)

Moving:

- "Move date"
- "From ZIP / To ZIP"
- "Home size" (studio/1br/2br/house)
- "Need packing?" (yes/no)
- "Elevator/stairs?" (yes/no)

Cleaning:

- "Home size" (sqft or bedrooms)
- "One-time or recurring" (weekly/biweekly/monthly)
- "Pets?" (yes/no)
- "Deep clean needed?" (yes/no)

Construction/Remodeling:

- "Project type" (kitchen/bath/addition/commercial)
- "Permit needed?" (yes/no/unsure)
- "Budget range"
- "Timeline start"
- "Property owned?" (yes/no)

### D) Quality scoring signals (recommendation)

Score = 0..100 with reasons. Store on lead.

Positive signals:

- Valid phone + prefers call/text
- Timeframe = ASAP/this week
- Decision maker = yes
- Budget provided and matches service norms
- Specific service selection + details
- Completion time normal (not too fast)
- UTM from high-intent sources (Google Search, Maps, etc.)

Negative signals:

- Disposable email domain
- Too many URLs in message
- Spam keywords ("seo", "backlinks", "crypto", "telegram", "whatsapp marketing")
- Completion time too fast (bot-like)
- Duplicate email within short window (idempotency collisions)
- ZIP missing or invalid
- Phone invalid or missing when service requires phone (configurable)
- Consent unchecked (hard-fail if required)

Actions based on score:

- score >= threshold: ACCEPT + assign + notify assignee
- score < threshold: QUARANTINE + notify ops only + no assignment (or assign to review queue)
- optional: auto-credit for low-score leads sold as "verified"

---

## 6) Implementation Notes for Codex

- Store all config/flags in SSM and cache in Lambda (60s).
- Default all expensive features OFF in dev and prod.
- Only fetch secrets when their feature flags are enabled.
- Idempotent pipeline stages; DLQ-protected queues.
- Evidence Pack is the primary UI artifact in portal/admin (build early).
- Funnel pages are fully customizable; share only submitLead() + utilities + shared types.
- Portal onboarding: admin creates portal users; temp password emailed; portal reset required.
