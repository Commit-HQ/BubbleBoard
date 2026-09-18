import { database, requireAdmin } from '$lib/server/session';
import { parseSettings, saveSettings } from '$lib/server/messages';
import { readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';
export const PUT: RequestHandler = async (event) => {
	const admin = await requireAdmin(event);
	await saveSettings(
		database(event),
		admin,
		parseSettings(event.params.id, await readJson(event.request))
	);
	return new Response(null, { status: 204 });
};
