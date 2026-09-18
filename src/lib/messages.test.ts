import { expect, it } from 'vitest';
import { createContentKey } from '$lib/crypto';
import { chargesAllowance, messageClock, openMessage, sealMessage } from '$lib/messages';
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
it('groups messages by the kindergarten’s day, not the device’s', () => {
	// Midnight in Zagreb, an hour before UTC's, starts the next day for everyone.
	expect(messageClock(Date.parse('2026-09-17T22:30Z')).date).toBe('2026-09-18');
	expect(messageClock(Date.parse('2026-09-17T21:30Z')).date).toBe('2026-09-17');
});
