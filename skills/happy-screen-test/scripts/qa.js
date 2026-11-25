// On-screen case panel for a manual screen test (happy-screen-test).
// Layout, top to bottom: head (case code + topic, verdict summary "ไม่ผ่าน 1 จาก 3 ข้อ", small ย่อ / ย้ายมุม icons),
// body (scrolls; head and actions stay in view), note box, action bar (bottom right, the main action last).
// intro():   before the screen plays — steps and what is correct side by side, then the source data; ▶ เริ่ม.
// doing():   while the script plays the screen: only a small badge (กำลังเล่น · case code) in the bottom-right corner
//            that clicks pass through, so the panel never covers what the mouse is about to click.
// verdict(): each check as  ผล | เรื่องที่ตรวจ | ที่ถูกต้อง | ที่ระบบได้  (a failed check is red across its row); waits for
//            ถัดไป / ไม่ถูกต้อง (note, logged and printed as USER FAIL) / ทำซ้ำ / ย้อน.
//            With a failed check, ถัดไป needs a second click and prints USER OVERRIDE (passed over a failed check).
//            { once: true } hides ทำซ้ำ for a case that cannot run twice (it continues from state an earlier step changed).
// waitFor(): a step the tester does outside the screen (e.g. SQL on dev): a panel without buttons says what to do, and
//            the script checks a condition until it holds, then goes on by itself.
// The panel collapses (head + actions only), changes corner, and drags anywhere by its head (the place is kept until a
// corner button sends it back); a note being typed survives all three. ทำซ้ำ replays without the intro.
// Answers are appended to $QA_DIR/user-verdicts.jsonl.
const fs = require('node:fs');
const path = require('node:path');

const VERDICTS = path.join(process.env.QA_DIR || __dirname, 'user-verdicts.jsonl');

// Case code prefix -> topic in words, from the test plan (e.g. { 'TC-UI-07': 'ปัญหาต่อแถว' }). The longest prefix wins.
let topics = {};
function setTopics(map) { topics = map; }

function topicOf(tc) {
  const key = Object.keys(topics).filter(k => tc.startsWith(k)).sort((a, b) => b.length - a.length)[0];
  return key ? topics[key] : '';
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

// Scoped to #qa-panel so the host page's CSS (Bootstrap tables, buttons, lists) does not leak in, and so focus rings
// and hover states exist at all (inline styles cannot carry them). Spacing steps 4 / 8 / 12 / 16.
const PANEL_CSS = `
#qa-panel{position:fixed;z-index:2147483647;box-sizing:border-box;width:min(980px,calc(100vw - 32px));display:flex;flex-direction:column;
  background:#fff;color:#0f172a;border:2px solid var(--qa-accent);border-radius:10px;overflow:hidden;text-align:left;
  box-shadow:0 10px 28px rgba(15,23,42,.18),0 2px 6px rgba(15,23,42,.12);font:14px/1.5 system-ui,'Segoe UI',Tahoma,'Noto Sans Thai',sans-serif}
#qa-panel *{box-sizing:border-box}
#qa-panel ::selection{background:var(--qa-tint-strong)}
#qa-panel.qa-bottom{left:16px;bottom:16px}
#qa-panel.qa-top{right:16px;top:64px}
#qa-panel .qa-head{display:flex;align-items:flex-start;gap:12px;padding:12px 12px 10px 16px;background:var(--qa-tint);border-bottom:1px solid #e2e8f0}
#qa-panel .qa-ident{flex:1;min-width:0}
#qa-panel .qa-title{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;font-size:16px;font-weight:600;line-height:1.35}
#qa-panel .qa-code{padding:1px 6px;border:1px solid #cbd5e1;border-radius:4px;background:#fff;color:#334155;
  font:600 12px/1.4 ui-monospace,Consolas,monospace;white-space:nowrap}
#qa-panel .qa-summary{margin-top:4px;font-size:13px;font-weight:600}
#qa-panel .qa-summary.fail{color:#b42318}
#qa-panel .qa-summary.pass{color:#1e6b3a}
#qa-panel .qa-tools{display:flex;gap:4px;margin-top:-2px}
#qa-panel .qa-icon{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:0;border-radius:6px;
  background:transparent;color:#475569;cursor:pointer}
#qa-panel .qa-icon:hover{background:rgba(15,23,42,.07);color:#0f172a}
#qa-panel .qa-body{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:16px;padding:12px 16px 16px}
#qa-panel .qa-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px 24px}
#qa-panel .qa-label{margin-bottom:6px;font-size:13px;font-weight:600;color:#475569}
#qa-panel ol,#qa-panel ul{margin:0;padding-left:20px}
#qa-panel li{margin:2px 0}
#qa-panel table{border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums;background:#fff}
#qa-panel th{background:#f1f5f9;color:#334155;font-weight:600;text-align:left}
#qa-panel th,#qa-panel td{padding:6px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top}
#qa-panel .qa-checks{width:100%}
#qa-panel .qa-checks td:first-child,#qa-panel .qa-checks th:first-child{width:1%;white-space:nowrap}
#qa-panel .qa-checks td:nth-child(2){width:26%}
#qa-panel .qa-checks tr.qa-fail td{background:#fdf2f2}
#qa-panel .qa-checks tr.qa-fail td.qa-got{color:#b42318;font-weight:600}
#qa-panel .qa-pill{display:inline-block;padding:1px 8px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap}
#qa-panel .qa-pill.pass{background:#e7f6ec;color:#1e6b3a}
#qa-panel .qa-pill.fail{background:#fde4e2;color:#b42318}
#qa-panel .qa-scroll{overflow-x:auto}
#qa-panel .qa-source th,#qa-panel .qa-source td{padding:3px 8px;border:1px solid #e2e8f0;white-space:nowrap;font-size:12.5px}
#qa-panel .qa-source .qa-idx{background:#f8fafc;color:#64748b}
#qa-panel .qa-source .qa-empty{background:#fdecec;color:#9b1c1c}
#qa-panel .qa-source .qa-more{color:#64748b}
#qa-panel .qa-note{margin:6px 0 0;font-size:12.5px;color:#475569}
#qa-panel .qa-failbox{display:flex;flex-direction:column;gap:8px;padding:12px 16px;background:#fdf2f2;border-top:1px solid #f3c4c0}
#qa-panel .qa-failbox[hidden]{display:none}
#qa-panel .qa-failbox label{font-size:13px;font-weight:600;color:#7a1d16}
#qa-panel textarea{width:100%;min-height:64px;padding:6px 8px;border:1px solid #e5a3a0;border-radius:6px;background:#fff;color:#0f172a;
  font-family:inherit;font-size:13px;line-height:1.5;resize:vertical}
#qa-panel .qa-failbox .qa-btn{align-self:flex-end}
#qa-panel .qa-foot{display:flex;flex-wrap:wrap;justify-content:flex-end;align-items:center;gap:8px;padding:10px 16px;background:#f8fafc;border-top:1px solid #e2e8f0}
#qa-panel .qa-btn{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:6px 14px;border:1px solid #cbd5e1;border-radius:6px;
  background:#fff;color:#1e293b;font-family:inherit;font-size:13px;font-weight:600;line-height:1.2;cursor:pointer}
#qa-panel .qa-btn:hover{background:#f1f5f9}
#qa-panel .qa-btn.primary{background:var(--qa-primary);border-color:var(--qa-primary);color:#fff}
#qa-panel .qa-btn.primary:hover{filter:brightness(.9)}
#qa-panel .qa-btn.danger{border-color:#e5a3a0;color:#b42318}
#qa-panel .qa-btn.danger:hover{background:#fdf2f2}
#qa-panel .qa-btn.danger.solid{background:#b42318;border-color:#b42318;color:#fff}
#qa-panel button:focus-visible,#qa-panel textarea:focus-visible{outline:2px solid var(--qa-accent);outline-offset:2px}
#qa-panel.qa-badge{top:auto;left:auto;right:12px;bottom:12px;width:auto;flex-direction:row;align-items:center;gap:8px;padding:4px 12px;
  border:0;border-radius:999px;background:var(--qa-accent);color:#fff;font-size:12px;font-weight:600;line-height:1.6;white-space:nowrap;
  pointer-events:none;opacity:.92;box-shadow:0 2px 8px rgba(15,23,42,.25)}
#qa-panel.qa-badge .qa-dot{width:8px;height:8px;border-radius:50%;background:#fff;animation:qa-pulse 1.6s cubic-bezier(.16,1,.3,1) infinite}
@keyframes qa-pulse{0%{opacity:1}60%{opacity:.25}100%{opacity:1}}
@media (prefers-reduced-motion:reduce){#qa-panel.qa-badge .qa-dot{animation:none}}
`;

// Builds the panel with DOM nodes and textContent only (no HTML from the data).
async function show(page, spec) {
  await page.evaluate(([spec, css]) => {
    const store = {
      get: k => { try { return localStorage.getItem(k); } catch { return null; } },
      set: (k, v) => { try { localStorage.setItem(k, v); } catch { } },
    };
    if (!document.getElementById('qa-style')) {
      const s = document.createElement('style');
      s.id = 'qa-style';
      s.textContent = css;
      (document.head || document.documentElement).appendChild(s);
    }
    let p = document.getElementById('qa-panel');
    if (!p) { p = document.createElement('div'); p.id = 'qa-panel'; document.body.appendChild(p); }
    const tones = { intro: ['#2b6cb0', '#eef5fc', '#dbe9f8', '#2b6cb0'], verdict: ['#b7791f', '#fdf6e3', '#f6e3b4', '#276749'],
      wait: ['#6b46c1', '#f3effc', '#e4dbf7', '#6b46c1'] };
    const [accent, tint, tintStrong, primary] = tones[spec.mode] || tones.intro;
    p.removeAttribute('style');
    p.style.setProperty('--qa-accent', accent);
    p.style.setProperty('--qa-tint', tint);
    p.style.setProperty('--qa-tint-strong', tintStrong);
    p.style.setProperty('--qa-primary', primary);
    p.replaceChildren();

    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const SVG = 'http://www.w3.org/2000/svg';
    const icon = d => {
      const svg = document.createElementNS(SVG, 'svg');
      for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', width: '16', height: '16', fill: 'none', stroke: 'currentColor',
        'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) svg.setAttribute(k, v);
      const line = document.createElementNS(SVG, 'path');
      line.setAttribute('d', d);
      svg.append(line);
      return svg;
    };
    const ICON = { back: 'M15 6l-6 6 6 6', next: 'M9 6l6 6-6 6', start: 'M8 5l11 7-11 7z', retry: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4',
      fail: 'M6 6l12 12M18 6L6 18', collapse: 'M5 12h14', expand: 'M5 5h14v14H5z', toTop: 'M7 17L17 7M9 7h8v8', toBottom: 'M17 7L7 17M15 17H7V9' };
    const btn = (text, cls, fn, before, after) => {
      const b = el('button', 'qa-btn' + (cls ? ' ' + cls : ''));
      b.type = 'button';
      if (before) b.append(icon(ICON[before]));
      b.append(document.createTextNode(text));
      if (after) b.append(icon(ICON[after]));
      b.onclick = fn;
      return b;
    };
    const tool = (label, name, fn) => {
      const b = el('button', 'qa-icon');
      b.type = 'button';
      b.title = label;
      b.setAttribute('aria-label', label);
      b.append(icon(ICON[name]));
      b.onclick = fn;
      return b;
    };
    const answer = (action, note) => { window.__qaAction = action; window.__qaNote = note || ''; };
    const remember = (key, value) => { store.set(key, value); window.__qaRedraw = true; };

    // Playing the screen: a click-through badge instead of the panel.
    if (spec.mode === 'doing') {
      p.className = 'qa-badge';
      p.append(el('span', 'qa-dot'), el('span', '', `กำลังเล่น · ${spec.code || ''}`));
      return;
    }

    const top = store.get('qaCorner') === 'top';
    const collapsed = store.get('qaCollapsed') === '1';
    p.className = top ? 'qa-top' : 'qa-bottom';
    p.style.maxHeight = collapsed ? 'none' : '72vh';
    p.setAttribute('role', 'region');
    p.setAttribute('aria-label', `แผงทดสอบ ${spec.code || ''}`);
    const checks = spec.checks || [];
    const failed = checks.filter(c => !c.ok).length;

    const head = el('div', 'qa-head');
    const ident = el('div', 'qa-ident');
    const title = el('div', 'qa-title');
    if (spec.code) title.append(el('span', 'qa-code', spec.code));
    title.append(el('span', '', spec.topic || spec.title || ''));
    ident.append(title);
    if (spec.mode === 'verdict' && checks.length) {
      ident.append(el('div', 'qa-summary ' + (failed ? 'fail' : 'pass'),
        failed ? `ไม่ผ่าน ${failed} จาก ${checks.length} ข้อ` : `ผ่านครบ ${checks.length} ข้อ`));
    }
    const tools = el('div', 'qa-tools');
    tools.append(tool(collapsed ? 'ขยาย' : 'ย่อ', collapsed ? 'expand' : 'collapse', () => remember('qaCollapsed', collapsed ? '0' : '1')));
    tools.append(tool(top ? 'ย้ายไปล่างซ้าย' : 'ย้ายไปบนขวา', top ? 'toBottom' : 'toTop', () => {
      store.set('qaPos', '');
      remember('qaCorner', top ? 'bottom' : 'top');
    }));
    head.append(ident, tools);
    p.append(head);

    // Drag the head anywhere so the panel never covers what the tester checks. The place is kept (qaPos) across cases
    // and reloads until a corner button sends the panel back; it stays inside the window with the head reachable.
    const place = (x, y) => {
      const left = Math.round(Math.min(Math.max(0, x), Math.max(0, innerWidth - 120)));
      const down = Math.round(Math.min(Math.max(0, y), Math.max(0, innerHeight - 56)));
      p.style.left = left + 'px';
      p.style.top = down + 'px';
      p.style.right = 'auto';
      p.style.bottom = 'auto';
      if (!collapsed) p.style.maxHeight = `min(72vh, calc(100vh - ${down + 8}px))`;
      return { x: left, y: down };
    };
    let saved = null;
    try { saved = JSON.parse(store.get('qaPos') || 'null'); } catch { saved = null; }
    if (saved) place(saved.x, saved.y);
    head.style.cursor = 'move';
    head.title = 'ลากเพื่อย้ายกล่อง';
    head.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('button')) return;
      e.preventDefault();
      const r = p.getBoundingClientRect();
      const dx = e.clientX - r.left;
      const dy = e.clientY - r.top;
      head.setPointerCapture(e.pointerId);
      const move = ev => place(ev.clientX - dx, ev.clientY - dy);
      const up = ev => {
        head.removeEventListener('pointermove', move);
        head.removeEventListener('pointerup', up);
        store.set('qaPos', JSON.stringify(place(ev.clientX - dx, ev.clientY - dy)));
      };
      head.addEventListener('pointermove', move);
      head.addEventListener('pointerup', up);
    });

    const list = (label, items, tag) => {
      const box = el('div');
      box.append(el('div', 'qa-label', label));
      const l = el(tag);
      items.forEach(i => l.append(el('li', '', i)));
      box.append(l);
      return box;
    };
    const checkTable = () => {
      const t = el('table', 'qa-checks');
      const thead = el('thead');
      const hr = el('tr');
      ['ผล', 'เรื่องที่ตรวจ', 'ที่ถูกต้อง', 'ที่ระบบได้'].forEach(h => hr.append(el('th', '', h)));
      thead.append(hr);
      const tbody = el('tbody');
      checks.forEach(c => {
        const tr = el('tr', c.ok ? '' : 'qa-fail');
        const result = el('td');
        result.append(el('span', 'qa-pill ' + (c.ok ? 'pass' : 'fail'), c.ok ? 'ผ่าน' : 'ไม่ผ่าน'));
        tr.append(result, el('td', '', c.label), el('td', '', c.want == null ? '' : String(c.want)), el('td', 'qa-got', c.detail == null ? '' : String(c.detail)));
        tbody.append(tr);
      });
      t.append(thead, tbody);
      return t;
    };
    const sourceBlock = source => {
      const box = el('div', 'qa-source');
      box.append(el('div', 'qa-label', 'ข้อมูลต้นทาง' + (source.caption ? ': ' + source.caption : '')));
      if (source.table) {
        const wrap = el('div', 'qa-scroll');
        const t = el('table');
        const addRow = (cells, isHead, idx) => {
          const tr = el('tr');
          tr.append(el(isHead ? 'th' : 'td', 'qa-idx', isHead ? '#' : String(idx)));
          cells.forEach(c => {
            const empty = !isHead && c === '';
            tr.append(el(isHead ? 'th' : 'td', empty ? 'qa-empty' : '', empty ? '(ว่าง)' : c));
          });
          t.append(tr);
        };
        source.table.forEach((r, i) => addRow(r, i === 0, i));
        if (source.more) {
          const tr = el('tr');
          const td = el('td', 'qa-more', source.more);
          td.colSpan = source.table[0].length + 1;
          tr.append(td);
          t.append(tr);
        }
        if (source.lastRow) addRow(source.lastRow, false, 'สุดท้าย');
        wrap.append(t);
        box.append(wrap);
      }
      (source.text || []).forEach(l => box.append(el('p', 'qa-note', l)));
      return box;
    };

    if (!collapsed) {
      const body = el('div', 'qa-body');
      if (spec.mode === 'intro') {
        const cols = el('div', 'qa-cols');
        if (spec.steps && spec.steps.length) cols.append(list('ขั้นตอนที่จะทำบนจอ', spec.steps, 'ol'));
        if (spec.expect && spec.expect.length) cols.append(list('ที่ถูกต้อง', spec.expect, 'ul'));
        body.append(cols);
      }
      // A step the tester does outside the screen (e.g. SQL on dev): no buttons, the script goes on by itself.
      if (spec.mode === 'wait') body.append(list('รอคุณทำ', spec.steps || [], 'ol'));
      if (checks.length) body.append(checkTable());
      if (spec.source) body.append(sourceBlock(spec.source));
      p.append(body);
    }

    if (spec.mode === 'verdict') {
      const f = el('div', 'qa-failbox');
      f.id = 'qa-fail';
      f.hidden = !window.__qaFailOpen;
      const label = el('label', '', 'ไม่ถูกต้องตรงไหน (ส่งถึง Claude)');
      label.htmlFor = 'qa-fail-note';
      const ta = el('textarea');
      ta.id = 'qa-fail-note';
      ta.value = window.__qaDraft || '';
      ta.oninput = () => { window.__qaDraft = ta.value; };
      f.append(label, ta, btn('ส่ง แล้วไปเคสถัดไป', 'danger solid', () => answer('fail', ta.value)));
      p.append(f);
    }

    const foot = el('div', 'qa-foot');
    if (spec.mode === 'intro') {
      foot.append(btn('ย้อน', '', () => answer('back'), 'back'), btn('ข้าม', '', () => answer('skip')),
        btn('เริ่ม', 'primary', () => answer('start'), 'start'));
    }
    if (spec.mode === 'verdict') {
      foot.append(btn('ย้อน', '', () => answer('back'), 'back'));
      if (!spec.once) foot.append(btn('ทำซ้ำ', '', () => answer('retry'), 'retry'));
      foot.append(btn('ไม่ถูกต้อง', 'danger', () => {
        window.__qaFailOpen = true;
        const f = document.getElementById('qa-fail');
        if (f) { f.hidden = false; f.querySelector('textarea').focus(); }
      }, 'fail'));
      foot.append(btn('ถัดไป', 'primary', e => {
        const b = e.currentTarget;
        if (failed && !b.dataset.sure) {
          b.dataset.sure = '1';
          b.textContent = `ไม่ผ่าน ${failed} ข้อ — กดอีกครั้งถ้าผ่านจริง`;
          return;
        }
        answer('next');
      }, null, 'next'));
    }
    p.append(foot);
  }, [spec, PANEL_CSS]);
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

// Set by ทำซ้ำ: the rerun plays at once, without asking เริ่ม again.
let replay = false;

// Before the screen plays: what is about to be tested. ข้าม / ย้อน throw Jump.
async function intro(page, tc, steps, expect, source) {
  if (replay) {
    replay = false;
    console.log('REPLAY', tc);
    return;
  }
  console.log('INTRO', tc);
  const { action } = await ask(page, { mode: 'intro', code: tc, topic: topicOf(tc), steps, expect, source });
  console.log('USER ' + action.toUpperCase(), tc);
  if (action !== 'start') throw new Jump(action);
}

// While the script plays the screen.
async function doing(page, tc) {
  await reset(page);
  await show(page, { mode: 'doing', code: tc });
}

// A step the tester does outside the screen (e.g. SQL on dev): shows `steps` in a panel without buttons and checks
// `done` (sync or async, e.g. a K.db query) every `every` ms, redrawing after ย่อ / ย้าย or a navigation.
// True once done holds, false after `minutes`. Prints WAITING (what the tester must do), then WAIT OK or WAIT TIMEOUT.
async function waitFor(page, tc, steps, done, { minutes = 20, every = 2000 } = {}) {
  const spec = { mode: 'wait', code: tc, topic: topicOf(tc), steps: [...steps, `script ตรวจทุก ${every / 1000} วินาที แล้วทำต่อเอง`] };
  await reset(page);
  await show(page, spec);
  console.log('WAITING', tc, '::', steps.join(' | '));
  const end = Date.now() + minutes * 60000;
  while (Date.now() < end) {
    if (await done()) {
      console.log('WAIT OK', tc);
      return true;
    }
    const s = await page.evaluate(() => ({ r: window.__qaRedraw, has: !!document.getElementById('qa-panel') }))
      .catch(() => ({ r: true, has: false }));
    if (s.r || !s.has) {
      await page.evaluate(() => { window.__qaRedraw = false; }).catch(() => {});
      await show(page, spec).catch(() => {});
    }
    await page.waitForTimeout(every);
  }
  console.log('WAIT TIMEOUT', tc);
  return false;
}

// The result: checks are { label, want, detail, ok }. ย้อน / ทำซ้ำ throw Jump.
// A failed check prints CHECK RED before the panel opens, so the agent starts fixing without waiting for the tester.
async function verdict(page, tc, checks, source, { once = false } = {}) {
  const red = checks.filter(c => !c.ok);
  if (red.length) console.log('CHECK RED', tc, '::', red.map(c => `${c.label}: want ${c.want}, got ${c.detail}`).join(' | '));
  console.log('WAITING USER', tc);
  const { action, note } = await ask(page, { mode: 'verdict', code: tc, topic: topicOf(tc), checks, source, once });
  fs.appendFileSync(VERDICTS, JSON.stringify({ tc, action, note, checks }) + '\n');
  const said = action === 'next' && checks.some(c => !c.ok) ? 'OVERRIDE' : action.toUpperCase();
  console.log(action === 'fail' ? `USER FAIL ${tc} :: ${note}` : `USER ${said} ${tc}`);
  replay = action === 'retry';
  if (action === 'back' || action === 'retry') throw new Jump(action);
}

const check = (label, want, detail, ok) => ({ label, want, detail, ok });

module.exports = { setTopics, show, intro, doing, waitFor, verdict, check, csvSource, Jump };
