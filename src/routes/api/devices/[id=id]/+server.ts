import { json } from '@sveltejs/kit';
import { familyDevices, removeDevice, requireFamily } from '$lib/server/session';
import type { RequestHandler } from './$types';

/** Signs out another of the family's devices, and answers with the family's devices as they are now. */
export const DELETE: RequestHandler = async (event) => {
	const family = await requireFamily(event);
	await removeDevice(event, family, event.params.id);
	return json({ devices: await familyDevices(event, family) });
};
