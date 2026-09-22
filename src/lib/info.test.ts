import { describe, expect, it } from 'vitest';
import type { InfoPageRecord } from './api';
import { createId, unwrapKey, wrapping } from './crypto';
import {
	maxInfoBytes,
	openInfoForFamily,
	openInfoForStaff,
	sealFirstInfoPage,
	sealInfoPage,
	type InfoPageContent
} from './info';
import { newClassroom } from './kindergarten';
import type { NoticeDocument } from './notices';

// Info pages sealed as the head's device saves them, and opened the way devices get them back from the server: staff
// with the Staff Key, and families with the Group Key of any of their classrooms. Synthetic content only.

const text = (value: string): NoticeDocument => ({
	type: 'doc',
	content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }]
});
const hours: InfoPageContent = { paper: 'yellow', body: text('Open from 6:30 to 17:00') };
const meals: InfoPageContent = { paper: 'green', body: text('Lunch is at 11:30') };

/** A Staff Key or a Group Key, as a device holds one once it has opened it. */
function openedKey() {
	return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

describe('info pages', () => {
	it('open for staff with the Staff Key, and for a family with the Group Key of any of its classrooms, each in its own place', async () => {
		const staffKey = await openedKey();
		const classrooms = [
			{ id: createId(), groupKey: await openedKey() },
			{ id: createId(), groupKey: await openedKey() }
		];
		const [first, second] = [createId(), createId()];
		const sealed = await sealFirstInfoPage(first, hours, staffKey, classrooms);
		const { infoKeyForStaff } = sealed.key;
		const later = await sealInfoPage(second, meals, staffKey, infoKeyForStaff);
		const pages: InfoPageRecord[] = [
			{ id: first, content: sealed.content, editedAt: 1 },
			{ id: second, content: later.content, editedAt: 2 }
		];
		const opened = [
			{ ...hours, id: first, editedAt: 1 },
			{ ...meals, id: second, editedAt: 2 }
		];
		expect(await openInfoForStaff({ infoKeyForStaff, pages }, staffKey)).toEqual({
			pages: opened,
			unreadable: 0
		});

		// The server sends a family the copies of its own classrooms.
		const copies = sealed.key.classrooms.map(({ classroom, infoKey }) => ({
			id: classroom,
			infoKey
		}));
		for (const [index, { id, groupKey }] of classrooms.entries()) {
			expect(await openInfoForFamily(pages, [copies[index]], new Map([[id, groupKey]]))).toEqual({
				pages: opened,
				unreadable: 0
			});
		}

		// Another key opens none, nor does a copy moved to another classroom, even with the right Group Key.
		const none = { pages: [], unreadable: 2 };
		expect(await openInfoForStaff({ infoKeyForStaff, pages }, await openedKey())).toEqual(none);
		const other = createId();
		const moved = [{ id: other, infoKey: copies[0].infoKey }];
		const bubbles = new Map([[other, classrooms[0].groupKey]]);
		expect(await openInfoForFamily(pages, moved, bubbles)).toEqual(none);

		// A page moved into another's place doesn't open there, and the rest still do.
		const swapped = [{ ...pages[0], id: second }, pages[1]];
		expect(await openInfoForStaff({ infoKeyForStaff, pages: swapped }, staffKey)).toEqual({
			pages: [opened[1]],
			unreadable: 1
		});
	});

	it('keep the key the first page made, and a classroom added later gets a copy that opens them', async () => {
		const staffKey = await openedKey();
		const page = createId();
		const { key } = await sealFirstInfoPage(page, hours, staffKey, []);
		const changed = await sealInfoPage(page, meals, staffKey, key.infoKeyForStaff);
		const pages = [{ id: page, content: changed.content, editedAt: 2 }];

		const classroom = await newClassroom(staffKey, 'Bubbles', key.infoKeyForStaff);
		const groupKey = await unwrapKey(
			classroom.groupKeyForStaff,
			wrapping.groupKeyForStaff(staffKey, classroom.id)
		);
		const copies = [{ id: classroom.id, infoKey: classroom.infoKey ?? null }];
		const opened = await openInfoForFamily(pages, copies, new Map([[classroom.id, groupKey]]));
		expect(opened.pages).toMatchObject([meals]);
		// Before the kindergarten has info pages, a new classroom has no copy.
		expect(await newClassroom(staffKey, 'Owls')).not.toHaveProperty('infoKey');
	});

	it('refuse content longer than the server stores, and a paper or files a page can’t have', async () => {
		const staffKey = await openedKey();
		const page = createId();
		const long = { ...hours, body: text('Bring slippers. '.repeat(maxInfoBytes / 15)) };
		await expect(sealFirstInfoPage(page, long, staffKey, [])).rejects.toMatchObject({
			code: 'info-too-long'
		});

		const { key } = await sealFirstInfoPage(page, hours, staffKey, []);
		const open = async (content: unknown) => {
			const sealed = await sealInfoPage(
				page,
				content as InfoPageContent,
				staffKey,
				key.infoKeyForStaff
			);
			const pages = [{ id: page, content: sealed.content, editedAt: 1 }];
			return openInfoForStaff({ infoKeyForStaff: key.infoKeyForStaff, pages }, staffKey);
		};
		const script = { id: createId(), name: 'page.html', bytes: 10, key: 'not a key' };
		for (const content of [
			{ ...hours, paper: 'red' },
			{ body: hours.body },
			{ ...hours, files: [script] }
		]) {
			expect(await open(content), JSON.stringify(content)).toEqual({ pages: [], unreadable: 1 });
		}
	});
});
