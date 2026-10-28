/** consts.mjs — paths, literals and limits shared by every module */
import path from "node:path";
import { fileURLToPath } from "node:url";

// This module sits one level under .agent-kit/, so the repo root is two levels up.
export const SCRIPT_ROOT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);
export const MANIFEST = ".agent-kit/sync-manifest.json";
export const STATE = ".agent-kit/template.json";
export const PROJECT = ".agent-kit/project.md";
export const TASKS = ".agent-kit/tasks";
export const TASK_INDEX = `${TASKS}/INDEX.md`;
export const TASK_TEMPLATE = ".agent-kit/templates/task.md";
export const LOG_DIR = ".agent-kit/logs";

// A change is one file, filed under the month it landed in:
// `logs/MM-YYYY/YYYY-MM-DD-TASK-N-slug.md`. One home for the vocabulary: close validates
// against it, `release` renders the headings.
export const CATEGORIES = [
	["added", "Added"],
	["changed", "Changed"],
	["fixed", "Fixed"],
	["removed", "Removed"],
];
export const ENTRY_LIMIT = 140;
// A loop is the same red set over the same code: past this many identical runs, a new plan.
export const LOOP_LIMIT = 3;
// `always` runs on every verify; `milestone` only on the baseline, `verify --full` and close.
// A missing cell means `always`, so a table written before tiers existed keeps its meaning.
export const TIERS = new Set(["always", "milestone"]);

// `start` derives the newest entries from the files, so only a pre-TASK-127 install still
// carries a RECENT block; these are the two indexes whose first close retires it.
export const RECENT_INDEXES = [TASK_INDEX, `${LOG_DIR}/INDEX.md`];
export const RECENT_LIMIT = 5;

export const TEXT_EXT = new Set([
	".md",
	".mjs",
	".js",
	".json",
	".yml",
	".yaml",
	".sh",
	".txt",
	".toml",
]);
export const SKIP_DIRS = new Set([
	".git",
	"node_modules",
	"dist",
	"build",
	"out",
	"coverage",
	".venv",
	"venv",
	"target",
	"__pycache__",
]);
// Common double-encoded UTF-8 sequences. Escaped so the pattern cannot match its own source.
export const MOJIBAKE = /(dY[\x22\x27~-]|\u00c3[\x80-\xBF]|\u00e2\u20ac|\ufffd)/;
