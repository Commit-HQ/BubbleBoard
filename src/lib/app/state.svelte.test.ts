import { afterEach, expect, it, vi } from 'vitest';
vi.mock('$app/navigation', () => ({ replaceState: vi.fn() }));
vi.mock('$app/state', () => ({ page: { url: new URL('https://example.test/app') } }));
vi.mock('$lib/device', () => ({
	saveCard: async () => {},
	forgetCard: async () => {},
	hideNameCard: async () => {}
}));
vi.mock('$lib/notifications', () => ({
	forgetSubscription: async () => {},
	notificationState: async () => 'off',
	homeCardHidden: async () => false
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
vi.mock('$lib/api', async (original) => ({ ...(await original<object>()), request: vi.fn() }));
import { request, ApiError } from '$lib/api';
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
		teachers: [{ id: 'teacher', name: 'Private name', admin: true }]
	},
	notices: [],
	photos: [],
	info: { pages: [] }
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
