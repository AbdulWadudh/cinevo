#!/usr/bin/env node

/**
 * agent-kit.mjs — the template's only executable surface.
 *
 * Zero dependencies. Runs on Bun or Node >= 18. Uses node: builtins only, so
 * `bun .agent-kit/agent-kit.mjs <cmd>` and `node .agent-kit/agent-kit.mjs <cmd>` are
 * the same program.
 *
 * Commands
 *   setup [target] [--source <path|url>]   scaffold a repo; never overwrites an authored file
 *          [--ref <tag>]                  install that release tag; default is the newest tag
 *          [--no-rtk]                     skip the install only; rtk is still a prerequisite gate
 *          [--ids local|issue]            who allocates task ids: this repo, or the issue number
 *   check [--json] [--ref <tag>]           drift table vs the template; never writes
 *   pull [--dry-run|--force|--seeds]       apply the sync, then doctor
 *        [--ref <tag>]                     move the install to that release tag
 *   doctor [--strict] [--fix] [--json]     truth checks over the repo's own docs
 *   start                                  session brief: task, gate, evidence, next; never writes
 *   verify [--full|--baseline]             run the always-tier commands; --full adds milestone rows
 *   harnesses                              list the coding agents on this machine (HOME, PATH, repo)
 *   task new <slug> [--lane quick|planned] open a task and record the baseline run
 *            [--parent TASK-N]             ... as TASK-N.M, closing on the quick suite
 *            [--from <issue>]              ... from an existing issue, whose number is the id
 *   task show [--id TASK-N]                the active task's scope, plan, evidence and staleness
 *   task block "<question>"                stop at an impasse; the owner's question waits on disk
 *   task resume                            continue a blocked task
 *   task close [--amend "<why>"] [--pr]    quick for a subtask, full suite + archive for the main
 *              [--sync]                   ... and close the task's issue with the final record
 *   task publish [--id TASK-N]             send the task file to its issue (ids: issue only)
 *   task renumber <TASK-N> <TASK-M>|--next change a local id and its references (--file: which one)
 *   task guard [--message <file>]          hook gate: scope (pre-commit), message (commit-msg)
 *   learnings archive                      move entries past the 30 cap into .agent-kit/learnings/
 *   release <version>                      write .agent-kit/releases/vX.Y.Z.md from the unclaimed change files
 *   selftest                               prove every gate can fail, in a temp repo
 *
 * Design rule: one canonical home per fact. Commands live in .agent-kit/project.md
 * only; this file cites them, never restates them.
 */

import { main } from "./lib/main.mjs";

process.exitCode = await main(process.argv);
