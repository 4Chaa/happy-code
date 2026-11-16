# happy-screen-test — reference

## Scripts

| Script | ทำอะไร | Env |
|---|---|---|
| `browser.js` | เปิด Chrome ค้างไว้ (persistent profile, `--remote-debugging-port`) | `QA_DIR`, `APP_URL`, `CDP_PORT`=9333, `PW_CHANNEL`=chrome |
| `login.js` | รอ user login จนเห็น `READY_SELECTOR` (สูงสุด 20 นาที) | `APP_URL`, `READY_SELECTOR`, `CDP_PORT` |
| `qa.js` | กล่องบนจอ: `setTopics`, `intro`, `doing`, `verdict` (`{ once: true }` ซ่อน ทำซ้ำ; มี ❌ แล้วกด ถัดไป = กดสองครั้ง + `USER OVERRIDE`), `check`, `csvSource`, `Jump` | `QA_DIR` (เก็บ `user-verdicts.jsonl`) |
| `runner.js` | `run(page, cases)` — วนเคส, ย้อน / ทำซ้ำ / ข้าม | `START`, `STOP` |
| `recorder.js` | `start(page)`, `read(page)`, `timeline(rec)` — บันทึก toast + progress ต่อ tab | — |
| `kit.js` | เมาส์/คีย์บอร์ดแบบคน: `click`, `type`, `hover`, `showCursor` (จุดแดง). Angular + ng-select + ngx-datatable + ngx-toastr: `pick`, `options`, `selected`, `clearSelect`, `pickTypeahead`, `fieldMessage`, `toasts`, `toastKind`, `holdToast`, `dismissToasts`, `gridRows`, `column`, `nextGridPage`, `row`, `checkRow`, `searchRow`. Negative path ที่จอกันไว้ (dev build): `devCall`. API (FE = BE เท่านั้น): `trackAuth`, `api`, `errorText`. DB read-only: `db`. `shot` | `APP_URL`, `CDP_PORT`, `QA_DIR`, `HUMAN_PACE` (1), `DB_CMD`, `DB_CWD` |
| `example-cases.js` | แม่แบบไฟล์เคส | `SKILL_SCRIPTS`, `FILES` |

รัน: `node <playwright-skill>/run.js <script>` (ใส่ NODE_PATH ให้ `require('playwright')`).
Log ที่ script พิมพ์: `BROWSER READY|CLOSED`, `LOGIN NEEDED|LOGGED IN|TIMEOUT`, `CASE n`, `INTRO`, `REPLAY`,
`WAITING USER`, `USER NEXT|OVERRIDE|FAIL|RETRY|BACK|SKIP|START`, `RUN DONE`, `ERROR`.

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
| บัญชีทดสอบ login ไม่ได้ / เมนูหรือปุ่มไม่ขึ้น | บัญชีใช้ provider อื่น (AD) หรือไม่มี profile / สิทธิ์คณะที่เคสต้องใช้ | preflight ผู้ใช้ทดสอบ (SKILL ข้อ 1.4) ก่อนเปิด browser |
| เปิด Chrome ทดสอบแล้วหน้าว่าง / ต่อไม่ได้ | SPA ไม่ได้รัน (มีแค่ API) | preflight เปิด `APP_URL` ให้ได้ก่อน; ให้ user start เอง |
| Chrome ถูกคลิกสองชุด / เคสเก่าเล่นซ้อนเคสใหม่ | `TaskStop` หยุด shell แต่ลูก node (`cases.js`, `login.js`) ยังรัน | หยุด node ค้างก่อนรันทุกครั้ง (Pattern ด้านล่าง) |
| เลือกนักศึกษาแล้วค่าหาย / ได้คนละคน | ค่า default (ปี/ภาค) โหลดทีหลังแล้วล้างช่องที่ผูกกัน | `waitForLoadState('networkidle')` หลังเปิดจอและหลังเลือกช่องต้นทาง แล้วอ่าน `selected` ซ้ำ |
| ไม่มีกลุ่มเรียน / ตัวเลือกที่คาด | ยังไม่ได้ตั้งปี/ภาคที่ข้อมูลทดสอบอยู่ (จอใช้ default ปีอื่น) | ตั้งปี/ภาคก่อนแล้วรอ `networkidle`; เขียนปี/ภาคไว้ในขั้นตอนของ intro |
| จำนวนแถวที่คาดเกินจากที่จอแสดง | query ไม่ใส่ filter ตั้งต้นของจอ (เช่น ระบบการศึกษา) | ใส่ค่า default ของช่องค้นหาใน query นับ |
| ยิง API ตรงได้ 400 JSON parse error | body ประกอบเองผิด type (object แทน string) | ลอก body จาก request จริงของ FE แล้วแก้เฉพาะ field ที่ทดสอบ |
| กด ↻ ทำซ้ำ แล้วเคสพัง | เคสต่อจากสถานะที่ขั้นก่อนเปลี่ยนไปแล้ว (ทำซ้ำไม่ได้) | อ่านสถานะก่อนเล่น หรือ `verdict(..., { once: true })` |
| ผู้ทดสอบตีตกเพราะ "เปิดผิดใบ" ทั้งที่ตั้งใจ | intro ไม่บอกว่าขั้นนั้นใช้ record คนละใบ | ใส่เลข record และเหตุผลใน intro / verdict |
| ผู้ทดสอบอยากเห็น error บนจอ แต่เคสยิง API เงียบ ๆ | negative path ที่จอกันไว้ ไม่มีปุ่มให้กด | `devCall` ให้ FE ยิง request จริง → toast ขึ้นบนจอ; ใส่สีด้วย `toastKind` |
| toast สีไม่ตรงที่คาด | interceptor แยกสีตาม status (เช่น 403 = warning เหลือง, 400 = error แดง) | อ่าน interceptor ก่อนเขียนผลที่คาด; ตรวจด้วย `toastKind` |
| `.ps1` ที่มีภาษาไทย parse error / ตัวเพี้ยน | Windows PowerShell 5.1 อ่าน UTF-8 ไม่มี BOM เป็น ANSI | เซฟ `.ps1` เป็น UTF-8 with BOM |
| `DB_CMD` ที่เป็น Python พิมพ์ไทยพัง | `python -I` ไม่อ่าน `PYTHONIOENCODING` | `python -I -X utf8 <script>` |

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
- **ฝืน negative path ที่จอกันไว้ (dev build):** ปุ่ม อนุมัติ ไม่ขึ้นสำหรับคนไม่มีสิทธิ์ → เรียก method ของ component ตรง
  ให้ FE ยิง request จริงแล้ว interceptor ขึ้น toast:
  ```js
  await K.dismissToasts(page);
  const fired = await K.devCall(page, 'app-workflow-action', 'onClick', { eventCode: 'Approve' }); // 'ok' หรือเหตุผล
  const t = await K.toasts(page);
  Q.check('toast', 'เหลือง "ไม่มีสิทธิ์…"', `${await K.toastKind(page)} ${t.join(' | ')}`, fired === 'ok' && (await K.toastKind(page)) === 'warning');
  ```
  หน้า add ที่ resolver ต้องกัน: `K.devCall(page, 'app-<screen>', 'add')` แล้วตรวจ toast + URL ยังอยู่จอค้นหา.
  argument ส่งแบบเดียวกับที่ template ส่ง (ดู `(click)=` ใน html) — ไม่ใช่ object ที่ประกอบเอง.
- **หยุด node ค้างก่อนรัน (Windows):** เฉพาะ script ของ skill ไม่แตะ `browser.js`:
  ```powershell
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -match 'cases\.js|login\.js' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
  ```
