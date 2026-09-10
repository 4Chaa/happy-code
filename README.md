# happy-code

A guided, Thai-speaking development pipeline for Claude Code, plus two ClickUp ticket skills.

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
| `/happy-code` | Runs one development task end-to-end, solo (no subagents): adhd+caveman output style → grill → spec → tracer-bullet tickets → impact analysis → confirm gate → laziest working implementation (ponytail) → two-stage self-review → test cases via tdd → atomic commit → keep the branch as-is. Replies in Thai. |
| `/to-ticket` | Creates a ClickUp task or subtask from any content (email, chat, screenshot, work notes) — asks for the List, task level, parent and extra fields first, and copies the naming pattern from that List's existing tasks. |
| `/pick-ticket` | Takes a ClickUp task id or URL, reads the task with its custom fields, subtasks and comments, confirms the brief with you, then hands it to `/happy-code` to implement. |

`/to-ticket` and `/pick-ticket` need a connected ClickUp MCP server.

## Requirements

`/happy-code` invokes skills it does not bundle. Without them the pipeline runs degraded:

- plugins: [`mattpocock-skills`](https://github.com/mattpocock/skills) (`grill-with-docs`, `to-spec`, `to-tickets`, `tdd`), [`ponytail`](https://github.com/DietrichGebert/ponytail), `i-have-adhd`
- skills: `caveman`, `finishing-a-development-branch`

`to-spec` and `to-tickets` are `disable-model-invocation` — you run them yourself when the
pipeline reaches step 2b/2c.

## License

MIT
