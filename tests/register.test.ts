import { expect, test } from 'claude-code/testing'

// The desktop app can load the module after session.start (a synced plugin, a hot reload):
// the end of a turn still declares both slash commands.
test('the end of a main turn registers /cockpit and /screen-board', async ($, on) => {
  const registered: string[] = []
  on('command.register', (_, e) => {
    registered.push(e.name)

    return { value: { command: e.name } }
  })
  on('turn.complete', () => ({ text: '' }))
  const before = registered.length
  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })

  expect(registered.slice(before).sort()).toEqual(['cockpit', 'screen-board'])
})
