/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

import { defaultLocale, notificationTexts } from '$lib/i18n';
import { notificationLocale, notify } from '$lib/notifications';
import { appPath, type AppPage } from '$lib/paths';
import { pushKind, type PushKind } from '$lib/push';

// BubbleBoard's service worker handles notifications only: no caching and no offline copies
// (next-step-plan.md). A push carries one letter saying what happened and nothing more, so the words are
// these, in the language notifications were turned on in, and every push shows one, as Safari requires. The
// app's open windows load the board again, straight away in view or once back in view
// (src/lib/app/state.svelte.ts), and a tap brings one forward, or opens one, on the page it's about.

const worker = self as unknown as ServiceWorkerGlobalScope;

/** The page a tap opens, by what happened. A notice or board photo is on the board, which is home. */
const pages: Record<PushKind, AppPage | undefined> = {
	notice: undefined,
	message: 'messages',
	slots: 'meetings',
	booking: 'meetings'
};

/** What a push says happened. One that carries nothing, as a device that hasn't sent its keys gets, is a notice. */
function kindOf(event: PushEvent): PushKind {
	try {
		return pushKind(event.data?.text());
	} catch {
		return 'notice';
	}
}

/** The app's open windows. */
async function appWindows() {
	const windows = await worker.clients.matchAll({ type: 'window', includeUncontrolled: true });
	return windows.filter((client) => new URL(client.url).origin === worker.location.origin);
}

worker.addEventListener('push', (event) => {
	const kind = kindOf(event);
	event.waitUntil(
		Promise.all([
			notificationLocale()
				.catch(() => undefined)
				.then((locale = defaultLocale) =>
					// The tag is the kind, so a second message replaces the first without burying a cancelled
					// meeting time.
					notify(worker.registration, notificationTexts[locale][kind], kind, {
						path: appPath(locale, pages[kind])
					})
				),
			appWindows().then((windows) => windows.forEach((client) => client.postMessage('board')))
		])
	);
});

worker.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const path: string = event.notification.data?.path ?? appPath(defaultLocale);
	event.waitUntil(
		appWindows().then(([open]) => {
			if (!open) return worker.clients.openWindow(path);
			// A window that was asleep may have missed the push.
			open.postMessage('board');
			return open.focus();
		})
	);
});
