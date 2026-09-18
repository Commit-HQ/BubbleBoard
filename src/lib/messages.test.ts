import { expect, it } from 'vitest';
import { createContentKey } from '$lib/crypto';
import {
	chargesAllowance,
	defaultSchedule,
	messageClock,
	openMessage,
	sealMessage,
	sendingLeft
} from '$lib/messages';
it('binds private content to its family key, classroom, message and conversation', async () => {
	const { key } = await createContentKey();
	const content = await sealMessage(
		{ text: 'Private reply', name: 'Teacher' },
		key,
		'classroom',
		'message',
		'conversation'
	);
	const row = { id: 'message', sequence: 1, author: 'teacher:id', content, postedAt: 0 };
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
