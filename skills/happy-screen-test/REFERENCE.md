# happy-screen-test — reference

## Scripts

| Script | ทำอะไร | Env |
|---|---|---|
| `browser.js` | เปิด Chrome ค้างไว้ (persistent profile, `--remote-debugging-port`) | `QA_DIR`, `APP_URL`, `CDP_PORT`=9333, `PW_CHANNEL`=chrome |
| `login.js` | รอ user login จนเห็น `READY_SELECTOR` (สูงสุด 20 นาที) | `APP_URL`, `READY_SELECTOR`, `CDP_PORT` |
| `qa.js` | กล่องบนจอ: `setTopics`, `intro`, `doing`, `verdict`, `check`, `csvSource`, `Jump` | `QA_DIR` (เก็บ `user-verdicts.jsonl`) |
| `runner.js` | `run(page, cases)` — วนเคส, ย้อน / ทำซ้ำ / ข้าม | `START`, `STOP` |
| `recorder.js` | `start(page)`, `read(page)`, `timeline(rec)` — บันทึก toast + progress ต่อ tab | — |
| `kit.js` | เมาส์/คีย์บอร์ดแบบคน: `click`, `type`, `hover`, `showCursor` (จุดแดง). Angular + ng-select + ngx-datatable + ngx-toastr: `pick`, `options`, `selected`, `clearSelect`, `pickTypeahead`, `fieldMessage`, `toasts`, `holdToast`, `dismissToasts`, `gridRows`, `column`, `nextGridPage`, `row`, `checkRow`, `searchRow`. API (FE = BE เท่านั้น): `trackAuth`, `api`, `errorText`. DB read-only: `db`. `shot` | `APP_URL`, `CDP_PORT`, `QA_DIR`, `HUMAN_PACE` (1), `DB_CMD`, `DB_CWD` |
| `example-cases.js` | แม่แบบไฟล์เคส | `SKILL_SCRIPTS`, `FILES` |

รัน: `node <playwright-skill>/run.js <script>` (ใส่ NODE_PATH ให้ `require('playwright')`).
Log ที่ script พิมพ์: `BROWSER READY|CLOSED`, `LOGIN NEEDED|LOGGED IN|TIMEOUT`, `CASE n`, `INTRO`, `REPLAY`,
`WAITING USER`, `USER NEXT|FAIL|RETRY|BACK|SKIP|START`, `RUN DONE`, `ERROR`.

## กับดักที่เจอจริง

| อาการ | สาเหตุ | ทางแก้ |
|---|---|---|
| `spawn UNKNOWN` / Permission denied ตอนเปิด browser | sandbox บล็อก chrome.exe | รัน `browser.js` นอก sandbox (เฉพาะคำสั่งนี้) |
| Chromium ของ Playwright เปิดไม่ขึ้น ("side-by-side configuration") | ติดตั้งเสีย | `PW_CHANNEL=chrome` ใช้ Chrome ในเครื่อง + profile แยกใน `QA_DIR` |
| ไม่เจอ toast | ngx-toastr ใช้ `.ngx-toastr` ไม่ใช่ `.toast` | `kit.toasts` |
| toast หายก่อนคนอ่าน | หายเองใน 6–10 วินาที | `holdToast` + ใส่ข้อความ toast ลงตาราง verdict |
| ค่าใน grid ผิดคอลัมน์ | อ่านด้วยตำแหน่ง แต่มีคอลัมน์ต่อท้าย | `column(page, 'หัวคอลัมน์')` |
| ตรวจไม่ครบทุกแถว | grid แบ่งหน้า 10 แถว | `nextGridPage` |
| datepicker อ่านค่าผิด | มี input 2 ช่อง | เลือก `datepicker input` ช่องแรก |
| API ตอบ 401 ตอนยิงตรง | token ที่เก็บไว้หมดอายุ (SPA ต่ออายุเอง) | `trackAuth` เก็บ header ล่าสุดทุก request |
| `waitForResponse` timeout | import / save ไฟล์ใหญ่ใช้เป็นนาที | timeout 5 นาทีสำหรับ endpoint หนัก |
| หาช่องค้นหาไม่เจอใน tab ที่เปิดกลาง job | การ์ด progress ซ่อนฟอร์ม (ถูกต้องตาม design) | รอ `.progress-bar` หรือฟอร์ม อย่างใดอย่างหนึ่ง |
| ลำดับ tab สลับ | `contexts()[0].pages()` ไม่คงที่ | แยกด้วย `rec.t0` |
| ไฟล์ดาวน์โหลดชื่อเป็น GUID | Chrome ที่ Playwright คุมใช้ชื่อชั่วคราว | ใช้ `download.suggestedFilename()` + `saveAs` |
| หน้าโหลดไม่ขึ้นชั่วคราว | ng serve กำลัง rebuild | retry; ดู release date บนจอ |
| เคส error path บนจอไม่ทำงาน | interceptor toast แล้วกลืน error (`of()`) | เคสที่ต้องจบสถานะเมื่อ error → ทดสอบ error path บนจอเสมอ |
| หลัง login หน้าไม่ใช่จอที่ต้องการ | redirect ไป dashboard | `login.js` ไปที่ `APP_URL` แล้วรอ selector |
| `login.js` ค้าง `LOGIN NEEDED` ทั้งที่ login แล้ว | `READY_SELECTOR` ไม่มีในจอนี้ (เช่น `app-sidebar` ซ่อน) | หา selector จาก layout จริงก่อน; user บอกว่า login แล้ว → หยุด `login.js` เล่นต่อ |
| เช็ค server แล้วไม่เจอ port | dev server ฟังแค่ `::1`, grep `netstat` พลาด | `detectDevServers` + `Get-NetTCPConnection -State Listen` (ได้ pid, เวลาเริ่ม) |
| API ตอบ 404 / ไม่มีสิทธิ์ ทั้งที่จอเปิดได้ | `trackAuth` เก็บ header จาก request ที่ไม่ใช่ API ของจอ (ไม่มี `company`/`division`/`program`) | `trackAuth(page, '/api/<screen>')` |
| ข้อความ error ของ API ทำ query พัง | เอาข้อความ exception ไปต่อเป็น SQL | `errorText(res, lookup)` lookup เฉพาะ code รูป `EN00023` |
| ค้นหาแล้วไม่เจอ record ที่เพิ่งสร้าง | filter เริ่มต้นของจอค้นหา (เช่น ระบบการศึกษา) ไม่ตรงกับ record | `searchRow(page, key, { input, submit, fallbackSelect })` |
| เลือกใน typeahead ไม่เจอด้วยรหัส | ตัวเลือกแสดงชื่อ (เช่น ชื่อหลักสูตร) ไม่ใช่รหัส | `pickTypeahead(page, name, { text })` เลือกด้วยชื่อหรือตัวแรก แล้วใส่ชื่อที่เลือกในตาราง verdict |
| ติ๊ก checkbox ใน grid ไม่ได้ ("element is not visible") | custom-control: input ซ่อนใต้ label ว่าง | `checkRow(page, text)` — เมาส์ไปที่กล่อง แล้ว check input แบบ force |
| แก้ `cases.js` แล้วกด ↻ ทำซ้ำ ยังพังแบบเดิม | process เดิมโหลดโค้ดเก่าไว้ | `TaskStop` แล้วรันใหม่ด้วย `START=n` |
| query ตรวจ DB ได้ `Reading as 'System.Object' is not supported ... regclass` | reader อ่าน type ระบบไม่ได้ | cast เป็น `::text` |
| ผลที่คาดไม่ตรงกับระบบ แต่ระบบถูก | เขียนผลที่คาดจากความเข้าใจ ไม่ได้อ่านกฎ | อ่าน method ที่ตัดสินผล (เช่น `NeedsExamSeat`) แล้วอ้าง `file:line` ใน test plan |
| แถว import แดง "ไม่มีสิทธิ์ศูนย์…" ปุ่มบันทึกถูกปิด | ผู้ใช้ไม่มีสิทธิ์ข้อมูลที่ไฟล์ใช้ | precondition สิทธิ์ข้อมูลใน test plan; ถาม user ก่อนเล่น |

## Pattern ที่ใช้บ่อย
- **เล่นจอแบบคน:** `await K.type(page, page.locator('textbox[formcontrolname="enInfo"] input'), code)` →
  `await K.click(page, page.locator('button:has(i.fa-search)'))` → `await K.click(page, K.row(page, code).locator('a'))`.
  ฟอร์มยาว (ที่อยู่, การศึกษา, ผู้ปกครอง) กรอกทีละช่องบนจอ — เขียน helper ต่อ section ใน `cases.js` เช่น `fillAddress(page, a)`
  แล้วใช้ซ้ำทุกเคส. ห้ามยิง API สร้างแทน.
- **record ที่ต้องมีอยู่ก่อน:** เลือกจาก dev ด้วย `K.db` (สถานะที่ใช้ได้, ยังไม่ถูกเคสอื่นแตะ) แล้วบันทึก id ใน test plan.
  เคสที่ต้องสร้าง record ใหม่ → สร้างผ่านฟอร์มบนจอในเคสนั้นเลย (เป็นส่วนหนึ่งของการทดสอบ).
- **FE = BE ต่อ field:** FE → `fieldMessage(page, 'select-input[formcontrolname="x"]')`; BE → `api(...)` ส่งค่าผิดแบบเดียวกัน
  แล้วแปล `errors[].code` + `parameters` ด้วยตารางข้อความของระบบ (เช่น `su_message`, `su_program_label`) — read-only.
- **job เบื้องหลัง + หลาย tab:** Tab A กดบันทึก → เช็ค A ได้ 202 เร็ว, Tab B เปลี่ยนเป็น progress เอง, B ส่งซ้อนได้ error,
  A จบแล้ว B ไม่มี toast และ grid ยังอยู่. ใช้ไฟล์เล็ก (~30 แถว) ลดข้อมูลที่เขียนลง dev.
- **ข้อมูลต้นทางที่ไม่ใช่ไฟล์:** `{ caption: 'request (ข้าม FE)', text: ['POST /api/x ไม่ส่ง year', 'BE ตอบ: message.STD00023'] }`.
