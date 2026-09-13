import { replaceState } from '$app/navigation';
import { page } from '$app/state';
import { ApiError, request, type Access, type Kindergarten, type NoticeRecord } from '$lib/api';
import { readCard, type CardReading } from '$lib/card';
import { createId, deriveCredential, hashAuthToken, UnreadableError } from '$lib/crypto';
import { forgetCard, loadCard, saveCard, type DeviceCard } from '$lib/device';
import type { Locale } from '$lib/i18n';
import { installStep, type InstallPlatform, type InstallPrompt } from '$lib/install';
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
	staffCard,
	teacherProfile,
	type Catalog,
	type Child,
	type CreatedFamily,
	type Family,
	type FamilyClassroom,
	type StaffKeys,
	type Teacher
} from '$lib/kindergarten';
import {
	forgetSubscription,
	hideHomeCard,
	homeCardHidden,
	notificationState,
	sendSubscription,
	turnOff,
	turnOn,
	type NotificationState
} from '$lib/notifications';
import {
	openBoard,
	sealNotice,
	type Notice,
	type NoticeContent,
	type NoticeDocument,
	type Paper
} from '$lib/notices';
import { createContext } from 'svelte';

// The app's state in the browser: the card this device holds, and the decrypted records it may see. The
// app layout creates one for every page, so it survives moving between pages and languages.

/**
 * What the app is doing. `install` holds every page back until BubbleBoard is installed: on iPhone and iPad
 * before anything connects, and on Android once the browser has connected, since the installed app shares
 * its storage.
 */
type Status =
	| 'loading'
	| 'unsupported'
	| 'install'
	| 'offline'
	| 'unreadable'
	| 'disconnected'
	| 'staff'
	| 'family';
export type NewKindergarten = Awaited<ReturnType<typeof createKindergarten>>;
export type TeacherValues = { name: string; admin: boolean; classrooms: string[] };
export type ChildValues = { name: string; classroom: string } & (
	{ cardName: string } | { sibling: string }
);
/** A notice as its form fills it in. `announce` puts a changed notice back on top and notifies again. */
export type NoticeValues = {
	classrooms: string[];
	paper: Paper;
	days: number;
	body: NoticeDocument;
	announce: boolean;
};

const emptyCatalog: Catalog = {
	revision: 0,
	classrooms: [],
	teachers: [],
	families: [],
	children: []
};

/** The app loads the board again when it comes back into view, but not more often than this. */
const refreshAfter = 60 * 1000;

/**
 * The kindergarten's records didn't open, although this device's card did. Unlike a card that stopped
 * working, that's no reason to forget the card: the device keeps its keys and shows an error.
 */
class UnreadableRecords extends Error {
	readonly code = 'unreadable-records';

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

/** The code the app explains an error with (errors in src/lib/i18n), which each of the app's errors carries. */
function errorCode(cause: unknown) {
	const code = (cause as { code?: unknown } | null | undefined)?.code;
	return typeof code === 'string' ? code : 'unexpected';
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
	/** The steps installing BubbleBoard takes on this device, when it's a phone or tablet outside the app. */
	install = $state<InstallPlatform>();
	/** The browser's own install prompt, when it offers one. */
	installPrompt = $state.raw<InstallPrompt>();
	/** Whether this device gets a notification for new notices. */
	notifications = $state<NotificationState>('unsupported');
	/** Whether Not now put away home's card that turns notifications on. */
	notificationCardHidden = $state(true);
	catalog = $state.raw(emptyCatalog);
	me = $state.raw<Teacher>();
	/** The classrooms a family device has joined. */
	familyClassrooms = $state.raw<FamilyClassroom[]>([]);
	/** The notices this device sees, the most recently announced first. */
	board = $state.raw<Notice[]>([]);
	/** How many notices didn't open on this device. */
	unreadableNotices = $state(0);
	connecting = $state(false);
	cardError = $state<string>();
	/** A card from a link, waiting for confirmation before it takes the place of this device's card. */
	pendingCard = $state.raw<Uint8Array<ArrayBuffer>>();
	/** The token from a setup link, for the setup page. */
	setupToken = $state<string>();

	#card?: DeviceCard;
	#keys?: StaffKeys;
	#loadedAt = 0;

	get admin() {
		return this.me?.admin === true;
	}

	get connected() {
		return this.status === 'staff' || this.status === 'family';
	}

	/**
	 * The classrooms this device belongs to: a family's children's, or those the server sends staff, which
	 * are a teacher's own, or all of them for an admin.
	 */
	get myClassrooms(): { id: string; name: string }[] {
		return this.status === 'family' ? this.familyClassrooms : this.catalog.classrooms;
	}

	get #staff() {
		if (!this.#keys) throw new Error('This device isn’t connected with a staff card');
		return this.#keys;
	}

	async start() {
		// First, so a card's code leaves the address bar even in a browser that can't use it.
		const { card, token } = takeFragment();
		this.setupToken = token;
		// Android's install panel shows the browser's prompt when asked; elsewhere the browser keeps its own.
		addEventListener('beforeinstallprompt', (event) => {
			if (this.install !== 'android') return;
			event.preventDefault();
			this.installPrompt = event as InstallPrompt;
		});
		// Keys are made with Web Crypto and kept in IndexedDB; browsers offer Web Crypto only on https
		// and localhost.
		if (!isSecureContext || !('indexedDB' in window)) {
			this.status = 'unsupported';
			return;
		}
		// Safari and the browsers inside other apps don't share their storage with the installed app, so
		// nothing connects there: installing comes first.
		this.install = installStep();
		if (this.install === 'ios' || this.install === 'in-app') {
			this.status = 'install';
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
		const ready = !['loading', 'unsupported', 'install'].includes(this.status);
		if (card && ready) await this.useCard(card);
	}

	async retry() {
		this.status = 'loading';
		await this.#resume();
	}

	/** Loads the records and board again, quietly, when the app comes back into view. */
	async refresh() {
		const card = this.#card;
		if (!this.connected || !card || Date.now() - this.#loadedAt < refreshAfter) return;
		this.#loadedAt = Date.now();
		try {
			// The session is the one the app opened with, so its subscription isn't sent again.
			await this.#open(await request<Access>('GET', '/api/session'), card, { resend: false });
		} catch (cause) {
			if (isDisconnection(cause)) await this.#disconnect('signed-out');
		}
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

	async #open(access: Access, card: DeviceCard, { resend = true } = {}) {
		// A session or card that doesn't match the stored card means connecting again with a card.
		if (access.credential !== card.credential) throw new UnreadableError();
		if (access.kind === 'staff' && card.kind === 'staff') {
			this.#keys = await openStaffKeys(access, card.unlockKey);
			await this.#load(access.kindergarten, access.teacher);
			await this.#openBoard(access.notices, this.catalog.classrooms);
		} else if (
			access.kind === 'family' &&
			card.kind === 'family' &&
			access.family === card.family
		) {
			this.familyClassrooms = await readRecords(openFamily(access, card.familyKey));
			await this.#openBoard(access.notices, this.familyClassrooms);
		} else {
			throw new UnreadableError();
		}
		this.#card = card;
		this.#loadedAt = Date.now();
		this.status = this.install === 'android' ? 'install' : access.kind;
		void this.#keepNotifications(resend);
	}

	/**
	 * Reads whether notifications are on and whether their card on home was put away. With `resend`, it also
	 * sends the subscription, which keeps it with the current session.
	 */
	async #keepNotifications(resend: boolean) {
		const [state, hidden] = await Promise.all([
			notificationState().catch(() => 'unsupported' as const),
			homeCardHidden().catch(() => false)
		]);
		this.notifications = state;
		this.notificationCardHidden = hidden;
		if (resend && state === 'on') await sendSubscription().catch(() => {});
	}

	async #load(records: Kindergarten, teacher = this.me?.id) {
		const catalog = await readRecords(openCatalog(this.#staff.staffKey, records));
		this.catalog = catalog;
		this.me = catalog.teachers.find((candidate) => candidate.id === teacher);
	}

	/** Opens notices with the Group Keys of the classrooms this device sees. */
	async #openBoard(records: NoticeRecord[], classrooms: { id: string; groupKey: CryptoKey }[]) {
		const groupKeys = new Map(classrooms.map(({ id, groupKey }) => [id, groupKey]));
		const { notices, unreadable } = await openBoard(records, groupKeys);
		this.board = notices;
		this.unreadableNotices = unreadable;
	}

	/** Runs a request made on purpose. A device whose session ended disconnects: only its card connects it again. */
	async #signedIn<T>(work: () => Promise<T>) {
		try {
			return await work();
		} catch (cause) {
			if (cause instanceof ApiError && cause.status === 401) await this.#disconnect('signed-out');
			throw cause;
		}
	}

	/**
	 * Sends a change and opens what comes back. When it fails, records that moved on or lost what was
	 * changed load again to show with the error.
	 */
	async #send<T>(
		method: 'POST' | 'PUT' | 'DELETE',
		path: string,
		body: unknown,
		open: (response: T) => Promise<void>
	) {
		try {
			await this.#signedIn(async () => open(await request<T>(method, path, body)));
		} catch (cause) {
			if (cause instanceof UnreadableRecords) this.status = 'unreadable';
			else if (cause instanceof ApiError && ['stale', 'not-found'].includes(cause.code)) {
				await this.#resume();
			}
			throw cause;
		}
	}

	/** Sends an admin's change to the records, which come back as they are now. */
	#change(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) {
		return this.#send<Kindergarten>(method, path, body, (records) => this.#load(records));
	}

	/** Sends a change to the board, which comes back as this staff member sees it now. */
	#changeBoard(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) {
		return this.#send<NoticeRecord[]>(method, path, body, (records) =>
			this.#openBoard(records, this.catalog.classrooms)
		);
	}

	async #disconnect(notice?: string) {
		// Notifications end with the session, whose subscription the server forgets: after connecting again,
		// the device turns them on again.
		await Promise.all([forgetCard(), forgetSubscription()].map((done) => done.catch(() => {})));
		this.notifications = 'off';
		this.#card = undefined;
		this.#keys = undefined;
		this.me = undefined;
		this.catalog = emptyCatalog;
		this.familyClassrooms = [];
		this.board = [];
		this.unreadableNotices = 0;
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

	/** Turns notifications on, from a tap: the permission request can't wait for anything before it. */
	async turnOnNotifications(locale: Locale) {
		this.notifications = await this.#signedIn(() => turnOn(locale));
	}

	async turnOffNotifications() {
		await this.#signedIn(turnOff);
		this.notifications = 'off';
	}

	/** Puts away home's card that turns notifications on, on this device. Settings keep the switch. */
	hideNotificationCard() {
		this.notificationCardHidden = true;
		// Without storage, the card comes back next time.
		hideHomeCard().catch(() => {});
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
			await this.#signedIn(() => request('POST', path, { credential: card.credential }));
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
		return created[0]?.secret;
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

	/** Replaces the cards of these families together. Returns the new cards' secrets, in order, to print. */
	async replaceFamilyCards(families: Family[]) {
		const { staffKey } = this.#staff;
		const cards = await Promise.all(families.map((family) => familyCard(staffKey, family)));
		await this.#signedIn(() =>
			request('POST', '/api/families/cards', {
				cards: cards.map(({ credential }, index) => ({ family: families[index].id, credential }))
			})
		);
		return cards.map(({ secret }) => secret);
	}

	/** Whether this device may change a notice: its author's own, or any for an admin. */
	canChange(notice: Notice) {
		return this.status === 'staff' && (this.admin || notice.teacher === this.me?.id);
	}

	/**
	 * Posts a notice, or changes `notice`, sealed under a new Notice Key for its classrooms. A change keeps
	 * the name of whoever posted the notice; the recovery card posts without one.
	 */
	async saveNotice(values: NoticeValues, notice?: Notice) {
		const id = notice?.id ?? createId();
		const author = notice ? notice.author : this.me?.recovery ? undefined : this.me?.name;
		const content: NoticeContent = { paper: values.paper, body: values.body };
		if (author) content.author = author;
		const classrooms = values.classrooms.map((classroom) =>
			byId(this.catalog.classrooms, classroom)
		);
		const sealed = await sealNotice(id, content, classrooms);
		const { days, announce } = values;
		if (notice) await this.#changeBoard('PUT', `/api/notices/${id}`, { ...sealed, days, announce });
		else await this.#changeBoard('POST', '/api/notices', { ...sealed, id, days });
	}

	deleteNotice(notice: Notice) {
		return this.#changeBoard('DELETE', `/api/notices/${notice.id}`);
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
