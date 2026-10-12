import { describe, it, expect } from 'vitest';
import { meetingTimestamp, nextMeetingTime } from './meetings';
import { createContentKey, encryptData, decryptData } from './crypto';
describe('meeting times in Zagreb', () => {
	it('offers the next time where the last one ends, as long as it, within the day', () => {
		expect(nextMeetingTime()).toEqual({ from: '16:00', to: '16:20' });
		expect(nextMeetingTime({ from: '16:00', to: '16:20' })).toEqual({ from: '16:20', to: '16:40' });
		expect(nextMeetingTime({ from: '16:25', to: '17:10' })).toEqual({ from: '17:10', to: '17:55' });
		expect(nextMeetingTime({ from: '23:30', to: '23:50' })).toEqual({ from: '23:50', to: '23:59' });
		expect(nextMeetingTime({ from: '23:50', to: '23:59' })).toBeUndefined();
		expect(nextMeetingTime({ from: '23:30', to: '23:55' })).toBeUndefined();
		expect(nextMeetingTime({ from: '16:00', to: '' })).toEqual({ from: '16:00', to: '16:20' });
	});
	it('uses winter time and rejects invalid or nonexistent times', () => {
		expect(meetingTimestamp('2026-12-01', '16:00')).toBe(Date.parse('2026-12-01T15:00:00Z'));
		for (const [date, time] of [
			['2026-02-30', '16:00'],
			['2026-03-29', '02:30'],
			['bad', '16:00']
		])
			expect(meetingTimestamp(date, time)).toBeNaN();
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
