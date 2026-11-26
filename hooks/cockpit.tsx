// Ticket Cockpit: a pane beside the chat showing the /happy-code task in
// .scratch/*/state.md (ticket, branch, phase, tracer-bullet tickets).
import { atom, read, update } from 'claude-code'
import type { EngineInterface, FsEntry, On } from 'claude-code'

import type { Cockpit, Row, RowState } from '../types'

const PANE = 'ticket-cockpit'
const OPEN = { id: PANE, title: 'Ticket' }
// Change the shape tag when Cockpit's fields change: a value an older version
// stored then reads as null instead of a wrong shape.
const cockpit = atom({ plugin: 'happy-code', key: 'cockpit' } as const, null, {
  shape: 'cockpit-1',
})
const STATE_FILE = /[\\/]\.scratch[\\/][^\\/]+[\\/]state\.md$/i
const ICON: Record<RowState, string> = { done: '✓', doing: '▶', todo: '·' }

const samePath = (a: string, b: string) =>
  a.replace(/\\/g, '/').toLowerCase() === b.replace(/\\/g, '/').toLowerCase()

const cut = (text: string, width: number) =>
  text.length > width ? `${text.slice(0, Math.max(1, width - 1))}…` : text

const stateOf = (status: string): RowState =>
  /^(done|✅|เสร็จ)/i.test(status) ? 'done' : /^(doing|wip|กำลัง)/i.test(status) ? 'doing' : 'todo'

// The state.md template in skills/happy-code: the lines before the first "## "
// carry Ticket: and Branch:, and "## Tickets" carries | # | ticket | สถานะ | commit |.
const parse = (text: string, path: string): Cockpit => {
  const lines = text.split(/\r?\n/)
  const firstSection = lines.findIndex(line => line.startsWith('## '))
  const head = lines.slice(0, firstSection < 0 ? lines.length : firstSection).join('\n')
  const start = lines.findIndex(line => /^##\s+Tickets/i.test(line))
  const rows: Row[] = []
  for (const line of start < 0 ? [] : lines.slice(start + 1)) {
    if (line.startsWith('## ')) break
    if (!line.trim().startsWith('|')) continue
    // ponytail: a "|" inside a cell splits it; the template's tables don't use one.
    const [no = '', title = '', status = '', commit = ''] = line
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map(cell => cell.trim())
    if (no === '#' || /^:?-+:?$/.test(no) || title === '') continue
    rows.push({ no, title, status, state: stateOf(status), commit })
  }

  return {
    path,
    title: (lines.find(line => line.startsWith('# ')) ?? '# state.md')
      .slice(2)
      .replace(/\s+[—–-]\s+state\s*$/i, '')
      .trim(),
    clickupId: /ClickUp\s+([a-z0-9]{6,})/i.exec(head)?.[1],
    ticketName: /"([^"]+)"/.exec(head)?.[1],
    branch: /\bbranch\b:?\s*`?([\w./-]+)/i.exec(head)?.[1],
    rows,
  }
}

// ponytail: state.md has no phase field, so the phase is read off the table.
// If it guesses wrong, have the template carry a "Phase:" line and read that.
const phaseOf = (rows: readonly Row[]) => {
  if (rows.length === 0) return 'grill / spec'
  if (rows.some(row => row.state !== 'done')) return 'build'
  const isWaiting = rows.some(
    row => row.status.includes('รอ') || (row.commit === '' && !/commit/i.test(row.status)),
  )

  return isWaiting ? 'รอ review / commit' : 'เสร็จ'
}

// The state.md whose Branch: is the checked-out branch, else the newest one.
async function discover($: EngineInterface) {
  const root = await $.session.root()
  const dir = `${root}/.scratch`
  const entries = await $.fs.list(dir).catch((): FsEntry[] => [])
  const files = await Promise.all(
    entries
      .filter(entry => entry.kind === 'dir')
      .map(async entry => {
        const path = `${dir}/${entry.name}/state.md`
        const stat = await $.fs.stat(path).catch(() => undefined)

        return { path, mtimeMs: stat?.mtimeMs ?? -1 }
      }),
  )
  const newest = files.filter(file => file.mtimeMs >= 0).sort((a, b) => b.mtimeMs - a.mtimeMs)
  const head = await $.fs.read(`${root}/.git/HEAD`).catch(() => '')
  const branch = /ref: refs\/heads\/(\S+)/.exec(head)?.[1]
  for (const file of branch === undefined ? [] : newest) {
    const text = await $.fs.read(file.path).catch(() => '')
    if (parse(text, file.path).branch === branch) return { path: file.path, isOnBranch: true }
  }
  const [first] = newest

  return first && { path: first.path, isOnBranch: false }
}

async function show($: EngineInterface, path: string | undefined) {
  const text = path === undefined ? undefined : await $.fs.read(path).catch(() => undefined)
  await update($, cockpit, () =>
    path === undefined || text === undefined ? null : parse(text, path),
  )
}

// session.start and turn.complete are hooked once for the plugin, in register.ts, which calls these two.
export async function startCockpit($: EngineInterface) {
  await $.command.register({
    name: 'cockpit',
    description: 'Ticket Cockpit: happy-code ticket, phase and tracer tickets from .scratch/*/state.md',
  })
  const found = await discover($).catch(() => undefined)
  await show($, found?.path).catch(() => undefined)
  if (found?.isOnBranch) await $.ui.open(OPEN).catch(() => undefined)
}

export async function endCockpitTurn($: EngineInterface) {
  const shown = await read($, cockpit)
  if (shown !== null) await show($, shown.path)
}

export function registerCockpit(on: On) {
  on('command.run', { command: 'cockpit' }, async $ => {
    const found = await discover($).catch(() => undefined)
    await show($, found?.path)
    await $.ui.open(OPEN)

    return {
      text: found ? `Ticket Cockpit: ${found.path}` : 'ไม่เจอ .scratch/*/state.md ในโปรเจกต์นี้',
      isTextDisplayOnly: true,
    }
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if ((e.tool === 'Edit' || e.tool === 'Write') && STATE_FILE.test(e.file_path)) {
      const shown = await read($, cockpit)
      await show($, e.file_path).catch(() => undefined)
      // Opens once per state.md: a pane the person closed stays closed for that file.
      if (shown === null || !samePath(shown.path, e.file_path)) {
        await $.ui.open(OPEN).catch(() => undefined)
      }
    }

    return ran
    // A failure after next(e) replays the call's settled result: the tool never runs twice.
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Link, Progress, Text } = $.ui.resolve(e)
    const shown = await read($, cockpit)
    if (shown === null) {
      return <Text dimColor>ยังไม่มี .scratch/*/state.md (happy-code สร้างตอนเริ่ม grill)</Text>
    }

    const width = Math.max(16, e.props.bodyColumns - 2)
    const done = shown.rows.filter(row => row.state === 'done').length
    const count = `${done}/${shown.rows.length}`
    const phase = phaseOf(shown.rows)
    if (e.props.placement === 'widget') {
      return <Text>{cut(`${shown.title} · ${phase} · ${count}`, width)}</Text>
    }

    const nextRow = shown.rows.find(row => row.state !== 'done')
    const say = (text: string) => () => void $.prompt.submit({ text, asUser: true })

    return (
      <Box flexDirection="column">
        <Text bold>{cut(shown.title, width)}</Text>
        {shown.clickupId !== undefined && (
          <Link
            href={`https://app.clickup.com/t/${shown.clickupId}`}
            label={cut(`ClickUp ${shown.clickupId} ${shown.ticketName ?? ''}`.trim(), width)}
          />
        )}
        {shown.branch !== undefined && <Text dimColor>{cut(shown.branch, width)}</Text>}
        <Text>ขั้น: {phase}</Text>
        {shown.rows.length > 0 && (
          <Progress label="ticket" value={done} max={shown.rows.length} valueText={count} />
        )}
        {shown.rows.map(row => (
          <Text dimColor={row.state === 'done'}>
            {cut(`${ICON[row.state]} ${row.no} ${row.title}`, width)}
          </Text>
        ))}
        <Box flexDirection="row" gap={1}>
          <Button
            key="next"
            label="ทำต่อ"
            variant={phase === 'build' ? 'primary' : 'secondary'}
            onPress={say(nextRow ? `ทำ ticket ${nextRow.no} ต่อ` : 'ต่อ')}
          />
          <Button
            key="diff"
            label="ดู diff"
            variant={phase.startsWith('รอ') ? 'primary' : 'secondary'}
            onPress={say('ขอดู diff')}
          />
          <Button key="commit" label="commit" onPress={say('commit')} />
        </Box>
      </Box>
    )
  })
}
