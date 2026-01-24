import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type UuidTestCase = Record<string, string>;

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadJson(filename: string): UuidTestCase {
	const path = join(__dirname, filename);
	return JSON.parse(readFileSync(path, "utf-8"));
}

export const uuidEdgeCases: UuidTestCase = loadJson("uuid-edge-cases.json");
export const uuidRandomCases: UuidTestCase = loadJson("uuid.json");
export const uuidv7Cases: UuidTestCase = loadJson("uuidv7.json");

/**
 * Convert a string to mixed case (alternating upper/lower)
 */
export function toMixedCase(str: string): string {
	return str
		.split("")
		.map((char, i) => (i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()))
		.join("");
}
