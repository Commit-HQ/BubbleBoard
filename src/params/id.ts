import { isId } from '$lib/crypto';

// Record IDs in API paths, so a malformed ID never reaches a query.
export function match(param: string) {
	return isId(param);
}
