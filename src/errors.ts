export class NominalIdError extends Error {}

export class InvalidTagError extends NominalIdError {
	constructor(input: string, expectedTag: string) {
		super(`Expected tag "${expectedTag}" in "${input}"`);
	}
}
