import { InvalidBase32CharacterError, InvalidUuidError } from "./errors.ts";
import { type TaggedIdStatic, type TaggedId, Id, stringify } from "./id.ts";

// Crockford base32 alphabet (lowercase)
const BASE32_ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";

// Hex character lookup for efficient byte to hex conversion
const HEX_CHARS = "0123456789abcdef";

// Uint8Array lookup table for base32 decoding
// Maps ASCII char codes to base32 values (0-31) or 0xff for invalid chars
const BASE32_DECODE = new Uint8Array(128);
BASE32_DECODE.fill(0xff); // Mark all as invalid by default

// Build lookup from alphabet (includes 0-9 and a-z, excluding i, l, o, u)
for (let i = 0; i < BASE32_ALPHABET.length; i++) {
	const lower = BASE32_ALPHABET.charCodeAt(i);
	BASE32_DECODE[lower] = i; // lowercase
	BASE32_DECODE[lower - 32] = i; // uppercase (ASCII offset: 'A' = 'a' - 32)
}

/**
 * Parse a hyphenated UUID hex string to a 16-byte Uint8Array.
 * Input: "0188bac7-a64e-7a51-843c-441ad1d9cbc6" (36 chars)
 * Output: Uint8Array(16)
 */
function parseUuidHex(uuid: string): Uint8Array {
	const bytes = new Uint8Array(16);
	let byteIndex = 0;

	// Process in chunks, skipping hyphens at positions 8, 13, 18, 23
	// It must be true that uuid.length === 36.
	for (let i = 0; i < 36; i += 2) {
		// Skip hyphens
		if (uuid[i] === "-") {
			i--;
			continue;
		}

		const hex = uuid.slice(i, i + 2);
		bytes[byteIndex++] = parseInt(hex, 16);
	}

	return bytes;
}

/**
 * Convert a 16-byte Uint8Array to a hyphenated UUID hex string.
 * Input: Uint8Array(16)
 * Output: "0188bac7-a64e-7a51-843c-441ad1d9cbc6" (36 chars)
 *
 * Optimized to build the string directly without intermediate allocations.
 */
function formatUuidHex(bytes: Uint8Array): string {
	// Pre-allocate array for 32 hex chars + 4 hyphens
	const result = new Array(36);
	let resultIndex = 0;

	for (let i = 0; i < 16; i++) {
		// Add hyphen after bytes 4, 6, 8, 10 (positions 8, 13, 18, 23)
		if (i === 4 || i === 6 || i === 8 || i === 10) {
			result[resultIndex++] = "-";
		}

		const byte = bytes[i]!;
		// Convert byte to two hex characters using lookup table
		result[resultIndex++] = HEX_CHARS[byte >> 4];
		result[resultIndex++] = HEX_CHARS[byte & 0x0f];
	}

	return result.join("");
}

/**
 * Encode a 16-byte Uint8Array to base32 (Crockford alphabet).
 * Input: Uint8Array(16)
 * Output: 26 base32 chars
 *
 * Base32 encoding produces 130 bits (26 × 5), with 2 leading zero bits
 * followed by the 128-bit UUID.
 */
function encodeBase32(bytes: Uint8Array): string {
	const result: string[] = new Array(26);
	let resultIndex = 0;

	// Start with 2 zero bits in buffer (to make 130 bits total)
	let bitBuffer = 0;
	let bitsInBuffer = 2;

	// It must be true that bytes.length === 16.
	for (let i = 0; i < 16; i++) {
		// Add byte to buffer
		bitBuffer = (bitBuffer << 8) | bytes[i]!;
		bitsInBuffer += 8;

		// Extract 5-bit chunks
		while (bitsInBuffer >= 5) {
			bitsInBuffer -= 5;
			const index = (bitBuffer >> bitsInBuffer) & 31;
			result[resultIndex++] = BASE32_ALPHABET[index]!;
		}
	}

	return result.join("");
}

/**
 * Decode a base32 string to a 16-byte Uint8Array.
 * Input: 26 base32 chars
 * Output: Uint8Array(16)
 *
 * Base32 decoding consumes 130 bits (26 × 5), discarding the 2 leading zero bits
 * to get the 128-bit UUID.
 */
function decodeBase32(base32: string): Uint8Array {
	const bytes = new Uint8Array(16);
	let bitBuffer = 0;
	let bitsInBuffer = 0;
	let byteIndex = 0;

	// It must be true that base32.length === 26.
	for (let i = 0; i < 26; i++) {
		const charCode = base32.charCodeAt(i);
		const value = BASE32_DECODE[charCode] ?? 0xff;

		if (value === 0xff) {
			throw new InvalidBase32CharacterError(base32[i]!);
		}

		// Add 5 bits to buffer
		bitBuffer = (bitBuffer << 5) | value;
		bitsInBuffer += 5;

		// Skip the first 2 bits (from first character)
		if (i === 0) {
			// First char contributes 5 bits, but we skip 2, leaving 3
			bitsInBuffer = 3;
			bitBuffer &= 0x07; // Keep only bottom 3 bits
		}

		// Extract complete bytes
		while (bitsInBuffer >= 8) {
			bitsInBuffer -= 8;
			bytes[byteIndex++] = (bitBuffer >> bitsInBuffer) & 0xff;
		}
	}

	return bytes;
}

declare abstract class TaggedUuid<Tag extends string> extends TaggedId<Tag> implements Uuid {
	toHex(): string;
	toBase32(): string;
}

interface TaggedUuidStatic<Tag extends string> extends TaggedIdStatic<Tag> {
	readonly prototype: TaggedUuid<Tag>;
}

type TaggedUuidCls<Tag extends string> = typeof TaggedUuid<Tag> & TaggedUuidStatic<Tag>;

/**
 * Convert a UUID hex string (36 chars with hyphens) to a 26-char Crockford base32 string.
 */
export function uuidToBase32(uuid: string): string {
	return encodeBase32(parseUuidHex(uuid));
}

/**
 * Convert a 26-char Crockford base32 string to a hyphenated UUID hex string (36 chars).
 */
export function base32ToUuid(base32: string): string {
	return formatUuidHex(decodeBase32(base32));
}

export class Uuid extends Id {
	// The key is inherited from Id but is always a string (hyphenated hex UUID, 36 chars)
	declare readonly key: string;

	private base32?: string;

	static from<T extends typeof Id>(this: T, key: string, tag?: string): T["prototype"] {
		// Normalize the key to lowercase hyphenated hex format for storage
		let hexKey: string;

		if (key.length === 36) {
			// It's hex with hyphens - normalize to lowercase (keep hyphens).
			hexKey = key.toLowerCase();
		} else if (key.length === 26) {
			// It's base32 - convert to hyphenated hex.
			const bytes = decodeBase32(key);
			hexKey = formatUuidHex(bytes);
		} else {
			throw new InvalidUuidError(key);
		}

		// Call the parent from() with the hyphenated hex key
		return super.from(hexKey, tag);
	}

	/**
	 * Fast path for parsing a lower case hex UUID with hyphens, as returned by Postgres.
	 */
	static fromLowerCaseHex<T extends typeof Id>(this: T, lowerCaseHex: string): T["prototype"] {
		return this.from(lowerCaseHex);
	}

	// Redeclare this method to give it the right types.
	declare static For: <Tag extends string>(tag: Tag) => TaggedUuidCls<Tag>;

	override toString(): string {
		return stringify(this.toBase32(), this.tag);
	}

	toHex(): string {
		return this.key;
	}

	toBase32(): string {
		// Convert hex key to base32 (cached)
		if (!this.base32) {
			const bytes = parseUuidHex(this.key);
			this.base32 = encodeBase32(bytes);
		}
		return this.base32;
	}
}
