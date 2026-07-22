---
name: happy-code
description: >
  Standard guided pipeline for executing one development task end-to-end:
  switch to caveman first, then grill-with-docs to lock the design, an impact
  analysis + explicit confirm gate, then subagent-driven-development to implement the
  laziest working solution (ponytail) with spec+quality review gates and test cases derived via
  tdd — every subagent also told to use caveman, asking the user back on every real decision, committing
  atomically, and finishing by keeping the branch as-is. The orchestrator replies to the user in Thai; subagents may
  report in English. Use when the user assigns a coding task and wants this full
  pipeline, or invokes /happy-code.
---

# Task Flow

Orchestrated pipeline for one development task. Announce at start (in Thai):
"ใช้ happy-code: caveman → grill → impact analysis → confirm → subagent build (caveman+ponytail) → ถามทุก decision → test-case (tdd) → คง branch ไว้"

This skill chains existing skills — invoke them, don't reinvent them:
`caveman` → `grill-with-docs` → `subagent-driven-development` → `finishing-a-development-branch`,
with `caveman` applied to the orchestrator AND every subagent,
`tdd` applied whenever test / verification cases are devised (step 4),
and `ponytail` governing every line of code written (step 4 — laziest solution that works).

## Language — REQUIRED, ทั้ง flow
**Orchestrator (ตัวหลัก)** ตอบ user เป็น **ภาษาไทย** เสมอ — grill questions, confirm
gate, สรุป, status, red-flag warnings ทุกอย่าง. ผสมกับ caveman ได้: terse Thai (ตัด
filler/คำสุภาพ/hedging) แต่เก็บ technical substance ครบ. คำเทคนิค / code / ชื่อ skill /
`file:line` / error text / command คงรูปเดิม (ไม่แปล). **Subagent ตอบ English ได้**
(caveman style, ดู step 5) — orchestrator สรุป/รายงานกลับ user เป็นไทย. คงไว้จนจบ flow
หรือ user สั่ง "stop caveman" / "normal mode" / "ตอบอังกฤษ".

## The pipeline

### 1. Caveman first — REQUIRED, before anything else
Before the grill, before any exploration, switch YOUR OWN communication to `caveman`
style **in Thai** and keep it active for the entire happy-code run: drop filler /
pleasantries / hedging; keep all technical substance exact (terms, code, file:line,
errors). Every response to the user during this flow — grill questions, confirmations,
summaries — stays terse Thai. Honor caveman's auto-clarity exceptions (security
warnings, irreversible-action confirmations, genuinely ambiguous multi-step asks).
Stays active until the flow ends or the user says "stop caveman" / "normal mode".

### 2. Grill — `grill-with-docs`
Invoke `grill-with-docs`. Interview the user about the task until shared understanding.
- Explore the codebase to answer questions yourself instead of asking the user.
- One question at a time; always give a recommended answer first.
- Resolve every design branch and dependency before writing any code.

### 3. Impact analysis → confirm gate
**Impact analysis FIRST — before the confirm summary, before any code.** Find the blast
radius with grep/Glob, don't guess. Cover both:
- **ในโปรแกรมตัวเอง** — every layer the screen touches (entity / slice / controller /
  SPA), other call sites of the function or SQL you're changing, DB columns & migrations,
  label/message keys.
- **ของคนอื่น** — shared code (DB function, shared component, base class, common SQL),
  other screens/modules calling it, API contract consumers, files another branch or the
  user's WIP is editing.

Report as: **จุดกระทบ → ความเสี่ยง → แนวทาง**, options laid out with the recommended one
first (e.g. narrow-scope change vs shared-code change + fix all callers). Zero impact
outside the task = say so in one line. Then summarize the locked plan in one tight block
and wait for an "ok"/confirm. No code before this gate.

### 4. Build — `subagent-driven-development`
Invoke `subagent-driven-development`. Per task:
- Dispatch a FRESH implementer subagent with the full spec + scene-setting context.
  Hand it the spec directly — never make it read a plan file.
- Build the LAZY version — `ponytail`: the implementer (and any fixer) writes the
  simplest thing that works. Climb the ladder, stop at the first rung that holds —
  does it need to exist (YAGNI) → stdlib → native platform feature → already-installed
  dep → one line → only then minimal new code. No unrequested abstractions, no
  scaffolding "for later", shortest working diff; deletion over addition. The spec you
  hand the implementer says this explicitly. NEVER simplify away input validation at
  trust boundaries, error handling, security, accessibility, or anything the user
  explicitly asked for. Mark deliberate shortcuts with a `// ponytail:` comment.
- **Sonar-clean + low complexity — ponytail's partner, not its rival.** Ponytail decides
  WHETHER code exists; this decides the SHAPE of the code that survives. Rules:
  - cognitive complexity ≤ 15 per method, nesting ≤ 3 → guard clauses / early return
    instead of nested `if`; flatten, don't pyramid.
  - one method = one job, name states the job. Long handler doing fetch + validate +
    map + save → split by job into small private methods.
  - no duplicated blocks — extract on the 3rd occurrence (rule of three), not the 2nd.
  - no magic numbers/strings (const, or `su_parameter` in this repo), no dead code,
    no unused vars/params/imports, no commented-out code, no empty `catch` (handle or
    rethrow — never swallow).
  - prefer LINQ / stdlib over hand-rolled loops — fewer lines AND lower complexity.
  **Ponytail veto:** extract a method when a rule actually trips (complexity, nesting,
  3rd duplicate), NOT preemptively. Slicing a 5-line method into three is
  over-engineering — the quality reviewer rejects that too.
- Two-stage review after implementation: **spec compliance FIRST, then code quality.**
  Loop fixes until both pass. Never start quality review before spec is ✅. The
  code-quality stage checks the Sonar/complexity rules above AND REJECTS
  over-engineering — speculative generality, one-impl interfaces, needless new deps,
  boilerplate, gratuitous method-splitting — sending it back to the lazy version.
  Review by reading the code — do NOT run a Sonar scan; the rules are the point,
  the scanner is not.
- Multi-layer work (FE/BE): split into per-layer subagents. Dispatch sequentially,
  or in parallel ONLY when the file sets are disjoint (no conflict).
- Derive test cases with `tdd` — cases BEFORE code, red → green → refactor. Enumerate
  the cases that PROVE the change works AND that would FAIL if the logic regressed:
  happy path, the originally-reported case, boundary / edge cases (empty, single vs
  many, null, duplicates, out-of-range). Write them first and watch them go RED, then
  implement until GREEN, then refactor with the tests still green. For a bug-fix task
  the red test IS the repro — it must fail before the fix and pass after. State each
  case and how it was checked (unit test, DB query, manual run) — don't hand-wave
  coverage. A test that never went red proves nothing.
- Verify honestly at the end: run the build / typecheck; report real failures vs
  environmental ones (e.g. file locks); never claim green when it isn't.

### 5. Every subagent uses caveman — REQUIRED
EVERY subagent dispatched in this flow (implementer, spec reviewer, quality reviewer,
explorer, fixer) MUST be told to operate in `caveman` style from its first word.
Put this line near the TOP of every dispatch prompt:

> Respond in caveman style (per the caveman skill), English is fine: terse, drop
> articles / filler / pleasantries / hedging, keep ALL technical substance exact —
> diffs, file:line refs, error text, verdicts, status. Fragments fine. Fluff dies,
> data stays.

Rationale: subagent reports flow back to the orchestrator; caveman strips report fluff
without losing the data needed to coordinate. Subagents may report in English — the
orchestrator translates / summarizes back to the user in Thai. Non-negotiable in this flow.

**Code-authoring subagents (implementer, fixer) get a SECOND directive — `ponytail`** —
put it near the top of their dispatch prompt too (caveman governs how they TALK,
ponytail governs what they BUILD):

> Build in ponytail style (per the ponytail skill): laziest solution that actually
> works. Climb the ladder — YAGNI → stdlib → native feature → installed dep → one line
> → minimal code; stop at the first rung that holds. No unrequested abstractions, no
> scaffolding for later, shortest working diff, deletion over addition. NEVER strip
> input validation at trust boundaries, error handling, security, or explicitly-requested
> behavior. Mark deliberate simplifications with a `// ponytail:` comment.
>
> Code must also be Sonar-clean and low-complexity: cognitive complexity ≤ 15/method,
> nesting ≤ 3 (guard clauses, early return — no pyramids), one method = one job with a
> name that says the job, extract duplicates on the 3rd occurrence, no magic
> numbers/strings, no dead or commented-out code, no unused vars/params/imports, no
> empty catch. Split a long method into small per-job private methods ONLY when a rule
> actually trips — never preemptively; gratuitous splitting is over-engineering and
> gets rejected.

### 6. Ask back on every real decision
Whenever something needs a decision the USER owns, STOP and ask (AskUserQuestion),
recommended option first. Triggers:
- a design/scope choice with genuine alternatives;
- an unexpected fix needed beyond the stated task;
- intermingled or unexpected working-tree changes — do NOT silently mix; ask whose
  they are and how to handle;
- a reviewer flags something that contradicts the confirmed plan.
Never guess on a user-owned decision; never proceed past one.

### 7. Commit discipline
- Atomic commit per task. Stage only that task's files.
- When a task's changes are intermingled with unrelated or user-WIP changes in the
  same file, stage at HUNK level (e.g. `git apply --cached` on a hunk-filtered patch)
  so the commit stays clean and the user's WIP is left untouched. Ask first if unsure.
- Add the project's `Co-Authored-By` trailer to work you authored; do NOT add the
  Claude co-author trailer to the user's own changes you are merely committing.
- Commit when the user signals it. If they say "let me review first", present the
  diff and wait — don't auto-commit.

### 8. Finish — keep the branch as-is, ALWAYS
On completion, follow `finishing-a-development-branch` but ALWAYS choose
"keep the branch as-is" (no merge, no PR) unless the user explicitly says otherwise.
Report the commit list and any remaining tasks.

## Red flags — never
- Orchestrator replies to the user in English — orchestrator is Thai-only this flow
  (subagents may report in English; just summarize back to the user in Thai).
- Run the flow without switching to caveman at step 1.
- Implement before the step-3 confirm gate.
- Reach the confirm gate without an impact analysis — blast radius (own program AND
  shared/other-people's code) must be reported with แนวทาง before "ok".
- Dispatch ANY subagent without the caveman instruction.
- Proceed past a user-owned decision by guessing.
- Ship over-engineered / speculative / scaffolded-for-later code — violates `ponytail`
  (laziest working solution wins; reviewer sends bloat back).
- Ship a Sonar-dirty method — complexity > 15, nesting > 3, duplicated blocks, magic
  values, dead code, empty catch. Equally: split methods preemptively when no rule trips.
- Commit intermingled / unrelated / user-WIP changes together.
- Merge or open a PR (keep branch as-is unless told otherwise).
- Claim done without deriving test cases via `tdd` (esp. the originally-reported case
  + edge cases) for any non-trivial change, or ship a test that never went red.
- Claim build/tests green without actually verifying.
