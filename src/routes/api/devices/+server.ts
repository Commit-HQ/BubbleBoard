import { json } from '@sveltejs/kit';
import { addOneTimeCard } from '$lib/server/catalog';
import { database, familyDevices, nameDevice, requireFamily } from '$lib/server/session';
import { newCredential, readJson, sealed } from '$lib/server/validate';
import type { RequestHandler } from './$types';

/** The devices connected for this device's family, for the family's devices alone. */
export const GET: RequestHandler = async (event) => {
	return json({ devices: await familyDevices(event, await requireFamily(event)) });
};

// A family's device adds another of the family's devices: it stores the one-time card that device connects with.
export const POST: RequestHandler = async (event) => {
	const family = await requireFamily(event);
	const credential = newCredential(await readJson(event.request));
	return json({ until: await addOneTimeCard(database(event), family, credential) });
};

/** Says who uses this device, and answers with the family's devices as they are now. */
export const PUT: RequestHandler = async (event) => {
	const family = await requireFamily(event);
	await nameDevice(event, sealed((await readJson(event.request)).name, 1024));
	return json({ devices: await familyDevices(event, family) });
};
