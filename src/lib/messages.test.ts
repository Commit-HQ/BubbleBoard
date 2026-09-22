import { expect, it, vi } from 'vitest';
import { createContentKey } from '$lib/crypto';
import {
	chargesAllowance,
	defaultSchedule,
	messageClock,
	mergeRecentMessages,
	openConversation,
	openMessage,
	sealSubject,
	sealMessage,
	sendingLeft
} from '$lib/messages';

it('resets a non-overlapping refresh so missing messages remain reachable through older pages', () => {
	const message = (sequence: number) => ({
		id: String(sequence),
		sequence,
		content: '',
		author: 'teacher:1',
		postedAt: 0,
		editedAt: null,
		deletedAt: null
	});
	const history = Array.from({ length: 110 }, (_, i) => message(i + 1));
	const refreshed = mergeRecentMessages(history.slice(0, 50), history.slice(-50));
	expect(refreshed).toEqual(history.slice(60));
	// The same before-cursor used by the page can now reach the gap rather than skipping back to 1.
	const older = history.filter((row) => row.sequence < refreshed[0].sequence).slice(-50);
	expect([...older, ...refreshed].map((row) => row.sequence)).toEqual(
		history.slice(10).map((row) => row.sequence)
	);
	expect(mergeRecentMessages(history.slice(0, 70), history.slice(60))).toEqual(history);
	expect(mergeRecentMessages(history, [])).toEqual([]);
});

it('reuses decrypted inbox content while updating metadata and decrypting changed content', async () => {
	const { key } = await createContentKey();
	const record = {
		id: 'conversation',
		family: 'family',
		classroom: 'classroom',
		title: await sealSubject('Subject', key, 'classroom', 'conversation'),
		content: await sealMessage(
			{ text: 'First', name: 'Teacher' },
			key,
			'classroom',
			'message1',
			'conversation'
		),
		messageId: 'message1',
		author: 'teacher:1',
		closed: 0,
		createdAt: 0,
		postedAt: 1,
		lastSequence: 1,
		readSequence: 0,
		seenSequence: 0,
		editedAt: null,
		deletedAt: null
	};
	const previous = { key, conversation: await openConversation(record, key) };
	const next = {
		...record,
		content: await sealMessage(
			{ text: 'Second', name: 'Teacher' },
			key,
			'classroom',
			'message2',
			'conversation'
		),
		messageId: 'message2',
		lastSequence: 2
	};
	const decrypt = vi.spyOn(crypto.subtle, 'decrypt');
	try {
		const refreshed = await openConversation(
			{ ...record, readSequence: 1, closed: 1 },
			key,
			previous
		);
		expect(refreshed).toMatchObject({
			subject: 'Subject',
			preview: 'First',
			readSequence: 1,
			closed: 1
		});
		expect(decrypt).not.toHaveBeenCalled();
		expect(await openConversation(next, key, previous)).toMatchObject({
			subject: 'Subject',
			preview: 'Second'
		});
		expect(decrypt).toHaveBeenCalledTimes(1);
		await expect(
			openConversation({ ...record, classroom: 'other' }, key, previous)
		).rejects.toThrow();
		await expect(
			openConversation(record, (await createContentKey()).key, previous)
		).rejects.toThrow();
	} finally {
		decrypt.mockRestore();
	}
});
it('binds private content to its family key, classroom, message and conversation', async () => {
	const { key } = await createContentKey();
	const content = await sealMessage(
		{ text: 'Private reply', name: 'Teacher' },
		key,
		'classroom',
		'message',
		'conversation'
	);
	const row = {
		id: 'message',
		sequence: 1,
		author: 'teacher:id',
		content,
		postedAt: 0,
		editedAt: null,
		deletedAt: null
	};
	expect((await openMessage(row, key, 'classroom', 'conversation')).text).toBe('Private reply');
	await expect(
		openMessage(row, (await createContentKey()).key, 'classroom', 'conversation')
	).rejects.toThrow();
	await expect(openMessage(row, key, 'another-classroom', 'conversation')).rejects.toThrow();
	await expect(
		openMessage({ ...row, id: 'another-message' }, key, 'classroom', 'conversation')
	).rejects.toThrow();
	await expect(openMessage(row, key, 'classroom', 'another-conversation')).rejects.toThrow();
});
it('spends an inquiry on every family message a teacher hasn’t answered', () => {
	expect(chargesAllowance(undefined)).toBe(true);
	expect(chargesAllowance('family:id')).toBe(true);
	expect(chargesAllowance('teacher:id')).toBe(false);
});
it('counts the minutes left of today’s sending window', () => {
	const settings = {
		classroom: 'c',
		enabled: true,
		monthlyLimit: 3,
		revision: 0,
		schedule: defaultSchedule()
	};
	// Monday, 08:00–16:00 Zagreb.
	expect(sendingLeft(settings, Date.parse('2026-09-14T13:40Z'))).toBe(20);
	expect(sendingLeft(settings, Date.parse('2026-09-14T06:00Z'))).toBe(480);
	expect(sendingLeft(settings, Date.parse('2026-09-14T14:00Z'))).toBeUndefined();
	expect(sendingLeft(settings, Date.parse('2026-09-19T08:00Z'))).toBeUndefined();
	expect(
		sendingLeft({ ...settings, enabled: false }, Date.parse('2026-09-14T08:00Z'))
	).toBeUndefined();
});
it('groups messages by the kindergarten’s day, not the device’s', () => {
	// Midnight in Zagreb, an hour before UTC's, starts the next day for everyone.
	expect(messageClock(Date.parse('2026-09-17T22:30Z')).date).toBe('2026-09-18');
	expect(messageClock(Date.parse('2026-09-17T21:30Z')).date).toBe('2026-09-17');
});

it('opens a deleted message as the placeholder, without decrypting anything', async () => {
	const { key } = await createContentKey();
	const decrypt = vi.spyOn(crypto.subtle, 'decrypt');
	try {
		const row = {
			id: 'message',
			sequence: 1,
			author: 'teacher:id',
			// A deleted message's ciphertext is gone, so there is nothing an envelope could be read from.
			content: '',
			postedAt: 0,
			editedAt: null,
			deletedAt: 5
		};
		const opened = await openMessage(row, key, 'classroom', 'conversation');
		expect(opened).toMatchObject({ text: '', name: '', deletedAt: 5 });
		expect(opened.files).toBeUndefined();
		expect(decrypt).not.toHaveBeenCalled();
	} finally {
		decrypt.mockRestore();
	}
});
