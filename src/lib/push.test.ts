import { describe, expect, it } from 'vitest';
import { pushCode, pushKind, pushKinds } from './push';

// The one letter a push carries. Nothing else goes over the wire, so the letters have to stay apart, and a
// letter a device's service worker doesn't know yet has to mean something safe rather than nothing.

describe('what a push says happened', () => {
	it('gives every kind a letter of its own, so no two arrive as the same push', () => {
		expect(new Set(pushKinds.map(pushCode)).size).toBe(pushKinds.length);
		for (const kind of pushKinds) expect(pushKind(pushCode(kind))).toBe(kind);
	});

	it('reads a letter it doesn’t know as a notice, which every worker has words for', () => {
		// A phone keeps the worker it installed with until the app updates, so a kind added since then
		// arrives as a letter that worker's list doesn't have: it says the least rather than nothing.
		for (const unknown of [undefined, '', 'z', 'pp', '\u0000'])
			expect(pushKind(unknown)).toBe('notice');
	});
});
