import type { PushKind } from '$lib/push';
import type { Attachment } from 'svelte/attachments';
import { postedAt, type App } from './state.svelte';

// What a tapped notification was about (src/routes/(app)/+layout.svelte) comes into view and a soap bubble's
// colours run round its border for a few seconds (`[data-spotlight]` in app.css). A push never says which notice, event, or message it was, so
// it's the newest of its kind this device has, which is the one it announced unless another came since.

let current = $state<string>();
let timer: ReturnType<typeof setTimeout> | undefined;

/** Lights up the card with this ID, once it's on the page, if it gets there within a few seconds. */
export function spotlight(id: string | undefined) {
	current = id;
	clearTimeout(timer);
	timer = setTimeout(() => (current = undefined), 5000);
}

/** Goes on the card of anything a notification can be about, with its ID. */
export function spotlit(id: string): Attachment<HTMLElement> {
	return (element) => {
		if (current !== id) return;
		current = undefined;
		// A frame later, once the page around it is laid out. A card taller than half the screen comes in at
		// the top, so its beginning shows.
		requestAnimationFrame(() => {
			element.scrollIntoView({
				block: element.offsetHeight < innerHeight / 2 ? 'center' : 'start',
				inline: 'nearest'
			});
			element.dataset.spotlight = '';
		});
		// The glow and the border fade out together, and then it goes.
		const done = ({ animationName }: AnimationEvent) => {
			if (animationName !== 'spotlight') return;
			delete element.dataset.spotlight;
			element.removeEventListener('animationend', done);
		};
		element.addEventListener('animationend', done);
	};
}

const newestOf = <T>(items: T[], at: (item: T) => number) =>
	items.toSorted((a, b) => at(b) - at(a))[0];

/**
 * The ID of what a notification of this kind is about, as far as this device can tell: the newest notice,
 * event, or board photo, the conversation with the newest unread message, or the family's next meeting for
 * tomorrow's reminder. Which meeting times are new, or which booking changed, it can't tell, so those light
 * up home's meetings card, which leads to them.
 */
export function tappedTarget(app: App, kind: PushKind) {
	switch (kind) {
		case 'notice':
			return newestOf(
				app.board.filter((notice) => !app.isHidden(notice)),
				postedAt
			)?.id;
		case 'photos':
			return newestOf(
				app.events.filter((event) => !app.isHidden(event)),
				postedAt
			)?.id;
		case 'corkboard':
			return newestOf(app.photos, (photo) => photo.postedAt)?.id;
		case 'message':
		case 'report':
			return newestOf(
				app.conversations.filter((item) => item.lastSequence > item.readSequence),
				(item) => item.postedAt
			)?.id;
		case 'slots':
		case 'booking':
			return 'meetings';
		case 'tomorrow':
			return newestOf(
				app.meetings.filter((slot) => slot.mine && slot.start > Date.now()),
				(slot) => -slot.start
			)?.id;
	}
}
