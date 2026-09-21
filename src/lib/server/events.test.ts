import { describe, it, expect } from 'vitest';
import { localDatabase, localStore } from './test-database';
import { transaction } from './database';
import {
	consents,
	projectionStatements,
	saveConsent,
	syncProjections,
	startEvent,
	uploadEventFile,
	publishEvent,
	events,
	eventFile,
	removeEvent
} from './events';
import { cleanUp } from './cleanup';
import type { Staff, FamilyIdentity } from '$lib/api';
async function setup() {
	const db = localDatabase();
	await db.batch([
		db.prepare('INSERT INTO installation(id,set_up_at) VALUES(1,0)'),
		db.prepare("INSERT INTO teachers VALUES('teacher',1,'profile')"),
		db.prepare(
			"INSERT INTO classrooms(id,profile,group_key_for_staff) VALUES('group','profile','key'),('other','profile','key')"
		),
		db.prepare("INSERT INTO families VALUES('a','profile','key'),('b','profile','key')"),
		db.prepare("INSERT INTO family_classrooms VALUES('a','group','key'),('b','other','key')"),
		db.prepare("INSERT INTO children VALUES('child','group','profile')")
	]);
	const staff: Staff = {
		kind: 'staff',
		teacher: 'teacher',
		admin: true,
		credential: 'credential',
		wrappedKey: ''
	};
	const family = (id: string): FamilyIdentity => ({
		kind: 'family',
		family: id,
		credential: id,
		wrappedKey: ''
	});
	const { store, objects } = localStore({ bytes: 1e8, uploads: 100, downloads: 100 });
	await syncProjections(db, staff, 'group', 0, [{ child: 'child', family: 'a', label: 'label' }]);
	return { db, staff, family, store, objects };
}
describe('events publication', () => {
	it('stages invisibly, verifies uploads, publishes once, scopes reads and removes bytes', async () => {
		const { db, staff, family, store, objects } = await setup();
		const snapshot = await consents(db, staff);
		await startEvent(db, staff, 'event', 'group', snapshot.catalog, snapshot.revision);
		expect(await events(db, family('a'))).toEqual([]);
		await expect(
			publishEvent(db, store, staff, 'event', 'content', 'key', ['file'], 30)
		).rejects.toMatchObject({ status: 409 });
		await uploadEventFile(db, store, staff, 'event', 'file', new Uint8Array([1, 2, 3]));
		expect(
			await publishEvent(db, store, staff, 'event', 'content', 'key', ['file'], 30)
		).toMatchObject({ published: true });
		expect(
			await publishEvent(db, store, staff, 'event', 'content', 'key', ['file'], 30)
		).toMatchObject({ published: false });
		expect(await events(db, family('a'))).toHaveLength(1);
		expect(await events(db, family('b'))).toEqual([]);
		await expect(eventFile(db, store, family('b'), 'event', 'file')).rejects.toMatchObject({
			status: 404
		});
		expect((await eventFile(db, store, family('a'), 'event', 'file')).status).toBe(200);
		await removeEvent(db, store, staff, 'event');
		expect(objects.size).toBe(0);
	});
	it('rejects stale consent atomically, including a previously missing choice; old publications keep their snapshot', async () => {
		const { db, staff, family, store } = await setup();
		const snapshot = await consents(db, staff);
		await startEvent(db, staff, 'event', 'group', snapshot.catalog, snapshot.revision);
		await uploadEventFile(db, store, staff, 'event', 'file', new Uint8Array([1]));
		await saveConsent(db, family('a'), 'child', 0, 'choice');
		await expect(saveConsent(db, family('a'), 'child', 0, 'lost')).rejects.toMatchObject({
			status: 409
		});
		await expect(saveConsent(db, family('b'), 'child', 1, 'other')).rejects.toMatchObject({
			status: 409
		});
		await expect(
			publishEvent(db, store, staff, 'event', 'content', 'key', ['file'], 30)
		).rejects.toMatchObject({ status: 409 });
		expect((await db.prepare('SELECT * FROM event_files').all()).results).toHaveLength(0);
		const current = await consents(db, staff);
		await startEvent(db, staff, 'next', 'group', current.catalog, current.revision);
		await uploadEventFile(db, store, staff, 'next', 'file', new Uint8Array([1]));
		await publishEvent(db, store, staff, 'next', 'content', 'key', ['file'], 30);
		await saveConsent(db, family('a'), 'child', 1, 'changed');
		expect((await events(db, family('a')))[0].content).toBe('content');
	});
	it('records a consent form for every family card, only over the revision it read', async () => {
		const { db, staff, family } = await setup();
		// A second family card for the same child, as parents living apart have.
		await db.prepare("INSERT INTO family_classrooms VALUES('b','group','key')").run();
		const both = (choice?: string, revision?: number) =>
			['a', 'b'].map((f) => ({
				family: f,
				label: 'label',
				...(choice === undefined ? {} : { choice }),
				...(revision === undefined || f === 'b' ? {} : { revision })
			}));
		await transaction(db, projectionStatements(db, 'child', both('form', 0)));
		const stored = async () =>
			(await consents(db, staff)).rows.map((row) => [row.family, row.choice, row.revision]);
		expect(await stored()).toEqual([
			['a', 'form', 1],
			['b', 'form', 0]
		]);
		// A parent changes their own choice, so the same write made again is refused.
		await saveConsent(db, family('a'), 'child', 1, 'parent');
		await expect(
			transaction(db, projectionStatements(db, 'child', both('form', 1)))
		).rejects.toMatchObject({ status: 409 });
		// A row staff expect to be new, but which a parent already has, is refused too.
		await expect(
			transaction(db, projectionStatements(db, 'child', both('form')))
		).rejects.toMatchObject({ status: 409 });
		expect(await stored()).toEqual([
			['a', 'parent', 2],
			['b', 'form', 0]
		]);
		// Renaming the child leaves every choice as it is.
		await transaction(db, projectionStatements(db, 'child', both()));
		expect(await stored()).toEqual([
			['a', 'parent', 2],
			['b', 'form', 0]
		]);
	});
	it('rejects catalog races and missing R2 bytes; expires staged and published data', async () => {
		const { db, staff, family, store, objects } = await setup();
		const snapshot = await consents(db, staff);
		await startEvent(db, staff, 'event', 'group', snapshot.catalog, snapshot.revision);
		await uploadEventFile(db, store, staff, 'event', 'file', new Uint8Array([1]));
		objects.clear();
		await expect(
			publishEvent(db, store, staff, 'event', 'content', 'key', ['file'], 1)
		).rejects.toMatchObject({ status: 409 });
		objects.set('events/event/file', new Uint8Array([1]));
		await db.prepare('UPDATE installation SET revision=revision+1').run();
		await expect(
			publishEvent(db, store, staff, 'event', 'content', 'key', ['file'], 1)
		).rejects.toMatchObject({ status: 409 });
		await expect(syncProjections(db, staff, 'group', 0, [])).rejects.toMatchObject({ status: 409 });
		await cleanUp({ DB: db, FILES: store.bucket }, Date.now() + 2 * 86400000);
		expect(objects.size).toBe(0);
		expect(await events(db, family('a'))).toEqual([]);
	});
});
