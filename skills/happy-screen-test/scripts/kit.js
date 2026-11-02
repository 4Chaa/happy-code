// Helpers for an Angular SPA built on ng-select (<select-input formControlName>), ngx-datatable and ngx-toastr.
// Other widget libraries: keep the shape, change the selectors.
//
// The screen is played the way a tester would: the mouse travels to each element and clicks it, text is typed
// key by key, and a red dot shows where the pointer is. Nothing here clicks through the DOM or skips the form;
// the API helpers are for FE = BE checks and read-only lookups only.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const QA_DIR = process.env.QA_DIR;
const TOAST = '.toast-container .ngx-toastr';
const PACE = Number(process.env.HUMAN_PACE || 1); // 0 = no pauses (rerun), 2 = slower demo

async function attach() {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.CDP_PORT || 9333}`);
  const ctx = browser.contexts()[0];
  const origin = new URL(process.env.APP_URL).origin;
  const page = ctx.pages().find(p => p.url().startsWith(origin)) || ctx.pages()[0];
  await page.bringToFront();
  await showCursor(page);
  return { browser, ctx, page };
}

const settle = (page, ms = 600) => page.waitForTimeout(ms);

// ---------- the mouse and keyboard, like a person ----------
// A red dot that follows the real mouse, so the tester sees where the next click lands. Survives navigation.
const CURSOR = `(() => {
  if (window.__qaCursor) return; window.__qaCursor = true;
  const add = () => {
    const d = document.createElement('div');
    d.id = '__qa-cursor';
    d.style.cssText = 'position:fixed;z-index:2147483647;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;'
      + 'background:rgba(220,38,38,.55);border:2px solid #fff;box-shadow:0 0 0 1px rgba(220,38,38,.9);pointer-events:none;'
      + 'transition:transform .12s;left:-40px;top:-40px';
    document.documentElement.appendChild(d);
    addEventListener('mousemove', e => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', () => { d.style.transform = 'scale(.6)'; }, true);
    addEventListener('mouseup', () => { d.style.transform = ''; }, true);
  };
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', add) : add();
})()`;

async function showCursor(page) {
  await page.context().addInitScript(CURSOR).catch(() => {});
  await page.evaluate(CURSOR).catch(() => {});
}

const pause = (page, ms) => page.waitForTimeout(ms * PACE);

// Moves the mouse to the element in visible steps and clicks it there. `force` for an input hidden under a styled
// label (custom-control checkbox / radio): the mouse still goes to the box the tester would click.
async function click(page, locator, { force = false } = {}) {
  await locator.waitFor({ state: force ? 'attached' : 'visible' });
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  let target = locator;
  if (force) {
    const box = locator.locator('xpath=..');
    if (await box.boundingBox()) target = box;
  }
  const b = await target.boundingBox();
  if (!b) throw new Error('click: element has no box on screen');
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 18 });
  await pause(page, 250);
  if (force) await locator.check({ force: true }); else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await pause(page, 300);
}

// Clicks into the field, clears it like a person (select all + delete) and types key by key.
async function type(page, locator, text) {
  await click(page, locator);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.keyboard.type(String(text), { delay: 45 * PACE });
  await pause(page, 200);
}

async function hover(page, locator) {
  const b = await locator.boundingBox();
  if (b) await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
}

// ---------- ng-select by formControlName ----------
const ng = (page, name) => page.locator(`select-input[formcontrolname="${name}"] ng-select`);

async function selected(page, name) {
  const v = ng(page, name).locator('.ng-value-label');
  return (await v.count()) ? (await v.first().innerText()).trim() : null;
}

async function options(page, name) {
  await click(page, ng(page, name).locator('.ng-select-container'));
  const panel = page.locator('.ng-dropdown-panel');
  await panel.waitFor();
  const texts = (await panel.locator('.ng-option').allInnerTexts()).map(t => t.trim());
  await page.keyboard.press('Escape');
  return texts;
}

// Picks the option containing `text`, then waits for the cascade request it starts.
async function pick(page, name, text) {
  await click(page, ng(page, name).locator('.ng-select-container'));
  const option = page.locator('.ng-dropdown-panel .ng-option').filter({ hasText: text }).first();
  await option.waitFor();
  await click(page, option);
  await settle(page, 900);
}

async function clearSelect(page, name) {
  const clear = ng(page, name).locator('.ng-clear-wrapper');
  if (await clear.count()) await click(page, clear);
  await settle(page);
}

// A server-search ng-select wrapped in another component (e.g. <typeahead formControlName>). Its options are labels
// such as names, not codes: types `keyword` when given, picks the option containing `text` (or the first), and
// returns the picked label so the verdict can show what was chosen.
async function pickTypeahead(page, name, { host = 'typeahead', keyword, text } = {}) {
  const sel = page.locator(`${host}[formcontrolname="${name}"] ng-select`);
  await click(page, sel.locator('.ng-select-container'));
  if (keyword) await page.keyboard.type(keyword, { delay: 45 * PACE });
  let option = page.locator('.ng-dropdown-panel .ng-option');
  if (text) option = option.filter({ hasText: text });
  option = option.first();
  await option.waitFor({ timeout: 15000 });
  const label = (await option.innerText()).split(/\r?\n/)[0].trim();
  await click(page, option);
  await settle(page, 1200);
  return label;
}

// The message an invalid field shows under itself (FE validation).
const fieldMessage = async (page, host) =>
  (await page.locator(host).locator('.invalid').allInnerTexts()).join(' ').replace(/\s+/g, ' ').trim();

// ---------- toasts (they fade in ~6-10 s: hover the first one to hold it) ----------
async function dismissToasts(page) {
  for (const t of await page.locator(TOAST).all()) await t.click().catch(() => {});
  await settle(page, 300);
}

async function toasts(page, timeout = 8000) {
  await page.locator(TOAST).first().waitFor({ timeout }).catch(() => {});
  await settle(page, 400);
  return (await page.locator(TOAST).allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
}

async function holdToast(page) {
  const first = page.locator(TOAST).first();
  if (await first.count()) await hover(page, first).catch(() => {});
}

// ---------- ngx-datatable: rows on the current page only (it pages, 10 per page by default) ----------
async function gridRows(page) {
  return page.locator('datatable-body-row').evaluateAll(rows => rows.map(r => ({
    cells: [...r.querySelectorAll('datatable-body-cell')].map(c => c.innerText.replace(/\s+/g, ' ').trim()),
    red: !!r.querySelector('.text-danger'),
  })));
}

// Column index by header text — never by position (other columns come and go).
async function column(page, header) {
  const headers = (await page.locator('datatable-header-cell').allInnerTexts()).map(h => h.replace(/\s+/g, ' ').trim());
  return headers.findIndex(h => h.includes(header));
}

async function nextGridPage(page) {
  const next = page.locator('datatable-pager li:not(.disabled) a[aria-label="go to next page"]');
  if (!(await next.count())) return false;
  await click(page, next);
  await settle(page, 500);
  return true;
}

// The grid row holding `text` (e.g. a document number).
const row = (page, text) => page.locator('datatable-body-row').filter({ hasText: text }).first();

// Ticks the row's checkbox. Custom-control checkboxes hide the input under an empty label: the mouse goes to the
// box, the input is checked.
async function checkRow(page, text) {
  await click(page, row(page, text).locator('input[type=checkbox]').first(), { force: true });
}

// Searches a list screen for `text` and returns the row. A search page often starts with a default filter (e.g. one
// system study type) that hides the record: when the row is not listed, it tries each option of `fallbackSelect`.
// `input` / `submit` are selectors of the keyword box and the search button.
async function searchRow(page, text, { input, submit, fallbackSelect } = {}) {
  const run = async () => {
    await type(page, page.locator(input), text);
    await click(page, page.locator(submit).first());
    await settle(page, 1500);
  };
  await run();
  const found = row(page, text);
  if (!(await found.count()) && fallbackSelect) {
    for (const o of await options(page, fallbackSelect)) {
      await pick(page, fallbackSelect, o);
      await click(page, page.locator(submit).first());
      await settle(page, 1500);
      if (await found.count()) break;
    }
  }
  return found;
}

// ---------- the API behind the screen (FE = BE checks only — never to skip a step the tester does) ----------
// Keeps the latest headers of the screen's own API calls. Pass the screen's API path: other requests (menus, i18n,
// another module) may carry an Authorization without the company / division / program headers the API needs.
function trackAuth(page, apiPath = '/api/') {
  const state = { headers: null };
  page.on('request', r => {
    if (r.url().includes(apiPath) && r.headers()['authorization']) {
      state.headers = { ...r.headers() };
      delete state.headers['content-type'];
      delete state.headers['content-length'];
    }
  });
  return state;
}

// Calls the API directly (FE bypassed) with the screen's own headers; body parsed as JSON when it is JSON.
// Any status >= 400 is logged as API BODY so a failure shows what the server said.
async function api(page, auth, url, opts) {
  const r = await page.request.fetch(url, { headers: auth.headers, ...opts });
  const text = await r.text();
  let body = text;
  try { body = JSON.parse(text); } catch { }
  if (r.status() >= 400) console.log('API BODY', r.status(), text.slice(0, 1500));
  return { status: r.status(), body };
}

// The error codes of an API answer, each with its message text from `lookup(code)` (e.g. su_message via db()).
// Only codes shaped like EN00023 are looked up; anything else (exception text) is shown as is, never put into SQL.
function errorText(res, lookup = () => '') {
  const errs = res.body?.errors || res.body?.Errors || [];
  const list = Array.isArray(errs) ? errs : Object.values(errs).flat();
  return list.map(e => {
    const raw = String(e?.code || e?.message || e);
    const m = raw.match(/(?:message\.)?([A-Z]{2,4}\d{5})/);
    return m ? `${m[1]} ${lookup(m[1]) || ''} ${(e?.parameters || []).join(' ')}`.trim() : raw;
  }).join(' | ') || JSON.stringify(res.body).slice(0, 200);
}

// ---------- read-only database checks ----------
// DB_CMD: the command that runs one SQL file read-only and prints a tab-separated table (header row first),
// with {file} where the file path goes, e.g.  pgq.exe Web/appsettings.Development.json {file}
// Cast regclass / other non-text system types to ::text; some readers cannot print them.
function db(sql) {
  const file = path.join(QA_DIR, 'q.sql');
  fs.writeFileSync(file, sql);
  const [exe, ...args] = process.env.DB_CMD.match(/"[^"]+"|\S+/g).map(a => a.replace(/^"|"$/g, '').replace('{file}', file));
  const out = execFileSync(exe, args, { encoding: 'utf8', cwd: process.env.DB_CWD || process.cwd() });
  const lines = out.split(/\r?\n/).filter(l => l && !l.startsWith('###'));
  if (lines[0]?.startsWith('ERR')) throw new Error(lines[0]);
  const head = lines.shift()?.split('\t') || [];
  return lines.map(l => Object.fromEntries(l.split('\t').map((v, i) => [head[i], v])));
}

const shot = (page, name) => page.screenshot({ path: path.join(QA_DIR, 'shots', name + '.png'), fullPage: true });

module.exports = {
  attach, settle, showCursor, click, type, hover, ng, selected, options, pick, clearSelect, pickTypeahead, fieldMessage,
  dismissToasts, toasts, holdToast, gridRows, column, nextGridPage, row, checkRow, searchRow,
  trackAuth, api, errorText, db, shot,
};
