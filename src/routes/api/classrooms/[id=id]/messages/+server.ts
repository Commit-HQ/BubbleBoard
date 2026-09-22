import { database, requireManager } from '$lib/server/session';
import { parseSettings, saveSettings } from '$lib/server/messages';
import { readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';
export const PUT: RequestHandler = async (event) => {
	const manager = await requireManager(event);
	await saveSettings(
		database(event),
		manager,
		parseSettings(event.params.id, await readJson(event.request))
	);
	return new Response(null, { status: 204 });
};
