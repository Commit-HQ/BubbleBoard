import { exploreRoles, type ExploreRole } from '$lib/paths';

// The walks through the app that the landing pages have, so any other address under /explore is not found.
export function match(param: string): param is ExploreRole {
	return exploreRoles.includes(param as ExploreRole);
}
