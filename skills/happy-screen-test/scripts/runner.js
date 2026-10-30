// Plays the cases in order. Each case is async (page) => { Q.intro(...); Q.doing(...); ...; Q.verdict(...) }.
// START / STOP (1-based, env) pick a range. The panel's ◀ ย้อน reruns the previous case (with its intro),
// ↻ ทำซ้ำ reruns this one (no intro), ข้าม skips it. Prints CASE n / RUN DONE; a crash prints ERROR <stack>.
const Q = require('./qa');

async function run(page, cases) {
  let i = Number(process.env.START || 1) - 1;
  const last = Math.min(Number(process.env.STOP || cases.length), cases.length) - 1;
  while (i <= last) {
    try {
      console.log('CASE', i + 1);
      await cases[i](page);
      i++;
    } catch (e) {
      if (!(e instanceof Q.Jump)) throw e;
      if (e.to === 'back') i = Math.max(0, i - 1);
      if (e.to === 'skip') i++;
    }
  }
  console.log('RUN DONE');
}

module.exports = { run };
