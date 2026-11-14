# Cahootz — Moderation Playbook & SLA Procedures

> **STATUS: PILOT OPERATIONAL PLAYBOOK (`OPEN-12` SLAs Proposed)**

---

## 1. Triage Priority & SLA Targets (`MODERATION_SLA_HOURS`)
| Category | Priority | Target Response SLA | Immediate Action |
|---|---|---|---|
| `CRITICAL_SAFETY` (Threats of violence, self-harm, minor safety) | P0 — Critical | **<= 1 hour** | Immediate `SUSPEND`, preserve evidence snapshot, escalate to Founder/Safety Lead |
| `HARASSMENT` (Abusive DMs, unwanted advances, stalking) | P1 — High | **<= 4 hours** | Review immutable `evidenceSnapshot`, issue `RESTRICT_24H`, `RESTRICT_7D`, or `SUSPEND` |
| `ACADEMIC_INTEGRITY` (Live exam leaks, contract cheating) | P2 — Medium | **<= 24 hours** | `REMOVE_CONTENT` + `WARN` (first offence) or `RESTRICT_7D` (repeat offence) |
| `SPAM` / `OTHER` | P3 — Normal | **<= 24 hours** | `REMOVE_CONTENT` + `WARN` or `DISMISS` if unfounded |

---

## 2. Mandatory Operational Rules
1. **Staff MFA Required**: No moderator or administrator can view the moderation queue, inspect evidence snapshots, or issue sanctions without TOTP MFA verified (`Policy.assertStaffWithMfa`).
2. **Evidence Snapshot Confidentiality**: Evidence snapshots attached to reports are restricted to MFA-verified staff and are never exposed publicly.
3. **Sanction Ladder**:
   - **Level 1 (`WARN`)**: Minor community guideline breach or off-topic post.
   - **Level 2 (`REMOVE_CONTENT` + `RESTRICT_24H`)**: Uncivil language, spam, or repeated off-topic posts.
   - **Level 3 (`RESTRICT_7D`)**: Targeted harassment or academic dishonesty.
   - **Level 4 (`SUSPEND`)**: Severe harassment, minor-safety violation, account compromise, or repeated violations after `RESTRICT_7D`.
4. **Separation of Duties on Appeals**:
   - A moderator who issued a sanction is **blocked in code** (`ModerationService.reviewAppeal`) from reviewing the appeal for that sanction.
   - A second, independent moderator must review the evidence snapshot and the student's appeal note before marking `UPHELD` or `OVERTURNED`.
5. **Two-Approver Rule for Sensitive Admin Actions**:
   - Actions such as `PURGE_USER`, `DISABLE_SAFETY_KILLSWITCH`, or `ELEVATE_STAFF_ROLE` require proposal by one MFA-verified staff member and approval by a second distinct MFA-verified staff member (`AdministrationService.approveSensitiveAction`).
