import { describe, expect, it } from 'vitest';
import { nextWaiting } from './gallery';

describe('the order an event’s photos open in', () => {
	it('opens them in order while the family is at the first one', () => {
		const waiting = [true, true, true];
		expect(nextWaiting(waiting, 0)).toBe(0);
		waiting[0] = false;
		expect(nextWaiting(waiting, 0)).toBe(1);
		waiting[1] = false;
		expect(nextWaiting(waiting, 0)).toBe(2);
		waiting[2] = false;
		expect(nextWaiting(waiting, 0)).toBe(-1);
	});

	it('opens the photo being looked at first, then the ones beside it', () => {
		const waiting = [true, true, true, true, true];
		expect(nextWaiting(waiting, 3)).toBe(3);
		waiting[3] = false;
		expect(nextWaiting(waiting, 3)).toBe(4);
		waiting[4] = false;
		expect(nextWaiting(waiting, 3)).toBe(2);
	});

	it('comes back to one that is asked for again, wherever it is', () => {
		const waiting = [false, false, true, false, false];
		expect(nextWaiting(waiting, 0)).toBe(2);
		expect(nextWaiting(waiting, 4)).toBe(2);
	});

	it('takes a gallery with nothing left, and a place outside it, as nothing to do', () => {
		expect(nextWaiting([], 0)).toBe(-1);
		expect(nextWaiting([false, false], 0)).toBe(-1);
		expect(nextWaiting([true, false], -5)).toBe(0);
		expect(nextWaiting([false, true], 99)).toBe(1);
	});
});
