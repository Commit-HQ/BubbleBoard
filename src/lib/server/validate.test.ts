import { expect, it } from 'vitest';
import { toBase64Url } from '$lib/base64url';
import { createId, SEALED_BYTES_OVERHEAD } from '$lib/crypto';
import { maxPhotoBytes } from '$lib/photos';
import {
	familyCards,
	familyLinks,
	newChild,
	newNotice,
	noticeChange,
	readPhoto,
	setup,
	voteChoice
} from './validate';

// Structure the server enforces on requests it can't read. Envelopes only need the right form here.

const envelope = (bytes: number) =>
	`1.${toBase64Url(new Uint8Array(12))}.${toBase64Url(new Uint8Array(bytes))}`;
const credential = () => ({
	id: createId(),
	authToken: toBase64Url(new Uint8Array(32)),
	wrappedKey: envelope(48)
});

it('refuses a new family card that wouldn’t reach its child’s classroom', () => {
	const classroom = createId();
	const family = {
		id: createId(),
		profile: envelope(20),
		familyKeyForStaff: envelope(48),
		credential: credential()
	};
	const request = {
		revision: 0,
		id: createId(),
		classroom,
		profile: envelope(20),
		newFamilies: [family],
		removeMemberships: [],
		removeFamilies: []
	};
	const reaching = [{ family: family.id, classroom, groupKeyForFamily: envelope(48) }];
	expect(newChild({ ...request, addMemberships: reaching }).newFamilies).toHaveLength(1);
	expect(() => newChild({ ...request, addMemberships: [] })).toThrow();
	expect(() => newChild({ ...request, addMemberships: [...reaching, ...reaching] })).toThrow();
	// A child being removed is in no classroom, so its links can't add a family.
	expect(() => familyLinks({ ...request, addMemberships: reaching })).toThrow();
});

it('refuses a setup whose two cards share an ID', () => {
	const teacher = () => ({ id: createId(), profile: envelope(20), credential: credential() });
	const [admin, recovery] = [teacher(), teacher()];
	expect(setup({ token: 'token', teachers: [admin, recovery] }).teachers).toHaveLength(2);
	const shared = { ...recovery, credential: { ...recovery.credential, id: admin.credential.id } };
	expect(() => setup({ token: 'token', teachers: [admin, shared] })).toThrow();
});

it('refuses new family cards that repeat a family or a card', () => {
	const card = () => ({ family: createId(), credential: credential() });
	const [first, second] = [card(), card()];
	expect(familyCards({ cards: [first, second] })).toHaveLength(2);
	expect(() => familyCards({ cards: [] })).toThrow();
	expect(() => familyCards({ cards: [first, { ...second, family: first.family }] })).toThrow();
	const shared = { ...second.credential, id: first.credential.id };
	expect(() => familyCards({ cards: [first, { ...second, credential: shared }] })).toThrow();
});

it('refuses notices without classrooms, with a classroom twice, too big, up for other days, or unclear about a poll', () => {
	const key = () => ({ classroom: createId(), noticeKey: envelope(48) });
	const notice = {
		id: createId(),
		content: envelope(200),
		days: 30,
		poll: true,
		classrooms: [key(), key()]
	};
	expect(newNotice(notice).classrooms).toHaveLength(2);
	expect(noticeChange({ ...notice, announce: false })).toMatchObject({
		announce: false,
		poll: true
	});
	for (const refused of [
		{ ...notice, classrooms: [] },
		{ ...notice, classrooms: [notice.classrooms[0], notice.classrooms[0]] },
		{ ...notice, days: 2 },
		{ ...notice, content: envelope(40 * 1024) },
		{ ...notice, poll: 'yes' },
		{ ...notice, poll: undefined }
	]) {
		expect(() => newNotice(refused)).toThrow();
	}
	expect(() => noticeChange(notice)).toThrow();
});

it('refuses a poll answer bigger than the option it names', () => {
	expect(voteChoice({ choice: envelope(40) })).toBe(envelope(40));
	for (const choice of [envelope(1024), 'Tuesday', undefined]) {
		expect(() => voteChoice({ choice })).toThrow();
	}
});

it('reads a board photo’s encrypted bytes, holding something and no bigger than a photo is kept', async () => {
	const upload = (bytes: number, type = 'application/octet-stream') =>
		new Request('https://bubbleboard.example.com/api', {
			method: 'PUT',
			headers: { 'content-type': type },
			body: new Uint8Array(bytes)
		});
	expect(await readPhoto(upload(SEALED_BYTES_OVERHEAD + 1))).toHaveLength(
		SEALED_BYTES_OVERHEAD + 1
	);
	await expect(readPhoto(upload(maxPhotoBytes + SEALED_BYTES_OVERHEAD + 1))).rejects.toMatchObject({
		status: 413
	});
	await expect(readPhoto(upload(SEALED_BYTES_OVERHEAD))).rejects.toMatchObject({ status: 400 });
	await expect(readPhoto(upload(100, 'application/json'))).rejects.toMatchObject({ status: 415 });
});
