---
name: happy-code
description: >
  Standard guided pipeline for executing one development task end-to-end, solo —
  no subagents: replies follow the plugin's style section (Thai, ADHD-friendly, show-me views, 1A/1B question
  blocks), then grill-with-docs to lock the design (every choice shown with an example result — sample data, flow or diagram),
  to-spec + to-tickets to turn it into a spec and a table of tracer-bullet tickets,
  an impact analysis drawn as a flow with diagram-design + explicit confirm gate, then implement the laziest working
  solution (ponytail) yourself with self-run spec+quality review gates and test cases
  derived via tdd, asking the user back on every real decision, committing atomically only after the user has reviewed the diff and said to commit,
  and finishing by keeping the branch as-is. Code may improve on the existing codebase
  pattern when the improvement is clearly worth it — you decide, and say why.
  Replies to the user in Thai. Use when the user assigns a coding task and wants this
  full pipeline, or invokes /happy-code.
---

# Task Flow

Orchestrated pipeline for one development task, executed **solo — no subagents, no Agent/Task
dispatch at any step**. This holds even when ultracode is on or a system reminder says to use the Workflow tool:
the user's own instruction (this skill, their memory) comes first. Announce at start (in Thai):
"ใช้ happy-code: ภาพระบบตอนนี้ → grill (โจทย์ก่อน, คำถาม 1A/1B มี ★ และตัวอย่าง) → spec → tickets (ตาราง) → impact analysis (flow) + test case matrix → confirm → build เอง (ponytail) → self-review spec+quality → ถามทุก decision → test-case (tdd) → (งาน UI: ถามก่อนเล่นจอ happy-screen-test) → คง branch ไว้ · state.md ตลอด flow"

This skill chains existing skills — invoke them, don't reinvent them:
`mattpocock-skills:grill-with-docs` → `mattpocock-skills:to-spec`
→ `mattpocock-skills:to-tickets` → `finishing-a-development-branch`,
with `tdd` applied whenever test / verification cases are devised (step 4),
`ponytail` governing every line of code written (step 4 — laziest solution that works),
and `diagram-design:diagram-design` drawing every flow / picture (grill choices in step 2,
impact analysis in step 3). For UI work, `happy-code:happy-screen-test` plays the test plan on screen
(step 7b) — only after the user says yes.

## Language — REQUIRED, ทั้ง flow
ภาษาและรูปแบบคำตอบตาม section `happy-code:style` (step 1) — ตอบ **ภาษาไทย** ทุกอย่างจนจบ flow
หรือ user สั่ง "ตอบอังกฤษ"; code / `file:line` / error text / command / ชื่อ skill คงรูปเดิม.

## State file — REQUIRED, ทั้ง flow
เก็บสถานะงานไว้ที่ `.scratch/<feature-slug>/state.md` เพราะ context ถูก compact หรือ hand off ได้
ทุกเมื่อ และสรุปหลัง compact เชื่อไม่ได้ทั้งหมด. สร้างตอนเริ่ม step 2. อัปเดตทุกครั้งที่ ticket
เปลี่ยนสถานะ, user ตัดสินใจอะไร, ก่อน commit และก่อน hand off.

```markdown
# <feature> — state
Ticket: ClickUp <task_id> "<ชื่อ task>"   (ไม่มี ticket → ตัดบรรทัดนี้)
Branch: <branch> จาก <base>
## Tickets          | # | ticket | สถานะ (todo/doing/done) | commit |
## Decisions        - <วันที่> <คำตัดสินใจ> (user: "<คำพูดของ user>")
## Must not change  - <สิ่งที่ห้ามเปลี่ยน / source of truth จาก step 2>
## Working tree     - <ไฟล์> : ของเรา / WIP ของ user / ของ session อื่น
## Commit choice    - แยก หรือ รวม กับ WIP ของ user (step 7)
## Options          - FE=BE: on / off (step 3)
## How to verify    - <คำสั่ง test, script, query ที่ใช้จริง>
```

- เริ่ม flow → `git status --short` แล้วบันทึกไฟล์ที่แก้ค้างอยู่แล้วว่าเป็น "WIP ของ user" ก่อนแตะอะไร.
- หลัง compact หรือรับงานต่อ → อ่าน `state.md` และ `git status` ก่อน. ห้ามเชื่อสรุปอย่างเดียว.
- ไฟล์อยู่ใน `.scratch/` → ไม่ commit.
- Ticket Cockpit (pane ของ plugin นี้, `/cockpit`) อ่านไฟล์นี้: คงบรรทัด `Ticket:` / `Branch:` และคอลัมน์ตาราง Tickets ตามแบบ, สถานะขึ้นต้นด้วย `todo` / `doing` / `done`.

## Long waits — background, never block
อะไรที่ต้องรอนาน (build / test ชุดใหญ่, job เบื้องหลัง, import ไฟล์ใหญ่, รอ user login / restart server /
รัน DB script) → รันด้วย `run_in_background` แล้วเฝ้าด้วย `Monitor` หรือ waiter ที่ออกเองเมื่อเงื่อนไขครบ
(เช่น log ขึ้น "Application started" ใหม่ + query read-only เห็นค่าที่ script ตั้ง) แล้วทำขั้นต่อไปเองทันที.
- บอก user เป็นข้อ ๆ ว่ากำลังรออะไรจากเขา และพอครบแล้วจะเกิดอะไรต่อ.
- filter ของ monitor ต้องจับทั้งสำเร็จและพัง (`DONE|FAIL|ERROR|Traceback`) — เงียบไม่ได้แปลว่าผ่าน.
- ห้าม `sleep` / poll ค้างใน foreground; ห้าม kill process หรือ restart server ของ user เอง.

## The pipeline

### 1. รูปแบบคำตอบ — มาจาก plugin
กติกาภาษา, โครงคำตอบ, ภาพเล็กแบบ show-me และรูปแบบคำถาม 1A/1B อยู่ใน section `happy-code:style`
ที่ hook ของ plugin นี้ใส่ใน system prompt ทุก session — ไม่ต้องโหลด skill ใด.
ไม่เห็น section นั้น (ปิด option `thaiStyle` หรือ plugin รุ่นเก่า) → ทำตามสรุปนี้เอง: ตอบไทย · บรรทัดแรกคือสิ่งที่จะทำ ·
งานหลายขั้นใส่เลข · กลับมาทำต่อ = สรุปสถานะก่อน · ปิดด้วย "ต่อไปทำอะไร" · คำถามมีตัวเลือกใช้ block ตาม step 2.
plugin caveman เปิดอยู่ → กระชับได้ แต่ห้ามทิ้งเลขขั้น การสรุปสถานะ และบรรทัด "ต่อไปทำอะไร".

### 2. Grill — `mattpocock-skills:grill-with-docs`
Invoke `mattpocock-skills:grill-with-docs`. Interview the user about the task until shared understanding.
- Explore the codebase to answer questions yourself instead of asking the user.
- ถามทุกข้อที่ตัดสินได้ตอนนี้ในรอบเดียว (ทับกติกา "ถามทีละข้อ" ของ grill-with-docs); ตัวที่แนะนำ (★) มาก่อนเสมอ.
- Resolve every design branch and dependency before writing any code.

**REQUIRED: ค้น convention ของโมดูลข้างเคียงก่อนเสนอตัวเลือก.** เรื่องที่ระบบมีของคล้ายกันอยู่แล้ว — endpoint กลางที่
โมดูลอื่นใช้, ค่า audit (`created_by` / `created_program`) ของข้อมูลที่ระบบอื่นยิงเข้ามา, event / handler pattern,
แถวที่จองไว้ในเอกสารกลาง — grep โค้ดและ query ข้อมูลจริง (read-only) ของโมดูลพี่น้องก่อน แล้วให้ตัวเลือกที่ตรง
convention เป็นตัวแนะนำ อ้าง `file:line` หรือแถวข้อมูล. เดาจากชื่อจอ (เช่นเสนอ program = ชื่อจอ ทั้งที่ระบบอื่นใช้
`<MODULE>_INTERFACE`) = แนะนำผิดและ user ต้องแก้ให้.

**REQUIRED: ภาพระบบตอนนี้ (2a) — ก่อนคำถามแรก.** หลังอ่านโค้ดและข้อมูลส่วนที่งานแตะ (รวม convention ข้างบน)
วาดด้วย `diagram-design:diagram-design` ว่าตอนนี้ระบบทำงานยังไง แล้วส่งให้ user ดูก่อนเปิดรอบคำถาม:

| สิ่งที่สำคัญในงาน | type |
|---|---|
| กติกาต่างกันระหว่างทางเข้า (สร้าง / แก้ / คัดลอก / API) | Flowchart แบบ paired traces — ไฮไลต์จุดแรกที่ต่าง |
| request วิ่งข้าม layer (UI → API → service → DB) | Sequence |
| โครงสร้าง / ใครเรียกใคร | Architecture |
| ตาราง / ความสัมพันธ์ของข้อมูล | ER หรือ Database schema |
| สถานะของเอกสาร / record | State machine |

- ทุกกล่องที่อ้างโค้ดมี `file:line` จริง — อ่านก่อนวาด ห้ามเดา. จุดที่ ticket / tester บอกว่าผิด = accent (≤ 2 จุด).
- เก็บ `.scratch/<feature-slug>/diagrams/current-<n>.html` · ส่งด้วย `SendUserFile` (`display: "render"`) ·
  กติกาฟอนต์ไทย, self-check และการข้าม pause "confirm before drawing" ตาม step 3.
- ใต้ภาพ: ตาราง "เห็นอะไรในภาพ → grill จะถามอะไร" แล้วเปิดรอบคำถาม.
- ทางลัด: งาน "1 ticket, ไม่แตก" และไม่กระทบที่อื่น → call tree หรือ pseudocode ในแชตแทน HTML.

**REQUIRED: งานแตะสิทธิ์ / การมองเห็นข้อมูล → ไล่ทุกจุดที่ข้อมูลโผล่ใน grill** ก่อนล็อกกติกา. แสดงเป็นตารางให้ user
ตอบทีละแถว (กติกาที่ไม่ได้เขียนต่อแถว = user ต้องทักทีละจุดหลัง build):

| จุด | ใครเห็น / ทำได้ | เช็คที่ |
|---|---|---|
| จอค้นหา (list) | … | BE query |
| dropdown / typeahead ทุกตัวที่ดึงข้อมูลนี้ | … | BE query |
| เปิด detail / edit | … | BE + resolver |
| เข้าโหมด add | … | resolver (แจ้งเตือน + กลับจอค้นหา) + BE |
| action (ส่ง / อนุมัติ / ยกเลิก) | … | BE hook |
| API ภายนอก / export / print | … | BE |

**REQUIRED: ถามโจทย์ก่อนเสนอทางเลือก.** คำถามแรกของ grill (ก่อนคำถามที่มีตัวเลือก) ต้องล็อก
สิ่งที่ห้ามเปลี่ยนและ source of truth ให้ได้ก่อน เช่น "ต้องคงรหัส status เดิมไหม", "ยึด db_status
หรือยึด function", "จอเดิมต้องได้ผลเหมือนเดิมไหม". ทางเลือกที่ขัดกับคำตอบนี้ไม่ต้องเสนอ.
- task ที่แก้ logic เดิม → ภาพ 2a คือคำอธิบายของเดิม; ใต้ภาพเพิ่ม 1–2 บรรทัดว่าทำไมโค้ดเดิมเขียนแบบนั้น
  (อ้าง `file:line`) เช่น ทำไม SQL เดิมต้องมี `AND` เยอะ. user เห็นภาพของเดิมก่อนจะตัดสินใจได้ถูกกว่า.
- คำตอบเขียนลง `state.md` หัวข้อ "Must not change" และหัวข้อ Implementation Decisions ของ spec.

**REQUIRED: คำถามที่มีตัวเลือก → ทุกตัวเลือกต้องมีตัวอย่างผลลัพธ์ให้เห็นภาพ** ว่าเลือกแล้ว
ได้อะไร — ห้ามมีแค่คำอธิบายนามธรรม. เลือกรูปแบบตามสิ่งที่ตัวเลือกต่างกัน:
- **ข้อมูล / output ต่างกัน** → ตัวอย่างข้อมูลจริงของแต่ละตัวเลือก: แถวตาราง, JSON response,
  ค่าที่ขึ้นบนจอ, ข้อความใน report. ใช้ค่าสมจริงจาก domain/codebase ไม่ใช่ `foo`/`bar`.
- **flow / ลำดับขั้นต่างกัน** → flow สั้นต่อตัวเลือก (`A → B → C`).
- **UI / layout ต่างกัน** → mockup ASCII ของหน้าจอ.

เขียนคำถามเป็น block ต่อข้อตาม section `happy-code:style`: `❓<เลข>` คำถาม + สถานการณ์จริงหนึ่งบรรทัด ·
ตัวเลือก `1A` / `1B` · ★ ตัวแนะนำ · ⛔ รหัสและข้อความที่ผู้ใช้เห็นบนจอ · ✅ ข้อดี · ⚠️ ข้อเสีย · ตัวเลือกที่แค่เพิ่มกติกา
→ block `diff` บรรทัด `+`. ตัวอย่างผลลัพธ์ (แถวข้อมูล / flow / mockup) อยู่ใต้ตัวเลือกใน block เดียวกัน (สั้น ≤ ~15 บรรทัด).
ปิดรอบด้วย "ค่าแนะนำ: 1A 2B …" ให้ตอบด้วยปุ่ม "ใช้ค่าแนะนำ" หรือพิมพ์รหัส — ไม่ใช้ preview ของ `AskUserQuestion` / widget.
ตัวเลือกต่างกันที่ **โครงสร้าง** (flow หลาย branch, layer, data model) จนข้อความไม่พอ →
วาดภาพเทียบด้วย `diagram-design:diagram-design` — หนึ่งไฟล์ ตัวเลือกละ panel (A vs B),
type ตามตาราง step 3. เก็บที่ `.scratch/<feature-slug>/diagrams/grill-<topic>.html`, แสดงแบบเดียวกับ
step 3, ส่งภาพก่อนแล้วค่อยถามด้วย block (อ้าง panel A / B). คำถามปลายเปิด
หรือ yes/no ที่ไม่มีผลลัพธ์ต่างกันให้ดู → block สั้นไม่ต้องมีตัวอย่าง.

### 2b. Spec — `mattpocock-skills:to-spec`
Grill จบ → โหลด `to-spec` ด้วยการอ่านไฟล์ตรง ๆ แล้วทำตามเหมือน invoke. skill นี้ตั้ง
`disable-model-invocation: true` → Skill tool เรียกไม่ได้ ไม่ต้องลอง:
1. หาไฟล์ตามลำดับ ใช้ที่แรกที่เจอ:
   - ข้าง `grill-with-docs` ที่โหลดใน step 2: หัวของมันบอก `Base directory for this skill: <dir>` →
     `<dir>/../to-spec/SKILL.md` (ใช้ได้ทั้ง plugin ที่ติดตั้งด้วย CLI และที่แอป desktop sync มา)
   - Glob `*/mattpocock-skills/*/skills/engineering/to-spec/SKILL.md` ใน `~/.claude/plugins/cache/`
     — เจอหลาย version → ใช้ version สูงสุด.
2. Read ไฟล์นั้นแล้วทำตาม instruction ในไฟล์.
3. หาไม่เจอ → บอก user หนึ่งบรรทัดว่าไม่ได้ติดตั้ง `mattpocock-skills` แล้วเขียน spec ตาม template ด้านล่างเอง.

สังเคราะห์จากสิ่งที่ grill ไปแล้ว — **ห้าม interview ซ้ำ**.
- ใช้ template ของ skill ครบทุกหัวข้อ: Problem / Solution / User Stories /
  Implementation Decisions / Testing Decisions / Out of Scope / Further Notes.
- ไม่มี issue tracker ต่อไว้ → เขียนลงไฟล์ `.scratch/<feature-slug>/spec.md` แทน publish.
- สรุป spec ให้ user (ไทย, caveman) แล้วรอ confirm ก่อนไปขั้นต่อไป.

### 2c. Tickets — `mattpocock-skills:to-tickets` → **แสดงเป็นตาราง**
ต่อจาก spec โหลด `to-tickets` แบบเดียวกับ 2b (Glob `.../skills/engineering/to-tickets/SKILL.md`
→ Read → ทำตาม; skill นี้ก็ `disable-model-invocation`). แตกงานเป็น tracer-bullet vertical slice
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

### 2d. Quick-fix lane — bug ระหว่างทาง / งานเล็กที่ user สั่งเพิ่ม
ใช้แทน step 2–3 เมื่อเข้าเงื่อนไขครบทุกข้อ:
- เป็น bug ที่ user ชี้ หรือเจอระหว่าง flow หรือเป็นงานปรับเล็ก (เช่น ความกว้างคอลัมน์ grid,
  ค่าค้นหาหายตอนกลับจากหน้า detail);
- แก้ไม่เกิน 1 layer และไม่เกินประมาณ 3 ไฟล์;
- ไม่แตะ shared code, API contract หรือ DB schema;
- ไม่มีทางเลือกที่ user ต้องตัดสินใจ (มี → ถามด้วย block 1A/1B ก่อนแล้วค่อยเข้า lane).

Flow: หา root cause (อ่านโค้ด + repro) → test แดง (unit test หรือ script ตาม "Verification
recipes" ใน step 4) → แก้ → test เขียว + ตรวจบนจอ → รายงานสาเหตุ (`file:line`), สิ่งที่แก้ และผลตรวจ
→ commit เมื่อ user สั่ง. ไม่ทำ spec, tickets หรือ impact diagram. บอกหนึ่งบรรทัดว่า "quick-fix lane".
ไม่เข้าเงื่อนไขข้อใดข้อหนึ่ง → ใช้ full pipeline.

### 3. Impact analysis → confirm gate
**Impact analysis FIRST — before the confirm summary, before any code.** Find the blast
radius with grep/Glob yourself, don't guess. Cover both:
- **ในโปรแกรมตัวเอง** — every layer the screen touches (entity / slice / controller /
  SPA), other call sites of the function or SQL you're changing, DB columns & migrations,
  label/message keys.
- **ของคนอื่น** — shared code (DB function, shared component, base class, common SQL),
  other screens/modules calling it, API contract consumers, files another branch or the
  user's WIP is editing.
- **command ซ้อน** — design ที่เรียก command จากใน handler หรือ event handler (`Mediator.Send` ซ้อน): inner command
  อยู่ใน transaction เดียวกันไหม, domain event ของ inner ยิงตอนไหน (pipeline ที่ข้าม transaction ซ้อนมักไม่ dispatch
  event จนจบ command นอกสุด), audit ได้ user / program ของใคร. อ่าน pipeline behaviour จริงก่อน แล้วยกขึ้นตั้งแต่ grill
  ตอนเลือก design — ไม่ใช่รอ user ทัก.

**โค้ดของทีม/module อื่น** (เช่นงาน EN ต้องแตะ service ของ FN): ห้ามแก้เองโดยไม่ถาม. ถามด้วย
block 1A/1B ก่อน build ว่าจะ (ก) ทำแค่ฝั่งตัวเอง + เขียนส่งต่อ (README/diagram: ฝั่งเราเตรียมอะไรไว้แล้ว
ทีมนั้นต้องแก้อะไร ที่ไหน) หรือ (ข) แก้ข้ามทีมในงานนี้. ไม่รู้ว่าใครเป็นเจ้าของ → ถือว่าเป็นของทีมอื่น.
ถ้าเปลี่ยนการเรียกข้ามทีมเป็น event: ฝั่งที่ประกาศ event เป็นเจ้าของ contract ของ event; ฝั่งเรา
เพิ่มได้แค่ตัวรับ และของเดิมที่ทีมนั้นยังเรียกให้ใช้ `[Obsolete]` ชี้ทางใหม่แทนการลบ/เปลี่ยนชื่อ.

Report as: **จุดกระทบ → ความเสี่ยง → แนวทาง**, options laid out with the recommended one
first (e.g. narrow-scope change vs shared-code change + fix all callers). Zero impact
outside the task = say so in one line.

**REQUIRED: วาดผลวิเคราะห์เป็น flow ให้เห็นภาพ** — ใช้ `diagram-design:diagram-design`
(Skill tool) วาดก่อนสรุป confirm. เลือก type ตามสิ่งที่วิเคราะห์ ไม่เกิน 2 ภาพ:

| วิเคราะห์อะไร | type |
|---|---|
| logic / เงื่อนไขที่เปลี่ยน | Flowchart |
| request ข้าม layer (UI → controller → service → DB) | Sequence |
| blast radius — ใครเรียกของที่แก้ | Dependency graph |
| โครงสร้างก่อน vs หลังแก้ | Architecture delta |
| เปลี่ยน table / column | Database schema |

- node ที่แก้ = accent (coral), node ที่กระทบแต่ไม่แก้ = ปกติ + label ความเสี่ยง. ≤ 9 node ต่อภาพ.
- type + content ถูกกำหนดจาก step นี้แล้ว → ข้าม pause "confirm before drawing" ของ
  diagram-design: บอก type หนึ่งบรรทัดแล้ววาดเลย. style-guide gate ครั้งแรก → แนะนำ (e) keep default.
- เก็บไฟล์ที่ `.scratch/<feature-slug>/diagrams/impact-<n>.html` แล้วแสดงให้ user เห็น:
  มี `SendUserFile` → ส่ง `display: "render"`; ไม่มี → บอก path ให้เปิดใน browser.
- ไม่ได้ติดตั้ง diagram-design → บอกหนึ่งบรรทัด แล้ววาด Mermaid code block ใน chat แทน.
- **ข้อความไทยในภาพ:** Geist ไม่มีตัวไทย → เพิ่ม `Noto Sans Thai` ใน Google Fonts link และในทุก
  font stack (`'Geist','Noto Sans Thai',sans-serif`, `'Geist Mono','Noto Sans Thai',monospace`).
  ตัวอักษรใน SVG ≥ 10px (ข้อความหลักและ legend ≥ 11px). กล่องและชิปเผื่อความกว้างประมาณ 6px
  ต่อตัวอักษรไทยที่ 10px. วาดเสร็จรัน `scripts/self_check.py` ของ diagram-design และเปิดดูภาพจริงก่อนส่ง.
- **นอก step 2–3:** เวลาอธิบายทางเลือก, เทียบผลก่อน/หลัง หรือตอบ "ทำไม" ที่มีโครงสร้าง (ลำดับขั้น,
  coverage, ตัวเลขเทียบกัน) → วาดภาพเลยถ้าช่วยให้เห็นภาพ ไม่งั้นเสนอหนึ่งบรรทัดท้ายคำตอบ.
- **ponytail escape hatch:** task "1 ticket, ไม่แตก" + zero impact นอก task → flow ข้อความ
  บรรทัดเดียวใน chat พอ (`A → B → C`), ไม่ต้องเปิด diagram-design.

**Test case matrix — REQUIRED, part of the analysis, not deferred to step 4.** ไล่ครบทุกเลนส์ขณะหา blast radius;
เลนส์ที่ไม่เกี่ยวกับงาน → เขียน `ไม่เกี่ยว: <เหตุผล>` ห้ามข้ามเงียบ:
1. **กติกา** — ทุกกติกาที่งานเพิ่มหรือแตะ ทั้ง BE (validator, handler, DB constraint / function) และ FE (required,
   disabled, hidden, filter, mask) พร้อม `file:line`.
2. **ทางเข้า** — ทุกทางที่ข้อมูลเข้าหรือเปลี่ยน: สร้าง, แก้, คัดลอก, import, bulk, เรียก API ตรง, job. "แก้" แยกตามสถานะแถว
   (ใหม่ / แก้ / ลบ / แถวเดิมที่ไม่แตะ) และแถวหลักกับแถวลูก. ถาม: ทุกทางเรียกกติกานี้ไหม · ทางพี่น้องกรองแถวแบบเดียวกันไหม.
3. **สถานะข้อมูล** — null / ว่าง, ค่าขอบ, "เหมือนแต่ต่าง" (ค่าเดียวกันคนละ key ย่อย), เปลี่ยนหลังบันทึก (ย้าย / ปิดใช้งาน /
   ยังไม่ยืนยัน), หลายแถวต่อ key, ข้อมูลของ scope อื่น, แถวของ record ตัวเอง, id ที่ไม่มีจริง, ข้อมูลเก่าที่ผิดกติกาใหม่.
4. **ข้อมูลบนจอ BE=FE** — ทุกช่องหรือรายการที่ดึงจาก master / lookup / status เทียบ 3 จุด: FE แสดงหรือกรอง ↔
   BE API ที่ให้รายการ ↔ BE ตอนบันทึก. เงื่อนไข: active, scope / สิทธิ์ (บริษัท / หน่วยงาน / สาขา), ช่วงวันที่หรือรอบ,
   parent → child, สถานะ, soft delete, default filter ของจอค้นหา, limit / sort — รวมค่าที่บันทึกไว้แล้วแต่ตอนนี้ใช้ไม่ได้
   (inactive, นอกสิทธิ์) ตอน view / แก้ / คัดลอก. จุดที่ไม่ตรงกัน = เคส: เรียก API ด้วยค่าที่จอซ่อน · เปิดแก้ record ที่ถือค่า
   inactive · คัดลอกจาก / ไปขอบเขตที่ปิดแล้ว · ค่านอกสิทธิ์ได้ error อะไร ข้อความและสีอะไร.
5. **FE vs BE รายกติกา** สองทาง — BE หลวมกว่า FE, FE เข้มกว่า BE · option FE=BE on → ข้อความต้องตรงกัน.
6. **คนอ่านต่อ** — module / report / export / print อื่นที่อ่านข้อมูลนี้ใช้นิยามเดียวกันไหม (query read-only).
7. **ลำดับ error** และผิดหลายข้อใน request เดียว · หลาย tab / หลายคนแก้พร้อมกัน (บันทึกเป็นความเสี่ยง).
8. **สิทธิ์** — ทุกแถวของตารางจุดที่ข้อมูลโผล่ (step 2) มีเคส.
9. **ข้อความ / label** มีครบทุก env · วันที่ เวลา โซนเวลา ปฏิทิน (เช่น พ.ศ. / ค.ศ.).
10. **mutation check** — ทุกกติกา: ปิดชั่วคราวแล้ว test ของกติกานั้นต้องแดง (ทำตอน step 4).
11. **ช่องว่าง** — ข้อมูล dev ไม่พอให้ทดสอบ → เสนอ seed script ให้ user รัน ไม่ทิ้งเงียบ.

ผลลัพธ์: `.scratch/<feature-slug>/test-matrix.html` (CSS เดียวกับ impact) คอลัมน์ กติกา · ทางเข้า · สถานะข้อมูล · FE ·
BE list · BE save · เคส · ครอบด้วย (unit / SQL dev / จอ / ช่องว่าง) → ส่ง `SendUserFile` render + สรุปในแชตเป็นจำนวนต่อเลนส์
และรายการช่องว่าง พร้อมบอกว่าอะไรทดสอบยากหรือไม่ได้และเพราะอะไร. ทางลัด: quick-fix lane หรือ "1 ticket, ไม่แตก"
ที่ไม่กระทบที่อื่น → matrix ย่อในแชต (เลนส์ 1–4).

**Option FE=BE — ถามครั้งเดียวต่อ run, เฉพาะงานที่มี validation ทั้ง FE และ BE** (บางโปรเจคไม่ใช้):
ถามด้วย block "ให้ FE กับ BE ตรวจ field เดียวกันด้วยข้อความเดียวกันไหม?" — **on**: BE ครอบทุก rule ที่ FE
บังคับ (required, รูปแบบ, ขนาด) ใช้ข้อความตาม convention ของระบบ (เช่น ใต้ช่อง = ข้อความสั้น, toast = ระบุชื่อช่อง)
และทดสอบ error path ของจอจริง (interceptor ที่ toast แล้วกลืน error ทำให้ error callback ไม่ทำงาน);
**off**: ข้าม. บันทึกที่ `state.md` → Options แล้วใช้ทั้ง run.

**Flag any deviate-from-codebase call here too** (step 5) — if you intend to write the new
code differently from the surrounding pattern, it goes in the confirm summary, not as a
surprise in the diff.

Then summarize the locked plan (code + test case matrix + any deviations + impact diagram) in one tight block
and wait for an "ok"/confirm — the user approves the impact and the matrix together. No code before this gate.

### 3b. Decision changed after the confirm gate
User เปลี่ยนการตัดสินใจหรือเพิ่ม scope หลัง confirm (เช่น "ต้อง 403 ไม่ใช่ 400", "เช็คทุก action
ด้วย") → หยุดเขียนโค้ดส่วนที่กระทบ แล้วทำ delta loop ก่อนไปต่อ:
1. อัปเดต `spec.md` เฉพาะหัวข้อที่เปลี่ยน (Implementation Decisions, Testing Decisions, Out of Scope).
2. อัปเดตตาราง ticket (เพิ่มหรือแก้แถว และ blocking) และ `state.md` หัวข้อ Decisions.
3. เพิ่ม impact 1–3 บรรทัด: จุดใหม่ที่แตะ, shared code ใหม่, ความเสี่ยงใหม่. โครงไม่เปลี่ยน → ไม่ต้องวาดภาพใหม่.
4. test case ที่เปลี่ยน → แก้ test ก่อน แล้วดูให้แดงอีกรอบ. รวม manual test plan (`docs/test-plans/`): เคสที่ผลคาด
   เปลี่ยนตามกติกาใหม่ แก้ในไฟล์ แล้วบอก user ว่าเคสไหนต้องเล่นจอซ้ำ.
5. สรุป delta เป็นก้อนเดียวไม่เกิน 5 บรรทัด แล้วรอ "ok" สั้น ๆ. user สั่ง "ทำทีเดียวเลย" ไว้แล้ว
   → แจ้ง delta แล้วทำต่อได้ ไม่ต้องรอ.

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
  - no magic numbers/strings (const, or the project's parameter / config table), no dead code,
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
  to the user in one short block. Option FE=BE on (step 3) → the spec pass also checks
  every FE rule has its BE rule and message, field by field.
  **Deleting a line that looks redundant:** in event-driven code (`patchValue` / `setValue` that fire
  `valueChanges`, subscriptions, cached lookups) the second call often exists for its *order*, not its value.
  Trace what fires and in which order before and after the deletion, and write that trace in the self-review.
  (Example: a "redundant" `setValue(id)` after `patchValue` re-ran a dependent lookup once its parent field was
  set; deleting it left saved records with empty dropdown lists.)
- Multi-layer work (FE/BE): do the layers in sequence, one coherent edit set per layer,
  self-review each layer before moving to the next.
- Derive test cases with `tdd` from the step-3 test case matrix (its unit rows first) — cases BEFORE code,
  red → green → refactor, then the mutation check per rule (lens 10). Enumerate
  the cases that PROVE the change works AND that would FAIL if the logic regressed:
  happy path, the originally-reported case, boundary / edge cases (empty, single vs
  many, null, duplicates, out-of-range). Write them first and watch them go RED, then
  implement until GREEN, then refactor with the tests still green. For a bug-fix task
  the red test IS the repro — it must fail before the fix and pass after. State each
  case and how it was checked (unit test, DB query, manual run) — don't hand-wave
  coverage. A test that never went red proves nothing.
- **Verification recipes** — เลือกตามชนิดงาน. สูตรเหล่านี้นับเป็น test แดง → เขียวได้:

  | งาน | วิธีพิสูจน์ |
  |---|---|
  | แก้ DB function / SQL logic (DB read-only สำหรับเรา) | query read-only: ดึง expression จาก script ที่จะรันจริง (ห้ามพิมพ์ซ้ำ), cross join ทุก combination ของ input แล้วเทียบเก่ากับใหม่. นับ (1) แบบที่เก่าถูกแต่ใหม่ต่าง ต้องเป็น 0 (2) แบบที่ผลไม่ valid หรือ NULL (3) แถวข้อมูลจริงที่ผลเปลี่ยน |
  | จัด layout UI (grid, ฟอร์ม) | วัดด้วย Playwright `evaluate`: ความกว้างช่องเทียบกับความกว้างข้อความ + padding + ไอคอน และจำนวนบรรทัดต่อ cell. แนบภาพก่อน/หลัง. ห้ามกะด้วยตา |
  | bug SPA ที่ไม่มี spec runner | Playwright repro script เป็น test แดง: assert บน state จริง (`sessionStorage`, `ng.getComponent(el).<form>.value`, response ของ API). รันก่อนแก้ (แดง) และหลังแก้ (เขียว) |
  | ข้อความบนจอ, flow หลายจอ / หลาย tab, FE กับ BE ต้องได้ข้อความเดียวกัน | `happy-code:happy-screen-test` — ถาม user ก่อน (step 7b) แล้วเล่น test plan บน Chrome ให้ user ตรวจเอง |

  dev server ต้อง rebuild ก่อนวัด → retry จนเห็นค่าใหม่. ห้ามสรุปจากรอบที่ยังเป็นโค้ดเก่า.
- Verify honestly at the end with the project's own build / typecheck commands (read them from CLAUDE.md,
  memory or the CI config — e.g. .NET `dotnet build`; Angular `npx tsc --noEmit -p <the app's tsconfig>`).
  Do NOT run a full FE production build (`ng build` / `npm run build*`) — too slow; a typecheck misses template
  errors, which is the speed tradeoff, so run the specs the project has when the change warrants. Report real
  failures vs environmental ones (e.g. file locks); never claim green when it isn't.

### 5. Write better than the codebase — your call
The surrounding code is the **default**, not the ceiling. Copying an existing slice keeps
things consistent; copying its flaws ships the flaws again. You decide, per case, which
wins — and you say which you chose and why, in one line.

**Default: follow the codebase pattern.** Consistency is real value — the next dev, and
the next agent, navigate by pattern. Deviating costs them.

**Deviate when the existing pattern is actually harmful here.** Worth improving on:
- a correctness or security hole in the pattern you'd be copying (missing tenant / company
  filter, unparameterized SQL, swallowed exception, a write that is not inside a transaction,
  missing null guard);
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
Whenever something needs a decision the USER owns, STOP and ask with the question block
(step 2 format: 1A/1B, ★ recommended first, answer by button or typed codes). Triggers:
- a design/scope choice with genuine alternatives;
- an unexpected fix needed beyond the stated task;
- intermingled or unexpected working-tree changes — do NOT silently mix; ask whose
  they are and how to handle;
- your self-review flags something that contradicts the confirmed plan;
- a step-5 deviation that touches shared code or an API contract.
Never guess on a user-owned decision; never proceed past one.

### 7. Commit discipline
- **Never commit before the user has reviewed.** Every ticket ends with the diff summary and a stop; commit only on
  an explicit "commit" from the user (a plan approval, "เริ่มเลย" or "ไปต่อ" is not commit approval). Already
  committed by mistake → say so, offer to keep or undo, never rewrite history unasked.
- Atomic commit per task. Stage only that task's files.
- When a task's changes sit in files that also hold user WIP (or another session's work),
  ask ONCE per run with a question block:
  - **แยก (แนะนำ)** — stage at HUNK level (e.g. `git apply --cached` on a hunk-filtered patch).
    WIP re-indents the whole file → build the index blob from `HEAD` + your edits only
    (`git show HEAD:<file>` → apply your edits → `git hash-object -w` → `git update-index --cacheinfo`).
  - **รวม** — commit the user's WIP together; the message describes both changes.
  Record the answer in `state.md` (Commit choice) and reuse it for the rest of the run unless
  the user says otherwise.
- `Co-Authored-By` trailer: the commit holds work you wrote → add it. The commit holds only the
  user's own changes → do NOT add it.
- Commit only when the user signals it, per ticket. If they say "let me review first", present the
  diff and wait — don't auto-commit.

### 7b. ทดสอบบนจอ — ถามก่อนเสมอ
งานแตะ UI (จอ, ข้อความ, validation, import/export, job ที่จอรอผล) และ ticket ครบแล้ว → ถามด้วย
block หนึ่งครั้ง: "เล่น manual test บนจอด้วย happy-screen-test ไหม?" ตัวเลือก:
- **เล่นเลย (แนะนำ)** — invoke `happy-code:happy-screen-test`. skill นั้นสร้าง manual test plan ให้ถ้ายังไม่มี
  และแสดงตารางสรุปเคสให้อนุมัติก่อนเล่นจอเสมอ.
- **ข้าม** — บันทึกใน `state.md` แล้วไป step 8.

ระหว่างเล่น: bug ที่เจอ → quick-fix lane (2d) หรือ delta loop (3b) แล้วเล่นเคสนั้นซ้ำก่อน commit.
ข้อมูลที่เคสเขียนลง DB ของ dev → จดใน `state.md` และรายงานตอนจบ.
ห้ามเรียก skill นี้เองโดยไม่ถาม — user ต้องว่างนั่งดูจอและ login เอง.

### 8. Finish — keep the branch as-is, unless the user asks for a PR
On completion, follow `finishing-a-development-branch` and choose "keep the branch as-is"
(no merge, no PR) unless the user explicitly asks for a PR. Report the commit list and any
remaining tasks.

**User สั่ง PR / MR:**
1. **Host:** `git remote get-url origin` แล้วเปิดหน้าเว็บดูก่อนว่าเป็นอะไร (footer, หน้า login) — ห้ามเดา URL.
   - GitHub / GHE → `gh pr create`.
   - GitLab → `glab mr create` หรือ `git push -o merge_request.create -o merge_request.target=<base>`.
   - Gitea → `tea pulls create`.
   - ไม่มี CLI → หน้าเว็บ: GitHub/Gitea `<repo>/compare/<base>...<head>`, GitLab
     `<repo>/-/merge_requests/new?merge_request[source_branch]=<head>&merge_request[target_branch]=<base>`.
2. **Branch:** `git fetch` แล้วเช็คว่า push ครบไหม (`git status -sb`), ahead/behind base และ
   `git merge-tree --write-tree HEAD origin/<base>`. มี conflict → บอก user ก่อน ไม่ merge base เอง.
3. **Description (อังกฤษ):** Summary / Features / Fixes / Refactors / Shared code touched /
   DB scripts to run (ทุกไฟล์ใน `db/` ที่ branch เพิ่ม) / Testing (ตัวเลขจริง) + attribution line
   ตาม system reminder. ร่างลง `.scratch/<feature-slug>/pr.md` ก่อน.
4. **หน้าเว็บต้อง login** → ให้ user login เอง (ห้ามกรอกรหัสผ่าน) แล้วค่อยกรอก title/description และกด create.
5. **หลังสร้าง:** รายงานลิงก์, mergeable, behind และ CI. Host เป็น GitHub → bind กับ PR tooling ของ app.
   ห้าม merge PR เอง.

### 8b. หลังจบ — build / deploy / เอกสาร (เฉพาะเมื่อ user สั่ง)
- **build / push image ด้วย script ในเครื่อง** → เทียบกับ CI ของ repo ก่อนรัน (`Jenkinsfile`, `.gitlab-ci.yml`, workflow):
  runtime version, env (เช่น `NPM_CONFIG_LEGACY_PEER_DEPS`), ขั้นหลัง build. ต่างกัน → ทำตาม CI แล้วบอก user หนึ่งบรรทัด.
  ห้ามสลับ runtime ทั้งเครื่อง (nvm-windows `nvm use`) โดยไม่ถาม. ขั้นที่อาจเป็น no-op (patch script ที่ไม่เจอ string)
  → ตรวจผลจริง อย่าให้ check เข้มเกินจน fail ทั้ง run. รายงาน tag + digest ที่ push จริง.
- **อัปเดตเอกสาร docx บน SharePoint / OneDrive** → ไฟล์ > 1 MB `sharepoint_update_file` รับไม่ได้: เปิด URL ผ่าน
  Word COM, clone section ที่ใกล้เคียงแล้วแก้, save ทับ, export PDF แล้ว render ดูหน้าที่แก้ก่อนรายงาน. ระวัง page break
  ที่ติดมากับ section (หน้าว่าง) และตัวไทยต้องตั้ง font ของ complex script (`NameBi` / `SizeBi`) ด้วย.

## Red flags — never
- Dispatch a subagent (Agent/Task/workflow) anywhere in this flow — solo only, ultracode or not.
- Commit before the user has reviewed that ticket's diff and said to commit.
- Edit another team's / module's code without asking first (step 3).
- Reply to the user in English — Thai-only this flow.
- Drop the reply shape to save words — no wall-of-text multi-step answers, no dropped
  "ต่อไปทำอะไร" line (step 1).
- Skip `to-spec` / `to-tickets` after the grill — เว้น task เล็กที่ประกาศไว้ว่า "1 ticket, ไม่แตก"
  หรืองานที่เข้า quick-fix lane (step 2d) ครบทุกเงื่อนไข.
- เปิดคำถามแรกของ grill ก่อนส่งภาพระบบตอนนี้ (2a) — เว้นทางลัดงานเล็ก.
- เสนอทางเลือกก่อนล็อกว่าอะไรห้ามเปลี่ยน / source of truth (step 2).
- เสนอทางเลือกก่อนค้น convention ของโมดูลข้างเคียงทั้งในโค้ดและในข้อมูล (step 2).
- งานแตะสิทธิ์ / การมองเห็นข้อมูล แต่ไม่ได้ไล่ตารางจุดที่ข้อมูลโผล่ใน grill (step 2).
- เลือก design ที่ประกอบ command ซ้อนโดยไม่เช็ค transaction / domain event boundary (step 3).
- เขียนโค้ดต่อหลัง user เปลี่ยนการตัดสินใจหลัง confirm โดยไม่ทำ delta loop (step 3b).
- เชื่อสรุปหลัง compact มากกว่า `state.md` + `git status`.
- Show the ticket breakdown as anything other than a markdown table.
- Implement before the step-3 confirm gate.
- Reach the confirm gate without an impact analysis — blast radius (own program AND
  shared/other-people's code) must be reported with แนวทาง before "ok".
- Reach the confirm gate without the test case matrix (step 3), skip a lens without `ไม่เกี่ยว: <เหตุผล>`, or
  write a screen test plan whose cases are not the matrix's "จอ" rows.
- Report the impact analysis without a flow diagram (`diagram-design`) — เว้น escape hatch
  "1 ticket + zero impact" ที่ใช้ flow ข้อความบรรทัดเดียว.
- Ask a grill question with choices but no example of each choice's result (sample data /
  flow / mockup / diagram), or outside the 1A/1B block format (`AskUserQuestion` preview, widget).
- Skip the two-stage self-review, or run quality before spec passes.
- Proceed past a user-owned decision by guessing.
- Ship over-engineered / speculative / scaffolded-for-later code — violates `ponytail`
  (laziest working solution wins; self-review sends bloat back).
- Ship a Sonar-dirty method — complexity > 15, nesting > 3, duplicated blocks, magic
  values, dead code, empty catch. Equally: split methods preemptively when no rule trips.
- Copy a broken pattern (missing company filter, unparameterized SQL, swallowed exception,
  a write outside a transaction) just because the neighbouring file does it — step 5 says fix it here.
- Deviate from the codebase pattern for taste, or refactor code outside the blast radius.
- Commit intermingled / unrelated / user-WIP changes together without the user's once-per-run
  answer (step 7).
- Open a PR the user did not ask for, or merge one (step 8).
- Start `happy-screen-test` without asking (step 7b), or skip the ask on UI work.
- Block the session on a long wait (`sleep`, foreground polling) instead of background + monitor.
- Claim done without deriving test cases via `tdd` (esp. the originally-reported case
  + edge cases) for any non-trivial change, or ship a test that never went red.
- Claim build/tests green without actually verifying with the project's own build / typecheck
  commands (FE: typecheck, never a slow full production build).
