/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

import { defaultLocale, notificationTexts } from '$lib/i18n';
import { notificationLocale, notify } from '$lib/notifications';
import { appPath, type AppPage } from '$lib/paths';
import { pushKind, type PushKind } from '$lib/push';

// BubbleBoard's service worker handles notifications only: no caching and no offline copies
// (decisions.md). A push carries one letter saying what happened and nothing more, so the words are
// these, in the language notifications were turned on in, and every push shows one, as Safari requires. The
// app's open windows are told what happened and load what it changed, straight away in view or once back in
// view (src/routes/(app)/+layout.svelte), and a tap brings one forward, or opens one, on the page it's about.

const worker = self as unknown as ServiceWorkerGlobalScope;

// A new worker takes over the moment it arrives, rather than waiting for every window to close first. This
// one serves no page and caches nothing, so there is no half-old copy of the app it could leave behind; and a
// phone that keeps the app open, even only in the background, is a window that never closes, which would
// leave that device on the worker it installed with for as long as it goes on using the app. Claiming the
// windows that are already open is the other half: a tap can only send a window the worker controls.
worker.addEventListener('install', () => worker.skipWaiting());
worker.addEventListener('activate', (event) => event.waitUntil(worker.clients.claim()));

/** The page a tap opens, by what happened. A notice or board photo is on the board, which is home. */
const pages: Record<PushKind, AppPage | undefined> = {
	notice: undefined,
	message: 'messages',
	slots: 'meetings',
	booking: 'meetings',
	// An event's photos are reached from the board, which is home: a push must never say which event.
	photos: undefined,
	corkboard: undefined
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
			appWindows().then((windows) =>
				windows.forEach((client) => client.postMessage({ type: 'push', kind }))
			)
		])
	);
});

/** A tap brings a window forward on the page the notification is about, or opens one there. */
async function openPage(path: string, kind: string) {
	const [open] = await appWindows();
	if (!open) {
		await worker.clients.openWindow(path);
		return;
	}
	await open.focus();
	// A window is wherever it was last left, which is rarely the page the notification is about, so it's
	// sent there and loads the board on the way. A window already on that page loads what the notification
	// is about again instead, as does one this worker doesn't control yet and so can't send: asleep, it may
	// have missed the push.
	const elsewhere = new URL(open.url).pathname !== path;
	const sent =
		elsewhere &&
		(await open
			.navigate(path)
			.then(() => true)
			.catch(() => false));
	if (!sent) open.postMessage({ type: 'push', kind });
}

worker.addEventListener('notificationclick', (event) => {
	event.notification.close();
	// The tag is the kind (`notify` above).
	event.waitUntil(
		openPage(event.notification.data?.path ?? appPath(defaultLocale), event.notification.tag)
	);
});
