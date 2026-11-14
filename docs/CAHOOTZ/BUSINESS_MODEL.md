---
title: "Business Model, Virtual Economy and Monetization"
project: CAHOOTZ
version: "v0.1 (Draft for founder review)"
date: "5 November 2026"
status: PROPOSED baseline (awaiting founder approval)
---

# Business Model, Virtual Economy and Monetization

> Version v0.1 (Draft for founder review) · 5 November 2026 · Index: [MASTER_BLUEPRINT.md](MASTER_BLUEPRINT.md) · Tracker: [PROJECT_TRACKER.md](PROJECT_TRACKER.md) · Decisions: [DECISION_LOG.md](DECISION_LOG.md)
> Labels: **[CONFIRMED]** fixed by the founder · **[PROPOSED]** recommendation awaiting approval · **[OPEN]** unresolved.

Source chapters in the PDF edition: 13, 14.

## 13. Gamification and virtual economy

_XP, coins, ledger and fraud controls_


### Concepts kept separate **[CONFIRMED]**

| Concept | Purpose | Spendable? | Can decrease? |
|---|---|---|---|
| XP | Measure effort and progress; levels | No | No |
| Coins | Spendable virtual currency (Release 3) | Yes, on cosmetics and perks | Yes, by spending or reversal |
| Achievements | Badges for milestones | No | No |
| Streaks | Consistency indicator | No | Resets or uses a freeze |
| Reliability | Trust signal for partners | No | Yes, with rolling window |
| Rewards | Catalogue items bought with coins or earned | — | — |
| Premium entitlements | Subscription-based access | — | Expire |


### Ledger design **[CONFIRMED]**

All coin and XP changes are append-only ledger entries. Balances are derived or cached from the ledger, never edited directly. For coins, use **double-entry bookkeeping**: each transaction has two or more entries that sum to zero across accounts (user wallet, system rewards pool, system revenue, refunds).

| Table | Key fields |
|---|---|
| wallet_accounts | id, owner (user or system), currency (COIN), type, created_at |
| wallet_transactions | id, type (EARN, SPEND, REVERSAL, GRANT, REFUND, EXPIRY), idempotency_key (unique), reason_code, reference (session id, order id), created_at |
| wallet_entries | id, transaction_id, account_id, amount (signed integer), balance_after (optional snapshot) |
| xp_ledger | id, user_id, amount, reason_code, reference, created_at |

- Amounts are integers; no floating point.
- Transaction creation runs in one database transaction with row locking or serializable isolation on the affected wallet.
- Idempotency keys prevent double-awarding if a request is retried.
- Reversals are new entries that reference the original; originals are never altered or deleted.


### Earning, spending, limits **[PROPOSED]**

| Topic | Proposed rule |
|---|---|
| Earn XP | Completed sessions (scaled by duration), streak days, helpful answers accepted; daily cap |
| Earn coins (R3) | Small amounts for completed sessions and weekly goals; daily and weekly caps; no coins from idle time |
| Spend coins | Cosmetics, streak freezes, profile customization; not required for any academic access **[CONFIRMED]** |
| Balance | Sum of ledger entries for the account |
| Reversal | If a session is later found fraudulent or a dispute is upheld, a reversal entry removes the reward; balance may go to zero but not negative; repeat offenders sanctioned |
| Expiry | Avoid expiry initially; if introduced for liability reasons, needs legal review and clear notice |
| Transferability | Not transferable and not withdrawable as cash **[CONFIRMED]** |
| Refunds | Purchases refundable per provider rules and consumer-protection law; refund creates reversing entries |


### Fraud and abuse prevention

- Verified academic identity and device/IP signals to limit multi-accounting.
- Per-pair and per-day session reward limits; unusual earning patterns flagged.
- Rewarded-ads: server-side verification callbacks, frequency caps; no rewarded ads for under-18 users until legal review.
- Anomaly dashboards and manual wallet freezes for review, always logged.


### Legal, financial and operational implications of paid virtual currency **[OPEN]**

If coins can be bought with real money, Cahootz takes on payment processing, tax, consumer-protection, refund, chargeback and possibly financial-regulatory questions in Nigeria. This version does not assert what the law requires. The safe design choices are: keep coins non-transferable and non-cashable, treat them as in-app licenses, avoid anything resembling stored value or gambling, and obtain advice from a Nigerian fintech and consumer-protection lawyer before Release 3. LEGAL REVIEW.

> **Recommendation**  
> Do not ship paid coins in the MVP. Prove the study loop with XP and streaks first. Add coins only after legal review and clear evidence that students want them. **[PROPOSED]**


## 14. Business model and monetization

_Revenue streams and costs without invented projections_

| Revenue stream | Fit | Trust risk | Stage **[PROPOSED]** |
|---|---|---|---|
| Freemium core | Excellent: keeps access open | Low | MVP |
| Premium subscription (AI limits, advanced analytics, cosmetics) | Good, similar to Knowt and Quizlet paid tiers [[12]](references/REFERENCES.md#ref-12) | Low if free core is generous | Release 2-3 |
| AI usage tiers | Good, ties price to real cost | Low-medium | Release 2 |
| Institutional partnerships | Strong long-term: verified rosters, official content, analytics | Medium if data use unclear | Release 3+ |
| Educational partnerships (publishers, tutors) | Moderate | Medium | Later |
| Sponsored academic content | Possible, clearly labeled | Medium-high | Later, careful |
| Rewarded advertisements | Weak fit for focus; can distract and raise child-safety issues | High | Avoid until proven; legal review |
| Paid virtual currency | Uncertain; legal complexity | High | Not before Release 3 and legal review |


### Staged strategy **[PROPOSED]**

1. **Stage 0 (MVP, pilot):** No revenue. Validate retention and session completion. Keep costs low.
2. **Stage 1:** Optional supporter subscription and basic premium; AI free tier funded by quota.
3. **Stage 2:** Institutional pilots and partnerships.
4. **Stage 3:** Cosmetic coin economy if validated; sponsored content labeled and academic only.


### Main operating costs **[PROPOSED]**

| Cost driver | Why it matters | Control |
|---|---|---|
| AI inference and embeddings | Scales with usage; unpredictable | Quotas, caching, small models, usage-based tiers |
| Realtime infrastructure | Concurrent connections and Redis | Efficient protocol, regional hosting, autoscale only when needed |
| Video/TURN | Bandwidth is expensive | Delay to Release 3; audio-first; managed provider with caps |
| Storage and egress | Documents and attachments | R2 or equivalent with low egress; lifecycle rules; size limits |
| Moderation | Human time is the largest recurring safety cost | Automation for triage, volunteer moderators with training, per-community moderation |
| Support and verification | Manual review time | Clear flows, self-service, partner rosters |

> **No revenue projections**  
> This version contains no revenue forecast because no verified willingness-to-pay, conversion rates or pricing for Nigerian students exist yet. A model will be built from stated assumptions after pilot data. **[OPEN]**

