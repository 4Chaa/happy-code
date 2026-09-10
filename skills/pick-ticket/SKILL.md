---
name: pick-ticket
description: "หยิบ ClickUp ticket ที่มีอยู่แล้ว (task id หรือ URL) มาอ่านให้ครบ — description, custom fields, subtasks, comments — สรุปเป็น brief ให้ user ยืนยัน แล้วส่งต่อให้ /happy-code ลงมือทำ. Use when the user wants to start work on an existing ClickUp ticket, says \"ทำ ticket นี้\", \"หยิบงานนี้มาทำ\", pastes a ClickUp task URL, or invokes /pick-ticket."
---

# Pick Ticket

หยิบ ClickUp ticket ที่มีอยู่แล้ว มาลงมือทำต่อด้วย `happy-code`

ตอบ user เป็น **ภาษาไทย**

## 1. รับ task id — บังคับ

ต้องมี **task id หรือ URL** เสมอ skill นี้ไม่เดาและไม่ไล่หา ticket ให้เอง

- URL `https://app.clickup.com/t/<task_id>` หรือ `.../t/<team_id>/<task_id>` → task id คือ segment สุดท้าย
- custom id (`DEV-1234`) ส่งเข้า `task_id` ได้ตรง ๆ
- **ไม่ได้ใส่มา** → ถามกลับหนึ่งคำถาม "task id หรือ URL ไหน?" แล้วรอ ห้ามไปเดาจาก list หรือหยิบงานอื่นมาแทน

## 2. อ่าน ticket ให้ครบ

`clickup_get_task` — `include: ["description", "custom_fields", "subtasks"]`

> ต้องใส่ `"description"` ใน `include` เสมอ ไม่งั้นได้แค่ summary ที่ถูกตัด

`clickup_get_task_comments` ทุกครั้ง — บริบทที่ใช้ทำงานจริงมักอยู่ในคอมเมนต์ ไม่ใช่ description
comment ไหน `reply_count > 0` → ตามต่อด้วย `clickup_get_threaded_comments`

## 3. สรุป brief → ให้ยืนยันก่อน

สรุปสั้น ๆ ให้ user ตรวจ:

- ชื่อ task + id + URL
- status ปัจจุบัน / assignee / due date
- custom field ที่มีค่า (Customer, Issue Type, System Module, Request By …)
- **สิ่งที่ ticket ขอให้ทำ** — สังเคราะห์จาก description + comments รวมกัน
- subtask ที่มีอยู่แล้ว
- **สิ่งที่ยังไม่ชัด / ไม่มีในติ๊กเก็ต** — ข้อนี้สำคัญที่สุด ให้ user เติมก่อนเริ่ม

ถาม "อ่านถูกไหม ตกอะไรไหม" แล้วรอ ok เดินหน้าโดยไม่ยืนยัน = grill ผิดทางทั้งรอบ

## 4. ส่งต่อ `happy-code`

ยืนยันแล้ว → invoke `happy-code:happy-code` (Skill tool) โดยส่ง brief เป็น context ตั้งต้น

- brief เป็น **วัตถุดิบของ step 2 (grill)** ไม่ใช่ spec สำเร็จรูป — ยัง grill ตามปกติ แค่ไม่ถามซ้ำสิ่งที่ ticket ตอบไปแล้ว
- **ยังทำ step 2b (to-spec) และ 2c (to-tickets) ครบ** — ClickUp ticket คนละแบบกับ spec ของ happy-code แทนกันไม่ได้
- ที่เหลือปล่อยให้ happy-code คุม: impact analysis → confirm gate → build → self-review → commit → คง branch ไว้

## 5. จบงานแล้ว — เสนอเขียนกลับ ClickUp

happy-code จบที่ step 8 (คง branch) แล้วค่อยมาต่อตรงนี้ **เสนอ อย่าเพิ่งทำ**:

- comment สรุป — commit list, ไฟล์ที่แก้, สิ่งที่ยังไม่ได้ทำ → `clickup_create_comment` (`entity_id` = task id)
- เปลี่ยน status → ดูค่าที่ list รองรับก่อนด้วย `clickup_get_task` + `expand_statuses: true` แล้วค่อย `clickup_update_task`
- ลงเวลาที่ใช้จริง → `clickup_add_time_entry`

รอ "ok" ก่อนทุกครั้ง user ไม่ตอบหรือบอกไม่ต้อง → ไม่แตะ ClickUp เลย

## Red flags — never

- เดา task id เอง หรือหยิบ ticket อื่นมาแทนตอนที่ user ไม่ได้ระบุ
- ข้าม `clickup_get_task_comments`
- เรียก `clickup_get_task` โดยไม่ใส่ `"description"` ใน `include` แล้วสรุปจาก summary ที่ถูกตัด
- เอา ticket description ไปใช้แทน spec — ต้อง grill + to-spec ตาม happy-code
- เขียน comment / เปลี่ยน status / ลงเวลา โดยไม่ถามก่อน
- ใช้ `clickup_create_task_comment` — deprecated แล้ว ใช้ `clickup_create_comment`
- ตั้ง status เป็น Done ทั้งที่ยังไม่ได้ merge — happy-code คง branch ไว้เสมอ
