import { expect, test } from 'claude-code/testing'

const PLAN = [
  '# Test plan — EXRT03',
  '',
  '| # | เคส | เรื่อง | ข้อมูลทดสอบ | ผลที่ถูกต้อง (ย่อ) | คนตรวจ | script ตรวจ |',
  '|---|---|---|---|---|---|---|',
  '| 1 | TC-UI-01 | หน้าค้นหา: ค่าเริ่มต้น | — | ปี 2569 | dropdown | ค่า default |',
  '| 2 | TC-UI-03 | dropdown ศูนย์เฉพาะที่มีสิทธิ์ | ผู้ใช้ทดสอบ | 3 ศูนย์ | dropdown | จำนวน |',
  '| 3 | TC-UI-05 | ปุ่มบันทึก | — | toast เขียว | toast | — |',
  '| 4 | TC-UI-09 (+10) | ลบข้อมูล | — | หายจาก grid | grid | จำนวนแถว |',
  '',
  '| key | ค่า | ค่า | ใช้ในเคส |',
  '|---|---|---|---|',
  '| a | b | c | TC-UI-01 |',
].join('\n')

const VERDICTS = [
  { tc: 'TC-UI-01', action: 'next', note: '', checks: [{ label: 'ปี', want: '2569', detail: '2569', ok: true }] },
  { tc: 'TC-UI-03', action: 'next', note: '', checks: [{ label: 'จำนวนตัวเลือก', want: '3', detail: '5', ok: false }] },
  { tc: 'TC-UI-03', action: 'fail', note: 'ศูนย์ 02 ไม่ควรเห็น', checks: [{ label: 'จำนวนตัวเลือก', want: '3', detail: '5', ok: false }] },
  { tc: 'TC-UI-05', action: 'next', note: '', checks: [{ label: 'สี toast', want: 'เขียว', detail: 'แดง', ok: false }] },
]
  .map(verdict => JSON.stringify(verdict))
  .join('\n')

const PANE = {
  plugin: 'happy-code',
  component: 'Pane',
  requestId: 'screen-board',
  props: {
    title: 'Screen test',
    isFocused: false,
    bodyColumns: 70,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

const TURN = { answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as const

test('a red case opens the board once; its rows and buttons ask for the fix and the reruns', async ($, on) => {
  const opened: string[] = []
  const sent: string[] = []
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', (_, e) => {
    opened.push(e.id)

    return { value: { isPlaced: true } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: 'C:/repo' }))
  on('session.info', () => ({ value: { transcriptPath: '', scratchpadDir: 'C:/sp' } }))
  on('fs.stat', () => ({ value: { kind: 'file', size: 1, mtimeMs: 5, isLink: false } }))
  on('fs.list', (_, e) => ({
    value: e.path.endsWith('test-plans')
      ? [{ name: 'TEST-PLAN-EXRT03-CombinedExam.md', kind: 'file', size: 1, mtimeMs: 1, isLink: false }]
      : [],
  }))
  on('fs.read', (_, e) => ({
    value: e.path.endsWith('.jsonl') ? VERDICTS : e.path.endsWith('.md') ? PLAN : '',
  }))
  on('prompt.submit', (_, e) => {
    sent.push(e.text)

    return { text: e.text }
  })
  on('turn.complete', () => ({ text: '' }))

  await $.session.start({ cwd: 'C:/repo', surface: 'desktop', isInteractive: true })
  await $.turn.complete(TURN)
  await $.turn.complete({ ...TURN, turnId: 't2' })
  expect(opened).toEqual(['screen-board'])

  for (const surface of ['terminal', 'desktop'] as const) {
    sent.length = 0
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /^ผ่าน/ }))?.text).toBe(
      'ผ่าน 1 · ไม่ผ่าน 1 · override 1 · ยังไม่เล่น 1',
    )
    expect((await ui.find({ type: 'Text', text: /TC-UI-03/ }))?.text).toBe(
      '✗ TC-UI-03 dropdown ศูนย์เฉพาะที่มีสิทธิ์',
    )
    expect((await ui.find({ type: 'Text', text: /ต้องได้ 3/ }))?.text).toBe(
      '    ✗ จำนวนตัวเลือก: ต้องได้ 3 · ได้ 5',
    )
    expect((await ui.find({ type: 'Text', text: /TC-UI-09/ }))?.text).toBe('· TC-UI-09 ลบข้อมูล')
    await ui.press({ key: 'fix-TC-UI-03' })
    await ui.press({ key: 'fix-TC-UI-05' })
    await ui.press({ key: 'replay-bad' })
    await ui.press({ key: 'resume' })
    await ui.unmount()
    expect(sent).toEqual([
      'แก้เคส TC-UI-03 ที่ไม่ผ่าน: ศูนย์ 02 ไม่ควรเห็น',
      'แก้เคส TC-UI-05 ที่ไม่ผ่าน: สี toast: ต้องได้ เขียว · ได้ แดง',
      'เล่นจอซ้ำเฉพาะเคสที่ไม่ผ่าน: TC-UI-03, TC-UI-05',
      'เล่นจอต่อจาก TC-UI-09',
    ])
  }
})
