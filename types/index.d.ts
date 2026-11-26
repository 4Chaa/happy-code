export type RowState = 'done' | 'doing' | 'todo'

/** One row of state.md's "## Tickets" table. */
export type Row = {
  no: string
  title: string
  status: string
  state: RowState
  commit: string
}

/** What the Ticket Cockpit pane draws: one parsed state.md. */
export type Cockpit = {
  path: string
  title: string
  clickupId?: string
  ticketName?: string
  branch?: string
  rows: Row[]
}

/** One check of a screen-test verdict, as qa.js writes it. */
export type Check = { label: string; want: string; detail: string; ok: boolean }

/** pass: next, all checks ok · override: next over a failed check · fail: ไม่ถูกต้อง · replay: ทำซ้ำ / ย้อน · pending: no verdict. */
export type CaseState = 'pass' | 'override' | 'fail' | 'replay' | 'pending'

/** One case of the test plan with its latest verdict. */
export type BoardCase = {
  tc: string
  topic: string
  state: CaseState
  note: string
  failed: Check[]
}

/** What the Screen-Test Board pane draws. */
export type Board = {
  planName: string
  cases: BoardCase[]
  verdictsMtime: number
}

declare module 'claude-code' {
  interface PluginState {
    'happy-code': {
      cockpit: Shaped<Cockpit | null>
      board: Shaped<Board | null>
    }
  }
}
