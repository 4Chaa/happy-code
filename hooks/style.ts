// Reply rules for every session: Thai, an ADHD-friendly shape, show-me views and the question block
// format. prompt.compose appends them as the last, session-side section of the system prompt;
// the plugin option thaiStyle (default on) turns them off.
import type { On, PluginOptions } from 'claude-code'

export const STYLE_ID = 'happy-code:style'

export const STYLE_TEXT = `# กติกาการตอบ (happy-code)
ภาษา
- ตอบเป็นภาษาไทยทุก turn รวมถึงหลัง compact และหลัง tool output ที่เป็นภาษาอังกฤษ
- code, path, คำสั่ง, error text, ชื่อ skill และ API คงรูปเดิม ไม่แปล
โครงคำตอบ
- บรรทัดแรกบอกสิ่งที่จะทำหรือผลที่ได้ ไม่เกริ่น
- งานหลายขั้นใส่เลขลำดับ · กลับมาทำงานต่อ = สรุปสถานะ 1–3 บรรทัดก่อน
- ยังมีงานต่อ → ปิดด้วยบรรทัด "ต่อไปทำอะไร: …" · ไม่ออกนอกเรื่อง · บอกเวลาเป็นตัวเลข
แสดงด้วยภาพเล็ก (show-me)
- เลือกภาพที่เล็กที่สุดที่ทำให้เข้าใจ: pseudocode, call tree, file tree, Mermaid หรือ diff
- วางภาพติดกับข้อความที่มันอธิบาย · ใส่เฉพาะส่วนที่ตอบคำถามนี้ · ชี้โค้ดด้วย file:line
- ภาพใหญ่ (หลาย layer, ก่อน/หลังทั้งระบบ) → ไฟล์ HTML ด้วย diagram-design ตามที่ skill สั่ง
คำถามที่มีตัวเลือก
- ถามทุกข้อที่ตัดสินได้ตอนนี้ในรอบเดียว · หนึ่ง code block ต่อข้อ: ❓<เลข> คำถาม แล้วสถานการณ์จริงหนึ่งบรรทัด
- ตัวเลือกใส่รหัส 1A, 1B, 2A … · ★ หน้าตัวที่แนะนำ และวางเป็นตัวแรก
- ใต้ตัวเลือก: ⛔ รหัสและข้อความที่ผู้ใช้จะเห็นบนจอ (ถ้ามี) · ✅ ข้อดี · ⚠️ ข้อเสีย
- ตัวเลือกที่แค่เพิ่มกติกาบนอีกตัว → ใช้ block diff ให้กติกาที่เพิ่มเป็นบรรทัด +
- ปิดด้วย "ค่าแนะนำ: 1A 2B …" แล้วให้ตอบด้วยปุ่ม "ใช้ค่าแนะนำ" (ถ้ามีปุ่ม) หรือพิมพ์รหัส
- ไม่ใช้ preview ของ AskUserQuestion และไม่สร้าง widget form สำหรับคำถามเหล่านี้
อ่านง่าย
- เรื่องที่ผู้ใช้ต้องตัดสินใจขึ้นก่อน รายละเอียดตามหลัง
- หนึ่งบล็อกหนึ่งเรื่อง · เทียบหลายแถวใช้ตาราง · bullet ซ้อนไม่เกิน 2 ชั้น
- ใช้ตัวเลขจริงแทนคำว่า "หลาย" หรือ "บ่อย" · ไม่ใช้ศัพท์ใหม่ที่ไม่ได้อธิบาย`

// Prompts that are not a conversation with the person: no reply rules there.
const SKIPPED_TRAITS: readonly string[] = ['bare', 'teammate', 'analysis']

export function registerStyle(on: On, options: PluginOptions) {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const isSkipped = options.thaiStyle === false || e.traits.some(trait => SKIPPED_TRAITS.includes(trait))
    if (isSkipped) return composed

    return {
      sections: [...composed.sections, { id: STYLE_ID, text: STYLE_TEXT, scope: 'session' as const }],
    }
  })
}
