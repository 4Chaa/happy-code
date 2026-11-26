# happy-code

A guided, Thai-speaking development pipeline for Claude Code, plus two ticket skills, a screen-test skill and a Ticket Cockpit pane.

## Install

```bash
claude plugin marketplace add 4Chaa/happy-code
claude plugin install happy-code@4chaa
```

> **Before installing:** if you already have a standalone copy at `~/.claude/skills/happy-code/`,
> remove it first — two skills named `happy-code` collide.

## Skills

| Skill | What it does |
|---|---|
| `/happy-code` | Runs one development task end-to-end, solo (no subagents): a picture of how the system works now → grill (1A/1B question blocks, ★ recommended, an example result for every choice) → spec → tracer-bullet tickets → impact analysis drawn as a flow diagram + test case matrix (paths, data states, on-screen data FE vs BE) → confirm gate → laziest working implementation (ponytail) → two-stage self-review → test cases via tdd → atomic commit → keep the branch as-is. Replies in Thai. |
| `/to-ticket` | Creates a ClickUp task or subtask from any content (email, chat, screenshot, work notes) — asks for the List, task level, parent and extra fields first, and copies the naming pattern from that List's existing tasks. |
| `/pick-ticket` | Takes a ticket id or URL — a ClickUp task, a GitHub issue, or anything else you can reach or paste in — reads it in full with its metadata and comments, confirms the brief with you, creates a fresh branch (asks for the base and name, suggests a name from the ticket if you leave it blank), then hands it to `/happy-code` to implement. |
| `/happy-screen-test` | Plays a manual UI test plan on a visible Chrome (Playwright over CDP; you log in yourself). No plan yet → it writes one first from the bundled template and shows the cases as a summary table for your approval. Before each case an on-screen panel names the case, its steps, what is correct and the source data (CSV table or request); after it, a table of what is correct vs what the system did, with buttons next / not correct (your note comes back to Claude) / redo / back. Pauses only where a person must judge the on-screen text; checks multi-tab behaviour and, when the FE=BE option is on, that FE and BE give the same message. `/happy-code` offers it (asks first) when a task touches the UI. |

`/to-ticket` needs a connected ClickUp MCP server. `/pick-ticket` uses whatever it can reach —
a ClickUp or GitHub MCP server, the `gh` CLI, a public issue page, or content you paste in.

## Ticket Cockpit

A pane beside the chat for the `/happy-code` task in progress, read from `.scratch/*/state.md`: the ClickUp
ticket as a link, the branch, the phase (grill / spec, build, waiting for review / commit, done), a progress
bar and the tracer-bullet tickets (✓ done, ▶ doing, · todo). Its buttons send `ทำ ticket NN ต่อ`, `ขอดู diff`
and `commit` for you.

It opens by itself when a session starts on the branch a `state.md` names, and when `/happy-code` writes a new
`state.md`; `/cockpit` opens it any time. It refreshes after each edit of `state.md` and at the end of each turn.

## Screen-Test Board

A pane for after a `/happy-screen-test` round and while fixing: every case of the test plan
(`docs/test-plans/TEST-PLAN-*.md`) with its latest verdict from `<scratchpad>/screen-test/user-verdicts.jsonl` —
✓ passed, ✗ not correct, ⚠ passed over a failed check, ↻ replaying, · not played — and, under a red case, each failed
check (wanted vs got) and the tester's note. Buttons ask Claude to fix a case, to replay the red cases, or to play on
from the first case not played. It opens by itself when a round ends or a case newly goes red; `/screen-board` opens
it any time.

## Reply style

Every session gets happy-code's reply rules as one section of the system prompt (a `prompt.compose` hook):
Thai replies, an ADHD-friendly shape (next action first, numbered steps, a closing "ต่อไปทำอะไร" line), small show-me
views (pseudocode, call tree, file tree, Mermaid, `diff`), and questions with choices as 1A/1B blocks — ★ the
recommended option first, ⛔ the message the user would see, ✅ pros, ⚠️ cons — answered with a "ใช้ค่าแนะนำ" button or
typed codes such as `1A 2B`. Turn it off with the plugin option `thaiStyle` (`/config`, or
`pluginConfigs["happy-code@4chaa"].options.thaiStyle = false` in settings).

## Requirements

`/happy-code` invokes skills it does not bundle. Without them the pipeline runs degraded:

- plugins: [`mattpocock-skills`](https://github.com/mattpocock/skills) (`grill-with-docs`, `to-spec`, `to-tickets`, `tdd`), [`ponytail`](https://github.com/DietrichGebert/ponytail), `diagram-design` (pictures of the current system, impact diagrams; falls back to Mermaid in chat)
- skills: `finishing-a-development-branch` (`caveman` optional: shorter replies that keep the reply shape)

`/happy-screen-test` needs the `playwright-skill` plugin (its `run.js` gives the bundled scripts Playwright) and
Google Chrome installed; its scripts live in `skills/happy-screen-test/scripts/`.

`to-spec` and `to-tickets` are `disable-model-invocation`, so the Skill tool can't load them.
At step 2b/2c `/happy-code` reads their `SKILL.md` straight from the plugin cache
(`~/.claude/plugins/cache/*/mattpocock-skills/`) and follows it — no need to type them yourself.

## License

MIT
