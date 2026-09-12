import { replaceState } from '$app/navigation';
import { page } from '$app/state';
import { ApiError, request, type Access, type Kindergarten } from '$lib/api';
import { readCard, type CardReading } from '$lib/card';
import { createId, deriveCredential, hashAuthToken, UnreadableError } from '$lib/crypto';
import { forgetCard, loadCard, saveCard, type DeviceCard } from '$lib/device';
import {
	byId,
	childProfile,
	classroomProfile,
	createKindergarten,
	EmptyNameError,
	familyCard,
	familyLinks,
	familyProfile,
	newClassroom,
	newFamily,
	openCatalog,
	openFamily,
	openFamilyKey,
	openStaffKeys,
	staffCard,
	teacherProfile,
	type Catalog,
	type Child,
	type CreatedFamily,
	type Family,
	type StaffKeys,
	type Teacher
} from '$lib/kindergarten';
import { createContext } from 'svelte';

// The app's state in the browser: the card this device holds, and the decrypted records it may see. The
// app layout creates one for every page, so it survives moving between pages and languages.

type Status =
	'loading' | 'unsupported' | 'offline' | 'unreadable' | 'disconnected' | 'staff' | 'family';
export type NewKindergarten = Awaited<ReturnType<typeof createKindergarten>>;
export type TeacherValues = { name: string; admin: boolean; classrooms: string[] };
export type ChildValues = { name: string; classroom: string } & (
	{ cardName: string } | { sibling: string }
);

const emptyCatalog: Catalog = {
	revision: 0,
	classrooms: [],
	teachers: [],
	families: [],
	children: []
};

/**
 * The kindergarten's records didn't open, although this device's card did. Unlike a card that stopped
 * working, that's no reason to forget the card: the device keeps its keys and shows an error.
 */
class UnreadableRecords extends Error {
	constructor(options?: ErrorOptions) {
		super('Unreadable records', options);
		this.name = 'UnreadableRecords';
	}
}

async function readRecords<T>(reading: Promise<T>) {
	try {
		return await reading;
	} catch (cause) {
		throw cause instanceof UnreadableError ? new UnreadableRecords({ cause }) : cause;
	}
}

/** The code the app explains an error with (errors in src/lib/i18n). */
function errorCode(cause: unknown) {
	if (cause instanceof ApiError) return cause.code;
	if (cause instanceof UnreadableRecords) return 'unreadable-records';
	if (cause instanceof UnreadableError) return 'unreadable';
	if (cause instanceof EmptyNameError) return 'empty-name';
	return 'unexpected';
}

/** The session ended, or the card no longer opens its keys: only the card can connect the device again. */
function isDisconnection(cause: unknown) {
	return (cause instanceof ApiError && cause.status === 401) || cause instanceof UnreadableError;
}

/**
 * Takes what a card or setup link carries in the fragment, and removes it from the address bar so it
 * doesn't stay in the history. The router must be ready, which it is a tick after the first navigation.
 */
function takeFragment(): { card?: CardReading; token?: string } {
	const { href, hash, origin } = location;
	const fields = new URLSearchParams(hash.slice(1));
	if (!fields.has('card') && !fields.has('token')) return {};
	replaceState(location.pathname + location.search, page.state);
	return {
		card: fields.has('card') ? readCard(href, origin) : undefined,
		token: fields.get('token') ?? undefined
	};
}

export class App {
	status = $state<Status>('loading');
	/** Why this device was disconnected, when it wasn't signed out on purpose. */
	notice = $state<string>();
	catalog = $state.raw(emptyCatalog);
	me = $state.raw<Teacher>();
	/** The names of the classrooms a family device has joined. */
	joined = $state.raw<string[]>([]);
	connecting = $state(false);
	cardError = $state<string>();
	/** A card from a link, waiting for confirmation before it takes the place of this device's card. */
	pendingCard = $state.raw<Uint8Array<ArrayBuffer>>();
	/** The token from a setup link, for the setup page. */
	setupToken = $state<string>();

	#card?: DeviceCard;
	#keys?: StaffKeys;

	get admin() {
		return this.me?.admin === true;
	}

	get connected() {
		return this.status === 'staff' || this.status === 'family';
	}

	get #staff() {
		if (!this.#keys) throw new Error('This device isn’t connected with a staff card');
		return this.#keys;
	}

	async start() {
		// First, so a card's code leaves the address bar even in a browser that can't use it.
		const { card, token } = takeFragment();
		this.setupToken = token;
		// Keys are made with Web Crypto and kept in IndexedDB; browsers offer Web Crypto only on https
		// and localhost.
		if (!isSecureContext || !('indexedDB' in window)) {
			this.status = 'unsupported';
			return;
		}
		try {
			this.#card = await loadCard();
		} catch {
			this.status = 'unsupported';
			return;
		}
		await this.#resume();
		if (card) await this.useCard(card);
	}

	/** A link opened in a tab already showing the app changes only the fragment, so the page doesn't load again. */
	async openLink() {
		const { card, token } = takeFragment();
		if (token) this.setupToken = token;
		if (card && this.status !== 'loading' && this.status !== 'unsupported')
			await this.useCard(card);
	}

	async retry() {
		this.status = 'loading';
		await this.#resume();
	}

	async #resume() {
		const card = this.#card;
		if (!card) {
			this.status = 'disconnected';
			return;
		}
		try {
			await this.#open(await request<Access>('GET', '/api/session'), card);
		} catch (cause) {
			if (isDisconnection(cause)) await this.#disconnect('signed-out');
			else this.status = cause instanceof UnreadableRecords ? 'unreadable' : 'offline';
		}
	}

	async #open(access: Access, card: DeviceCard) {
		// A session or card that doesn't match the stored card means connecting again with a card.
		if (access.credential !== card.credential) throw new UnreadableError();
		if (access.kind === 'staff' && card.kind === 'staff') {
			this.#keys = await openStaffKeys(access, card.unlockKey);
			await this.#load(access.kindergarten, access.teacher);
		} else if (
			access.kind === 'family' &&
			card.kind === 'family' &&
			access.family === card.family
		) {
			this.joined = await readRecords(openFamily(access, card.familyKey));
		} else {
			throw new UnreadableError();
		}
		this.#card = card;
		this.status = access.kind;
	}

	async #load(records: Kindergarten, teacher = this.me?.id) {
		const catalog = await readRecords(openCatalog(this.#staff.staffKey, records));
		this.catalog = catalog;
		this.me = catalog.teachers.find((candidate) => candidate.id === teacher);
	}

	/**
	 * Sends an admin's change and opens the records that come back. When it fails, a device whose session
	 * ended disconnects, and records that moved on or lost the one changed load again to show with the error.
	 */
	async #change(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) {
		try {
			await this.#load(await request<Kindergarten>(method, path, body));
		} catch (cause) {
			if (cause instanceof UnreadableRecords) this.status = 'unreadable';
			else if (cause instanceof ApiError && cause.status === 401) {
				await this.#disconnect('signed-out');
			} else if (cause instanceof ApiError && ['stale', 'not-found'].includes(cause.code)) {
				await this.#resume();
			}
			throw cause;
		}
	}

	async #disconnect(notice?: string) {
		await forgetCard().catch(() => {});
		this.#card = undefined;
		this.#keys = undefined;
		this.me = undefined;
		this.catalog = emptyCatalog;
		this.joined = [];
		this.notice = notice;
		this.status = 'disconnected';
	}

	/** Uses a card read from a link, a photo, or a typed code. A device with a card asks first. */
	async useCard(reading: CardReading) {
		this.cardError = undefined;
		if ('error' in reading) {
			this.cardError = reading.error === 'invalid' ? 'invalid-card' : reading.error;
			return;
		}
		// Also while the server can't be reached: a stored card is never replaced without asking.
		if (this.#card) {
			const { authToken } = await deriveCredential(reading.secret);
			if ((await hashAuthToken(authToken)) !== this.#card.cardHash)
				this.pendingCard = reading.secret;
			return;
		}
		await this.connect(reading.secret);
	}

	async connect(secret: Uint8Array<ArrayBuffer>) {
		this.pendingCard = undefined;
		this.cardError = undefined;
		this.connecting = true;
		let connected = false;
		try {
			const { authToken, unlockKey } = await deriveCredential(secret);
			const access = await request<Access>('POST', '/api/connect', { authToken });
			connected = true;
			const known = { credential: access.credential, cardHash: await hashAuthToken(authToken) };
			const card: DeviceCard =
				access.kind === 'staff'
					? { ...known, kind: 'staff', unlockKey }
					: {
							...known,
							kind: 'family',
							family: access.family,
							familyKey: await openFamilyKey(access, unlockKey)
						};
			await this.#open(access, card);
			await saveCard(card);
			this.notice = undefined;
		} catch (cause) {
			this.cardError = errorCode(cause);
			// The server already moved this browser's session to the new card.
			if (connected) await this.#disconnect();
		} finally {
			this.connecting = false;
		}
	}

	/** Forgets this device's card first, so its keys go even when the server can't be reached. */
	async signOut() {
		await this.#disconnect();
		await request('DELETE', '/api/session').catch(() => {});
	}

	/** Stores the first setup and connects this device with the admin's card. */
	async setUp(token: string, kindergarten: NewKindergarten) {
		await request('POST', '/api/setup', { token, teachers: kindergarten.teachers });
		const { admin } = kindergarten;
		const card: DeviceCard = {
			kind: 'staff',
			credential: admin.id,
			cardHash: await hashAuthToken(admin.authToken),
			unlockKey: admin.unlockKey
		};
		await saveCard(card);
		this.#card = card;
		await this.#resume();
	}

	async addClassroom(name: string) {
		await this.#change('POST', '/api/classrooms', await newClassroom(this.#staff.staffKey, name));
	}

	async renameClassroom(id: string, name: string) {
		const profile = await classroomProfile(byId(this.catalog.classrooms, id).groupKey, id, name);
		await this.#change('PUT', `/api/classrooms/${id}`, { profile });
	}

	deleteClassroom(id: string) {
		return this.#change('DELETE', `/api/classrooms/${id}`);
	}

	/** Returns the new teacher's card secret, to print. */
	async addTeacher({ name, admin, classrooms }: TeacherValues) {
		const id = createId();
		const card = await staffCard(this.#staff);
		const profile = await teacherProfile(this.#staff.staffKey, id, name);
		const teacher = { id, admin, classrooms, profile, credential: card.credential };
		await this.#change('POST', '/api/teachers', teacher);
		return card.secret;
	}

	async changeTeacher(id: string, { name, admin, classrooms }: TeacherValues) {
		const profile = await teacherProfile(this.#staff.staffKey, id, name);
		const { revision } = this.catalog;
		await this.#change('PUT', `/api/teachers/${id}`, { revision, admin, classrooms, profile });
	}

	removeTeacher(id: string) {
		return this.#change('DELETE', `/api/teachers/${id}`);
	}

	/** Returns the new card's secret, to print. */
	async replaceTeacherCard(id: string) {
		const card = await staffCard(this.#staff);
		const path = `/api/teachers/${id}/card`;
		if (id === this.me?.id) {
			// Replacing this device's own card ends its session, so it connects again with the new one.
			await request('POST', path, { credential: card.credential });
			await this.connect(card.secret);
		} else {
			await this.#change('POST', path, { credential: card.credential });
		}
		return card.secret;
	}

	/** Adds a child with a new family card, or with a brother's or sister's. Returns a new card's secret. */
	async addChild(values: ChildValues) {
		const created =
			'cardName' in values ? [await newFamily(this.#staff.staffKey, values.cardName)] : [];
		const families =
			'sibling' in values
				? byId(this.catalog.children, values.sibling).families
				: created.map(({ family }) => family.id);
		const child = { id: createId(), name: values.name, classroom: values.classroom, families };
		await this.#saveChild(child, undefined, created);
		return { id: child.id, secret: created[0]?.secret };
	}

	renameChild(child: Child, name: string) {
		return this.#saveChild({ ...child, name }, child);
	}

	moveChild(child: Child, classroom: string) {
		return this.#saveChild({ ...child, classroom }, child);
	}

	/** Adds a card for another family of the child, such as a parent living apart. Returns its secret. */
	async addFamilyCard(child: Child, name: string) {
		const created = await newFamily(this.#staff.staffKey, name);
		const families = [...child.families, created.family.id];
		await this.#saveChild({ ...child, families }, child, [created]);
		return created.secret;
	}

	removeFamilyCard(child: Child, family: string) {
		const families = child.families.filter((id) => id !== family);
		return this.#saveChild({ ...child, families }, child);
	}

	/** Saves a new child, or a change to `previous`, with the family links that follow from it. */
	async #saveChild(child: Child, previous?: Child, created: CreatedFamily[] = []) {
		const { staffKey } = this.#staff;
		const { catalog } = this;
		const others = catalog.children.filter(({ id }) => id !== child.id);
		const families = new Set([...(previous?.families ?? []), ...child.families]);
		const links = await familyLinks(staffKey, catalog, [...others, child], families, created);
		const body = {
			...links,
			classroom: child.classroom,
			profile: await childProfile(staffKey, child)
		};
		if (previous) await this.#change('PUT', `/api/children/${child.id}`, body);
		else await this.#change('POST', '/api/children', { ...body, id: child.id });
	}

	async removeChild(child: Child) {
		const { catalog } = this;
		const others = catalog.children.filter(({ id }) => id !== child.id);
		const links = await familyLinks(this.#staff.staffKey, catalog, others, child.families);
		await this.#change('DELETE', `/api/children/${child.id}`, links);
	}

	async renameFamily(family: Family, name: string) {
		const profile = await familyProfile(this.#staff.staffKey, family.id, name);
		await this.#change('PUT', `/api/families/${family.id}`, { profile });
	}

	/** Returns the new card's secret, to print. */
	async replaceFamilyCard(family: Family) {
		const card = await familyCard(this.#staff.staffKey, family);
		await request('POST', `/api/families/${family.id}/card`, { credential: card.credential });
		return card.secret;
	}
}

/** A change started from a form or a question: whether it's running, and the error code when it failed. */
export class Task {
	busy = $state(false);
	error = $state<string>();

	async run(work: () => Promise<unknown>) {
		if (this.busy) return;
		this.busy = true;
		this.error = undefined;
		try {
			await work();
		} catch (cause) {
			this.error = errorCode(cause);
		} finally {
			this.busy = false;
		}
	}
}

export const [getApp, setApp] = createContext<App>();
