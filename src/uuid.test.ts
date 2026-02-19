import assert from "node:assert/strict";
import { test } from "node:test";

import { toMixedCase, uuidEdgeCases, uuidRandomCases, uuidv7Cases } from "./__test__/fixtures.ts";
import { InvalidBase32CharacterError, InvalidUuidError } from "./errors.ts";
import { Uuid, uuidToBase32, base32ToUuid, isBase32Uuid } from "./uuid.ts";

class UserId extends Uuid.For("user") {}
class PostId extends Uuid.For("post") {}

// Test UUID: 0188bac7-a64e-7a51-843c-441ad1d9cbc6
const testHexWithHyphens = "0188bac7-a64e-7a51-843c-441ad1d9cbc6"; // Postgres format (the key)
const testBase32 = "01h2xcf9jef98r8f243b8xkjy6";

test("Uuid.from accepts hex UUID with hyphens (Postgres format)", () => {
	const uuid = Uuid.from(testHexWithHyphens);
	assert.equal(uuid.key, testHexWithHyphens);
});

test("Uuid.from accepts base32 UUID", () => {
	const uuid = Uuid.from(testBase32);
	assert.equal(uuid.key, testHexWithHyphens);
});

test("Uuid.from normalizes to lowercase hex", () => {
	const uuid = Uuid.from(testHexWithHyphens.toUpperCase());
	assert.equal(uuid.key, testHexWithHyphens);
});

test("Uuid.from with base32 and hex return same instance", () => {
	const a = Uuid.from(testHexWithHyphens);
	const b = Uuid.from(testBase32);
	assert.equal(a, b);
});

test("Uuid.toString returns base32", () => {
	const uuid = Uuid.from(testHexWithHyphens);
	assert.equal(uuid.toString(), testBase32);
});

test("Uuid.toJSON returns base32", () => {
	const uuid = Uuid.from(testHexWithHyphens);
	assert.equal(uuid.toJSON(), testBase32);
	assert.equal(JSON.stringify(uuid), `"${testBase32}"`);
});

test("Uuid.toPostgres returns hex", () => {
	const uuid = Uuid.from(testHexWithHyphens);
	assert.equal(uuid.toPostgres(), testHexWithHyphens);
});

test("Uuid.toHex returns hex with hyphens", () => {
	const uuid = Uuid.from(testHexWithHyphens);
	assert.equal(uuid.toHex(), testHexWithHyphens);
});

test("Uuid.toHex from base32 returns hex with hyphens", () => {
	const uuid = Uuid.from(testBase32);
	assert.equal(uuid.toHex(), testHexWithHyphens);
});

test("Uuid.toBase32 returns base32 string", () => {
	const uuid = Uuid.from(testHexWithHyphens);
	assert.equal(uuid.toBase32(), testBase32);
});

test("Uuid.toBase32 from base32 returns same base32", () => {
	const uuid = Uuid.from(testBase32);
	assert.equal(uuid.toBase32(), testBase32);
});

test("Uuid.toBase32 caches result", () => {
	const uuid = Uuid.from(testHexWithHyphens);
	const first = uuid.toBase32();
	const second = uuid.toBase32();
	assert.equal(first, second);
	assert.equal(first, testBase32);
});

test("Uuid.fromLowerCaseHex accepts lowercase hex", () => {
	const uuid = Uuid.fromLowerCaseHex(testHexWithHyphens);
	assert.equal(uuid.key, testHexWithHyphens);
	assert.equal(uuid.toHex(), testHexWithHyphens);
});

test("Uuid.fromLowerCaseHex returns interned instance", () => {
	const a = Uuid.fromLowerCaseHex(testHexWithHyphens);
	const b = Uuid.from(testHexWithHyphens);
	assert.equal(a, b);
});

test("UserId.from with tag", () => {
	const userId = UserId.from(testHexWithHyphens);
	assert.equal(userId.tag, "user");
	assert.equal(userId.key, testHexWithHyphens);
});

test("UserId.toString includes tag prefix", () => {
	const userId = UserId.from(testHexWithHyphens);
	assert.equal(userId.toString(), `user_${testBase32}`);
});

test("UserId.toJSON includes tag prefix", () => {
	const userId = UserId.from(testHexWithHyphens);
	assert.equal(JSON.stringify(userId), `"user_${testBase32}"`);
});

test("UserId.toPostgres returns hex without tag", () => {
	const userId = UserId.from(testHexWithHyphens);
	assert.equal(userId.toPostgres(), testHexWithHyphens);
});

test("Uuid.For creates distinct classes", () => {
	const UserA = Uuid.For("user");
	const UserB = Uuid.For("user");
	assert.notStrictEqual(UserA, UserB);
});

test("UserId and PostId with same UUID are different instances", () => {
	const user = UserId.from(testHexWithHyphens);
	const post = PostId.from(testHexWithHyphens);
	assert.notEqual(user, post);
	assert.equal(user.tag, "user");
	assert.equal(post.tag, "post");
});

test("Uuid instances are interned", () => {
	const a = Uuid.from(testHexWithHyphens);
	const b = Uuid.from(testHexWithHyphens);
	assert.equal(a, b);
});

test("UserId instances are interned", () => {
	const a = UserId.from(testHexWithHyphens);
	const b = UserId.from(testHexWithHyphens);
	assert.equal(a, b);
});

test("Invalid hex UUID throws error", () => {
	assert.throws(() => Uuid.from("not-a-uuid"), InvalidUuidError);
});

test("Invalid base32 UUID throws error", () => {
	assert.throws(() => Uuid.from("invalid_base32_string_length"), InvalidUuidError);
});

test("Base32 with invalid characters throws error", () => {
	// 'u' is not in the Crockford base32 alphabet
	assert.throws(() => Uuid.from("0c5pavn4ts6t2g1s891kest9su"), InvalidBase32CharacterError);
});

test("Round trip hex to base32 to hex", () => {
	const uuid1 = Uuid.from(testHexWithHyphens);
	const base32 = uuid1.toString();
	const uuid2 = Uuid.from(base32);
	assert.equal(uuid1, uuid2);
	assert.equal(uuid2.key, testHexWithHyphens);
});

test("Supports uppercase base32 decoding", () => {
	const uuid = Uuid.from(testBase32.toUpperCase());
	assert.equal(uuid.key, testHexWithHyphens);
});

// --- uuidToBase32 / base32ToUuid standalone functions ---

test("uuidToBase32 converts hex UUID to base32", () => {
	assert.equal(uuidToBase32(testHexWithHyphens), testBase32);
});

test("base32ToUuid converts base32 to hex UUID", () => {
	assert.equal(base32ToUuid(testBase32), testHexWithHyphens);
});

test("uuidToBase32 and base32ToUuid round trip", () => {
	assert.equal(base32ToUuid(uuidToBase32(testHexWithHyphens)), testHexWithHyphens);
	assert.equal(uuidToBase32(base32ToUuid(testBase32)), testBase32);
});

// --- isBase32Uuid ---

test("isBase32Uuid accepts valid base32 UUIDs", () => {
	assert.equal(isBase32Uuid(testBase32), true);
	assert.equal(isBase32Uuid("00000000000000000000000000"), true);
	assert.equal(isBase32Uuid("7zzzzzzzzzzzzzzzzzzzzzzzzz"), true);
});

test("isBase32Uuid accepts uppercase", () => {
	assert.equal(isBase32Uuid(testBase32.toUpperCase()), true);
});

test("isBase32Uuid accepts mixed case", () => {
	assert.equal(isBase32Uuid("01H2XCF9JEF98R8f243b8xkjy6"), true);
});

test("isBase32Uuid rejects wrong length", () => {
	assert.equal(isBase32Uuid("01h2xcf9jef98r8f243b8xkjy"), false); // 25 chars
	assert.equal(isBase32Uuid("01h2xcf9jef98r8f243b8xkjy67"), false); // 27 chars
	assert.equal(isBase32Uuid(""), false);
});

test("isBase32Uuid rejects invalid characters", () => {
	// 'u' is not in Crockford base32
	assert.equal(isBase32Uuid("0c5pavn4ts6t2g1s891kest9su"), false);
	// 'i', 'l', 'o' are excluded
	assert.equal(isBase32Uuid("0i5pavn4ts6t2g1s891kest9ss"), false);
	assert.equal(isBase32Uuid("0l5pavn4ts6t2g1s891kest9ss"), false);
	assert.equal(isBase32Uuid("0o5pavn4ts6t2g1s891kest9ss"), false);
});

test("isBase32Uuid rejects first char > 7 (overflow)", () => {
	// '8' as first char means top 2 bits are non-zero → >128 bits
	assert.equal(isBase32Uuid("80000000000000000000000000"), false);
	assert.equal(isBase32Uuid("z0000000000000000000000000"), false);
});

test("isBase32Uuid rejects hex UUIDs", () => {
	assert.equal(isBase32Uuid(testHexWithHyphens), false);
});

// Comprehensive test suite using all fixtures
for (const [name, cases] of [
	["Edge cases", uuidEdgeCases],
	["Random UUIDs", uuidRandomCases],
	["UUIDv7 cases", uuidv7Cases],
] as const) {
	test(`${name} - decode base32 to UUID`, () => {
		for (const [uuid, base32] of Object.entries(cases)) {
			const result = Uuid.from(base32);
			assert.equal(result.key, uuid, `Failed for base32: ${base32}`);
		}
	});

	test(`${name} - encode UUID to base32`, () => {
		for (const [uuid, base32] of Object.entries(cases)) {
			const result = Uuid.from(uuid);
			assert.equal(result.toString(), base32, `Failed for UUID: ${uuid}`);
		}
	});

	test(`${name} - round trip`, () => {
		for (const [uuid, base32] of Object.entries(cases)) {
			const fromBase32 = Uuid.from(base32);
			const fromUuid = Uuid.from(uuid);
			assert.equal(fromBase32, fromUuid, `Failed round trip for ${uuid}`);
			assert.equal(fromBase32.toString(), base32, `Failed base32 for ${uuid}`);
			assert.equal(fromUuid.toString(), base32, `Failed base32 for ${uuid}`);
		}
	});

	test(`${name} - uuidToBase32/base32ToUuid`, () => {
		for (const [uuid, base32] of Object.entries(cases)) {
			assert.equal(uuidToBase32(uuid), base32, `uuidToBase32 failed for ${uuid}`);
			assert.equal(base32ToUuid(base32), uuid, `base32ToUuid failed for ${base32}`);
		}
	});

	test(`${name} - uuidToBase32 is case insensitive`, () => {
		for (const [uuid, base32] of Object.entries(cases)) {
			assert.equal(
				uuidToBase32(uuid.toUpperCase()),
				base32,
				`uuidToBase32 uppercase failed for ${uuid}`,
			);
			assert.equal(
				uuidToBase32(toMixedCase(uuid)),
				base32,
				`uuidToBase32 mixed case failed for ${uuid}`,
			);
		}
	});

	test(`${name} - base32ToUuid is case insensitive`, () => {
		for (const [uuid, base32] of Object.entries(cases)) {
			assert.equal(
				base32ToUuid(base32.toUpperCase()),
				uuid,
				`base32ToUuid uppercase failed for ${base32}`,
			);
			assert.equal(
				base32ToUuid(toMixedCase(base32)),
				uuid,
				`base32ToUuid mixed case failed for ${base32}`,
			);
		}
	});

	test(`${name} - uppercase base32`, () => {
		for (const [uuid, base32] of Object.entries(cases)) {
			const result = Uuid.from(base32.toUpperCase());
			assert.equal(result.key, uuid, `Failed for uppercase base32: ${base32}`);
			assert.equal(result.toString(), base32, `Failed encoding for uppercase base32: ${base32}`);
		}
	});

	test(`${name} - isBase32Uuid accepts base32, rejects hex`, () => {
		for (const [uuid, base32] of Object.entries(cases)) {
			assert.equal(isBase32Uuid(base32), true, `Should accept base32: ${base32}`);
			assert.equal(isBase32Uuid(base32.toUpperCase()), true, `Should accept uppercase: ${base32}`);
			assert.equal(isBase32Uuid(uuid), false, `Should reject hex UUID: ${uuid}`);
		}
	});

	test(`${name} - mixed case base32`, () => {
		for (const [uuid, base32] of Object.entries(cases)) {
			const mixedCase = toMixedCase(base32);
			const result = Uuid.from(mixedCase);
			assert.equal(result.key, uuid, `Failed for mixed case base32: ${mixedCase}`);
			assert.equal(
				result.toString(),
				base32,
				`Failed encoding for mixed case base32: ${mixedCase}`,
			);
		}
	});
}
