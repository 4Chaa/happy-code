// Template: copy to $QA_DIR/cases.js, write one function per test-plan case, run through the playwright skill's run.js:
//   QA_DIR=... APP_URL=... node <playwright-skill>/run.js $QA_DIR/cases.js        (START=n STOP=m for a range)
const S = process.env.SKILL_SCRIPTS; // this folder
const K = require(S + '/kit');
const Q = require(S + '/qa');
const { run } = require(S + '/runner');

Q.setTopics({
  'TC-UI-01': 'เงื่อนไขค้นหา — cascade',
  'TC-UI-09': 'ไฟล์ที่อ่านไม่ได้',
});

async function open(page, path) {
  await page.goto(process.env.APP_URL + path);
  await page.waitForLoadState('networkidle').catch(() => {});
  await K.settle(page, 1200);
}

const CASES = [
  // A message the tester must judge: intro (what will happen) -> play -> verdict (expected vs actual).
  async page => {
    const tc = 'TC-UI-09 #1';
    const file = process.env.FILES + '/07-missing-column.csv';
    const src = Q.csvSource(file, 12, 'หัวตารางไม่มี location_code');
    await open(page, '/en/enpc03');
    await Q.intro(page, tc, ['เลือกไฟล์ 07', 'กด นำเข้าข้อมูล'], ['toast error "ไม่พบคอลัมน์ location_code ในไฟล์"', 'grid ไม่เปลี่ยน'], src);
    await Q.doing(page, tc, 'นำเข้าไฟล์ 07');
    await page.locator('input[type=file]').setInputFiles(file);
    await K.dismissToasts(page);
    await page.locator('button:has(i.fa-sync-alt)').click();
    const t = await K.toasts(page);
    await K.holdToast(page);
    await Q.verdict(page, tc, [
      Q.check('toast', 'พบข้อผิดพลาด ไม่พบคอลัมน์ location_code ในไฟล์', t.join(' | ') || '(ไม่มี toast)', t.some(x => x.includes('location_code'))),
      Q.check('grid', '0 แถว', `${(await K.gridRows(page)).length} แถว`, (await K.gridRows(page)).length === 0),
    ], src);
  },
];

(async () => {
  const { page } = await K.attach();
  await run(page, CASES);
  process.exit(0);
})().catch(e => { console.log('ERROR', e.stack); process.exit(1); });
