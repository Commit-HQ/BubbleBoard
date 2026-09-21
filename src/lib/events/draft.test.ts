import { describe, expect, it } from 'vitest';
import { draftLife, openable, savedDraft, type SavedDraft } from './draft';
import type { NoticeDocument } from '$lib/notices';
import { commit, emptyEdit, manualRegion } from './editor';

const details = {
	classroom: 'group',
	title: 'Spring walk',
	date: '2026-09-21',
	days: 30,
	description: { type: 'doc', content: [] } as NoticeDocument,
	step: 'review' as const
};

describe('an unfinished event on the device', () => {
	it('keeps the marks a photo has now, and comes back to the photos rather than the review', () => {
		const region = manualRegion('face', 200, 100);
		const history = commit(commit(emptyEdit(), [region], 'face'), [{ ...region, child: 'ana' }]);
		const draft = savedDraft(
			'card',
			details,
			[{ id: 'photo', width: 200, height: 100, text: 'Ana', detection: 'ready', history }],
			1000
		);
		expect(draft).toEqual({
			...details,
			step: 'photos',
			credential: 'card',
			savedAt: 1000,
			photos: [
				{
					id: 'photo',
					width: 200,
					height: 100,
					text: 'Ana',
					detection: 'ready',
					edit: history.present
				}
			]
		});
		expect(JSON.stringify(draft)).not.toContain('past');
	});

	it('opens only this card’s draft, only for a week, and only with photos in it', () => {
		const draft = savedDraft('card', details, [
			{ id: 'photo', width: 200, height: 100, text: '', detection: 'pending', history: emptyEdit() }
		]);
		expect(openable(draft, 'card')).toBe(draft);
		expect(openable(draft, 'another')).toBeUndefined();
		expect(openable(draft, 'card', draft.savedAt + draftLife)).toBeUndefined();
		expect(openable(savedDraft('card', details, []), 'card')).toBeUndefined();
		expect(openable(undefined, 'card')).toBeUndefined();
		expect(openable({ credential: 'card' } as unknown as SavedDraft, 'card')).toBeUndefined();
	});
});
