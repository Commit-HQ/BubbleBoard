// IndexedDB for what a device keeps: its card (device.ts) and its notification settings (notifications.ts),
// each in a database of its own with one object store. Browser-only.

/** Transactions on a database's one store, which the first use creates. Each returns what `use` read. */
export function objectStore(database: string, name: string, options?: IDBObjectStoreParameters) {
	return async <T>(
		mode: IDBTransactionMode,
		use: (store: IDBObjectStore) => IDBRequest<T> | void
	): Promise<T | undefined> => {
		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const opening = indexedDB.open(database, 1);
			opening.onupgradeneeded = () => opening.result.createObjectStore(name, options);
			opening.onsuccess = () => resolve(opening.result);
			opening.onerror = () => reject(opening.error);
		});
		try {
			return await new Promise((resolve, reject) => {
				const transaction = db.transaction(name, mode);
				const request = use(transaction.objectStore(name));
				transaction.oncomplete = () => resolve(request?.result);
				transaction.onerror = () => reject(transaction.error);
				transaction.onabort = () => reject(transaction.error);
			});
		} finally {
			db.close();
		}
	};
}
