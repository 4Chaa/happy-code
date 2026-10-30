# happy-screen-test — reference

## Scripts

| Script | ทำอะไร | Env |
|---|---|---|
| `browser.js` | เปิด Chrome ค้างไว้ (persistent profile, `--remote-debugging-port`) | `QA_DIR`, `APP_URL`, `CDP_PORT`=9333, `PW_CHANNEL`=chrome |
| `login.js` | รอ user login จนเห็น `READY_SELECTOR` (สูงสุด 20 นาที) | `APP_URL`, `READY_SELECTOR`, `CDP_PORT` |
| `qa.js` | กล่องบนจอ: `setTopics`, `intro`, `doing`, `verdict`, `check`, `csvSource`, `Jump` | `QA_DIR` (เก็บ `user-verdicts.jsonl`) |
| `runner.js` | `run(page, cases)` — วนเคส, ย้อน / ทำซ้ำ / ข้าม | `START`, `STOP` |
| `recorder.js` | `start(page)`, `read(page)`, `timeline(rec)` — บันทึก toast + progress ต่อ tab | — |
| `kit.js` | Angular + ng-select + ngx-datatable + ngx-toastr: `attach`, `pick`, `options`, `selected`, `clearSelect`, `fieldMessage`, `toasts`, `holdToast`, `dismissToasts`, `gridRows`, `column`, `nextGridPage`, `trackAuth`, `api`, `shot` | `APP_URL`, `CDP_PORT`, `QA_DIR` |
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

## Pattern ที่ใช้บ่อย
- **FE = BE ต่อ field:** FE → `fieldMessage(page, 'select-input[formcontrolname="x"]')`; BE → `api(...)` ส่งค่าผิดแบบเดียวกัน
  แล้วแปล `errors[].code` + `parameters` ด้วยตารางข้อความของระบบ (เช่น `su_message`, `su_program_label`) — read-only.
- **job เบื้องหลัง + หลาย tab:** Tab A กดบันทึก → เช็ค A ได้ 202 เร็ว, Tab B เปลี่ยนเป็น progress เอง, B ส่งซ้อนได้ error,
  A จบแล้ว B ไม่มี toast และ grid ยังอยู่. ใช้ไฟล์เล็ก (~30 แถว) ลดข้อมูลที่เขียนลง dev.
- **ข้อมูลต้นทางที่ไม่ใช่ไฟล์:** `{ caption: 'request (ข้าม FE)', text: ['POST /api/x ไม่ส่ง year', 'BE ตอบ: message.STD00023'] }`.
