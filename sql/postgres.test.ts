import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import pg from "pg";

import {
	toMixedCase,
	uuidEdgeCases,
	uuidRandomCases,
	uuidv7Cases,
} from "../src/__test__/fixtures.ts";

const { Client } = pg;

// Test configuration
const DB_CONFIG = {
	host: "localhost",
	port: 5433,
	database: "nominal_ids_test",
	user: "postgres",
	password: "postgres",
};

// Helper to run SQL file
const executeSqlFile = async (client: pg.Client, filename: string) => {
	const path = join(import.meta.dirname, filename);
	const sql = readFileSync(path, "utf-8");
	await client.query(sql);
};

// Main test suite
test("PostgreSQL UUID/Base32 conversion functions", async (t) => {
	const client = new Client(DB_CONFIG);

	try {
		await client.connect();

		// Setup: Load functions
		await t.test("Load conversion functions", async () => {
			await executeSqlFile(client, "postgres.sql");
		});

		// Prepare test data
		await t.test("Prepare and bulk insert test cases", async () => {
			// Drop and recreate table
			await client.query(`
				drop table if exists test_cases;
				create table test_cases (
					test_set text not null,
					uuid_lower text not null,
					uuid_upper text not null,
					uuid_mixed text not null,
					base32_lower text not null,
					base32_upper text not null,
					base32_mixed text not null
				);
			`);

			// Combine all test data
			const allTestData: Array<{
				testSet: string;
				uuid: string;
				base32: string;
			}> = [];

			// Add all edge cases
			for (const [uuid, base32] of Object.entries(uuidEdgeCases)) {
				allTestData.push({ testSet: "edge_cases", uuid, base32 });
			}

			// Add all random UUIDs
			for (const [uuid, base32] of Object.entries(uuidRandomCases)) {
				allTestData.push({ testSet: "random_uuids", uuid, base32 });
			}

			// Add all UUIDv7 cases
			for (const [uuid, base32] of Object.entries(uuidv7Cases)) {
				allTestData.push({ testSet: "uuidv7", uuid, base32 });
			}

			// Build raw SQL insert (much faster, no parameter limits)
			const values: string[] = [];

			for (const { testSet, uuid, base32 } of allTestData) {
				const uuidLower = uuid.toLowerCase();
				// Note: casting to `::uuid` is actually what handles these mixed cases
				// for us (PG natively handles this), but might as well test it!
				const uuidUpper = uuid.toUpperCase();
				const uuidMixed = toMixedCase(uuid);
				// Note: base32 output is always normalized to lowercase, but we might
				// as well test all cases.
				const base32Lower = base32.toLowerCase();
				const base32Upper = base32.toUpperCase();
				const base32Mixed = toMixedCase(base32);

				values.push(
					`('${testSet}', '${uuidLower}', '${uuidUpper}', '${uuidMixed}', '${base32Lower}', '${base32Upper}', '${base32Mixed}')`,
				);
			}

			// Execute bulk insert in one go
			const insertSql = `
				insert into test_cases (test_set, uuid_lower, uuid_upper, uuid_mixed, base32_lower, base32_upper, base32_mixed)
				values ${values.join(", ")}
			`;

			await client.query(insertSql);

			// Verify count
			const result = await client.query("select count(*) from test_cases");
			const count = Number.parseInt(result.rows[0].count);
			assert.equal(count, allTestData.length);
		});

		// Run all tests in a single query
		await t.test("Validate all conversions", async () => {
			const result = await client.query(`
				select
					test_set,
					uuid_lower,
					base32_lower as base32
				from test_cases
				where
					uuid_to_base32(uuid_lower::uuid) <> base32_lower
					or uuid_to_base32(uuid_upper::uuid) <> base32_lower
					or uuid_to_base32(uuid_mixed::uuid) <> base32_lower
					or base32_to_uuid(base32_lower)::text <> uuid_lower
					or base32_to_uuid(base32_upper)::text <> uuid_lower
					or base32_to_uuid(base32_mixed)::text <> uuid_lower
					or base32_to_uuid(uuid_to_base32(uuid_lower::uuid))::text <> uuid_lower
					or base32_to_uuid(uuid_to_base32(uuid_upper::uuid))::text <> uuid_lower
					or base32_to_uuid(uuid_to_base32(uuid_mixed::uuid))::text <> uuid_lower
			`);

			assert.deepStrictEqual(result.rows, []);
		});
	} finally {
		await client.end();
	}
});
