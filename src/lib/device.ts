import { objectStore } from '$lib/indexeddb';

// The card this browser is connected with, kept in IndexedDB as CryptoKey objects that can't be exported
// (docs/access-format.md). A browser has one active card; the store is keyed by credential so a later
// version can keep several without migrating.

export type DeviceCard = { credential: string; cardHash: string } & (
	{ kind: 'staff'; unlockKey: CryptoKey } | { kind: 'family'; family: string; familyKey: CryptoKey }
);

const cards = objectStore('bubbleboard', 'cards', { keyPath: 'credential' });

export async function loadCard() {
	const [card] = (await cards('readonly', (store) => store.getAll())) ?? [];
	return isDeviceCard(card) ? card : undefined;
}

/** Stores the active card, replacing any other. */
export async function saveCard(card: DeviceCard) {
	await cards('readwrite', (store) => {
		store.clear();
		store.put(card);
	});
}

export async function forgetCard() {
	await cards('readwrite', (store) => {
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
