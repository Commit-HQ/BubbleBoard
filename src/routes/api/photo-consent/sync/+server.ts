import { syncProjections } from '$lib/server/events';
import { database, requireStaff } from '$lib/server/session';
import { readJson, id, revision, list, fields, profile } from '$lib/server/validate';
import type { RequestHandler } from './$types';
export const POST: RequestHandler = async (event) => {
	const staff = await requireStaff(event),
		b = await readJson(event.request);
	const rows = list(b.rows, (value) => {
		const r = fields(value);
		return { child: id(r.child), family: id(r.family), label: profile(r.label) };
	});
	await syncProjections(database(event), staff, id(b.classroom), revision(b.revision), rows);
	return new Response(null, { status: 204 });
};
