---
name: to-ticket
description: "สร้าง ClickUp task หรือ subtask จากเนื้อหา (เมล, แชท, รูป, บันทึกงาน) โดยถาม List / ระดับ task / parent / ฟิลด์เสริมก่อนเสมอ. Use when the user asks to create, log or record a ClickUp task or subtask, says \"สร้าง ticket\", \"เปิด task\", \"บันทึกงาน\", or invokes /to-ticket."
---

# สร้าง ClickUp Task / Subtask

ใช้ภาษาเดียวกับที่ผู้ใช้พิมพ์มา (ไทย → ตอบไทย)

## 0. ดึงเนื้อหาต้นทางก่อน

ถ้าผู้ใช้แนบรูป/เมล/แชท ให้สรุปออกมาก่อนถาม:

- เรื่อง (subject), ผู้ส่ง + อีเมล, วันเวลา, ผู้รับ / CC, ไฟล์แนบ
- สิ่งที่ลูกค้าร้องขอ
- สิ่งที่ทีมทำไปแล้ว + วันเวลาที่ตอบกลับ (ถ้ามี)

ถ้าเนื้อหาในรูปถูกตัด (ขึ้นต้นแล้วมี `...`) ให้ใส่เท่าที่เห็น แล้วแจ้งผู้ใช้ตอนท้ายว่าส่วนไหนไม่ครบ **ห้ามเดาเนื้อหาที่มองไม่เห็น**

## 1. ถามผู้ใช้ (AskUserQuestion — รวมทุกคำถามใน call เดียว)

**Q1 — List ไหน?**
ดึงรายการมาให้เลือกก่อนเสมอ อย่าให้ผู้ใช้พิมพ์ ID เอง:
- ถ้ามี List ที่เคยใช้ในเซสชันนี้ → ใส่เป็นตัวเลือกแรก
- ไม่มี → `clickup_get_workspace_hierarchy` (max_depth 2) แล้วเสนอ List ที่เกี่ยวข้อง 3–4 อัน
- ผู้ใช้พิมพ์ชื่อ/URL เองได้ผ่าน "Other" (จาก URL `/li/<list_id>` คือ list id)

**Q2 — Task หลัก หรือ Subtask?**

**Q3 — ฟิลด์เสริมที่จะกรอก?** (multiSelect: true)
`Start / End date` · `Time estimate` · `Time tracked (ลงเวลาจริง)` · `Sprint points`
บอกในคำอธิบายตัวเลือกว่า ถ้าไม่เลือกจะใช้ค่า default ตามหัวข้อ 6

**ถ้าตอบว่า subtask** → ถามรอบที่สอง: **อยู่ใต้ task ไหน?**
- `clickup_filter_tasks` (list_ids, subtasks: true, include_closed: true) หรือ `clickup_search` ด้วยคีย์เวิร์ดจากเนื้อหา
- ดู field `hierarchy` ในผลลัพธ์ของ `clickup_search` เพื่อรู้เส้นทาง เช่น `e-Auction > DMS > Sale Order`
- เสนอ parent ที่เข้าเค้า 3–4 อันเป็นตัวเลือก (แสดงเป็นเส้นทางเต็ม) + ให้พิมพ์ชื่อ/ID เองผ่าน "Other"

ถ้าเป็นเซสชันที่ไม่มีคนตอบ (scheduled/unattended) → เลือกค่าที่สมเหตุสมผลที่สุด แล้วบอกสมมติฐานไว้ในคำตอบ

## 2. หาแพตเทิร์นชื่อจาก task เก่า

**แต่ละ List ใช้แพตเทิร์นไม่เหมือนกัน และบาง List ก็ไม่มีแพตเทิร์นเลย** — ห้ามเดาจาก List อื่น หรือจากตัวอย่างในสกิลนี้ ให้ดูของจริงทุกครั้ง

1. **ดึงตัวอย่างชื่อ 15–30 รายล่าสุด**
   - task หลัก → `clickup_filter_tasks` (`list_ids`, `include_closed: true`, `order_by: "created"`, `reverse: true`)
   - subtask → `clickup_get_task(<parent>, include: ["subtasks"])` เพราะแต่ละ parent มักมีแพตเทิร์นเฉพาะของตัวเอง
2. **มองหาส่วนที่ซ้ำกัน** — prefix รหัสลูกค้า/ระบบ, วันที่ (`YYMMDD` / `YYYYMMDD`), running number ต่อวัน, ตัวคั่น (` : ` / `: ` / `-`), วงเล็บเหลี่ยมนำหน้าชื่อโมดูล เช่น `[DMS]`, หรือส่วนท้ายที่ระบุคนทำ เช่น `- มิว`
3. **เกณฑ์ตัดสิน**
   - ชื่อ ≥ 2 ใน 3 ของตัวอย่างเข้าแพตเทิร์นเดียวกัน → ใช้แพตเทิร์นนั้น โดยยึดตัวคั่นและช่องไฟตามตัวอย่างจริง แม้จะดูไม่สม่ำเสมอ
   - ชื่อเป็นข้อความอิสระ ไม่มีโครงร่วม → **ไม่ต้องยัด prefix เอง** ตั้งชื่อเป็นประโยคสรุปสั้น ๆ พอ
   - ก้ำกึ่งระหว่าง 2 แบบ → เสนอชื่อที่ตั้งให้ผู้ใช้ยืนยันก่อนสร้าง (รวมไปกับคำถามชุดแรกได้)
4. **มี running number ต่อวัน** → หาเลขสูงสุดของวันเดียวกัน แล้ว +1 (นับรวม task ที่อยู่คนละ parent ด้วย ถ้าเลขรันนับรวมทั้ง list)

ระบุแพตเทิร์นที่ใช้ไว้ในคำตอบสุดท้าย เพื่อให้ผู้ใช้แก้ได้ถ้าอ่านผิด

## 3. Custom fields

เรียก `clickup_get_custom_fields` ด้วย `list_id` เสมอ (field id ต่างกันในแต่ละ list) แล้ว map ตาม **ชื่อ** ฟิลด์ เติมเฉพาะฟิลด์ที่ list นั้นมีจริง ตัวอย่างที่พบบ่อย:

| ฟิลด์ | ค่าที่ใส่ |
|---|---|
| Channel | ช่องทางที่ลูกค้าแจ้ง (Email / Line / MS Team / Call) |
| Customer | ชื่อลูกค้า |
| Issue Type | Bug / CR / Technical Support / Fix Data / Meeting ... |
| Request By | ชื่อ + บริษัทผู้ร้องขอ |
| Request Date | วันที่ลูกค้าแจ้ง |
| Resolution / Resolution Date | ใส่เมื่องานเสร็จแล้วเท่านั้น (เช่น Fixed) |
| System Module | โมดูล/ระบบที่เกี่ยวข้อง |

dropdown ต้องส่ง **option id (UUID)** ไม่ใช่ชื่อ; date ส่ง `YYYY-MM-DD`

ดูค่าที่ task เก่าใน list เดียวกันกรอกไว้ (`clickup_get_task` + `include: ["custom_fields"]`) เป็นตัวอย่างก่อนเดาเอง

## 4. สร้าง task

`clickup_create_task` — `list_id` (จำเป็น), `parent` (ถ้าเป็น subtask), `name`, `status`, `priority`, `assignees`, `start_date`, `due_date`, `time_estimate` (นาที), `custom_fields`, `markdown_description`

เช็ค status ที่ list รองรับจาก `clickup_get_list` ก่อน — ชื่อสถานะต่างกันตาม list เช่นกัน

เทมเพลต description เมื่อ task มาจากเมล:

```markdown
## ที่มา (Email)
- **เรื่อง:** ...
- **จาก:** ชื่อ (อีเมล) — วันเวลา
- **ถึง:** ... / **CC:** ...
- **ไฟล์แนบ:** ...

## รายละเอียดที่ลูกค้าแจ้ง
...

## การดำเนินการ
- ...

**สถานะ:** ...
```

## 5. ฟิลด์เสริมที่ต้องทำหลังสร้าง

- **Time tracked** → `clickup_add_time_entry` (create_task ใส่ได้แค่ estimate)
- **Sprint points** → ถ้า list มี custom field ชื่อ Points/Sprint Points ให้ `clickup_update_task`; ถ้าไม่มี ให้บอกผู้ใช้ว่า list นี้ไม่มีฟิลด์นี้ อย่าสร้างฟิลด์ใหม่เอง
- **ไฟล์แนบ** → `clickup_attach_task_file` ได้เฉพาะไฟล์ที่เข้าถึงได้จริง ถ้าไม่มีไฟล์ให้บอกผู้ใช้ตรง ๆ

## 6. ค่า default (เมื่อผู้ใช้ไม่ระบุ)

- **Status = Open** — ใช้สถานะแรกสุด/กลุ่ม open ของ list เสมอ **เปลี่ยนเป็นสถานะอื่นก็ต่อเมื่อผู้ใช้สั่งชัดเท่านั้น** (เช่น "ทำเสร็จแล้ว" → สถานะกลุ่ม closed ของ list) — งานที่เพิ่งบันทึกไว้ถือว่ายังไม่เสร็จ
- **Start** = เวลาที่ลูกค้าแจ้ง · **Due** = เวลาที่ตอบกลับ/ปิดงาน — ถ้าไม่รู้ ใช้วันนี้ 09:00 → 18:00
- **Time estimate** = 60 นาที
- **Priority** = normal
- **Assignee** = ผู้ใช้เอง (`clickup_resolve_assignees` กับ `"me"`) หรือคนที่รับผิดชอบ task ลักษณะเดียวกันก่อนหน้า

ตั้ง Resolution / Resolution Date **เฉพาะเมื่อผู้ใช้บอกว่างานเสร็จแล้ว** — task ที่ยัง Open ต้องเว้นสองฟิลด์นี้ไว้

## 7. ตรวจสอบและรายงาน

เรียก `clickup_get_task` (`include: ["custom_fields"]`) เพื่อยืนยันว่า parent / status / dates / custom fields ลงถูกจริง

สรุปให้ผู้ใช้แบบสั้น: ชื่อ task, URL, เส้นทาง parent, **แพตเทิร์นชื่อที่ใช้และที่มาของมัน**, status, assignee, วันเวลา, ฟิลด์ที่กรอก และ **สิ่งที่ยังไม่ครบหรือเดาไว้** เพื่อให้ตรวจซ้ำ