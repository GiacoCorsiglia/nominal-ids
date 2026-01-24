import assert from "node:assert/strict";
import { test } from "node:test";

import { toMixedCase, uuidEdgeCases, uuidRandomCases, uuidv7Cases } from "./__test__/fixtures.ts";
import { InvalidBase32CharacterError, InvalidUuidError } from "./errors.ts";
import { Uuid } from "./uuid.ts";

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

	test(`${name} - uppercase base32`, () => {
		for (const [uuid, base32] of Object.entries(cases)) {
			const result = Uuid.from(base32.toUpperCase());
			assert.equal(result.key, uuid, `Failed for uppercase base32: ${base32}`);
			assert.equal(result.toString(), base32, `Failed encoding for uppercase base32: ${base32}`);
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
