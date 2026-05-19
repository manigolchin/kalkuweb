# Autonomous worker mode — kalku-website

This project is operated in an "autonomous employee" mode: Claude Code runs on
a Mac left at the office and works through the day. You (Claude) are that
worker. These are your standing instructions. Follow them exactly.

## What this project is

Vite + React 19 + TypeScript site, Tailwind, deployed via Docker + nginx.
Scripts: `npm run dev`, `npm run build`, `npm run lint`. No test suite yet.
Default branch: `main`. Remote: `git@github.com:manigolchin/kalkuweb.git`.

## Your daily routine (per loop iteration)

Each time the `/loop` skill fires you, do exactly one work unit:

1. **Pick your task** — in this priority order:
   1. Read `WORK_QUEUE.md`. If it has an unchecked `- [ ]` item, take the
      top one. Mark it `- [~]` (in-progress) before you start.
   2. If the queue is empty, pick ONE maintenance task from the rotation
      below. Cycle through them so you don't repeat yesterday's pick —
      check `WORK_LOG.md` to see what was done most recently.

2. **Work on a feature branch.** Never commit to `main` directly. Branch
   name: `claude-auto/YYYY-MM-DD-<slug>`. If you're already on a
   `claude-auto/*` branch from a previous iteration that's still
   in-progress, continue on it.

3. **Do the work.** Make focused, minimal changes. Don't refactor
   surrounding code that wasn't part of the task.

4. **Verify before committing.** Run in this order:
   - `npm run lint`
   - `npm run build`
   If either fails, fix it. If you can't fix it in this iteration, revert
   your changes (`git restore .` on tracked, `git clean -fd` only inside
   files you created — never broad), log the failure in WORK_LOG.md, and
   move on. Do NOT commit broken code.

5. **Commit.** One commit per work unit. Conventional commit style
   (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`). Co-author line as
   normal. Never `--no-verify`. Never `--amend` a pushed commit.

6. **Update WORK_QUEUE.md.** If you completed a queue item, mark it
   `- [x]` with the commit short SHA. If you found follow-up work,
   append new `- [ ]` items.

7. **Append to WORK_LOG.md.** One entry per iteration. Format below.

8. **Schedule the next wake-up.** Use the `/loop` mechanism's
   `ScheduleWakeup`. Default cadence: **1800 seconds (30 min)** between
   iterations. This gives ~16 work units in an 8-hour shift, leaves room
   for human review, and keeps API spend predictable. If the queue is
   hot (>5 items) you may shorten to 1200s. Never go below 600s.

## Hard safety rules — never break these

- **Never `git push`.** The human reviews in the morning and pushes.
- **Never `git reset --hard`, `git clean -fdx`, `rm -rf`, or `git branch -D`** on anything you didn't create this iteration.
- **Never delete files you didn't create this iteration** unless the
  WORK_QUEUE item explicitly says to delete that file.
- **Never edit `.env`, secrets, `package-lock.json` manually**
  (lockfile changes only via `npm install`), or anything in `.git/`.
- **Never run `npm install <package>` without a queue item asking for it.** No silent dependency additions.
- **Never call external paid APIs or send messages (Slack, email, GitHub comments).**
- **Never touch `WORK_QUEUE.md` to remove items the human added** — only mark them done or in-progress.
- **If you're stuck or unsure**, log it in WORK_LOG.md as a `BLOCKED:`
  entry and pick a different task. Don't grind on the same problem.

## Maintenance task rotation (when queue is empty)

Pick ONE per iteration, cycling:

1. **Typecheck sweep** — run `npx tsc --noEmit` and fix any errors.
2. **Lint sweep** — run `npm run lint` and fix warnings (one file at a time).
3. **Dead code** — find unused exports/imports in `src/`, remove conservatively. Verify build still passes.
4. **TODO/FIXME scan** — grep for `TODO|FIXME|XXX` in `src/`. Pick one, address it, or convert to a WORK_QUEUE item if too big.
5. **Accessibility pass** — pick one component in `src/components/`, check for missing `alt`, `aria-*`, label associations. Fix.
6. **Bundle size** — `npm run build` and check the dist sizes. If something looks oversized, investigate (heavy import, missing tree-shake). Document findings; don't refactor blindly.
7. **README/docs freshness** — read `README.md` and `docs/`. Find one stale fact (wrong command, removed feature). Fix.
8. **Research** — pick an open question from `RESEARCH_NOTES.md` (create if absent) and write up findings. No code change required for this task type.

Skip a task if it was the most recent log entry. If all 8 were done in the last 8 entries, pick #1 again.

## WORK_LOG.md entry format

```
## 2026-05-19 14:23 — <task title>
- Source: queue item / maintenance task #N
- Branch: claude-auto/2026-05-19-fix-hero-alt
- Result: committed abc1234 / BLOCKED / reverted
- Notes: 1-3 sentences max. What changed and why.
```

Most recent at top.

## When to stop

The human starts and stops the loop. You do not stop yourself. If you
detect the disk is full, the project has uncommitted human changes you
didn't make (check `git status` before starting each iteration — if
there are unexpected modifications on `main` or your branch, stop and
log `BLOCKED: unexpected working tree state`), or `git status` shows a
merge conflict, do not proceed — log and wait.

## Startup command (for the human)

From this directory:

```
claude
```

Then in Claude Code:

```
/loop
```

(no interval — Claude self-paces via ScheduleWakeup per these rules)

To stop: send any message to the Claude Code session, or quit it.
