// On-screen case panel for a manual screen test (happy-screen-test).
// intro():   before the screen plays — the case, its topic, the steps, what is correct, the source data; waits for ▶ เริ่ม.
// doing():   while the script plays the screen.
// verdict(): each check as  เรื่องที่ตรวจ | ที่ถูกต้อง | ที่ระบบได้ | ✅/❌ ; waits for
//            ถัดไป / ✗ ไม่ถูกต้อง (note, logged and printed as USER FAIL) / ↻ ทำซ้ำ / ◀ ย้อน.
// The panel collapses (— ย่อ) and changes corner; a note being typed survives both. ↻ ทำซ้ำ replays without the intro.
// Answers are appended to $QA_DIR/user-verdicts.jsonl.
const fs = require('node:fs');
const path = require('node:path');

const VERDICTS = path.join(process.env.QA_DIR || __dirname, 'user-verdicts.jsonl');

// Case code prefix -> topic in words, from the test plan (e.g. { 'TC-UI-07': 'ปัญหาต่อแถว' }). The longest prefix wins.
let topics = {};
function setTopics(map) { topics = map; }

function named(tc) {
  const key = Object.keys(topics).filter(k => tc.startsWith(k)).sort((a, b) => b.length - a.length)[0];
  return key ? `${tc} · เรื่อง: ${topics[key]}` : tc;
}

// The file as the tester would open it: the header and up to maxRows rows as a table (+ the last row when cut).
// encoding: TextDecoder label; default windows-874 when the name says cp874, else utf-8.
function csvSource(file, maxRows = 12, note, encoding) {
  const buf = fs.readFileSync(file);
  const enc = encoding || (/cp874/i.test(file) ? 'windows-874' : 'utf-8');
  const text = new TextDecoder(enc).decode(buf).replace(/^﻿/, '');
  const rows = text.split(/\r?\n/).filter(l => l.length).map(l => l.split(','));
  const more = rows.length - 1 > maxRows ? `… อีก ${rows.length - 1 - maxRows} แถว (ทั้งหมด ${rows.length - 1} แถว)` : null;
  return { caption: `ไฟล์ ${path.basename(file)}${note ? ' — ' + note : ''}`, table: rows.slice(0, maxRows + 1), lastRow: more ? rows[rows.length - 1] : null, more };
}

// Thrown by intro()/verdict() for ย้อน / ทำซ้ำ / ข้าม; the runner catches it.
class Jump extends Error {
  constructor(to) { super('jump ' + to); this.to = to; }
}

// Builds the panel with DOM nodes and textContent only (no HTML from the data).
async function show(page, spec) {
  await page.evaluate(spec => {
    const store = {
      get: k => { try { return localStorage.getItem(k); } catch { return null; } },
      set: (k, v) => { try { localStorage.setItem(k, v); } catch { } },
    };
    let p = document.getElementById('qa-panel');
    if (!p) { p = document.createElement('div'); p.id = 'qa-panel'; document.body.appendChild(p); }
    const top = store.get('qaCorner') === 'top';
    const collapsed = store.get('qaCollapsed') === '1';
    const border = spec.mode === 'intro' ? '#2b6cb0' : '#b7791f';
    const bg = spec.mode === 'intro' ? '#ebf8ff' : '#fffbea';
    p.style.cssText = 'position:fixed;z-index:2147483647;width:min(980px,calc(100vw - 32px));max-height:' + (collapsed ? 'none' : '72vh') + ';overflow:auto;'
      + (top ? 'right:16px;top:64px;' : 'left:16px;bottom:16px;')
      + 'background:' + bg + ';border:2px solid ' + border + ';border-radius:8px;padding:8px 12px;font:14px/1.5 sans-serif;color:#222;box-shadow:0 2px 8px rgba(0,0,0,.25)';
    p.replaceChildren();
    const el = (tag, css, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; return e; };
    const btn = (text, color, fn) => { const b = el('button', 'margin-left:6px;padding:4px 12px;font-size:13px;background:' + color + ';color:#fff;border:0;border-radius:4px;cursor:pointer', text); b.onclick = fn; return b; };
    const answer = (action, note) => { window.__qaAction = action; window.__qaNote = note || ''; };

    const head = el('div', 'display:flex;align-items:center;gap:4px;flex-wrap:wrap');
    head.append(el('div', 'font-weight:700;font-size:15px;flex:1;min-width:240px', spec.title));
    if (spec.mode === 'intro') {
      head.append(btn('▶ เริ่ม', '#2b6cb0', () => answer('start')));
      head.append(btn('ข้าม', '#4a5568', () => answer('skip')));
      head.append(btn('◀ ย้อน', '#4a5568', () => answer('back')));
    }
    if (spec.mode === 'verdict') {
      head.append(btn('ถัดไป ▶', '#2f855a', () => answer('next')));
      head.append(btn('✗ ไม่ถูกต้อง', '#c53030', () => {
        window.__qaFailOpen = true;
        const f = document.getElementById('qa-fail');
        if (f) { f.style.display = 'block'; f.querySelector('textarea').focus(); }
      }));
      head.append(btn('↻ ทำซ้ำ', '#4a5568', () => answer('retry')));
      head.append(btn('◀ ย้อน', '#4a5568', () => answer('back')));
    }
    head.append(btn(collapsed ? '▢ ขยาย' : '— ย่อ', border, () => { store.set('qaCollapsed', collapsed ? '0' : '1'); window.__qaRedraw = true; }));
    head.append(btn(top ? '⇙ ล่างซ้าย' : '⇗ บนขวา', border, () => { store.set('qaCorner', top ? 'bottom' : 'top'); window.__qaRedraw = true; }));
    p.append(head);

    if (spec.mode === 'verdict') {
      const f = el('div', (window.__qaFailOpen ? 'display:block;' : 'display:none;') + 'margin:6px 0;padding:6px;background:#fff5f5;border:1px solid #feb2b2;border-radius:4px');
      f.id = 'qa-fail';
      f.append(el('div', 'font-weight:600;margin-bottom:4px', 'ไม่ถูกต้องตรงไหน (ส่งถึง Claude)'));
      const ta = el('textarea', 'width:100%;min-height:60px;font:13px sans-serif');
      ta.value = window.__qaDraft || '';
      ta.oninput = () => { window.__qaDraft = ta.value; };
      f.append(ta);
      f.append(btn('ส่ง แล้วไปเคสถัดไป', '#c53030', () => answer('fail', ta.value)));
      p.append(f);
    }
    if (collapsed) return;

    const section = (label, items, css) => {
      if (!items || !items.length) return;
      p.append(el('div', 'font-weight:600;margin-top:6px', label));
      const ol = el('ol', 'margin:2px 0 4px 20px;padding:0;' + (css || ''));
      items.forEach(i => ol.append(el('li', 'margin:1px 0', i)));
      p.append(ol);
    };
    section('ขั้นตอนที่จะทำบนจอ', spec.steps);
    section('ที่ถูกต้อง (คาดหวัง)', spec.expect, 'color:#22543d');
    (spec.lines || []).forEach(l => p.append(el('div', 'margin:2px 0', l)));

    if (spec.checks && spec.checks.length) {
      const t = el('table', 'border-collapse:collapse;width:100%;margin:6px 0;font-size:13px');
      const th = document.createElement('tr');
      ['เรื่องที่ตรวจ', 'ที่ถูกต้อง', 'ที่ระบบได้', ''].forEach(h => th.append(el('th', 'text-align:left;border-bottom:2px solid #e2c98a;padding:3px 6px;background:#f6ecd2', h)));
      t.append(th);
      spec.checks.forEach(c => {
        const tr = el('tr', c.ok ? '' : 'background:#fff5f5');
        tr.append(el('td', 'border-bottom:1px solid #eee;padding:3px 6px;vertical-align:top', c.label));
        tr.append(el('td', 'border-bottom:1px solid #eee;padding:3px 6px;vertical-align:top;color:#22543d', c.want == null ? '' : c.want));
        tr.append(el('td', 'border-bottom:1px solid #eee;padding:3px 6px;vertical-align:top;' + (c.ok ? '' : 'color:#c53030'), c.detail == null ? '' : c.detail));
        tr.append(el('td', 'border-bottom:1px solid #eee;padding:3px 6px;vertical-align:top;font-size:15px', c.ok ? '✅' : '❌'));
        t.append(tr);
      });
      p.append(t);
    }

    const source = spec.source;
    if (source) {
      const box = el('div', 'background:#fff;border:1px solid #e2c98a;border-radius:4px;padding:6px 8px;margin:6px 0 8px');
      box.append(el('div', 'font-weight:600;margin-bottom:4px', 'ข้อมูลต้นทาง: ' + (source.caption || '')));
      if (source.table) {
        const wrap = el('div', 'overflow-x:auto');
        const t = el('table', 'border-collapse:collapse;font:12px/1.35 monospace;white-space:nowrap');
        const addRow = (cells, isHead, idx) => {
          const tr = document.createElement('tr');
          tr.append(el(isHead ? 'th' : 'td', 'border:1px solid #ddd;padding:2px 5px;color:#888;background:#f7f7f7', isHead ? '#' : String(idx)));
          cells.forEach(c => tr.append(el(isHead ? 'th' : 'td', 'border:1px solid #ddd;padding:2px 5px;' + (isHead ? 'background:#f1e6c8' : '') + (c === '' ? ';background:#fdecec' : ''), c === '' ? '(ว่าง)' : c)));
          t.append(tr);
        };
        source.table.forEach((r, i) => addRow(r, i === 0, i));
        if (source.more) {
          const tr = document.createElement('tr');
          const td = el('td', 'padding:2px 5px;color:#888', source.more);
          td.colSpan = source.table[0].length + 1;
          tr.append(td); t.append(tr);
        }
        if (source.lastRow) addRow(source.lastRow, false, 'สุดท้าย');
        wrap.append(t); box.append(wrap);
      }
      (source.text || []).forEach(l => box.append(el('div', 'font:12px/1.4 monospace;white-space:pre-wrap', l)));
      p.append(box);
    }
  }, spec);
}

async function reset(page) {
  await page.evaluate(() => { window.__qaAction = null; window.__qaRedraw = false; window.__qaDraft = ''; window.__qaFailOpen = false; });
}

// Shows the panel and waits for the tester's answer, redrawing on ย่อ / ย้าย or after a navigation.
async function ask(page, spec) {
  await reset(page);
  await show(page, spec);
  for (;;) {
    const s = await page.evaluate(() => ({ a: window.__qaAction, n: window.__qaNote, r: window.__qaRedraw, has: !!document.getElementById('qa-panel') }))
      .catch(() => ({ a: null, r: true, has: false }));
    if (s.a) {
      await page.evaluate(() => { const p = document.getElementById('qa-panel'); if (p) p.remove(); window.__qaAction = null; });
      return { action: s.a, note: s.n };
    }
    if (s.r || !s.has) {
      await page.evaluate(() => { window.__qaRedraw = false; }).catch(() => {});
      await show(page, spec).catch(() => {});
    }
    await page.waitForTimeout(300);
  }
}

// Set by ↻ ทำซ้ำ: the rerun plays at once, without asking ▶ เริ่ม again.
let replay = false;

// Before the screen plays: what is about to be tested. ข้าม / ย้อน throw Jump.
async function intro(page, tc, steps, expect, source) {
  if (replay) {
    replay = false;
    console.log('REPLAY', tc);
    return;
  }
  console.log('INTRO', tc);
  const { action } = await ask(page, { mode: 'intro', title: `🔎 กำลังจะทดสอบ: ${named(tc)}`, steps, expect, source });
  console.log('USER ' + action.toUpperCase(), tc);
  if (action !== 'start') throw new Jump(action);
}

// While the script plays the screen.
async function doing(page, tc, what) {
  await reset(page);
  await show(page, { mode: 'doing', title: `▶ ${named(tc)} — กำลังเล่นจอ`, lines: [what] });
}

// The result: checks are { label, want, detail, ok }. ย้อน / ทำซ้ำ throw Jump.
async function verdict(page, tc, checks, source) {
  console.log('WAITING USER', tc);
  const { action, note } = await ask(page, { mode: 'verdict', title: `⏸ ${named(tc)} — ตรวจบนจอ`, checks, source });
  fs.appendFileSync(VERDICTS, JSON.stringify({ tc, action, note, checks }) + '\n');
  console.log(action === 'fail' ? `USER FAIL ${tc} :: ${note}` : `USER ${action.toUpperCase()} ${tc}`);
  replay = action === 'retry';
  if (action === 'back' || action === 'retry') throw new Jump(action);
}

const check = (label, want, detail, ok) => ({ label, want, detail, ok });

module.exports = { setTopics, show, intro, doing, verdict, check, csvSource, Jump };
