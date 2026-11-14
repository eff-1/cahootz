---
title: "UX/UI and Design System"
project: CAHOOTZ
version: "v0.1 (Draft for founder review)"
date: "5 November 2026"
status: PROPOSED baseline (awaiting founder approval)
---

# UX/UI and Design System

> Version v0.1 (Draft for founder review) · 5 November 2026 · Index: [MASTER_BLUEPRINT.md](MASTER_BLUEPRINT.md) · Tracker: [PROJECT_TRACKER.md](PROJECT_TRACKER.md) · Decisions: [DECISION_LOG.md](DECISION_LOG.md)
> Labels: **[CONFIRMED]** fixed by the founder · **[PROPOSED]** recommendation awaiting approval · **[OPEN]** unresolved.

Source chapters in the PDF edition: 15.

## 15. UX/UI and brand direction

_Principles, IA, design system and wireframes_


### Design philosophy **[PROPOSED]**

Modern, premium, youthful without being childish, friendly, academic without feeling institutional, social without becoming distracting, consistent across desktop, tablet and mobile. The Study Together screen is deliberately calm: few elements, large timer, clear state.


### Information architecture

| Section | Contents | Primary action |
|---|---|---|
| Home / Dashboard | Today's plan, streak, upcoming sessions, suggested partners, community highlights | Start or join session |
| Discover | Students and rooms filtered by course and availability | Invite |
| Study | Active session, schedule, history, goals | Start session |
| Communities | Institution and course spaces, Q&A | Ask or answer |
| AI Study (R2) | Course-aware assistant, flashcards, quizzes | Ask |
| Messages | Conversations and groups | Reply |
| Wallet (R3) | Balance, history, rewards | Spend |
| Profile | Public profile, reliability, achievements | Edit |
| Settings | Privacy, notifications, sessions, data rights | — |
| Admin (staff) | Queues, tools, audit | — |

Navigation: bottom tab bar on mobile (Home, Discover, Study, Communities, Messages), left rail on desktop, with Profile and Settings in a menu. Maximum two taps from Home to start a session. **[PROPOSED]**


### Design system **[PROPOSED]**

| Element | Specification |
|---|---|
| Typography | Display: Poppins (semi-bold) for headings; Body: Inter or a comparable humanist sans at 16px base; tabular numerals for timers |
| Colour | Deep navy #0B1B3A (brand base), blue #2F6BFF (action), off-white #F7F6F2 (surface), semantic green #2E9E6B, amber #C98410, red #C0392B. Dark mode planned. |
| Spacing | 4px base scale: 4, 8, 12, 16, 24, 32, 48 |
| Grid | 4 columns mobile, 8 tablet, 12 desktop; max content width 1200px |
| Breakpoints | 360, 640, 1024, 1280 px |
| Buttons | Primary (filled), secondary (outline), ghost, destructive; 44px minimum touch target |
| Cards | Rounded 12px, subtle border, minimal shadow |
| Forms | Inline validation, clear error text, labels always visible |
| Modals | Used sparingly; accessible focus trap; escape to close |
| Notifications | Toast for transient; inbox for persistent |
| Empty / loading / error states | Always designed: explain what is missing and offer a next step; skeletons not spinners; retry actions |
| Accessibility | WCAG 2.2 AA target: contrast, keyboard operation, focus states, screen-reader labels, reduced-motion, text scaling |


### Wireframe descriptions

| Screen | Layout description **[PROPOSED]** |
|---|---|
| Dashboard | Top: greeting and streak chip. Middle: large card “Next session” with countdown and Start button. Below: “Suggested partners” horizontal list; “Your courses” communities; “This week” bar chart of study minutes. |
| Discover | Search and filter chips (course, level, time). Vertical list of partner cards (avatar, first name, course overlap, reliability band, availability chips, Invite button). “Looking now” toggle at top. |
| Study Together (active) | Centered large timer; below, partner avatars with presence dots; goals row; Ping button; Break and Leave in a secondary area; a quiet activity log at bottom. |
| Session lobby | Both participants listed with ready state; configuration summary; Start enabled when all ready. |
| Community | Course header, tabs (Q&A, Resources, Announcements, Members), ask button; question cards show accepted-answer badge. |
| AI Study (R2) | Course selector, chat thread, source chips under each answer, side panel for generated flashcards. |
| Wallet (R3) | Balance, recent transactions list, reward grid, clear “coins have no cash value” notice. |
| Settings | Grouped lists: Privacy, Notifications, Devices, Data and account. |

Brand name, logo and domain are not finalized **[OPEN]**. The colours here reflect the brief's suggested direction and the cover of this document.

