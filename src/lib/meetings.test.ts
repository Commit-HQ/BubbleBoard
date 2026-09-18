import { describe, it, expect } from 'vitest';
import { generateMeetingSlots, meetingTimestamp } from './meetings';
import { createContentKey, encryptData, decryptData } from './crypto';
describe('meeting times in Zagreb', () => {
	it('splits a time window without extending it', () => {
		const slots = generateMeetingSlots('2026-09-24', '16:00', '18:05', 20);
		expect(slots).toHaveLength(6);
		expect(slots[0].start).toBe(Date.parse('2026-09-24T14:00:00Z'));
		expect(slots.at(-1)?.end).toBe(Date.parse('2026-09-24T16:00:00Z'));
	});
	it('uses winter time and rejects invalid or nonexistent times', () => {
		expect(meetingTimestamp('2026-12-01', '16:00')).toBe(Date.parse('2026-12-01T15:00:00Z'));
		for (const [date, time] of [
			['2026-02-30', '16:00'],
			['2026-03-29', '02:30'],
			['bad', '16:00']
		])
			expect(meetingTimestamp(date, time)).toBeNaN();
		expect(generateMeetingSlots('2026-09-24', '18:00', '16:00', 20)).toEqual([]);
		expect(generateMeetingSlots('2026-09-24', '16:00', '18:00', 0)).toEqual([]);
	});
	it('binds an invitation to its child, offer and family key', async () => {
		const { key } = await createContentKey();
		const context = { purpose: 'meeting-invite' as const, classroom: 'offer', child: 'child' };
		const label = await encryptData({ name: 'Lana' }, key, context);
		expect(await decryptData(label, key, context)).toEqual({ name: 'Lana' });
		await expect(decryptData(label, key, { ...context, child: 'other' })).rejects.toThrow();
		await expect(decryptData(label, key, { ...context, classroom: 'other' })).rejects.toThrow();
		await expect(decryptData(label, (await createContentKey()).key, context)).rejects.toThrow();
	});
});
