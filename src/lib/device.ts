// The card this browser is connected with, kept in IndexedDB as CryptoKey objects that can't be exported
// (docs/access-format.md). A browser has one active card; the store is keyed by credential so a later
// version can keep several without migrating.

export type DeviceCard = { credential: string; cardHash: string } & (
	{ kind: 'staff'; unlockKey: CryptoKey } | { kind: 'family'; family: string; familyKey: CryptoKey }
);

const storeName = 'cards';

function open() {
	return new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open('bubbleboard', 1);
		request.onupgradeneeded = () =>
			request.result.createObjectStore(storeName, { keyPath: 'credential' });
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function transaction<T>(
	mode: IDBTransactionMode,
	use: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | undefined> {
	const db = await open();
	try {
		return await new Promise((resolve, reject) => {
			const tx = db.transaction(storeName, mode);
			const request = use(tx.objectStore(storeName));
			tx.oncomplete = () => resolve(request?.result);
			tx.onerror = () => reject(tx.error);
			tx.onabort = () => reject(tx.error);
		});
	} finally {
		db.close();
	}
}

export async function loadCard() {
	const [card] = (await transaction('readonly', (store) => store.getAll())) ?? [];
	return isDeviceCard(card) ? card : undefined;
}

/** Stores the active card, replacing any other. */
export async function saveCard(card: DeviceCard) {
	await transaction('readwrite', (store) => {
		store.clear();
		store.put(card);
	});
}

export async function forgetCard() {
	await transaction('readwrite', (store) => {
		store.clear();
	});
}

function isDeviceCard(value: unknown): value is DeviceCard {
	const card = value as Record<string, unknown> | undefined;
	if (typeof card?.credential !== 'string' || typeof card.cardHash !== 'string') return false;
	if (card.kind === 'staff') return card.unlockKey instanceof CryptoKey;
	return (
		card.kind === 'family' && typeof card.family === 'string' && card.familyKey instanceof CryptoKey
	);
}
