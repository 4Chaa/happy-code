// Helpers for an Angular SPA built on ng-select (<select-input formControlName>), ngx-datatable and ngx-toastr.
// Other widget libraries: keep the shape, change the selectors.
const { chromium } = require('playwright');
const path = require('node:path');

const QA_DIR = process.env.QA_DIR;
const TOAST = '.toast-container .ngx-toastr';

async function attach() {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.CDP_PORT || 9333}`);
  const ctx = browser.contexts()[0];
  const origin = new URL(process.env.APP_URL).origin;
  const page = ctx.pages().find(p => p.url().startsWith(origin)) || ctx.pages()[0];
  await page.bringToFront();
  return { browser, ctx, page };
}

const settle = (page, ms = 600) => page.waitForTimeout(ms);

// ---------- ng-select by formControlName ----------
const ng = (page, name) => page.locator(`select-input[formcontrolname="${name}"] ng-select`);

async function selected(page, name) {
  const v = ng(page, name).locator('.ng-value-label');
  return (await v.count()) ? (await v.first().innerText()).trim() : null;
}

async function options(page, name) {
  await ng(page, name).locator('.ng-select-container').click();
  const panel = page.locator('.ng-dropdown-panel');
  await panel.waitFor();
  const texts = (await panel.locator('.ng-option').allInnerTexts()).map(t => t.trim());
  await page.keyboard.press('Escape');
  return texts;
}

// Picks the option containing `text`, then waits for the cascade request it starts.
async function pick(page, name, text) {
  await ng(page, name).locator('.ng-select-container').click();
  const option = page.locator('.ng-dropdown-panel .ng-option').filter({ hasText: text }).first();
  await option.waitFor();
  await option.click();
  await settle(page, 900);
}

async function clearSelect(page, name) {
  const clear = ng(page, name).locator('.ng-clear-wrapper');
  if (await clear.count()) await clear.click();
  await settle(page);
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
  if (await first.count()) await first.hover().catch(() => {});
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
  await next.click();
  await settle(page, 500);
  return true;
}

// ---------- the API behind the screen ----------
// Keeps the latest Authorization the screen sent: access tokens are short-lived and the SPA renews them silently.
function trackAuth(page) {
  const state = { headers: null };
  page.on('request', r => {
    if (r.headers()['authorization']) {
      state.headers = { ...r.headers() };
      delete state.headers['content-type'];
      delete state.headers['content-length'];
    }
  });
  return state;
}

// Calls the API directly (FE bypassed) with the screen's own token; body parsed as JSON when it is JSON.
async function api(page, auth, url, opts) {
  const r = await page.request.fetch(url, { headers: auth.headers, ...opts });
  const text = await r.text();
  let body = text;
  try { body = JSON.parse(text); } catch { }
  return { status: r.status(), body };
}

const shot = (page, name) => page.screenshot({ path: path.join(QA_DIR, 'shots', name + '.png'), fullPage: true });

module.exports = {
  attach, settle, ng, selected, options, pick, clearSelect, fieldMessage,
  dismissToasts, toasts, holdToast, gridRows, column, nextGridPage, trackAuth, api, shot,
};
