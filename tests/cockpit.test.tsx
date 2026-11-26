import { expect, test } from 'claude-code/testing'

const STATE = [
  '# EXRT03 log BE validation — state',
  '',
  'Ticket: ClickUp z8znm1wfdk "CRA Fix Log EXRT03 #ai" (parent z8znm13e75)',
  'Branch: feature/EXRT03-log-be-validation จาก origin/develop ed50809a2',
  '',
  '## Tickets',
  '| # | ticket | สถานะ | commit |',
  '|---|---|---|---|',
  '| 01 | กติกากลุ่มเข้า validator | done (รอ review) · green 38/38 | |',
  '| 02 | typeahead วิชาร่วม | doing | |',
  '| 03 | ขอบเขต 4 ช่อง active | todo | |',
  '',
  '- 2026-11-25 note under the table',
  '',
  '## Decisions',
  '| 99 | not a ticket | done | |',
].join('\n')

const PANE = {
  plugin: 'happy-code',
  component: 'Pane',
  requestId: 'ticket-cockpit',
  props: {
    title: 'Ticket',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

test('state.md of the checked-out branch opens the pane; ทำต่อ asks for the next ticket', async ($, on) => {
  const opened: string[] = []
  const sent: string[] = []
  on('command.register', () => ({ value: { command: 'cockpit' } }))
  on('ui.open', (_, e) => {
    opened.push(e.id)

    return { value: { isPlaced: true } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: 'C:/repo' }))
  on('fs.list', () => ({
    value: [{ name: 'exrt03', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }],
  }))
  on('fs.stat', () => ({ value: { kind: 'file', size: 1, mtimeMs: 1, isLink: false } }))
  on('fs.read', (_, e) => ({
    value: e.path.endsWith('HEAD') ? 'ref: refs/heads/feature/EXRT03-log-be-validation\n' : STATE,
  }))
  on('prompt.submit', (_, e) => {
    sent.push(e.text)

    return { text: e.text }
  })

  await $.session.start({ cwd: 'C:/repo', surface: 'desktop', isInteractive: true })
  expect(opened).toEqual(['ticket-cockpit'])

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /ขั้น/ }))?.text).toBe('ขั้น: build')
    expect((await ui.find({ type: 'Text', text: /02/ }))?.text).toBe('▶ 02 typeahead วิชาร่วม')
    expect(await ui.find({ type: 'Text', text: /not a ticket/ })).toBe(undefined)
    await ui.press({ key: 'next' })
    await ui.unmount()
  }
  expect(sent).toEqual(['ทำ ticket 02 ต่อ', 'ทำ ticket 02 ต่อ'])
})
