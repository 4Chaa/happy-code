---
name: happy-screen-test
description: "เล่น manual UI test plan บน Chrome ที่มองเห็นได้ด้วย Playwright — ทุกเคสขึ้นกล่องบนจอบอกเรื่อง ขั้นตอน ผลที่ถูกต้อง และข้อมูลต้นทาง (ตาราง CSV / request) ก่อนเล่น แล้วหยุดให้ผู้ทดสอบตรวจข้อความบนจอเองด้วยตาราง ที่ถูกต้อง | ที่ระบบได้ พร้อมปุ่ม ถัดไป / ไม่ถูกต้อง (ส่งหมายเหตุกลับ) / ทำซ้ำ / ย้อน; ตรวจ FE กับ BE ว่าได้ข้อความเดียวกัน และหลาย tab. Use when the user asks to run a test plan on screen, says \"เทสจอ\", \"เล่นจอ\", \"manual test ผ่าน playwright\", \"ให้ดูบนจอด้วย\", \"screen test\", or when happy-code asks to verify UI work on screen."
---

# Happy Screen Test

เล่น test plan บนจอจริงให้ผู้ทดสอบเห็นทุกขั้น หยุดให้ตรวจเฉพาะสิ่งที่คนต้องตัดสินเอง (ข้อความบนจอ)
ส่วนที่เป็นข้อมูลล้วน (DB, จำนวนแถว, status code) script ตรวจเอง. ตอบ user เป็น **ภาษาไทย**.
Solo — ไม่ใช้ subagent / workflow.

ลำดับ: test plan (สร้างถ้าไม่มี + ตารางสรุปเคสให้อนุมัติ) → เช็ค precondition → เปิด browser → เขียนเคส → เล่น → รายงาน.

Script กลางอยู่ที่ `scripts/` ของ skill นี้ (`browser.js`, `login.js`, `qa.js`, `runner.js`, `recorder.js`,
`kit.js`, `example-cases.js`). รันผ่าน `run.js` ของ `playwright-skill:playwright-skill` (ให้ NODE_PATH ของ
playwright) — invoke skill นั้นก่อนเพื่อหา path. รายละเอียด API และกับดักที่เจอจริง: [REFERENCE.md](REFERENCE.md).

## 0. Manual test plan — REQUIRED ก่อนเล่นจอ
ไม่มี test plan = ไม่เล่นจอ.
1. หา `docs/test-plans/TEST-PLAN-<SCREEN>-*.md` ของงาน.
2. **ไม่มี → สร้างให้** จาก [TEST-PLAN-TEMPLATE.md](TEST-PLAN-TEMPLATE.md): อ่าน spec / ticket / diff ของงาน
   แล้วเขียนเคสครบ — happy path, เคสที่ ticket แจ้ง, ข้อความ error แต่ละแบบ, ขอบ (ว่าง, ซ้ำ, เกินขนาด, สิทธิ์),
   หลาย tab ถ้ามี job. ข้อมูลทดสอบ (เช่นไฟล์ CSV) เก็บใน `docs/test-plans/<SCREEN>/` + script สร้างไฟล์ถ้าต้องใช้ id
   ที่ไม่ซ้ำ; ค่าใน dev ที่อ้างถึง (ปฏิทิน, ผู้ใช้, รหัส) ดึงจาก query read-only ไม่เดา. ใช้ skill `test` ช่วยได้.
3. **แสดงเป็นตาราง "สรุปเคส" ใน chat** (คอลัมน์เดียวกับ template):

   | # | เคส | เรื่อง | ข้อมูลทดสอบ | ผลที่ถูกต้อง (ย่อ) | คนตรวจ | script ตรวจ |
   |---|---|---|---|---|---|---|
   | 1 | TC-UI-07 | ปัญหาต่อแถว | `04-problems.csv` 12 แถว | 11 แถวแดง ข้อความตรง | ข้อความใน grid | 12 / 11 |

   ใต้ตาราง: precondition ที่ต้องทำก่อน (DB script, restart, ผู้ใช้/สิทธิ์) และเคสที่ข้อมูล dev ไม่พอ.
4. รอ user อนุมัติ / แก้ตาราง → เขียนลงไฟล์ test plan แล้วค่อยไปข้อ 1.
มี test plan อยู่แล้ว → ยังแสดงตารางสรุปเคสก่อนเล่นเสมอ (ดึงจากไฟล์).

## 1. ก่อนเล่น — เช็คให้ครบ แล้วรายงานเป็นรายการ
1. **Test plan** — อนุมัติแล้วตามข้อ 0.
2. **Server** — detect dev server (SPA + API). API ต้อง build หลังโค้ดล่าสุด: เทียบเวลา DLL/bundle กับไฟล์ที่แก้.
   เก่ากว่า → ให้ user restart (process ของ user — ห้าม kill เอง).
3. **DB** — script ที่งานต้องรัน (`db/*.sql`) ถูกรันแล้วหรือยัง: query read-only. ยัง → ให้ user รัน (เราไม่เขียน DB).
4. **ข้อมูลทดสอบ** — id ในไฟล์ยังไม่ถูกใช้ (query). เคสที่เขียน DB จะเพิ่มข้อมูลจริงใน dev → บอก user ก่อน.
5. **Work dir** — `QA_DIR=<scratchpad>/screen-test` (มี `profile/ downloads/ shots/`). ไม่ใช่ใน repo.

## 2. เปิด browser — user login เอง
1. รัน `browser.js` แบบ background (นอก sandbox; channel `chrome`) ด้วย `APP_URL`, `QA_DIR`.
2. รอ `BROWSER READY` แล้วรัน `login.js` (`READY_SELECTOR` = element ที่มีเฉพาะหลัง login).
   `LOGIN NEEDED` → บอก user ให้ login ใน Chrome นั้น. **ห้ามกรอกรหัสผ่านเอง.**
3. session หมด / browser ถูกปิดระหว่างทาง → เปิดใหม่ + `login.js` แล้วรันต่อจากเคสที่ค้าง (`START=n`).

## 3. เขียนเคส — หนึ่ง function ต่อหนึ่งเคสใน test plan
คัดลอก `example-cases.js` ไป `$QA_DIR/cases.js`. ทุกเคส:
1. `Q.setTopics({ 'TC-UI-07': '<ชื่อเรื่องจาก test plan>' })` — กล่องต้องบอก **เรื่อง** ไม่ใช่แค่รหัส.
2. `Q.intro(page, tc, steps, expect, source)` — ก่อนเล่นจอ: ขั้นตอน + ผลที่ถูกต้อง + ข้อมูลต้นทาง
   (`Q.csvSource(file)` สำหรับไฟล์; `{ caption, text: [...] }` สำหรับค่าที่เลือก / request ที่ยิง).
3. `Q.doing(...)` แล้วเล่นจอ.
4. `Q.verdict(page, tc, [Q.check(เรื่อง, ที่ถูกต้อง, ที่ระบบได้, ok)], source)`.
   **หยุดเฉพาะจุดที่มีข้อความให้คนดู** (toast, ข้อความใต้ช่อง, ข้อความใน grid, การ์ด progress).
   ข้อมูลล้วนตรวจใน script แล้วใส่ผลลงตารางเดียวกัน.
- อ่านค่าใน grid ด้วยชื่อหัวคอลัมน์ (`K.column`) ห้ามใช้ตำแหน่ง. grid แบ่งหน้า → `K.nextGridPage`.
- **FE = BE (option)** — ทำเมื่อ `state.md` ของ happy-code มี `FE=BE: on` หรือ user ขอ; ไม่รู้ → ถามหนึ่งครั้ง.
  ทุก field ที่ FE validate ให้ยิง API ตรง (`K.trackAuth` + `K.api`) ด้วยค่าที่ผิดแบบเดียวกัน แปล code ที่ BE ตอบเป็น
  ข้อความ แล้วเทียบกับข้อความบนจอในตารางเดียวกัน. หนึ่ง request ต่อหนึ่ง field.
- **หลาย tab:** `recorder.js` ในทุก tab; แยก tab ด้วยเวลาเริ่มบันทึก ไม่ใช่ลำดับ. เช็ค: tab อื่นเปลี่ยนจอเอง,
  ส่งซ้อนถูกปฏิเสธ, งานของอีก tab จบแล้ว tab นี้ไม่มีอะไรเกิดขึ้น.
- เคสที่เขียน DB ทำซ้ำไม่ได้ด้วยข้อมูลชุดเดิม → ไฟล์ชุดใหม่ (seed ใหม่) หรือ copy ใน `$QA_DIR`.

## 4. เล่น — background + เฝ้าเหตุการณ์ (ห้ามรอค้าง)
1. รัน `cases.js` แบบ background (`START`/`STOP` เลือกช่วง). รอ user (login, restart, รัน DB script) → waiter
   เบื้องหลังที่เริ่มเคสต่อเองเมื่อเงื่อนไขครบ แล้วบอก user ว่ารออะไรจากเขา.
2. Monitor log: `USER FAIL|USER BACK|USER RETRY|USER SKIP|RUN DONE|ERROR`.
3. `USER FAIL <tc> :: <หมายเหตุ>` → ตอบทันที: bug จริง / ความเห็น / script ผิด. ผู้ทดสอบขอเปลี่ยน → ทำตาม แล้วรันเคสนั้นซ้ำ.
4. Script ผิดเอง (selector, ตำแหน่งคอลัมน์, timeout) → บอกตรง ๆ ว่าเป็น script ไม่ใช่ระบบ แก้แล้วรันซ้ำเฉพาะเคส.
5. ผลแปลกจาก server → อ่าน log ของ API ก่อนสรุป.

## 5. รายงาน
- ตารางทุกเคส: ✅ / ❌ / ⚠️ + หมายเหตุสั้น.
- Bug ที่เจอ: อาการ → สาเหตุ (`file:line`) → ทางแก้ที่เสนอ (ให้ user เลือก).
- FE vs BE (เมื่อ option on): ตาราง กรณี | FE | BE | ตรงกัน.
- Precondition ที่ข้อมูล dev ไม่ครบ (เคสที่ทำไม่ได้ / ใช้ไฟล์ดัดแปลง) และข้อมูลที่เขียนลง dev ระหว่างทดสอบ.
- อัปเดต test plan ตามผลที่ตกลงกัน (ข้อความที่เปลี่ยน, ไฟล์ทดสอบใหม่).

## Red flags — never
- เล่นจอโดยไม่มี test plan ที่ user อนุมัติ หรือไม่แสดงตารางสรุปเคสก่อน.
- กรอกรหัสผ่าน / login แทน user.
- ปล่อยให้กล่องไม่มีชื่อเรื่อง ผลที่ถูกต้อง หรือข้อมูลต้นทาง.
- หยุดถามทุกขั้น — หยุดเฉพาะข้อความที่คนต้องตัดสิน.
- โทษระบบก่อนดู log / ก่อนตัดว่า script ผิด.
- รันเคสที่เขียน DB ซ้ำด้วยข้อมูลชุดเดิมแล้วสรุปว่าระบบพัง.
- restart API / รัน DB script / kill process ของ user เอง.
