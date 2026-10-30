// Keeps one visible Chrome open for the whole test run; case scripts attach to it over CDP.
// Env: QA_DIR (work folder: profile/, downloads/, shots/), APP_URL (first page), CDP_PORT (default 9333),
//      PW_CHANNEL (default "chrome": the installed Chrome; Playwright's own Chromium can be broken on Windows).
// Run it in the background, outside the sandbox (the sandbox may block chrome.exe), through the playwright skill's run.js.
const { chromium } = require('playwright');
const path = require('node:path');

(async () => {
  const dir = process.env.QA_DIR;
  const ctx = await chromium.launchPersistentContext(path.join(dir, 'profile'), {
    headless: false,
    channel: process.env.PW_CHANNEL || 'chrome',
    viewport: null,
    ignoreHTTPSErrors: true,
    acceptDownloads: true,
    downloadsPath: path.join(dir, 'downloads'),
    args: [`--remote-debugging-port=${process.env.CDP_PORT || 9333}`, '--start-maximized'],
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto(process.env.APP_URL);
  console.log('BROWSER READY');
  ctx.on('close', () => { console.log('BROWSER CLOSED'); process.exit(0); });
  await new Promise(() => {});
})();
