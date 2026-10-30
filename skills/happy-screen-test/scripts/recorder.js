// Records, per tab, every toast and every progress-bar value with a timestamp, so a multi-tab case can say afterwards
// which tab showed what and when. Inject after the tab's last navigation: a page load wipes it.
// The CDP tab order is not stable — tell tabs apart by rec.t0 (when each recorder started), not by index.
const RECORDER = `(() => {
  if (window.__qaRec) return;
  window.__qaRec = { toasts: [], progress: [], t0: Date.now() };
  const seen = new WeakSet();
  new MutationObserver(() => {
    document.querySelectorAll(window.__qaToastSelector || '.toast-container .ngx-toastr').forEach(t => {
      if (!seen.has(t)) { seen.add(t); window.__qaRec.toasts.push({ at: Date.now(), text: t.innerText.replace(/\\s+/g, ' ').trim() }); }
    });
    const bar = document.querySelector(window.__qaProgressSelector || '.progress-bar');
    const v = bar ? bar.innerText.trim() : '-';
    const p = window.__qaRec.progress;
    if (!p.length || p[p.length - 1].v !== v) p.push({ at: Date.now(), v });
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
})()`;

const start = page => page.evaluate(RECORDER);
const read = page => page.evaluate(() => window.__qaRec);
const timeline = rec => rec.progress.map(p => `${((p.at - rec.t0) / 1000).toFixed(0)}s:${p.v}`).join(' ');

module.exports = { start, read, timeline };
