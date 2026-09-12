import { request } from '$lib/api';
import { fromBase64Url } from '$lib/base64url';
import { isLocale, messages, type Locale } from '$lib/i18n';

// Notifications on this device (next-step-plan.md). The server pushes nothing but a nudge, and the service
// worker shows the same words for every one, in the language notifications were turned on in, which this
// keeps in IndexedDB for it.

export type NotificationState = 'unsupported' | 'blocked' | 'off' | 'on';

function settings<T>(
	mode: IDBTransactionMode,
	use: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | undefined> {
	return new Promise((resolve, reject) => {
		const opening = indexedDB.open('bubbleboard-notifications', 1);
		opening.onupgradeneeded = () => opening.result.createObjectStore('settings');
		opening.onerror = () => reject(opening.error);
		opening.onsuccess = () => {
			const db = opening.result;
			const transaction = db.transaction('settings', mode);
			const reading = use(transaction.objectStore('settings'));
			transaction.oncomplete = () => {
				db.close();
				resolve(reading?.result);
			};
			transaction.onerror = () => {
				db.close();
				reject(transaction.error);
			};
		};
	});
}

/** The language notifications were turned on in, for the service worker. */
export async function notificationLocale() {
	const locale = await settings('readonly', (store) => store.get('locale'));
	return isLocale(locale) ? locale : undefined;
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

/**
 * Turns notifications on from a tap. The permission request comes first, straight from the tap, or Safari
 * refuses it. Then this device subscribes with the installation's key, tells the server, and shows a test.
 */
export async function turnOn(locale: Locale): Promise<NotificationState> {
	const permission = await Notification.requestPermission();
	if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';
	const [{ key }, registration] = await Promise.all([
		request<{ key: string }>('GET', '/api/push'),
		navigator.serviceWorker.ready
	]);
	const applicationServerKey = fromBase64Url(key)!;
	let subscription = await registration.pushManager.getSubscription();
	// A subscription made with another key would never get this installation's pushes.
	const subscribedWith = subscription?.options.applicationServerKey;
	const sameKey =
		subscribedWith &&
		new Uint8Array(subscribedWith).every((byte, index) => byte === applicationServerKey[index]);
	if (subscription && !sameKey) {
		await subscription.unsubscribe();
		subscription = null;
	}
	subscription ??= await registration.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey
	});
	await settings('readwrite', (store) => void store.put(locale, 'locale'));
	await request('PUT', '/api/push', { endpoint: subscription.endpoint });
	await registration.showNotification('BubbleBoard', {
		body: messages[locale].app.notifications.test,
		icon: '/icons/icon-192.png',
		tag: 'test'
	});
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

/** Sends this device's subscription again, which keeps it with the current session. */
export async function sendSubscription() {
	const subscription = await currentSubscription();
	if (subscription) await request('PUT', '/api/push', { endpoint: subscription.endpoint });
}
