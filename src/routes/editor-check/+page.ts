import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// A local-only fixture for checking the editor with fictional children and a bundled stock photograph.
// It grants no access to the database or real classroom records, and is unavailable in production.
export const prerender = false;
export const load = () => {
	if (!dev) error(404, 'not-found');
};
