import { replaceState } from '$app/navigation';
import { page } from '$app/state';
import {
	ApiError,
	request,
	requestBytes,
	type Access,
	type Kindergarten,
	type NoticeRecord,
	type PhotoRecord,
	type PollAnswer,
	type StaffInfoRecord
} from '$lib/api';
import { readCard, type CardReading } from '$lib/card';
import {
	createContentKey,
	createId,
	deriveCredential,
	hashAuthToken,
	UnreadableError
} from '$lib/crypto';
import {
	forgetCard,
	loadCard,
	markStartCardUsed,
	saveCard,
	startCardUsed,
	type DeviceCard
} from '$lib/device';
import { CodedError, errorCode } from '$lib/errors';
import { openFile, openPicture, saveFile, type NewFile, type NoticeFile } from '$lib/files';
import type { Locale } from '$lib/i18n';
import {
	openInfoForFamily,
	openInfoForStaff,
	sealInfo,
	sealNewInfo,
	type Info,
	type InfoContent
} from '$lib/info';
import {
	installStep,
	onAppleHomeScreen,
	type InstallPlatform,
	type InstallPrompt
} from '$lib/install';
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
	oneTimeCard,
	openCatalog,
	openFamily,
	openFamilyKey,
	openFamilyKeyForStaff,
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
	sealVote,
	type FamilyKeys,
	type Notice,
	type NoticeContent,
	type NoticeDocument,
	type Paper,
	type PollOption
} from '$lib/notices';
import { openPhoto, openPhotoDetails, sealPhoto, sealPhotoDetails, type Photo } from '$lib/photos';
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
/**
 * A notice as its form fills it in. `announce` puts a changed notice back on top and notifies again. Its
 * files are those it carries already, and files attached in the form, sealed already. Its poll says whether
 * families see the counts.
 */
export type NoticeValues = {
	classrooms: string[];
	paper: Paper;
	days: number;
	body: NoticeDocument;
	announce: boolean;
	poll?: { options: PollOption[]; counts: boolean };
	files: (NoticeFile | NewFile)[];
};

/** The info page as its form fills it in: its text, and its files, as a notice's. */
export type InfoValues = Pick<NoticeValues, 'body' | 'files'>;

/**
 * A board photo, or a picture on a notice or the info page, that this device opened, with the address its image
 * shows at.
 */
export type Picture = { blob: Blob; url: string };

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
 * Records, a file, or a photo that this device's card opened the keys of, or an error with `code` when they
 * don't open. Unlike a card that stopped working, that's no reason to forget the card: the device keeps its
 * keys and shows the error.
 */
async function readable<T>(reading: Promise<T>, code: string) {
	try {
		return await reading;
	} catch (cause) {
		throw cause instanceof UnreadableError ? new CodedError(code, { cause }) : cause;
	}
}

/** The session ended, or the card no longer opens its keys: only the card can connect the device again. */
function isDisconnection(cause: unknown) {
	return (cause instanceof ApiError && cause.status === 401) || cause instanceof UnreadableError;
}

/** Where a board photo's encrypted bytes are kept. */
function photoPath({ classroom, id }: Pick<PhotoRecord, 'classroom' | 'id'>) {
	return `/api/classrooms/${classroom}/photo/${id}`;
}

/** Where the encrypted bytes of a notice's file are kept. */
function noticeFilePath(notice: string, file: string) {
	return `/api/notices/${notice}/files/${file}`;
}

/** Where the encrypted bytes of the info page's file are kept. */
function infoFilePath(file: string) {
	return `/api/info/files/${file}`;
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
	/** The photos of the boards of this device's classrooms: one for each classroom that shows one. */
	photos = $state.raw<Photo[]>([]);
	/** The kindergarten's info page, once an admin has saved it, when it opens on this device. */
	info = $state.raw<Info>();
	/** Whether the info page didn't open on this device. */
	unreadableInfo = $state(false);
	connecting = $state(false);
	cardError = $state<string>();
	/** A card from a link, waiting for confirmation before it takes the place of this device's card. */
	pendingCard = $state.raw<Uint8Array<ArrayBuffer>>();
	/** The token from a setup link, for the setup page. */
	setupToken = $state<string>();

	#card?: DeviceCard;
	#keys?: StaffKeys;
	/** The Family Key's envelope for a family device's card, as the server last sent it, for one-time cards. */
	#familyKeyEnvelope?: string;
	/**
	 * The info page's key wrapped for staff, as the server last sent it to a staff device, which saves the page and
	 * adds classrooms with it.
	 */
	#infoKeyForStaff?: string;
	#loadedAt = 0;
	/** The load of the records and board under way, which a refresh meanwhile waits for. */
	#reloading?: Promise<void>;
	/** Whether something new came since the last load started, so the board loads again. */
	#stale = false;
	/**
	 * The board photos and the pictures on notices and the info page this device has opened, by where they're kept,
	 * while they're up.
	 */
	#pictures = new Map<string, Promise<Picture>>();
	/** The Family Keys a staff device has opened, by the envelope each came from, until it disconnects. */
	#familyKeys = new Map<string, Promise<CryptoKey>>();

	get admin() {
		return this.me?.admin === true;
	}

	/** The name this device's staff member goes by, on what they put up and in home's greeting. */
	get myName() {
		// The recovery card has none.
		return this.me?.recovery ? undefined : this.me?.name;
	}

	get connected() {
		return this.status === 'staff' || this.status === 'family';
	}

	/**
	 * The classrooms this device belongs to, with their Group Keys: a family's children's, or those the server
	 * sends staff, which are a teacher's own, or all of them for an admin.
	 */
	get myClassrooms(): FamilyClassroom[] {
		return this.status === 'family' ? this.familyClassrooms : this.catalog.classrooms;
	}

	/**
	 * Whether this device can add the family's other devices. A family device connected before family devices kept
	 * their card's unlock key can't, until it connects again.
	 */
	get canAddDevices() {
		return this.#familyCard?.unlockKey !== undefined;
	}

	get #staff() {
		if (!this.#keys) throw new Error('This device isn’t connected with a staff card');
		return this.#keys;
	}

	/** This device's card, when it's a family's. */
	get #familyCard() {
		const card = this.#card;
		return card?.kind === 'family' ? card : undefined;
	}

	get #family() {
		const card = this.#familyCard;
		if (!card) throw new Error('This device isn’t connected with a family card');
		return card;
	}

	async start() {
		// Safari on iPhone and iPad keeps a card's link in the address bar, for the Home Screen app added from
		// there to open with (src/lib/install.ts). Everywhere else the code leaves the address bar first, even
		// in a browser that can't use it.
		this.install = installStep();
		const { card, token }: ReturnType<typeof takeFragment> =
			this.install === 'ios' ? {} : takeFragment();
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
		if (card) await this.#useStartCard(card);
	}

	/**
	 * Uses the card of the link the app opened with. The Home Screen app on iPhone and iPad opens at the card
	 * link it was added from every time, so it uses that card once the server has answered it, and never
	 * again: a device signed out, or a card replaced since, stays that way.
	 */
	async #useStartCard(card: CardReading) {
		if (!onAppleHomeScreen()) return this.useCard(card);
		if (await startCardUsed().catch(() => false)) return;
		await this.useCard(card);
		if (this.cardError !== 'offline') await markStartCardUsed().catch(() => {});
	}

	/** A link opened in a tab already showing the app changes only the fragment, so the page doesn't load again. */
	async openLink() {
		// Safari on iPhone and iPad keeps it in the address bar, as `start` does.
		if (this.install === 'ios') return;
		const { card, token } = takeFragment();
		if (token) this.setupToken = token;
		const ready = !['loading', 'unsupported', 'install'].includes(this.status);
		if (card && ready) await this.useCard(card);
	}

	async retry() {
		this.status = 'loading';
		await this.#resume();
	}

	/**
	 * Loads the records and board again, quietly: when the app comes back into view, but not more often than
	 * `refreshAfter`, or `now`, when a notification says there's something new or home is pulled down. An app
	 * out of view waits until it's back. One load runs at a time, and a refresh meanwhile waits for it; what's
	 * new since it started loads once more after it, however often it's asked for.
	 */
	refresh({ now = false } = {}) {
		if (!this.connected) return;
		this.#stale ||= now;
		if (document.visibilityState === 'hidden') return;
		if (!this.#reloading && (this.#stale || Date.now() - this.#loadedAt >= refreshAfter)) {
			this.#reloading = this.#reload().finally(() => (this.#reloading = undefined));
		}
		return this.#reloading;
	}

	async #reload() {
		do {
			this.#stale = false;
			const card = this.#card;
			if (!this.connected || !card) return;
			try {
				// The session is the one the app opened with, so its subscription isn't sent again.
				await this.#open(await request<Access>('GET', '/api/session'), card, { resend: false });
			} catch (cause) {
				if (isDisconnection(cause)) await this.#disconnect('signed-out');
				// A load that failed, such as while a phone's connection wakes up, is tried again the next time
				// the app comes into view, without waiting out `refreshAfter`.
				else this.#loadedAt = 0;
			}
		} while (this.#stale);
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
			else this.status = errorCode(cause) === 'unreadable-records' ? 'unreadable' : 'offline';
		}
	}

	async #open(access: Access, card: DeviceCard, { resend = true } = {}) {
		// A session or card that doesn't match the stored card means connecting again with a card.
		if (access.credential !== card.credential) throw new UnreadableError();
		let classrooms: FamilyClassroom[];
		if (access.kind === 'staff' && card.kind === 'staff') {
			this.#keys = await openStaffKeys(access, card.unlockKey);
			await this.#load(access.kindergarten, access.teacher);
			classrooms = this.catalog.classrooms;
			await this.#openBoard(access.notices, classrooms);
			await this.#showStaffInfo(access.info);
		} else if (
			access.kind === 'family' &&
			card.kind === 'family' &&
			access.family === card.family
		) {
			const opening = openFamily(access, card.familyKey);
			classrooms = await readable(opening, 'unreadable-records');
			this.familyClassrooms = classrooms;
			await this.#openBoard(access.notices, classrooms, card);
			const { info } = access;
			const groupKeys = new Map(classrooms.map(({ id, groupKey }) => [id, groupKey]));
			this.#infoKeyForStaff = undefined;
			await this.#showInfo(
				info ? openInfoForFamily(info, access.classrooms, groupKeys) : undefined
			);
		} else {
			throw new UnreadableError();
		}
		await this.#showPhotos(access.photos, classrooms);
		this.#card = card;
		this.#familyKeyEnvelope = access.kind === 'family' ? access.wrappedKey : undefined;
		this.#loadedAt = Date.now();
		this.status = this.install === 'android' ? 'install' : access.kind;
		void this.#keepNotifications(resend);
	}

	/**
	 * Reads whether notifications are on and whether their card on home was put away. With `resend`, it also
	 * sends the subscription, which keeps it with the current session and renews one made with an earlier key.
	 */
	async #keepNotifications(resend: boolean) {
		const [state, hidden] = await Promise.all([
			notificationState().catch(() => 'unsupported' as const),
			homeCardHidden().catch(() => false)
		]);
		this.notifications = state;
		this.notificationCardHidden = hidden;
		if (resend && state === 'on') {
			const sent = await sendSubscription().catch(() => state);
			// Unless notifications were turned on or off in the meantime.
			if (this.notifications === state) this.notifications = sent;
		}
	}

	async #load(records: Kindergarten, teacher = this.me?.id) {
		const opening = openCatalog(this.#staff.staffKey, records);
		const catalog = await readable(opening, 'unreadable-records');
		this.catalog = catalog;
		this.me = catalog.teachers.find((candidate) => candidate.id === teacher);
	}

	/**
	 * Opens notices with the Group Keys of the classrooms this device sees, and their polls' answers with the
	 * Family Keys it holds: a family device its own, and a staff device those of the families in its catalog.
	 */
	async #openBoard(
		records: NoticeRecord[],
		classrooms: { id: string; groupKey: CryptoKey }[],
		familyCard?: Extract<DeviceCard, { kind: 'family' }>
	) {
		const groupKeys = new Map(classrooms.map(({ id, groupKey }) => [id, groupKey]));
		const familyKeys: FamilyKeys = familyCard
			? async (family) => (family === familyCard.family ? familyCard.familyKey : undefined)
			: async (family) => {
					const record = this.catalog.families.find(({ id }) => id === family);
					if (!record) return undefined;
					const opening =
						this.#familyKeys.get(record.familyKeyForStaff) ??
						openFamilyKeyForStaff(this.#staff.staffKey, record);
					this.#familyKeys.set(record.familyKeyForStaff, opening);
					return opening;
				};
		const { notices, unreadable } = await openBoard(records, groupKeys, familyKeys);
		this.board = notices;
		this.unreadableNotices = unreadable;
		this.#keepPictures();
	}

	/**
	 * Shows the info page an opening gives, or none before an admin first saves it. A page that doesn't open is left
	 * out and said so, as notices are, so it doesn't hold back the rest.
	 */
	async #showInfo(opening?: Promise<Info>) {
		try {
			this.info = await opening;
			this.unreadableInfo = false;
		} catch (cause) {
			if (!(cause instanceof UnreadableError)) throw cause;
			this.info = undefined;
			this.unreadableInfo = true;
		}
		this.#keepPictures();
	}

	/** Shows the info page as staff get it, keeping its key's copy for staff, which saving it and adding classrooms take. */
	#showStaffInfo(record: StaffInfoRecord | null) {
		this.#infoKeyForStaff = record?.infoKeyForStaff;
		return this.#showInfo(record ? openInfoForStaff(record, this.#staff.staffKey) : undefined);
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
	 * Sends a change, with the `headers` that go with it, and opens what comes back. When it fails, records
	 * that moved on or lost what was changed load again to show with the error.
	 */
	async #send<T>(
		method: 'POST' | 'PUT' | 'DELETE',
		path: string,
		body: unknown,
		open: (response: T) => Promise<void>,
		headers?: Record<string, string>
	) {
		try {
			await this.#signedIn(async () => open(await request<T>(method, path, body, headers)));
		} catch (cause) {
			if (errorCode(cause) === 'unreadable-records') this.status = 'unreadable';
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

	/** Sends a change to the board, which comes back as this device sees it now. */
	#changeBoard(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) {
		return this.#send<NoticeRecord[]>(method, path, body, (records) =>
			this.#openBoard(records, this.myClassrooms, this.#familyCard)
		);
	}

	async #disconnect(notice?: string) {
		// Notifications end with the session, whose subscription the server forgets: after connecting again,
		// the device turns them on again.
		await Promise.all([forgetCard(), forgetSubscription()].map((done) => done.catch(() => {})));
		this.notifications = 'off';
		this.#card = undefined;
		this.#keys = undefined;
		this.#familyKeyEnvelope = undefined;
		this.#infoKeyForStaff = undefined;
		this.#familyKeys.clear();
		this.me = undefined;
		this.catalog = emptyCatalog;
		this.familyClassrooms = [];
		this.board = [];
		this.unreadableNotices = 0;
		this.photos = [];
		this.info = undefined;
		this.unreadableInfo = false;
		this.#keepPictures();
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
							familyKey: await openFamilyKey(access, unlockKey),
							unlockKey
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

	/**
	 * Makes a one-time card for another of this family's devices, which connects one device within a day. Returns
	 * its secret, to show, and until when it can connect one.
	 */
	async addDevice() {
		const { credential, unlockKey } = this.#family;
		const wrappedKey = this.#familyKeyEnvelope;
		if (!unlockKey || !wrappedKey) throw new Error('This device keeps no unlock key for its card');
		const card = await oneTimeCard({ credential, unlockKey, wrappedKey });
		const { until } = await this.#signedIn(() =>
			request<{ until: number }>('POST', '/api/devices', { credential: card.credential })
		);
		return { secret: card.secret, until };
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

	/** Adds a classroom, with the info page's key wrapped for it once the kindergarten has a page. */
	async addClassroom(name: string) {
		const classroom = await newClassroom(this.#staff.staffKey, name, this.#infoKeyForStaff);
		await this.#change('POST', '/api/classrooms', classroom);
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

	/** Whether this device's family marked a notice as seen. */
	isSeen(notice: Notice) {
		return notice.seen.some((family) => family === this.#familyCard?.family);
	}

	/** The families a notice is for, of those a staff device knows: the families of its classrooms. */
	audience(notice: Notice) {
		return this.catalog.families.filter((family) =>
			family.classrooms.some((classroom) => notice.classrooms.includes(classroom))
		);
	}

	/** Marks a notice as seen by this device's family, which its teachers see. */
	markSeen(notice: Notice) {
		return this.#changeBoard('PUT', `/api/notices/${notice.id}/seen`);
	}

	/** The option this device's family chose in a notice's poll. */
	myVote(notice: Notice) {
		return notice.votes.find((vote) => vote.family === this.#familyCard?.family)?.option;
	}

	/**
	 * Answers a notice's poll for this device's family, which also marks the notice as seen. The answer is
	 * encrypted with the key the poll says: the family's own, or the poll's when families see its counts.
	 */
	async vote(notice: Notice, option: string) {
		const { poll } = notice;
		if (!poll) return;
		const choice = await sealVote(notice.id, option, poll, this.#family.familyKey);
		const answer: PollAnswer = { choice, counts: poll.key !== undefined };
		await this.#changeBoard('PUT', `/api/notices/${notice.id}/vote`, answer);
	}

	/**
	 * Posts a notice, or changes `notice`, sealed under a new Notice Key for its classrooms. A change keeps
	 * the name of whoever posted the notice; the recovery card posts without one. A poll goes inside the
	 * notice, with a key of its own while families see its counts, and the server learns only that it has one
	 * and whether it shows the counts, as it learns nothing of its files' names and keys. Files attached in the
	 * form were sealed then, and are uploaded one at a time once the notice fits.
	 */
	async saveNotice(values: NoticeValues, notice?: Notice) {
		const id = notice?.id ?? createId();
		const author = notice ? notice.author : this.myName;
		const files: NoticeFile[] = values.files.map((file) => ({
			id: file.id,
			name: file.name,
			bytes: file.bytes,
			key: file.key
		}));
		const content: NoticeContent = { paper: values.paper, body: values.body };
		if (author) content.author = author;
		if (values.poll) {
			const { options, counts } = values.poll;
			// A poll keeps its key while families see its counts, and with it the answers given.
			const key = counts ? (notice?.poll?.key ?? (await createContentKey()).raw) : undefined;
			content.poll = key ? { options, key } : { options };
		}
		if (files.length) content.files = files;
		const classrooms = values.classrooms.map((classroom) =>
			byId(this.catalog.classrooms, classroom)
		);
		const sealed = await sealNotice(id, content, classrooms);
		for (const file of values.files) {
			if ('sealed' in file) await this.#uploadFile(noticeFilePath(id, file.id), file);
		}
		const { days, announce } = values;
		const poll = content.poll !== undefined;
		const counts = content.poll?.key !== undefined;
		const body = { ...sealed, days, poll, counts, files: files.map((file) => file.id) };
		if (notice) {
			await this.#changeBoard('PUT', `/api/notices/${id}`, { ...body, announce });
		} else {
			await this.#changeBoard('POST', '/api/notices', { ...body, id });
		}
	}

	/** Uploads a file attached in a form to where it's kept. One an earlier try stored is there already, as sealed. */
	async #uploadFile(path: string, file: NewFile) {
		await this.#signedIn(() => request('PUT', path, file.sealed)).catch((cause) => {
			if (!(cause instanceof ApiError && cause.code === 'stored')) throw cause;
		});
	}

	deleteNotice(notice: Notice) {
		return this.#changeBoard('DELETE', `/api/notices/${notice.id}`);
	}

	/**
	 * Saves the info page for an admin, sealed with its key, or at its first save under a new key for staff and for
	 * every classroom, all of which an admin's device sees. The server learns nothing of its text or of its files'
	 * names and keys. Files attached in the form were sealed then, and are uploaded one at a time first.
	 */
	async saveInfo(values: InfoValues) {
		const { staffKey } = this.#staff;
		const files: NoticeFile[] = values.files.map((file) => ({
			id: file.id,
			name: file.name,
			bytes: file.bytes,
			key: file.key
		}));
		const content: InfoContent = { body: values.body };
		if (files.length) content.files = files;
		const envelope = this.#infoKeyForStaff;
		const sealed = envelope
			? await sealInfo(content, staffKey, envelope)
			: await sealNewInfo(content, staffKey, this.catalog.classrooms);
		for (const file of values.files) {
			if ('sealed' in file) await this.#uploadFile(infoFilePath(file.id), file);
		}
		const body = { ...sealed, files: files.map((file) => file.id) };
		await this.#send<StaffInfoRecord>('PUT', '/api/info', body, (record) =>
			this.#showStaffInfo(record)
		);
	}

	/** Fetches and decrypts one of a notice's documents, and saves it on this device under its name. */
	saveNoticeFile(notice: Notice, file: NoticeFile) {
		return this.#saveFile(noticeFilePath(notice.id, file.id), file);
	}

	/** Fetches and decrypts one of the info page's documents, and saves it on this device under its name. */
	saveInfoFile(file: NoticeFile) {
		return this.#saveFile(infoFilePath(file.id), file);
	}

	async #saveFile(path: string, file: NoticeFile) {
		const sealed = await this.#signedIn(() => requestBytes(path));
		saveFile(await readable(openFile(sealed, file), 'unreadable-file'), file.name);
	}

	/** A board photo, opened with its classroom's Group Key (`#picture`). */
	photoPicture(photo: PhotoRecord) {
		return this.#picture(photoPath(photo), (sealed) => {
			const { groupKey } = byId(this.myClassrooms, photo.classroom);
			const opening = openPhoto(sealed, groupKey, photo.classroom, photo.id);
			return readable(opening, 'unreadable-photo');
		});
	}

	/** One of a notice's pictures, opened with the key its notice holds (`#picture`). */
	noticePicture(notice: Notice, file: NoticeFile) {
		return this.#filePicture(noticeFilePath(notice.id, file.id), file);
	}

	/** One of the info page's pictures, opened with the key the page holds (`#picture`). */
	infoPicture(file: NoticeFile) {
		return this.#filePicture(infoFilePath(file.id), file);
	}

	#filePicture(path: string, file: NoticeFile) {
		return this.#picture(path, (sealed) => readable(openPicture(sealed, file), 'unreadable-file'));
	}

	/**
	 * A picture, fetched from where it's kept and opened the first time it's shown, and kept while it's up. One
	 * that didn't open is tried again the next time it's shown.
	 */
	#picture(path: string, open: (sealed: Uint8Array<ArrayBuffer>) => Promise<Blob>) {
		let picture = this.#pictures.get(path);
		if (!picture) {
			picture = this.#signedIn(async () => {
				const blob = await open(await requestBytes(path));
				return { blob, url: URL.createObjectURL(blob) };
			});
			this.#pictures.set(path, picture);
			picture.catch(() => this.#pictures.delete(path));
		}
		return picture;
	}

	/** Lets go of the pictures of board photos, notices' files, and the info page's files that aren't up anymore. */
	#keepPictures() {
		const up = new Set([
			...this.photos.map(photoPath),
			...this.board.flatMap(({ id, files = [] }) =>
				files.map((file) => noticeFilePath(id, file.id))
			),
			...(this.info?.files ?? []).map((file) => infoFilePath(file.id))
		]);
		for (const [path, picture] of this.#pictures) {
			if (up.has(path)) continue;
			this.#pictures.delete(path);
			picture.then(
				({ url }) => URL.revokeObjectURL(url),
				() => {}
			);
		}
	}

	/**
	 * Keeps the board photos the server sent, with who put each up, from details opened with the Group Key of
	 * its classroom, and lets go of the pictures of photos that aren't up anymore. Details that don't open leave
	 * the name out. The classrooms come in, as `#openBoard`'s do: `myClassrooms` follows `status`, which
	 * `#open` sets last.
	 */
	async #showPhotos(records: PhotoRecord[], classrooms: { id: string; groupKey: CryptoKey }[]) {
		const photos = await Promise.all(
			records.map(async (record): Promise<Photo> => {
				const groupKey = classrooms.find(({ id }) => id === record.classroom)?.groupKey;
				if (!record.details || !groupKey) return record;
				const opening = openPhotoDetails(record.details, groupKey, record.classroom, record.id);
				return { ...record, ...(await opening.catch(() => ({}))) };
			})
		);
		this.photos = photos;
		this.#keepPictures();
	}

	/**
	 * Puts a photo made ready for the board up on a classroom's board, encrypted with the classroom's Group
	 * Key, in place of the one there, with who put it up. This device shows it without fetching it again.
	 */
	async putUpPhoto(classroom: string, photo: Blob) {
		const { groupKey } = byId(this.catalog.classrooms, classroom);
		const id = createId();
		const bytes = new Uint8Array(await photo.arrayBuffer());
		const author = this.myName;
		const [sealed, details] = await Promise.all([
			sealPhoto(bytes, groupKey, classroom, id),
			sealPhotoDetails(author ? { author } : {}, groupKey, classroom, id)
		]);
		const path = photoPath({ classroom, id });
		const open = async (photos: PhotoRecord[]) => {
			this.#pictures.set(path, Promise.resolve({ blob: photo, url: URL.createObjectURL(photo) }));
			await this.#showPhotos(photos, this.myClassrooms);
		};
		await this.#send('PUT', path, sealed, open, { 'bubbleboard-photo-details': details });
	}

	takeDownPhoto(photo: PhotoRecord) {
		const path = photoPath(photo);
		return this.#send<PhotoRecord[]>('DELETE', path, undefined, (photos) =>
			this.#showPhotos(photos, this.myClassrooms)
		);
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
