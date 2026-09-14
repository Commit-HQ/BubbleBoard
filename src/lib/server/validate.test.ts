import { expect, it } from 'vitest';
import { toBase64Url } from '$lib/base64url';
import { createId, SEALED_BYTES_OVERHEAD } from '$lib/crypto';
import { maxFileBytes, maxNoticeFiles } from '$lib/files';
import { maxPhotoBytes } from '$lib/photos';
import {
	familyCards,
	familyLinks,
	infoChange,
	newChild,
	newClassroom,
	newNotice,
	noticeChange,
	photoDetails,
	pollAnswer,
	readFile,
	readPhoto,
	setup
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

it('refuses notices without classrooms, with a classroom twice, too big, up for other days, or unclear about a poll, its counts, or files', () => {
	const key = () => ({ classroom: createId(), noticeKey: envelope(48) });
	const file = createId();
	const notice = {
		id: createId(),
		content: envelope(200),
		days: 30,
		poll: true,
		counts: true,
		classrooms: [key(), key()],
		files: [file, file]
	};
	expect(newNotice(notice)).toMatchObject({ counts: true, files: [file] });
	expect(newNotice(notice).classrooms).toHaveLength(2);
	expect(noticeChange({ ...notice, announce: false })).toMatchObject({
		announce: false,
		poll: true,
		counts: true
	});
	for (const refused of [
		// A device from before notices carried files, which would take them off a notice it changes.
		{ ...notice, files: undefined },
		{ ...notice, classrooms: [] },
		{ ...notice, classrooms: [notice.classrooms[0], notice.classrooms[0]] },
		{ ...notice, days: 2 },
		{ ...notice, content: envelope(40 * 1024) },
		{ ...notice, poll: 'yes' },
		{ ...notice, poll: undefined },
		// A device from before families could see a poll's counts, and counts without a poll.
		{ ...notice, counts: undefined },
		{ ...notice, poll: false },
		{ ...notice, files: ['menu.pdf'] },
		{ ...notice, files: Array.from({ length: maxNoticeFiles + 1 }, createId) }
	]) {
		expect(() => newNotice(refused)).toThrow();
	}
	expect(() => noticeChange(notice)).toThrow();
});

it('refuses a poll answer bigger than the option it names, or unclear about the poll’s counts', () => {
	expect(pollAnswer({ choice: envelope(40), counts: false })).toEqual({
		choice: envelope(40),
		counts: false
	});
	for (const answer of [
		{ choice: envelope(1024), counts: false },
		{ choice: 'Tuesday', counts: false },
		{ counts: true },
		{ choice: envelope(40) }
	]) {
		expect(() => pollAnswer(answer)).toThrow();
	}
});

it('reads a board photo’s encrypted details from beside its bytes', () => {
	const upload = (details?: string) =>
		new Request('https://bubbleboard.example.com/api', {
			method: 'PUT',
			headers: details === undefined ? {} : { 'bubbleboard-photo-details': details }
		});
	expect(photoDetails(upload(envelope(40)))).toBe(envelope(40));
	for (const details of [undefined, 'Ana Horvat', envelope(2048)]) {
		expect(() => photoDetails(upload(details))).toThrow();
	}
});

it('reads a photo’s or a file’s encrypted bytes, holding something and no bigger than is kept', async () => {
	const upload = (bytes: number, type = 'application/octet-stream') =>
		new Request('https://bubbleboard.example.com/api', {
			method: 'PUT',
			headers: { 'content-type': type },
			body: new Uint8Array(bytes)
		});
	for (const [read, max] of [
		[readPhoto, maxPhotoBytes],
		[readFile, maxFileBytes]
	] as const) {
		expect(await read(upload(SEALED_BYTES_OVERHEAD + 1))).toHaveLength(SEALED_BYTES_OVERHEAD + 1);
		expect(await read(upload(max + SEALED_BYTES_OVERHEAD))).toHaveLength(
			max + SEALED_BYTES_OVERHEAD
		);
		await expect(read(upload(max + SEALED_BYTES_OVERHEAD + 1))).rejects.toMatchObject({
			status: 413
		});
		await expect(read(upload(SEALED_BYTES_OVERHEAD))).rejects.toMatchObject({ status: 400 });
		await expect(read(upload(100, 'application/json'))).rejects.toMatchObject({ status: 415 });
	}
});

it('reads a new classroom with the info page’s key when it brings one', () => {
	const classroom = { id: createId(), profile: envelope(20), groupKeyForStaff: envelope(48) };
	expect(newClassroom(classroom)).not.toHaveProperty('infoKey');
	expect(newClassroom({ ...classroom, infoKey: envelope(48) })).toMatchObject({
		infoKey: envelope(48)
	});
	expect(() => newClassroom({ ...classroom, infoKey: 'key' })).toThrow();
});

it('refuses an info page too big or without its files, and a first save without a key for staff or with a classroom twice', () => {
	const file = createId();
	const change = { content: envelope(200), files: [file, file] };
	expect(infoChange(change)).toEqual({ content: envelope(200), files: [file] });
	const key = () => ({ classroom: createId(), infoKey: envelope(48) });
	const first = { ...change, infoKeyForStaff: envelope(48), classrooms: [key(), key()] };
	expect(infoChange(first)).toMatchObject({ infoKeyForStaff: envelope(48), files: [file] });
	expect(infoChange({ ...first, classrooms: [] })).toMatchObject({ classrooms: [] });
	for (const refused of [
		{ ...change, files: undefined },
		{ ...change, content: envelope(40 * 1024) },
		{ ...change, files: Array.from({ length: maxNoticeFiles + 1 }, createId) },
		{ ...first, infoKeyForStaff: 'key' },
		{ ...first, classrooms: undefined },
		{ ...first, classrooms: [first.classrooms[0], first.classrooms[0]] }
	]) {
		expect(() => infoChange(refused)).toThrow();
	}
});
