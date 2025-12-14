import { Id, stringify } from "./id.ts";

// Crockford base32 alphabet (lowercase)
const BASE32_ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";

// Build reverse lookup map for decoding
const BASE32_DECODE_MAP = new Map<string, number>();
for (let i = 0; i < BASE32_ALPHABET.length; i++) {
	const char = BASE32_ALPHABET[i]!;
	BASE32_DECODE_MAP.set(char, i);
	// Also support uppercase for decoding
	BASE32_DECODE_MAP.set(char.toUpperCase(), i);
}

/**
 * Encode a UUID hex string to base32 (Crockford alphabet).
 * Input: 32 hex chars (e.g., "0188bac7a64e7a51843c441ad1d9cbc6")
 * Output: 26 base32 chars
 */
function hexToBase32(hex: string): string {
	// Remove any hyphens from UUID format
	hex = hex.replace(/-/g, "");

	// Convert hex to BigInt for easier bit manipulation
	const num = BigInt(`0x${hex}`);

	// Convert to base32 - UUID is 128 bits, which gives us 26 base32 chars
	let result = "";
	let remaining = num;

	for (let i = 0; i < 26; i++) {
		const digit = Number(remaining & 31n); // Get last 5 bits
		result = BASE32_ALPHABET[digit] + result;
		remaining = remaining >> 5n;
	}

	return result;
}

/**
 * Add hyphens to a 32-char hex string to create standard UUID format.
 * Input: "0188bac7a64e7a51843c441ad1d9cbc6"
 * Output: "0188bac7-a64e-7a51-843c-441ad1d9cbc6"
 */
function addHyphens(hex: string): string {
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Decode a base32 string to UUID hex string with hyphens.
 * Input: 26 base32 chars
 * Output: 36 hex chars with hyphens (lowercase)
 */
function base32ToHex(base32: string): string {
	if (base32.length !== 26) {
		throw new Error(`Invalid base32 UUID length: ${base32.length} (expected 26)`);
	}

	let num = 0n;
	for (let i = 0; i < base32.length; i++) {
		// char necessarily exists.
		const char = base32[i]!;
		const digit = BASE32_DECODE_MAP.get(char);
		if (digit === undefined) {
			throw new Error(`Invalid base32 character: ${char}`);
		}
		num = (num << 5n) | BigInt(digit);
	}

	// Convert to hex, pad to 32 chars, then add hyphens
	const hex = num.toString(16).padStart(32, "0");
	return addHyphens(hex);
}

export class Uuid extends Id {
	// The key is inherited from Id but is always a string (hyphenated hex UUID, 36 chars)
	declare readonly key: string;

	private base32?: string;

	static from<T extends typeof Id>(this: T, key: string, tag?: string): T["prototype"] {
		// Normalize the key to lowercase hyphenated hex format for storage
		let hexKey: string;

		if (key.length === 36) {
			// It's hex with hyphens - normalize to lowercase (keep hyphens)
			hexKey = key.toLowerCase();
		} else if (key.length === 26) {
			// It's base32 - convert to hyphenated hex
			hexKey = base32ToHex(key);
		} else {
			throw new Error(`Invalid UUID format: ${key}`);
		}

		// Call the parent from() with the hyphenated hex key
		return super.from(hexKey, tag);
	}

	override toString(): string {
		// Convert hex key to base32
		const base32 = this.base32 ?? (this.base32 = hexToBase32(this.key));
		// Add tag prefix if present
		return stringify(base32, this.tag);
	}
}
