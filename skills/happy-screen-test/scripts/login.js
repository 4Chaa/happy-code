// Opens APP_URL and waits (up to 20 min) until the tester has logged in and READY_SELECTOR shows.
// The tester types the password; the script never does. Prints LOGIN NEEDED / LOGGED IN / LOGIN TIMEOUT.
// Env: APP_URL, READY_SELECTOR (an element only the logged-in screen has), CDP_PORT.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.CDP_PORT || 9333}`);
  const ctx = browser.contexts()[0];
  const page = ctx.pages().find(p => p.url().startsWith(new URL(process.env.APP_URL).origin)) || ctx.pages()[0];
  await page.goto(process.env.APP_URL).catch(() => {});
  await page.waitForTimeout(5000);
  const ready = async () => page.url().startsWith(process.env.APP_URL)
    && await page.locator(process.env.READY_SELECTOR).first().isVisible().catch(() => false);
  if (!(await ready())) console.log('LOGIN NEEDED', page.url().slice(0, 80));
  for (let i = 0; i < 400 && !(await ready()); i++) await page.waitForTimeout(3000);
  if (!(await ready())) { console.log('LOGIN TIMEOUT'); process.exit(1); }
  console.log('LOGGED IN');
  process.exit(0);
})().catch(e => { console.log('ERROR', e.message); process.exit(1); });
