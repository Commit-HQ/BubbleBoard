import { describe, expect, it } from 'vitest';
import type { InfoRecord, StaffInfoRecord } from './api';
import { createId, UnreadableError, unwrapKey, wrapping } from './crypto';
import {
	isBlank,
	maxInfoBytes,
	openInfoForFamily,
	openInfoForStaff,
	sealInfo,
	sealNewInfo,
	type InfoContent
} from './info';
import { newClassroom } from './kindergarten';
import type { NoticeDocument } from './notices';

// The info page sealed as an admin's device saves it, and opened the way devices get it back from the server:
// staff with the Staff Key, and families with the Group Key of any of their classrooms. Synthetic content only.

const text = (value: string): NoticeDocument => ({
	type: 'doc',
	content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }]
});
const content: InfoContent = { body: text('Open from 6:30 to 17:00') };

/** A Staff Key or a Group Key, as a device holds one once it has opened it. */
function openedKey() {
	return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

describe('the info page', () => {
	it('opens for staff with the Staff Key, and for a family with the Group Key of any of its classrooms', async () => {
		const staffKey = await openedKey();
		const classrooms = [
			{ id: createId(), groupKey: await openedKey() },
			{ id: createId(), groupKey: await openedKey() }
		];
		const sealed = await sealNewInfo(content, staffKey, classrooms);
		const staff: StaffInfoRecord = {
			content: sealed.content,
			editedAt: 1,
			infoKeyForStaff: sealed.infoKeyForStaff
		};
		expect(await openInfoForStaff(staff, staffKey)).toEqual({ ...content, editedAt: 1 });

		// The server sends a family the copies of its own classrooms.
		const record: InfoRecord = { content: sealed.content, editedAt: 1 };
		const copies = sealed.classrooms.map(({ classroom, infoKey }) => ({ id: classroom, infoKey }));
		for (const [index, { id, groupKey }] of classrooms.entries()) {
			const opened = await openInfoForFamily(record, [copies[index]], new Map([[id, groupKey]]));
			expect(opened).toEqual({ ...content, editedAt: 1 });
		}

		// Another key opens nothing, nor does a copy moved to another classroom, even with the right Group Key.
		const [bubbles, owls] = classrooms;
		await expect(openInfoForStaff(staff, await openedKey())).rejects.toThrow(UnreadableError);
		const other = createId();
		const moved = [{ id: other, infoKey: copies[0].infoKey }];
		await expect(
			openInfoForFamily(record, moved, new Map([[other, bubbles.groupKey]]))
		).rejects.toThrow(UnreadableError);
		await expect(
			openInfoForFamily(record, [copies[0]], new Map([[owls.id, owls.groupKey]]))
		).rejects.toThrow(UnreadableError);
	});

	it('keeps its key when it changes, and a classroom added later gets a copy that opens it', async () => {
		const staffKey = await openedKey();
		const { infoKeyForStaff } = await sealNewInfo(content, staffKey, []);
		const changed: InfoContent = { body: text('Closed on 1 May') };
		const record = { ...(await sealInfo(changed, staffKey, infoKeyForStaff)), editedAt: 2 };
		expect(await openInfoForStaff({ ...record, infoKeyForStaff }, staffKey)).toMatchObject(changed);

		const classroom = await newClassroom(staffKey, 'Bubbles', infoKeyForStaff);
		const groupKey = await unwrapKey(
			classroom.groupKeyForStaff,
			wrapping.groupKeyForStaff(staffKey, classroom.id)
		);
		const copies = [{ id: classroom.id, infoKey: classroom.infoKey ?? null }];
		const opened = await openInfoForFamily(record, copies, new Map([[classroom.id, groupKey]]));
		expect(opened).toMatchObject(changed);
		// Before the kindergarten has a page, a new classroom has no copy.
		expect(await newClassroom(staffKey, 'Owls')).not.toHaveProperty('infoKey');
	});

	it('refuses content longer than the server stores, and files of a kind the page doesn’t carry', async () => {
		const staffKey = await openedKey();
		const long = { body: text('Bring slippers. '.repeat(maxInfoBytes / 15)) };
		await expect(sealNewInfo(long, staffKey, [])).rejects.toMatchObject({ code: 'info-too-long' });

		const page = { id: createId(), name: 'page.html', bytes: 10, key: 'not a key' };
		const sealed = await sealNewInfo({ ...content, files: [page] }, staffKey, []);
		const staff = { content: sealed.content, editedAt: 1, infoKeyForStaff: sealed.infoKeyForStaff };
		await expect(openInfoForStaff(staff, staffKey)).rejects.toThrow(UnreadableError);
	});

	it('shows nothing without text or files', () => {
		const empty = { type: 'doc', content: [{ type: 'paragraph' }] } satisfies NoticeDocument;
		expect(isBlank({ body: empty })).toBe(true);
		expect(isBlank(content)).toBe(false);
		const file = { id: createId(), name: 'menu.pdf', bytes: 1, key: '' };
		expect(isBlank({ body: empty, files: [file] })).toBe(false);
	});
});
