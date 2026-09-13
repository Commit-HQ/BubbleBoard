/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

import { defaultLocale, notificationTexts } from '$lib/i18n';
import { notificationLocale, notify } from '$lib/notifications';
import { appPath } from '$lib/paths';

// BubbleBoard's service worker handles notifications only: no caching and no offline copies
// (next-step-plan.md). A push carries nothing, so every push shows the same words, in the language
// notifications were turned on in, and every push shows one, as Safari requires. The app's open windows load
// the board again straight away (src/routes/(app)/+layout.svelte), and a tap brings one forward, or opens one.

const worker = self as unknown as ServiceWorkerGlobalScope;

/** The app's open windows. */
async function appWindows() {
	const windows = await worker.clients.matchAll({ type: 'window', includeUncontrolled: true });
	return windows.filter((client) => new URL(client.url).origin === worker.location.origin);
}

worker.addEventListener('push', (event) => {
	event.waitUntil(
		Promise.all([
			notificationLocale()
				.catch(() => undefined)
				.then((locale = defaultLocale) =>
					notify(worker.registration, notificationTexts[locale], 'notice', {
						path: appPath(locale)
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
