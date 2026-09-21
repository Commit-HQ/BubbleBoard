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
	changeEvent,
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
		const snapshot = await consents(db, staff, 'group');
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
		const snapshot = await consents(db, staff, 'group');
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
		const current = await consents(db, staff, 'group');
		await startEvent(db, staff, 'next', 'group', current.catalog, current.revision);
		await uploadEventFile(db, store, staff, 'next', 'file', new Uint8Array([1]));
		await publishEvent(db, store, staff, 'next', 'content', 'key', ['file'], 30);
		await saveConsent(db, family('a'), 'child', 1, 'changed');
		expect((await events(db, family('a')))[0].content).toBe('content');
	});
	it('leaves a publication alone when another classroom’s consent changes', async () => {
		const { db, staff, family, store } = await setup();
		await db.prepare("INSERT INTO children VALUES('theirs','other','profile')").run();
		await syncProjections(db, staff, 'other', 0, [
			{ child: 'theirs', family: 'b', label: 'label' }
		]);
		const snapshot = await consents(db, staff, 'group');
		await startEvent(db, staff, 'event', 'group', snapshot.catalog, snapshot.revision);
		await uploadEventFile(db, store, staff, 'event', 'file', new Uint8Array([1]));
		await saveConsent(db, family('b'), 'theirs', 0, 'choice');
		expect(
			await publishEvent(db, store, staff, 'event', 'content', 'key', ['file'], 30)
		).toMatchObject({ published: true });
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
	it('lets the author and an admin change an event, and nobody else', async () => {
		const { db, staff, family, store } = await setup();
		const snapshot = await consents(db, staff, 'group');
		await startEvent(db, staff, 'event', 'group', snapshot.catalog, snapshot.revision);
		await uploadEventFile(db, store, staff, 'event', 'file', new Uint8Array([1]));
		await publishEvent(db, store, staff, 'event', 'content', 'key', ['file'], 30);
		const stranger: Staff = { ...staff, admin: false, teacher: 'other', credential: 'theirs' };
		await db.prepare("INSERT INTO teachers VALUES('other',0,'profile')").run();
		await db.prepare("INSERT INTO teacher_classrooms VALUES('other','group')").run();
		await expect(
			changeEvent(db, store, stranger, 'event', 'changed', ['file'], 30)
		).rejects.toMatchObject({ status: 403 });
		await expect(
			uploadEventFile(db, store, stranger, 'event', 'theirs', new Uint8Array([2]))
		).rejects.toMatchObject({ status: 403 });
		expect(await changeEvent(db, store, staff, 'event', 'changed', ['file'], 30)).toBe(true);
		expect(
			await changeEvent(db, store, { ...staff, teacher: 'other' }, 'event', 'again', ['file'], 30)
		).toBe(true);
		const [record] = await events(db, family('a'));
		expect(record.content).toBe('again');
		expect(record.editedAt).toEqual(expect.any(Number));
		expect(record.expiresAt).toBe(record.postedAt + 30 * 86400000);
	});
	it('adds photos under the revisions they were prepared against, and drops the ones left out', async () => {
		const { db, staff, family, store, objects } = await setup();
		const snapshot = await consents(db, staff, 'group');
		await startEvent(db, staff, 'event', 'group', snapshot.catalog, snapshot.revision);
		await uploadEventFile(db, store, staff, 'event', 'first', new Uint8Array([1]));
		await publishEvent(db, store, staff, 'event', 'content', 'key', ['first'], 30);
		const against = (s: { catalog: number; revision: number }) => ({
			catalog: s.catalog,
			consent: s.revision
		});
		// A photo the change names but nobody uploaded is refused, and an id already held needs no upload.
		await expect(
			changeEvent(db, store, staff, 'event', 'content', ['first', 'ghost'], 30, against(snapshot))
		).rejects.toMatchObject({ status: 409 });
		await uploadEventFile(db, store, staff, 'event', 'second', new Uint8Array([2]));
		// A parent changes their mind while the new photo is being prepared, so the change is refused whole.
		await saveConsent(db, family('a'), 'child', 0, 'choice');
		await expect(
			changeEvent(db, store, staff, 'event', 'changed', ['first', 'second'], 30, against(snapshot))
		).rejects.toMatchObject({ status: 409 });
		expect((await db.prepare('SELECT id FROM event_files').all()).results).toEqual([
			{ id: 'first' }
		]);
		expect((await events(db, family('a')))[0].content).toBe('content');
		// Prepared again against the consent as it stands now, the same photo goes up and the first comes off.
		const current = await consents(db, staff, 'group');
		expect(
			await changeEvent(db, store, staff, 'event', 'changed', ['second'], 30, against(current))
		).toBe(true);
		expect((await db.prepare('SELECT id FROM event_files').all()).results).toEqual([
			{ id: 'second' }
		]);
		expect([...objects.keys()]).toEqual(['events/event/second']);
		// The guard writes each clock back as it was, so the next change may be prepared against the same one.
		expect(await consents(db, staff, 'group')).toMatchObject(current);
		await expect(eventFile(db, store, family('a'), 'event', 'first')).rejects.toMatchObject({
			status: 404
		});
	});
	it('refuses a change to an event that is gone and one that keeps no photos', async () => {
		const { db, staff, store } = await setup();
		const snapshot = await consents(db, staff, 'group');
		await startEvent(db, staff, 'event', 'group', snapshot.catalog, snapshot.revision);
		await uploadEventFile(db, store, staff, 'event', 'file', new Uint8Array([1]));
		await expect(
			changeEvent(db, store, staff, 'event', 'changed', ['file'], 30)
		).rejects.toMatchObject({ status: 404 });
		await publishEvent(db, store, staff, 'event', 'content', 'key', ['file'], 30);
		await expect(changeEvent(db, store, staff, 'event', 'changed', [], 30)).rejects.toMatchObject({
			status: 400
		});
		await db.prepare('UPDATE events SET expires_at=1 WHERE id=?').bind('event').run();
		await expect(
			changeEvent(db, store, staff, 'event', 'changed', ['file'], 30)
		).rejects.toMatchObject({ status: 404 });
	});
	it('rejects catalog races and missing R2 bytes; expires staged and published data', async () => {
		const { db, staff, family, store, objects } = await setup();
		const snapshot = await consents(db, staff, 'group');
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
