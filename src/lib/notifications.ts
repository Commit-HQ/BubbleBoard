import { request } from '$lib/api';
import { fromBase64Url } from '$lib/base64url';
import { isLocale, messages, type Locale } from '$lib/i18n';
import { objectStore } from '$lib/indexeddb';

// Notifications on this device (next-step-plan.md). The server pushes nothing but a nudge, and the service
// worker shows the same words for every one, in the language notifications were turned on in, which this
// keeps in IndexedDB for it, along with whether Not now put away home's card that turns them on.

export type NotificationState = 'unsupported' | 'blocked' | 'off' | 'on';

/** The browser's push service refused to subscribe, as in Brave until Google's push messaging is allowed. */
export class PushUnavailableError extends Error {
	/** Brave says it has a push service, so its explanation names the setting that lets it work. */
	readonly code = 'brave' in navigator ? 'push-brave' : 'push-unavailable';

	constructor(options?: ErrorOptions) {
		super('Push service unavailable', options);
		this.name = 'PushUnavailableError';
	}
}

const settings = objectStore('bubbleboard-notifications', 'settings');

/** The language notifications were turned on in, for the service worker. */
export async function notificationLocale() {
	const locale = await settings('readonly', (store) => store.get('locale'));
	return isLocale(locale) ? locale : undefined;
}

/** Whether Not now put away home's card that turns notifications on, on this device. */
export async function homeCardHidden() {
	return (await settings('readonly', (store) => store.get('homeCardHidden'))) === true;
}

export async function hideHomeCard() {
	await settings('readwrite', (store) => void store.put(true, 'homeCardHidden'));
}

/**
 * Shows a notification with these words as its title. Phones and computers already say which app it's from,
 * so a title of "BubbleBoard" would say it twice.
 */
export function notify(
	registration: ServiceWorkerRegistration,
	title: string,
	tag: string,
	data?: unknown
) {
	return registration.showNotification(title, { icon: '/icons/icon-192.png', tag, data });
}

function supported() {
	return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function currentSubscription() {
	const registration = await navigator.serviceWorker.getRegistration();
	return (await registration?.pushManager.getSubscription()) ?? undefined;
}

export async function notificationState(): Promise<NotificationState> {
	if (!supported()) return 'unsupported';
	if (Notification.permission === 'denied') return 'blocked';
	if (Notification.permission !== 'granted') return 'off';
	return (await currentSubscription()) ? 'on' : 'off';
}

/** The installation's public key, which devices subscribe with. */
async function installationKey() {
	const { key } = await request<{ key: string }>('GET', '/api/push');
	return fromBase64Url(key)!;
}

/** Whether a subscription was made with the installation's key, or undefined where the browser doesn't say. */
function madeWith(subscription: PushSubscription, key: Uint8Array<ArrayBuffer>) {
	const used = subscription.options.applicationServerKey;
	if (!used) return undefined;
	const bytes = new Uint8Array(used);
	return bytes.length === key.length && bytes.every((byte, index) => byte === key[index]);
}

function subscribe(
	registration: ServiceWorkerRegistration,
	applicationServerKey: Uint8Array<ArrayBuffer>
) {
	return registration.pushManager
		.subscribe({ userVisibleOnly: true, applicationServerKey })
		.catch((cause) => {
			throw new PushUnavailableError({ cause });
		});
}

/**
 * Turns notifications on from a tap. The permission request comes first, straight from the tap, or Safari
 * refuses it. Then this device subscribes with the installation's key, tells the server, and shows a test.
 */
export async function turnOn(locale: Locale): Promise<NotificationState> {
	const permission = await Notification.requestPermission();
	if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';
	const [key, registration] = await Promise.all([installationKey(), navigator.serviceWorker.ready]);
	let subscription = await registration.pushManager.getSubscription();
	// A subscription made with another key would never get this installation's pushes.
	if (subscription && madeWith(subscription, key) !== true) {
		await subscription.unsubscribe();
		subscription = null;
	}
	subscription ??= await subscribe(registration, key);
	await settings('readwrite', (store) => void store.put(locale, 'locale'));
	await request('PUT', '/api/push', { endpoint: subscription.endpoint });
	await notify(registration, messages[locale].app.notifications.test, 'test');
	return 'on';
}

/** Ends this device's subscription in the browser, as when the device disconnects. */
export async function forgetSubscription() {
	await (await currentSubscription())?.unsubscribe();
}

export async function turnOff() {
	await forgetSubscription();
	await request('DELETE', '/api/push');
}

/**
 * Sends this device's subscription again, which keeps it with the current session, and says whether
 * notifications are still on. A subscription made with an earlier key, as when the installation's key was
 * replaced, would never get a push, so it's renewed with the current key first. A browser that won't subscribe
 * without a tap ends it instead, and notifications show as off until they're turned on again.
 */
export async function sendSubscription(): Promise<NotificationState> {
	const registration = await navigator.serviceWorker.getRegistration();
	let subscription = await registration?.pushManager.getSubscription();
	if (!registration || !subscription) return 'off';
	const key = await installationKey();
	if (madeWith(subscription, key) === false) {
		await subscription.unsubscribe();
		subscription = await subscribe(registration, key).catch(() => null);
		if (!subscription) {
			await request('DELETE', '/api/push');
			return 'off';
		}
	}
	await request('PUT', '/api/push', { endpoint: subscription.endpoint });
	return 'on';
}
