# happy-code

A guided, Thai-speaking development pipeline for Claude Code, plus two ticket skills and a screen-test skill.

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
| `/happy-code` | Runs one development task end-to-end, solo (no subagents): adhd+caveman output style → grill (every choice shown with an example result) → spec → tracer-bullet tickets → impact analysis drawn as a flow diagram → confirm gate → laziest working implementation (ponytail) → two-stage self-review → test cases via tdd → atomic commit → keep the branch as-is. Replies in Thai. |
| `/to-ticket` | Creates a ClickUp task or subtask from any content (email, chat, screenshot, work notes) — asks for the List, task level, parent and extra fields first, and copies the naming pattern from that List's existing tasks. |
| `/pick-ticket` | Takes a ticket id or URL — a ClickUp task, a GitHub issue, or anything else you can reach or paste in — reads it in full with its metadata and comments, confirms the brief with you, creates a fresh branch (asks for the base and name, suggests a name from the ticket if you leave it blank), then hands it to `/happy-code` to implement. |
| `/happy-screen-test` | Plays a manual UI test plan on a visible Chrome (Playwright over CDP; you log in yourself). No plan yet → it writes one first from the bundled template and shows the cases as a summary table for your approval. Before each case an on-screen panel names the case, its steps, what is correct and the source data (CSV table or request); after it, a table of what is correct vs what the system did, with buttons next / not correct (your note comes back to Claude) / redo / back. Pauses only where a person must judge the on-screen text; checks multi-tab behaviour and, when the FE=BE option is on, that FE and BE give the same message. `/happy-code` offers it (asks first) when a task touches the UI. |

`/to-ticket` needs a connected ClickUp MCP server. `/pick-ticket` uses whatever it can reach —
a ClickUp or GitHub MCP server, the `gh` CLI, a public issue page, or content you paste in.

## Requirements

`/happy-code` invokes skills it does not bundle. Without them the pipeline runs degraded:

- plugins: [`mattpocock-skills`](https://github.com/mattpocock/skills) (`grill-with-docs`, `to-spec`, `to-tickets`, `tdd`), [`ponytail`](https://github.com/DietrichGebert/ponytail), `i-have-adhd`, `diagram-design` (flow diagrams; falls back to Mermaid in chat)
- skills: `caveman`, `finishing-a-development-branch`

`/happy-screen-test` needs the `playwright-skill` plugin (its `run.js` gives the bundled scripts Playwright) and
Google Chrome installed; its scripts live in `skills/happy-screen-test/scripts/`.

`to-spec` and `to-tickets` are `disable-model-invocation`, so the Skill tool can't load them.
At step 2b/2c `/happy-code` reads their `SKILL.md` straight from the plugin cache
(`~/.claude/plugins/cache/*/mattpocock-skills/`) and follows it — no need to type them yourself.

## License

MIT
