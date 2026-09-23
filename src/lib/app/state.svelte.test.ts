import { afterEach, expect, it, vi } from 'vitest';
vi.mock('$app/navigation', () => ({ replaceState: vi.fn() }));
vi.mock('$app/state', () => ({ page: { url: new URL('https://example.test/app') } }));
vi.mock('$lib/device', () => ({
	saveCard: async () => {},
	forgetCard: async () => {},
	homeCards: ['notifications', 'device-name'],
	hiddenHomeCards: async () => [],
	keepHiddenHomeCards: async () => {}
}));
vi.mock('$lib/notifications', () => ({
	forgetSubscription: async () => {},
	notificationState: async () => 'off'
}));
vi.mock('$lib/crypto', async (original) => ({
	...(await original<object>()),
	deriveCredential: async () => ({ authToken: 'token', unlockKey: {} }),
	hashAuthToken: async () => 'hash'
}));
vi.mock('$lib/kindergarten', async (original) => ({
	...(await original<object>()),
	openStaffKeys: async () => ({ staffKey: {} }),
	openCatalog: vi.fn(async (_key: unknown, records: unknown) => records)
}));
vi.mock('$lib/info', async (original) => ({
	...(await original<object>()),
	openInfoForStaff: async () => ({ pages: [], unreadable: 0 })
}));
vi.mock('$lib/api', async (original) => ({
	...(await original<object>()),
	request: vi.fn(),
	requestBytes: vi.fn()
}));
vi.mock('$lib/events/cache', () => ({
	cachedPicture: vi.fn(async () => undefined),
	cachePicture: vi.fn(async () => {}),
	keepCachedPictures: vi.fn(async () => {}),
	clearCachedPictures: vi.fn(async () => {})
}));
vi.mock('$lib/events/package', async (original) => ({
	...(await original<object>()),
	renderPackage: vi.fn()
}));
import { request, requestBytes, ApiError } from '$lib/api';
import {
	cachePicture,
	cachedPicture,
	clearCachedPictures,
	keepCachedPictures
} from '$lib/events/cache';
import { renderPackage } from '$lib/events/package';
import type { OpenEvent } from '$lib/events/types';
import { openCatalog } from '$lib/kindergarten';
import { App } from './state.svelte';

function deferred<T>() {
	let resolve!: (value: T) => void, reject!: (cause: unknown) => void;
	const promise = new Promise<T>((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
}
const access = {
	kind: 'staff',
	credential: 'credential',
	teacher: 'teacher',
	kindergarten: {
		revision: 0,
		classrooms: [],
		families: [],
		children: [],
		teachers: [{ id: 'teacher', name: 'Private name', role: 'head' }]
	},
	notices: [],
	photos: [],
	info: { pages: [] },
	mutedClassrooms: []
};
async function connected() {
	vi.stubGlobal('document', { visibilityState: 'visible' });
	vi.mocked(request).mockImplementation(async (_method, path) => {
		if (path === '/api/connect') return access as never;
		if (path === '/api/messages') return { conversations: [], policies: [] } as never;
		if (path === '/api/meetings') return { slots: [], invites: [] } as never;
		return undefined as never;
	});
	const app = new App();
	await app.connect(new Uint8Array(32));
	expect(app.status).toBe('staff');
	return app;
}
afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});
it('ignores a refresh response after sign-out', async () => {
	const app = await connected();
	const response = deferred<typeof access>();
	vi.mocked(request).mockImplementationOnce(async () => response.promise as never);
	const refreshing = app.refresh({ now: true });
	await app.signOut();
	response.resolve(access);
	await refreshing;
	expect(app.status).toBe('disconnected');
	expect(app.catalog.teachers).toEqual([]);
	expect(app.myName).toBeUndefined();
});
it('ignores decryption that completes after sign-out', async () => {
	const app = await connected();
	const decrypting = deferred<typeof access.kindergarten>();
	const started = deferred<void>();
	vi.mocked(request).mockResolvedValueOnce(access as never);
	vi.mocked(openCatalog).mockImplementationOnce(async () => {
		started.resolve();
		return decrypting.promise as never;
	});
	const refreshing = app.refresh({ now: true });
	await started.promise;
	await app.signOut();
	decrypting.resolve(access.kindergarten);
	await refreshing;
	expect(app.status).toBe('disconnected');
	expect(app.catalog.teachers).toEqual([]);
});
it('does not let an old request failure disconnect a newly connected card', async () => {
	const app = await connected();
	const response = deferred<typeof access>();
	vi.mocked(request).mockImplementationOnce(async () => response.promise as never);
	const refreshing = app.refresh({ now: true });
	await app.signOut();
	await app.connect(new Uint8Array(32));
	response.reject(new ApiError(401, 'signed-out'));
	await refreshing;
	expect(app.status).toBe('staff');
	expect(app.myName).toBe('Private name');
});

const event = {
	id: 'event',
	key: {},
	value: { photos: [{ id: 'photo' }] }
} as unknown as OpenEvent;
const photoPath = '/api/events/event/files/photo';
it('shows an event photo this card kept without fetching it', async () => {
	const app = await connected();
	const blob = new Blob(['kept']);
	vi.mocked(cachedPicture).mockResolvedValueOnce({ blob, mine: true });
	const picture = await app.eventPicture(event, 'photo');
	expect(cachedPicture).toHaveBeenCalledWith(photoPath, 'credential');
	expect(picture).toMatchObject({ blob, mine: true });
	expect(requestBytes).not.toHaveBeenCalled();
	expect(renderPackage).not.toHaveBeenCalled();
});
it('keeps an event photo it composed for this card', async () => {
	const app = await connected();
	const blob = new Blob(['composed']);
	vi.mocked(requestBytes).mockResolvedValueOnce(new Uint8Array(1));
	vi.mocked(renderPackage).mockResolvedValueOnce({ blob, mine: false });
	const picture = await app.eventPicture(event, 'photo');
	expect(picture.blob).toBe(blob);
	expect(cachePicture).toHaveBeenCalledWith(photoPath, 'credential', { blob, mine: false });
});
it('keeps only the photos of the events on the board, and none once the card goes', async () => {
	const app = await connected();
	vi.mocked(request).mockResolvedValueOnce([] as never);
	await app.loadEvents();
	expect(keepCachedPictures).toHaveBeenCalledWith([]);
	await app.signOut();
	expect(clearCachedPictures).toHaveBeenCalled();
});
