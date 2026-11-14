# Name Clearance Checklist — Cahootz

> **Purpose**: A checklist for the founder to verify that the working name "Cahootz" is available and safe to use before public launch. The engineering team **cannot** perform legal searches — this document is a guide for the founder and/or legal counsel.
>
> **Status**: OPEN (OPEN-03). No checks have been performed.

---

## 1. Trademark Search

| Check | Where | Status | Notes |
|---|---|---|---|
| WIPO Global Brand Database search for "Cahootz", "Cahoots", "Kahoots" | [branddb.wipo.int](https://branddb.wipo.int) | Not done | Search Nice Classes 9, 41, 42 |
| Nigerian Trademarks Registry (Federal Ministry of Industry, Trade and Investment) | Registry office or agent | Not done | Classes 9 (software), 41 (education), 42 (SaaS) |
| US USPTO TESS search | [tess2.uspto.gov](https://tess2.uspto.gov) | Not done | Relevant if US expansion planned |
| EU EUIPO eSearch plus | [euipo.europa.eu](https://euipo.europa.eu) | Not done | Relevant if EU expansion planned |

### ⚠️ Kahoot Sound-Alike Risk

"Cahootz" is phonetically similar to **Kahoot!**, a well-known educational technology company (Norwegian, global reach, heavily used in classrooms). Kahoot! holds trademarks in classes 9, 41, and 42 in multiple jurisdictions. Risk areas:

- **Phonetic confusion**: "Cahootz" and "Kahoot" share the /kəˈhuːt/ sound root
- **Same industry**: Both are educational technology platforms
- **Same user base**: Both target students and educational institutions
- **Likelihood of opposition**: Kahoot! has shown willingness to protect its brand

**Recommendation**: Consult a trademark attorney specifically about the Kahoot similarity before filing. Consider alternative names as a contingency.

---

## 2. Company Name Registration

| Check | Where | Status | Notes |
|---|---|---|---|
| CAC (Corporate Affairs Commission, Nigeria) name availability | [pre.cac.gov.ng](https://pre.cac.gov.ng) | Not done | Search "Cahootz", "Cahootz Technologies", "Cahootz Ltd" |
| Reserve name with CAC if available | CAC portal | Not done | Reservation lasts 60 days |

---

## 3. Domain Availability

| Domain | Status | Notes |
|---|---|---|
| cahootz.com | Not checked | Primary target |
| cahootz.co | Not checked | Alternative |
| cahootz.ng | Not checked | Nigerian ccTLD |
| cahootz.app | Not checked | App-focused TLD |
| cahootz.io | Not checked | Tech-focused TLD |
| cahootz.org | Not checked | Alternative |

**Tool**: Use any WHOIS lookup or registrar search (Namecheap, Cloudflare, Google Domains).

---

## 4. App Store Name Availability

| Store | Search term | Status | Notes |
|---|---|---|---|
| Google Play Store | "Cahootz" | Not checked | Search for existing apps |
| Apple App Store | "Cahootz" | Not checked | Search for existing apps |

---

## 5. Social Media Handle Availability

| Platform | Handle | Status | Notes |
|---|---|---|---|
| Twitter/X | @cahootz | Not checked | |
| Instagram | @cahootz | Not checked | |
| TikTok | @cahootz | Not checked | |
| LinkedIn | /company/cahootz | Not checked | |
| YouTube | @cahootz | Not checked | |

---

## 6. Contingency Names

If "Cahootz" is unavailable or too risky due to Kahoot similarity, prepare 2-3 alternatives. The codebase stores the brand name in a single config constant (`BRAND_NAME`) so renaming requires only one change.

---

## 7. Actions After Clearance

1. Register the trademark in Nigeria (Classes 9, 41, 42)
2. Register the company name with CAC
3. Purchase primary and protective domains
4. Secure social media handles
5. Update `BRAND_NAME` constant in codebase if name changes
6. Update DECISION_LOG.md with the clearance outcome

---

*This checklist was produced by the engineering team. Legal searches require a qualified professional. No legal advice is given or implied.*

