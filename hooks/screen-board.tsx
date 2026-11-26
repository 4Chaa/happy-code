// Screen-Test Board: a pane with every case of the screen test plan and its latest verdict, for after a
// round and while fixing. Cases come from docs/test-plans/TEST-PLAN-*.md, verdicts from the file qa.js
// appends to: <scratchpad>/screen-test/user-verdicts.jsonl (QA_DIR in skills/happy-screen-test).
import { atom, read, update } from 'claude-code'
import type { EngineInterface, FsEntry, On } from 'claude-code'

import type { Board, BoardCase, CaseState, Check } from '../types'

const PANE = 'screen-board'
const OPEN = { id: PANE, title: 'Screen test' }
// Change the shape tag when Board's fields change: an older stored value then reads as null.
const board = atom({ plugin: 'happy-code', key: 'board' } as const, null, { shape: 'board-1' })
const ICON: Record<CaseState, string> = { pass: '✓', override: '⚠', fail: '✗', replay: '↻', pending: '·' }

type Verdict = { tc: string; action: string; note?: string; checks?: Check[] }

const cut = (text: string, width: number) =>
  text.length > width ? `${text.slice(0, Math.max(1, width - 1))}…` : text

const cellsOf = (line: string) =>
  line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim())

// The latest line of each case wins: a rerun replaces the verdict before it.
const verdictsOf = (text: string) => {
  const latest = new Map<string, Verdict>()
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '') continue
    try {
      const verdict = JSON.parse(line) as Verdict
      if (typeof verdict.tc === 'string') latest.set(verdict.tc, verdict)
    } catch {
      // ponytail: a line still being written is skipped; the next read has it whole.
    }
  }

  return latest
}

// The summary table of the plan: the first table whose header has a เคส column.
const casesOf = (text: string) => {
  const lines = text.split(/\r?\n/)
  const start = lines.findIndex(line => line.trim().startsWith('|') && cellsOf(line).includes('เคส'))
  if (start < 0) return []
  const head = cellsOf(lines[start] ?? '')
  const tcAt = head.indexOf('เคส')
  const topicAt = head.indexOf('เรื่อง')
  const cases: { tc: string; topic: string }[] = []
  for (const line of lines.slice(start + 1)) {
    if (!line.trim().startsWith('|')) break
    const cells = cellsOf(line)
    // A merged row reads "TC-UI-07 (+08)": the code is its first word.
    const tc = (cells[tcAt] ?? '').split(/[\s(,+]/)[0] ?? ''
    // Rows without a TC code (a PREP step, the separator) are no cases: qa.js gives verdicts to TC codes.
    if (!/^TC/i.test(tc)) continue
    cases.push({ tc, topic: topicAt < 0 ? '' : (cells[topicAt] ?? '') })
  }

  return cases
}

const stateOf = (verdict: Verdict | undefined): CaseState => {
  if (verdict === undefined) return 'pending'
  if (verdict.action === 'fail') return 'fail'
  if (verdict.action === 'next') return (verdict.checks ?? []).some(c => !c.ok) ? 'override' : 'pass'

  return 'replay'
}

const isBad = (one: BoardCase) => one.state === 'fail' || one.state === 'override'
const isOpenCase = (one: BoardCase) => one.state === 'pending' || one.state === 'replay'
const isRoundDone = (shown: Board | null) =>
  shown !== null && shown.cases.length > 0 && !shown.cases.some(isOpenCase)

// The plan holding the most of the run's case codes; with no verdicts yet, the newest plan.
async function pickPlan($: EngineInterface, verdicts: Map<string, Verdict>) {
  const dir = `${await $.session.root()}/docs/test-plans`
  const entries = await $.fs.list(dir).catch((): FsEntry[] => [])
  const plans = await Promise.all(
    entries
      .filter(entry => entry.kind === 'file' && /^TEST-PLAN-.*\.md$/i.test(entry.name))
      .map(async entry => ({
        name: entry.name.replace(/\.md$/i, ''),
        mtimeMs: entry.mtimeMs,
        cases: casesOf(await $.fs.read(`${dir}/${entry.name}`).catch(() => '')),
      })),
  )
  const score = (plan: (typeof plans)[number]) => plan.cases.filter(one => verdicts.has(one.tc)).length
  const [best] = plans.sort((a, b) => score(b) - score(a) || b.mtimeMs - a.mtimeMs)

  return best
}

const caseOf = (tc: string, topic: string, verdict: Verdict | undefined): BoardCase => ({
  tc,
  topic,
  state: stateOf(verdict),
  note: verdict?.note ?? '',
  failed: (verdict?.checks ?? [])
    .filter(c => !c.ok)
    .map(c => ({ label: String(c.label), want: String(c.want), detail: String(c.detail), ok: false })),
})

// Reads the verdicts again when the file changed (or when forced). Answers whether the pane should
// open by itself: the round just ended, or a case newly went red.
async function refresh($: EngineInterface, isForced: boolean) {
  const { scratchpadDir } = await $.session.info()
  if (scratchpadDir === undefined) return false
  const file = `${scratchpadDir}/screen-test/user-verdicts.jsonl`
  const stat = await $.fs.stat(file).catch(() => undefined)
  const before = await read($, board)
  if (!isForced && (stat === undefined || stat.mtimeMs === before?.verdictsMtime)) return false

  const verdicts = verdictsOf(stat === undefined ? '' : await $.fs.read(file).catch(() => ''))
  const plan = await pickPlan($, verdicts)
  const planned = (plan?.cases ?? []).map(one => caseOf(one.tc, one.topic, verdicts.get(one.tc)))
  // A verdict for a code the plan does not list still shows, after the planned cases.
  const extra = [...verdicts.values()]
    .filter(verdict => !planned.some(one => one.tc === verdict.tc))
    .map(verdict => caseOf(verdict.tc, '', verdict))
  const shown: Board = {
    planName: plan?.name ?? 'Screen test',
    cases: [...planned, ...extra],
    verdictsMtime: stat?.mtimeMs ?? 0,
  }
  await update($, board, () => shown)
  const isNewlyRed = shown.cases.some(
    one => isBad(one) && !before?.cases.some(old => old.tc === one.tc && old.state === one.state),
  )

  return (isRoundDone(shown) && !isRoundDone(before)) || isNewlyRed
}

const fixText = (one: BoardCase) => {
  const [check] = one.failed
  const why = one.note || (check ? `${check.label}: ต้องได้ ${check.want} · ได้ ${check.detail}` : '')

  return `แก้เคส ${one.tc} ที่ไม่ผ่าน${why ? `: ${why}` : ''}`
}

// session.start and turn.complete are hooked once for the plugin, in register.ts, which calls these two.
export async function startScreenBoard($: EngineInterface) {
  await $.command.register({
    name: 'screen-board',
    description: 'Screen-Test Board: every case of the screen test plan with its latest verdict',
  })
}

export async function endScreenBoardTurn($: EngineInterface) {
  if (await refresh($, false)) await $.ui.open(OPEN)
}

export function registerScreenBoard(on: On) {
  on('command.run', { command: 'screen-board' }, async $ => {
    await refresh($, true)
    await $.ui.open(OPEN)
    const shown = await read($, board)

    return {
      text: shown?.cases.length ? `Screen-Test Board: ${shown.planName}` : 'ยังไม่มีผลเทสจอใน session นี้',
      isTextDisplayOnly: true,
    }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const shown = await read($, board)
    if (shown === null || shown.cases.length === 0) {
      return <Text dimColor>ยังไม่มีผลเทสจอใน session นี้ (screen-test/user-verdicts.jsonl)</Text>
    }

    const width = Math.max(16, e.props.bodyColumns - 2)
    const count = (state: CaseState) => shown.cases.filter(one => one.state === state).length
    const summary = `ผ่าน ${count('pass')} · ไม่ผ่าน ${count('fail')} · override ${count('override')} · ยังไม่เล่น ${count('pending') + count('replay')}`
    if (e.props.placement === 'widget') {
      return <Text>{cut(`${shown.planName}: ${summary}`, width)}</Text>
    }

    const bad = shown.cases.filter(isBad)
    const resumeAt = shown.cases.find(one => one.state === 'pending')
    const say = (text: string) => () => void $.prompt.submit({ text, asUser: true })

    return (
      <Box flexDirection="column">
        <Text bold>{cut(shown.planName, width)}</Text>
        <Text>{summary}</Text>
        {shown.cases.map(one => (
          <Box flexDirection="column">
            <Box flexDirection="row" gap={1}>
              <Text dimColor={one.state === 'pass'}>
                {cut(`${ICON[one.state]} ${one.tc} ${one.topic}`.trim(), isBad(one) ? width - 8 : width)}
              </Text>
              {isBad(one) && <Button key={`fix-${one.tc}`} label="แก้" onPress={say(fixText(one))} />}
            </Box>
            {one.failed.map(check => (
              <Text color="error">{`    ✗ ${check.label}: ต้องได้ ${check.want} · ได้ ${check.detail}`}</Text>
            ))}
            {one.note !== '' && <Text dimColor>{`    หมายเหตุ: ${one.note}`}</Text>}
          </Box>
        ))}
        <Box flexDirection="row" gap={1}>
          {bad.length > 0 && (
            <Button
              key="replay-bad"
              label="เล่นซ้ำเคสที่ไม่ผ่าน"
              variant="primary"
              onPress={say(`เล่นจอซ้ำเฉพาะเคสที่ไม่ผ่าน: ${bad.map(one => one.tc).join(', ')}`)}
            />
          )}
          {resumeAt !== undefined && (
            <Button
              key="resume"
              label={`เล่นต่อจาก ${resumeAt.tc}`}
              onPress={say(`เล่นจอต่อจาก ${resumeAt.tc}`)}
            />
          )}
        </Box>
      </Box>
    )
  })
}
