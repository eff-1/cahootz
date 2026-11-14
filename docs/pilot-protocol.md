# Pilot Protocol — Cahootz Manual Study Sessions

> **Purpose**: Design for a low-tech pilot to validate the core Study Together hypothesis *before* the platform is built. Uses WhatsApp and shared timers to simulate the experience.
>
> **Status**: PROPOSED. Requires founder to select the pilot institution (OPEN-01) and recruit participants.

---

## 1. Objective

Test the core assumption (**A-01**): Nigerian university students want a social accountability tool for studying. Specifically:

1. Do students complete more study sessions when paired with a course-matched partner?
2. Is the accountability mechanic (pings/check-ins) perceived as fair and helpful, not punitive?
3. Will students return for a second and third session?
4. What friction points arise with manual coordination?

---

## 2. Participants

| Criterion | Requirement |
|---|---|
| Count | 15–20 students (8–10 pairs) |
| Institution | One pilot campus (OPEN-01) |
| Department | Ideally 2–3 departments to test cross-course matching |
| Level | 200–400 level (established enough to have study habits) |
| Device | Must have a smartphone with WhatsApp and internet access |
| Consent | Written informed consent; explain data collection; right to withdraw |

**Recruitment**: Through a departmental WhatsApp group, course rep, or direct outreach by the founder.

---

## 3. Design

### 3.1 Duration
- **2 weeks**, with sessions available daily
- Target: each participant completes at least 4 sessions over 2 weeks

### 3.2 Matching
- Pair students who share at least one course
- Assign pairs manually based on submitted course lists and availability
- Each student has one primary partner; may try a second partner in week 2

### 3.3 Session Flow (Manual)

```
1. SCHEDULE (WhatsApp)
   Partner A messages Partner B: "Study session at [time]? [course] for [duration]?"
   Partner B accepts or proposes alternative.

2. START
   Both partners join a WhatsApp call (audio only, camera optional).
   Each states their goal for the session.
   Both start a shared timer (use cuckoo.team, pomofocus.io, or phone timer).

3. ACCOUNTABILITY CHECK-INS
   At ~25 min intervals, one partner sends "Still here?" in chat.
   Other responds with a thumbs up or brief message.
   If no response in 2 minutes, note it but continue.

4. COMPLETE
   Timer ends. Each partner shares what they accomplished.
   Rate the session 1-5 in the group chat.

5. LOG
   Fill out the post-session survey (Google Form link sent via WhatsApp).
```

### 3.4 Tools

| Tool | Purpose | Cost |
|---|---|---|
| WhatsApp group | Coordination, scheduling, check-ins | Free |
| cuckoo.team or pomofocus.io | Shared visible timer | Free |
| Google Forms | Pre-survey, post-session survey, exit survey | Free |
| Google Sheets | Data collection and analysis | Free |

---

## 4. Data Collection

### 4.1 Pre-Pilot Survey
- Demographics: year, department, courses this semester
- Current study habits: hours/week, solo vs group, tools used
- Pain points: procrastination, isolation, finding partners
- Availability windows
- Expectations

### 4.2 Post-Session Survey (after each session)
- Partner name, course studied, duration (planned vs actual)
- Did you complete your goal? (Yes / Partially / No)
- How helpful was your partner's presence? (1-5)
- Were check-ins helpful or annoying? (1-5)
- Any connectivity issues?
- Would you study with this partner again? (Yes / Maybe / No)
- Free-text: what worked, what didn't

### 4.3 Exit Survey (end of pilot)
- Total sessions completed
- Net Promoter Score: "How likely to recommend this to a course mate?" (0-10)
- "Would you use an app that did this automatically?" (1-5)
- Willingness to verify academic identity
- Feature priorities: what would make it better?
- Concerns about privacy, safety, fairness

---

## 5. Success Criteria

| Metric | Target | Rationale |
|---|---|---|
| Session completion rate | ≥ 70% of scheduled sessions completed | Core loop viability |
| Repeat sessions | ≥ 60% of participants do 3+ sessions | Retention signal |
| Partner satisfaction | Average ≥ 3.5/5 on helpfulness | Value of pairing |
| Check-in acceptance | Average ≥ 3/5 on check-in helpfulness | Accountability is not punitive |
| Intent to use app | Average ≥ 4/5 on "would use an app" | Product-market signal |
| NPS | ≥ 30 | Word-of-mouth potential |

---

## 6. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Participants drop out | Over-recruit by 30%; incentivize completion (small airtime credit) |
| WhatsApp coordination is too clunky | Provide a clear step-by-step guide; founder moderates the first 2 sessions |
| Connectivity issues | Audio-only; note issues in survey; this validates the fairness requirement |
| Biased responses (founder is present) | Use anonymous surveys where possible; ask for honest criticism explicitly |
| Small sample, not generalizable | Acknowledge in findings; this is directional, not statistical proof |

---

## 7. Timeline

| Week | Activity |
|---|---|
| Week 0 | Recruit participants, collect pre-survey, form pairs |
| Week 1 | Sessions begin; founder checks in daily; collect post-session surveys |
| Week 2 | Continue sessions; allow partner switches; collect surveys |
| Week 3 | Exit survey; data analysis; findings report |

---

## 8. Deliverables

1. **Pilot findings report** with quantitative results and qualitative themes
2. **Updated ASSUMPTION_REGISTER.md** — validate or invalidate A-01 through A-05
3. **Insights for product design**: what should Study Together automate, what tuning numbers feel right, what features students asked for
4. **Decision**: proceed to build, pivot the mechanic, or gather more data

---

## 9. Ethical Considerations

- Participation is voluntary; students may withdraw at any time
- No grades or academic standing are affected
- Personal data (names, phone numbers) stored only for the pilot duration and deleted after
- Survey responses are anonymized in the report
- No monetary compensation that could be coercive; small airtime credit is acceptable
- If any participant reports discomfort or harassment, address immediately and exclude the offending participant

---

*This protocol is designed for the founder to execute with minimal resources. It does not require any platform code. Results feed directly into the product's OPEN questions and assumption register.*

