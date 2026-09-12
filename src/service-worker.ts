/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

import { defaultLocale, messages } from '$lib/i18n';
import { notificationLocale } from '$lib/notifications';
import { appPath } from '$lib/paths';

// BubbleBoard's service worker handles notifications only: no caching and no offline copies
// (next-step-plan.md). A push carries nothing, so every push shows the same words, in the language
// notifications were turned on in, and every push shows one, as Safari requires. A tap opens the board.

const worker = self as unknown as ServiceWorkerGlobalScope;

worker.addEventListener('push', (event) => {
	event.waitUntil(
		notificationLocale()
			.catch(() => undefined)
			.then((locale = defaultLocale) =>
				worker.registration.showNotification('BubbleBoard', {
					body: messages[locale].app.notifications.push,
					icon: '/icons/icon-192.png',
					tag: 'notice',
					data: { path: appPath(locale) }
				})
			)
	);
});

worker.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const path: string = event.notification.data?.path ?? appPath(defaultLocale);
	event.waitUntil(
		worker.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
			// An open app loads the board again when it comes into view.
			const open = windows.find((client) => new URL(client.url).origin === worker.location.origin);
			return open ? open.focus() : worker.clients.openWindow(path);
		})
	);
});
