---
name: happy-code
description: >
  Standard guided pipeline for executing one development task end-to-end, solo —
  no subagents: switch to i-have-adhd + caveman output style first, then grill-with-docs to lock the design,
  to-spec + to-tickets to turn it into a spec and a table of tracer-bullet tickets,
  an impact analysis + explicit confirm gate, then implement the laziest working
  solution (ponytail) yourself with self-run spec+quality review gates and test cases
  derived via tdd, asking the user back on every real decision, committing atomically,
  and finishing by keeping the branch as-is. Code may improve on the existing codebase
  pattern when the improvement is clearly worth it — you decide, and say why.
  Replies to the user in Thai. Use when the user assigns a coding task and wants this
  full pipeline, or invokes /happy-code.
---

# Task Flow

Orchestrated pipeline for one development task, executed **solo — no subagents, no Agent/Task
dispatch at any step**. Announce at start (in Thai):
"ใช้ happy-code: adhd+caveman → grill → spec → tickets (ตาราง) → impact analysis → confirm → build เอง (ponytail) → self-review spec+quality → ถามทุก decision → test-case (tdd) → คง branch ไว้"

This skill chains existing skills — invoke them, don't reinvent them:
`i-have-adhd` → `caveman` → `mattpocock-skills:grill-with-docs` → `mattpocock-skills:to-spec`
→ `mattpocock-skills:to-tickets` → `finishing-a-development-branch`,
with `tdd` applied whenever test / verification cases are devised (step 4),
and `ponytail` governing every line of code written (step 4 — laziest solution that works).

## Language — REQUIRED, ทั้ง flow
ตอบ user เป็น **ภาษาไทย** เสมอ — grill questions, confirm gate, สรุป, status, red-flag
warnings ทุกอย่าง. ผสมกับ caveman: terse Thai (ตัด filler/คำสุภาพ/hedging) แต่เก็บ
technical substance ครบ. คำเทคนิค / code / ชื่อ skill / `file:line` / error text /
command คงรูปเดิม (ไม่แปล). คงไว้จนจบ flow หรือ user สั่ง "stop caveman" /
"normal mode" / "ตอบอังกฤษ".

## The pipeline

### 1. Output style first — REQUIRED, before anything else
Two skills, in this order, before the grill and before any exploration:

**1a. `i-have-adhd`** — invoke it first (`Skill` tool, name `i-have-adhd:i-have-adhd`;
it is `disable-model-invocation`, so it only loads when explicitly invoked). Shapes every
response for the rest of the run: lead with the next action, number multi-step work,
restate state across turns, no tangents, specific time estimates, visible wins.

**1b. `caveman`** — then switch YOUR OWN communication to caveman style **in Thai** and
keep it active for the entire happy-code run: drop filler / pleasantries / hedging; keep
all technical substance exact (terms, code, file:line, errors). Honor caveman's
auto-clarity exceptions (security warnings, irreversible-action confirmations, genuinely
ambiguous multi-step asks).

**Combined = terse Thai, action-first, numbered.** Where they pull apart, ADHD structure
wins over caveman compression: keep the numbered steps, the state restatement, and the
"ต่อไปทำอะไร" closing line even though they cost words — caveman then strips the words
*inside* each of them. Never compress a multi-step instruction into one dense sentence.

Both stay active until the flow ends or the user says "stop adhd mode" / "stop caveman" /
"normal mode".

### 2. Grill — `mattpocock-skills:grill-with-docs`
Invoke `mattpocock-skills:grill-with-docs`. Interview the user about the task until shared understanding.
- Explore the codebase to answer questions yourself instead of asking the user.
- One question at a time; always give a recommended answer first.
- Resolve every design branch and dependency before writing any code.

### 2b. Spec — `mattpocock-skills:to-spec`
Grill จบ → invoke `mattpocock-skills:to-spec` (Skill tool; skill นี้ `disable-model-invocation`
ต้องเรียกเอง). สังเคราะห์จากสิ่งที่ grill ไปแล้ว — **ห้าม interview ซ้ำ**.
- ใช้ template ของ skill ครบทุกหัวข้อ: Problem / Solution / User Stories /
  Implementation Decisions / Testing Decisions / Out of Scope / Further Notes.
- ไม่มี issue tracker ต่อไว้ → เขียนลงไฟล์ `.scratch/<feature-slug>/spec.md` แทน publish.
- สรุป spec ให้ user (ไทย, caveman) แล้วรอ confirm ก่อนไปขั้นต่อไป.

### 2c. Tickets — `mattpocock-skills:to-tickets` → **แสดงเป็นตาราง**
ต่อจาก spec invoke `mattpocock-skills:to-tickets`. แตกงานเป็น tracer-bullet vertical slice
พร้อม blocking edges ตาม rule ของ skill นั้น (wide refactor = expand–contract).

**REQUIRED: แสดง breakdown เป็นตาราง markdown** ก่อนถาม user — ห้ามเป็น bullet ยาว:

| # | Ticket | Blocked by | ส่งมอบอะไร | Layer | ประเมิน |
|---|--------|-----------|-----------|-------|---------|
| 1 | ... | — | ... | BE/FE/DB | ~30 นาที |
| 2 | ... | 1 | ... | FE | ~1 ชม. |

- ถาม: granularity พอดีไหม / blocking edges ถูกไหม / ควรรวมหรือแตกอีกไหม → iterate จนอนุมัติ
- อนุมัติแล้วค่อย publish: ไม่มี tracker → ไฟล์ละ ticket ที่
  `.scratch/<feature-slug>/issues/<NN>-<slug>.md` เรียงตาม dependency
- ตารางนี้คือ work plan ของ step 3–8 — ทำทีละ ticket ตาม frontier (blocker เสร็จก่อน)
  และ restate ตารางพร้อมสถานะทุกครั้งที่ ticket หนึ่งจบ
- **ponytail escape hatch:** task เล็กที่เป็น ticket เดียวชัด ๆ → บอกหนึ่งบรรทัดว่า
  "1 ticket, ไม่แตก" แล้วไปต่อ ไม่ต้องทำตาราง

### 3. Impact analysis → confirm gate
**Impact analysis FIRST — before the confirm summary, before any code.** Find the blast
radius with grep/Glob yourself, don't guess. Cover both:
- **ในโปรแกรมตัวเอง** — every layer the screen touches (entity / slice / controller /
  SPA), other call sites of the function or SQL you're changing, DB columns & migrations,
  label/message keys.
- **ของคนอื่น** — shared code (DB function, shared component, base class, common SQL),
  other screens/modules calling it, API contract consumers, files another branch or the
  user's WIP is editing.

Report as: **จุดกระทบ → ความเสี่ยง → แนวทาง**, options laid out with the recommended one
first (e.g. narrow-scope change vs shared-code change + fix all callers). Zero impact
outside the task = say so in one line.

**Think about testing here too — part of the analysis, not deferred to step 4.** While
mapping the blast radius, enumerate the test/verification strategy: what proves the change
works, what would FAIL if the logic regressed (happy path, originally-reported case,
boundary/edge cases), and HOW each gets checked (unit test, DB query, manual run). Note
what's hard/impossible to test and why. Fold this into the confirm summary so the user
signs off on the test plan, not just the code plan.

**Flag any deviate-from-codebase call here too** (step 5) — if you intend to write the new
code differently from the surrounding pattern, it goes in the confirm summary, not as a
surprise in the diff.

Then summarize the locked plan (code + test strategy + any deviations) in one tight block
and wait for an "ok"/confirm. No code before this gate.

### 4. Build — yourself, no subagents
Write the code yourself with Read/Edit/Write. No Agent/Task dispatch, no delegation —
you hold the whole context already; spawning a cold agent to re-derive it is the expensive
path and this skill forbids it.

- Build the LAZY version — `ponytail`: the simplest thing that works. Climb the ladder,
  stop at the first rung that holds — does it need to exist (YAGNI) → stdlib → native
  platform feature → already-installed dep → one line → only then minimal new code. No
  unrequested abstractions, no scaffolding "for later", shortest working diff; deletion
  over addition. NEVER simplify away input validation at trust boundaries, error handling,
  security, accessibility, or anything the user explicitly asked for. Mark deliberate
  shortcuts with a `// ponytail:` comment.
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
  over-engineering — the quality review rejects that too.
- Apply step 5 (write better than the codebase) while writing, not as a later cleanup.
- Two-stage **self-review** after implementation: re-read your own diff top to bottom,
  **spec compliance FIRST, then code quality.** Fix and re-read until both pass. Never
  start the quality pass before spec is ✅. Review as an adversary, not an author: the
  quality pass checks the Sonar/complexity rules above AND REJECTS over-engineering —
  speculative generality, one-impl interfaces, needless new deps, boilerplate, gratuitous
  method-splitting — sending it back to the lazy version. Review by reading the code — do
  NOT run a Sonar scan; the rules are the point, the scanner is not. Report both verdicts
  to the user in one short block.
- Multi-layer work (FE/BE): do the layers in sequence, one coherent edit set per layer,
  self-review each layer before moving to the next.
- Derive test cases with `tdd` — cases BEFORE code, red → green → refactor. Enumerate
  the cases that PROVE the change works AND that would FAIL if the logic regressed:
  happy path, the originally-reported case, boundary / edge cases (empty, single vs
  many, null, duplicates, out-of-range). Write them first and watch them go RED, then
  implement until GREEN, then refactor with the tests still green. For a bug-fix task
  the red test IS the repro — it must fail before the fix and pass after. State each
  case and how it was checked (unit test, DB query, manual run) — don't hand-wave
  coverage. A test that never went red proves nothing.
- Verify honestly at the end. **BE**: `dotnet build`. **FE (Angular)**: do NOT run
  `ng build` / `npm run build*` — too slow. Typecheck only:
  `npx tsc --noEmit -p Web/spa/src/tsconfig.app.json` (catches `.ts` errors, not
  Angular template errors — that's the speed tradeoff; specs per the SPA memory if
  the change warrants). Report real failures vs environmental ones (e.g. file
  locks); never claim green when it isn't.

### 5. Write better than the codebase — your call
The surrounding code is the **default**, not the ceiling. Copying an existing slice keeps
things consistent; copying its flaws ships the flaws again. You decide, per case, which
wins — and you say which you chose and why, in one line.

**Default: follow the codebase pattern.** Consistency is real value — the next dev, and
the next agent, navigate by pattern. Deviating costs them.

**Deviate when the existing pattern is actually harmful here.** Worth improving on:
- a correctness or security hole in the pattern you'd be copying (missing `_user.Company`
  filter, unparameterized SQL, swallowed exception, missing `ICommand` marker so the write
  isn't transactional, missing null guard);
- an N+1 / repeated query / obvious O(n²) where a single query or a lookup is the same
  amount of code;
- copy-paste that would become the 3rd occurrence — extract instead;
- a method you're already touching that trips the Sonar rules (complexity > 15, nesting
  > 3) — flatten the part you touch;
- naming that actively misleads (Thai-domain mismatch, e.g. `program` vs `major`), where
  a correct name costs nothing.

**Do NOT deviate for:** taste, style, a newer language feature, "cleaner" architecture,
a framework you prefer, or anything that makes this file the odd one out with no
correctness payoff. That is over-engineering wearing a quality costume — ponytail kills it.

**Rules of engagement:**
- Improvement stays inside the blast radius you already touch. Do not refactor neighbours
  "while you're in there" — flag them instead (mention them, or spawn a follow-up task).
- Any deviation gets a one-line comment saying why (`// pattern deviation: <reason>`).
- A deviation that changes shared code or an API contract is a **user-owned decision** →
  step 6, ask first.
- Say the call explicitly in your report: "ตามแบบเดิม" or "ต่างจากแบบเดิมเพราะ …".
- If you spot a codebase-wide flaw the task can't fix, report it in one line at the end.
  Don't fix it, don't stall on it.

### 6. Ask back on every real decision
Whenever something needs a decision the USER owns, STOP and ask (AskUserQuestion),
recommended option first. Triggers:
- a design/scope choice with genuine alternatives;
- an unexpected fix needed beyond the stated task;
- intermingled or unexpected working-tree changes — do NOT silently mix; ask whose
  they are and how to handle;
- your self-review flags something that contradicts the confirmed plan;
- a step-5 deviation that touches shared code or an API contract.
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
- Dispatch a subagent (Agent/Task/workflow) anywhere in this flow — solo only.
- Reply to the user in English — Thai-only this flow.
- Run the flow without invoking `i-have-adhd` then `caveman` at step 1.
- Let caveman crush ADHD structure — no wall-of-text multi-step answers, no dropped
  "ต่อไปทำอะไร" line.
- Skip `to-spec` / `to-tickets` after the grill — เว้น task เล็กที่ประกาศไว้ว่า "1 ticket, ไม่แตก".
- Show the ticket breakdown as anything other than a markdown table.
- Implement before the step-3 confirm gate.
- Reach the confirm gate without an impact analysis — blast radius (own program AND
  shared/other-people's code) must be reported with แนวทาง before "ok".
- Skip the two-stage self-review, or run quality before spec passes.
- Proceed past a user-owned decision by guessing.
- Ship over-engineered / speculative / scaffolded-for-later code — violates `ponytail`
  (laziest working solution wins; self-review sends bloat back).
- Ship a Sonar-dirty method — complexity > 15, nesting > 3, duplicated blocks, magic
  values, dead code, empty catch. Equally: split methods preemptively when no rule trips.
- Copy a broken pattern (missing company filter, unparameterized SQL, swallowed exception,
  missing `ICommand`) just because the neighbouring file does it — step 5 says fix it here.
- Deviate from the codebase pattern for taste, or refactor code outside the blast radius.
- Commit intermingled / unrelated / user-WIP changes together.
- Merge or open a PR (keep branch as-is unless told otherwise).
- Claim done without deriving test cases via `tdd` (esp. the originally-reported case
  + edge cases) for any non-trivial change, or ship a test that never went red.
- Claim build/tests green without actually verifying (FE = `tsc --noEmit`, never a
  slow `ng build`).
