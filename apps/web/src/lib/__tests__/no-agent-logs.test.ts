import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, test } from "bun:test";

const SOURCE_ROOT = join(import.meta.dir, "..", "..");
const IGNORED_DIRS = new Set([".next", "__tests__", "node_modules"]);
const FORBIDDEN_PATTERNS = [
	"127.0.0.1:7245",
	"X-Debug-Session-Id",
	"#region agent log",
];

describe("source hygiene", () => {
	test("does not ship local agent log probes", () => {
		const matches = sourceFiles(SOURCE_ROOT).flatMap((file) => {
			const text = readFileSync(file, "utf8");
			return FORBIDDEN_PATTERNS.filter((pattern) => text.includes(pattern)).map(
				(pattern) => `${relative(SOURCE_ROOT, file)}: ${pattern}`,
			);
		});

		expect(matches).toEqual([]);
	});
});

function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const path = join(dir, entry);
		const stats = statSync(path);
		if (stats.isDirectory()) {
			return IGNORED_DIRS.has(entry) ? [] : sourceFiles(path);
		}
		return /\.(ts|tsx)$/.test(entry) ? [path] : [];
	});
}
