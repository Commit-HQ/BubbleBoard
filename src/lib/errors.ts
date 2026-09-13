// Errors the app explains to people by their code, in both languages (errors in src/lib/i18n).

/** A failure the app explains with its code, such as a file a notice can't carry. */
export class CodedError extends Error {
	readonly code: string;

	constructor(code: string, options?: ErrorOptions) {
		super(code, options);
		this.name = 'CodedError';
		this.code = code;
	}
}

/** The code the app explains an error with, which each of the app's errors carries. */
export function errorCode(cause: unknown) {
	const code = (cause as { code?: unknown } | null | undefined)?.code;
	return typeof code === 'string' ? code : 'unexpected';
}
