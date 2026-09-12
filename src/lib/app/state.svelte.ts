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
	familyCard,
	familyLinks,
	familyProfile,
	newClassroom,
	newFamily,
	openCatalog,
	openFamily,
	openFamilyKey,
	openStaffKeys,
	planFamilyLinks,
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

export type Status =
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
export function errorCode(cause: unknown) {
	if (cause instanceof ApiError) return cause.code;
	if (cause instanceof UnreadableRecords) return 'unreadable-records';
	if (cause instanceof UnreadableError) return 'unreadable';
	return 'unexpected';
}

/** The session ended, or the card no longer opens its keys: only the card can connect the device again. */
function isDisconnection(cause: unknown) {
	return (cause instanceof ApiError && cause.status === 401) || cause instanceof UnreadableError;
}

/** Reads a card from the address bar and removes it there, so the code doesn't stay in the history. */
function takeCardFromAddress(): CardReading | undefined {
	if (!new URLSearchParams(location.hash.slice(1)).has('card')) return undefined;
	const reading = readCard(location.href, location.origin);
	replaceState(location.pathname + location.search, page.state);
	return reading;
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

	#card?: DeviceCard;
	#keys?: StaffKeys;

	get admin() {
		return this.me?.admin === true;
	}

	get #staff() {
		if (!this.#keys) throw new Error('This device isn’t connected with a staff card');
		return this.#keys;
	}

	async start() {
		// First, so a card's code leaves the address bar even in a browser that can't use it.
		const reading = takeCardFromAddress();
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
		if (reading) await this.useCard(reading);
	}

	/** A card link opened in a tab already showing the app changes only the fragment, so the page doesn't load again. */
	async useCardLink() {
		const reading = takeCardFromAddress();
		if (reading && this.status !== 'loading' && this.status !== 'unsupported')
			await this.useCard(reading);
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
			await this.#load(access.teacher);
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

	async #load(teacher = this.me?.id) {
		const records = await request<Kindergarten>('GET', '/api/kindergarten');
		const catalog = await readRecords(openCatalog(this.#staff.staffKey, records));
		this.catalog = catalog;
		this.me = catalog.teachers.find((candidate) => candidate.id === teacher);
	}

	/** Loads the latest records, after a change or when another device changed them first. */
	async refresh() {
		try {
			await this.#load();
		} catch (cause) {
			if (isDisconnection(cause)) await this.#disconnect('signed-out');
			else if (cause instanceof UnreadableRecords) this.status = 'unreadable';
			else throw cause;
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

	classroomNames(ids: string[]) {
		return this.catalog.classrooms.filter(({ id }) => ids.includes(id)).map(({ name }) => name);
	}

	async addClassroom(name: string) {
		await request('POST', '/api/classrooms', await newClassroom(this.#staff.staffKey, name));
		await this.refresh();
	}

	async renameClassroom(id: string, name: string) {
		const profile = await classroomProfile(byId(this.catalog.classrooms, id), name);
		await request('PUT', `/api/classrooms/${id}`, { profile });
		await this.refresh();
	}

	async deleteClassroom(id: string) {
		await request('DELETE', `/api/classrooms/${id}`);
		await this.refresh();
	}

	/** Returns the new teacher's card secret, to print. */
	async addTeacher({ name, admin, classrooms }: TeacherValues) {
		const id = createId();
		const card = await staffCard(this.#staff);
		const profile = await teacherProfile(this.#staff.staffKey, id, name);
		await request('POST', '/api/teachers', {
			id,
			admin,
			classrooms,
			profile,
			credential: card.credential
		});
		await this.refresh();
		return card.secret;
	}

	async changeTeacher(id: string, { name, admin, classrooms }: TeacherValues) {
		const profile = await teacherProfile(this.#staff.staffKey, id, name);
		await request('PUT', `/api/teachers/${id}`, { admin, classrooms, profile });
		await this.refresh();
	}

	async removeTeacher(id: string) {
		await request('DELETE', `/api/teachers/${id}`);
		await this.refresh();
	}

	/** Returns the new card's secret, to print. */
	async replaceTeacherCard(id: string) {
		const card = await staffCard(this.#staff);
		await request('POST', `/api/teachers/${id}/card`, { credential: card.credential });
		// Replacing this device's own card ended its session, so it connects again with the new one.
		if (id === this.me?.id) await this.connect(card.secret);
		else await this.refresh();
		return card.secret;
	}

	/** Adds a child with a new family card, or with a brother's or sister's. Returns a new card's secret. */
	async addChild(values: ChildValues) {
		const { staffKey } = this.#staff;
		const { catalog } = this;
		const created = 'cardName' in values ? [await newFamily(staffKey, values.cardName)] : [];
		const families =
			'sibling' in values
				? byId(catalog.children, values.sibling).families
				: created.map(({ family }) => family.id);
		const child = { id: createId(), name: values.name, classroom: values.classroom, families };
		const links = await familyLinks(
			staffKey,
			catalog,
			[...catalog.children, child],
			families,
			created
		);
		await request('POST', '/api/children', {
			...links,
			revision: catalog.revision,
			id: child.id,
			classroom: child.classroom,
			profile: await childProfile(staffKey, child)
		});
		await this.refresh();
		return { id: child.id, secret: created[0]?.secret };
	}

	async #changeChild(
		child: Child,
		change: Partial<Pick<Child, 'name' | 'classroom' | 'families'>>,
		created: CreatedFamily[] = []
	) {
		const { staffKey } = this.#staff;
		const { catalog } = this;
		const next = { ...child, ...change };
		const others = catalog.children.filter(({ id }) => id !== child.id);
		const families = new Set([...child.families, ...next.families]);
		const links = await familyLinks(staffKey, catalog, [...others, next], families, created);
		await request('PUT', `/api/children/${child.id}`, {
			...links,
			revision: catalog.revision,
			classroom: next.classroom,
			profile: await childProfile(staffKey, next)
		});
		await this.refresh();
	}

	renameChild(child: Child, name: string) {
		return this.#changeChild(child, { name });
	}

	moveChild(child: Child, classroom: string) {
		return this.#changeChild(child, { classroom });
	}

	/** Adds a card for another family of the child, such as a parent living apart. Returns its secret. */
	async addFamilyCard(child: Child, name: string) {
		const created = await newFamily(this.#staff.staffKey, name);
		await this.#changeChild(child, { families: [...child.families, created.family.id] }, [created]);
		return created.secret;
	}

	removeFamilyCard(child: Child, family: string) {
		return this.#changeChild(child, { families: child.families.filter((id) => id !== family) });
	}

	async removeChild(child: Child) {
		const { catalog } = this;
		const others = catalog.children.filter(({ id }) => id !== child.id);
		const plan = planFamilyLinks(catalog.families, others, child.families);
		await request('DELETE', `/api/children/${child.id}`, {
			revision: catalog.revision,
			removeMemberships: plan.remove,
			removeFamilies: plan.removeFamilies
		});
		await this.refresh();
	}

	async renameFamily(family: Family, name: string) {
		const profile = await familyProfile(this.#staff.staffKey, family.id, name);
		await request('PUT', `/api/families/${family.id}`, { profile });
		await this.refresh();
	}

	/** Returns the new card's secret, to print. */
	async replaceFamilyCard(family: Family) {
		const card = await familyCard(this.#staff.staffKey, family);
		await request('POST', `/api/families/${family.id}/card`, { credential: card.credential });
		return card.secret;
	}
}

/** A change started from a page: whether it's running, and the error code when it failed. */
export class Task {
	busy = $state(false);
	error = $state<string>();
	#app: App;

	constructor(app: App) {
		this.#app = app;
	}

	/** Runs `work` and says whether it succeeded; when it didn't, `error` says why. */
	async run(work: () => Promise<unknown>) {
		if (this.busy) return false;
		this.busy = true;
		this.error = undefined;
		try {
			await work();
			return true;
		} catch (cause) {
			this.error = errorCode(cause);
			// Show the latest records along with the explanation.
			if (['stale', 'not-found', 'signed-out'].includes(this.error)) {
				await this.#app.refresh().catch(() => {});
			}
			return false;
		} finally {
			this.busy = false;
		}
	}

	/** Forgets the last error, when the form or question it belonged to opens or closes. */
	reset() {
		this.error = undefined;
	}
}

export const [getApp, setApp] = createContext<App>();
