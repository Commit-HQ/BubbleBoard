import { expect, it } from 'vitest';
import { createContentKey } from '$lib/crypto';
import { openMessage, sealMessage } from '$lib/messages';
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
