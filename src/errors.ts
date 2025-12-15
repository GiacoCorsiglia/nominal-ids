export class NominalIdError extends Error {}

export class InvalidTagError extends NominalIdError {
	constructor(input: string, expectedTag: string) {
		super(`Expected tag "${expectedTag}" in "${input}"`);
	}
}

/**
 * Error thrown when an invalid base32 character is encountered during decoding.
 */
export class InvalidBase32CharacterError extends NominalIdError {
	constructor(character: string) {
		super(`Invalid base32 character: ${character}`);
	}
}

/**
 * Error thrown when an invalid UUID format is provided.
 */
export class InvalidUuidError extends NominalIdError {
	constructor(value: string) {
		super(`Invalid UUID: ${value}`);
	}
}
