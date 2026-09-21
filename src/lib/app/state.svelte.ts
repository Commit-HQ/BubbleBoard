import {
	openEvent,
	preparePackage,
	readChoice,
	readLabel,
	renderPackage,
	sealChoice,
	sharing
} from '$lib/events/package';
import type {
	ConsentRow,
	ConsentSnapshot,
	EventRecord,
	OpenEvent,
	EventContent
} from '$lib/events/types';
import { clearDraft } from '$lib/events/draft';
import { maxEventBytes } from '$lib/events/limits';
import { maxEventContentBytes, maxEventFileBytes } from '$lib/events/types';
import type { EventDraft } from '$lib/events/publishing';
import type { Region } from '$lib/events/editor';
import { encryptData, decryptData, envelopeSize } from '$lib/crypto';
import type { MeetingSlot, MeetingChild, MeetingData, NewMeetingOffer } from '$lib/meetings';
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
	type StaffInfo
} from '$lib/api';
import {
	openConversation,
	openMessage,
	sealMessage,
	sealSubject,
	type Conversation,
	type Inbox,
	type MessageContent,
	type MessagePolicy,
	type MessageRecord,
	type MessageSettings,
	type OpenMessage
} from '$lib/messages';
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
	sealFirstInfoPage,
	sealInfoPage,
	type InfoPage,
	type InfoPageContent,
	type OpenedInfo
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
/**
 * A message sealed and ready to send, kept by the form so a send that failed goes again as the same message
 * rather than a second one. `start` says it begins a conversation, which the server takes on another path.
 */
export type SealedMessage = {
	conversation: string;
	message: string;
	start: boolean;
	payload: Record<string, unknown>;
};
export type TeacherValues = { name: string; admin: boolean; classrooms: string[] };
export type ChildValues = { name: string; classroom: string; share: boolean } & (
	{ cardName: string } | { sibling: string }
);
/**
 * What staff record from a family's consent form: whether the classroom's other families may see the
 * child's face, for every family card linked to the child. `rows` are the consent records the device just
 * read, so the write fails as stale rather than overwriting a choice a parent made meanwhile; without them,
 * the child's records are expected to be new.
 */
type PhotoChoice = { share: boolean; rows?: ConsentRow[] };
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

/** An info page as its form fills it in: its text on its paper, and its files, as a notice's. */
export type InfoPageValues = Pick<NoticeValues, 'paper' | 'body' | 'files'>;

/**
 * A board photo, or a picture on a notice or an info page, that this device opened, with the address its image
 * shows at.
 */
export type Picture = {
	blob: Blob;
	url: string;
	/** Whether one of this card's own children is in an event's photo (`renderPackage`). */
	mine?: boolean;
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

/** Where the encrypted bytes of an info page's file are kept. */
function infoFilePath(page: string, file: string) {
	return `/api/info/pages/${page}/files/${file}`;
}

/** Where the encrypted bytes of one of an event's photos are kept. */
function eventFilePath(event: string, photo: string) {
	return `/api/events/${event}/files/${photo}`;
}

/** Where the encrypted bytes of a file a teacher attached to an inquiry's message are kept. */
function messageFilePath(conversation: string, message: string, file: string) {
	return `/api/messages/${conversation}/files/${message}/${file}`;
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
	events = $state.raw<OpenEvent[]>([]);
	eventsError = $state<string>();
	async syncPhotoChildren(classroom: string) {
		// One label per child and family card, all sealed at once rather than one round trip after another.
		const rows = await Promise.all(
			this.catalog.children
				.filter((c) => c.classroom === classroom)
				.flatMap((child) =>
					child.families.map(async (family) => ({
						child: child.id,
						family,
						label: await encryptData({ name: child.name }, await this.messageKey(family), {
							purpose: 'photo-label',
							event: child.id,
							part: family
						})
					}))
				)
		);
		// Bound each body; a classroom's catalog version guards every batch.
		for (let start = 0; start < rows.length; start += 40)
			await request('POST', '/api/photo-consent/sync', {
				classroom,
				revision: this.catalog.revision,
				rows: rows.slice(start, start + 40)
			});
	}
	async loadEvents() {
		const version = this.#connectionVersion;
		try {
			const records = await request<EventRecord[]>('GET', '/api/events');
			const opened = await Promise.allSettled(
				records.map((r) => openEvent(r, byId(this.myClassrooms, r.classroom).groupKey))
			);
			if (version !== this.#connectionVersion) return;
			this.events = opened.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
			this.eventsError = opened.some((r) => r.status === 'rejected')
				? 'unreadable-photo'
				: undefined;
			// An event that came down takes its card's photo with it.
			this.#keepPictures();
		} catch (cause) {
			if (version === this.#connectionVersion) this.eventsError = errorCode(cause);
		}
	}
	async prepareEvent(
		classroom: string,
		photos: { id: string; blob: Blob; regions: Region[] }[],
		progress: (n: number) => void
	): Promise<EventDraft> {
		await this.refresh({ now: true });
		await this.syncPhotoChildren(classroom);
		const snapshot = await request<ConsentSnapshot>(
			'GET',
			`/api/photo-consent?classroom=${classroom}`
		);
		if (snapshot.catalog !== this.catalog.revision) throw new ApiError(409, 'stale');
		const children = this.catalog.children.filter((c) => c.classroom === classroom);
		const shared = await sharing(children, snapshot.rows, (f) => this.messageKey(f));
		const id = createId(),
			key = await createContentKey();
		const envelope = await encryptData(
			{ key: key.raw },
			byId(this.myClassrooms, classroom).groupKey,
			{ purpose: 'event-key', event: id }
		);
		const files = [];
		let total = 0;
		for (const photo of photos) {
			const file = await preparePackage(
				id,
				photo.id,
				photo.blob,
				photo.regions,
				key.key,
				this.#staff.staffKey,
				children,
				shared,
				(f) => this.messageKey(f)
			);
			total += file.sealed.length;
			if (file.sealed.length > maxEventFileBytes || total > maxEventBytes)
				throw new ApiError(413, 'too-large');
			files.push(file);
			progress(files.length);
		}
		return {
			id,
			key: key.key,
			envelope,
			catalog: snapshot.catalog,
			consent: snapshot.revision,
			classroom,
			files
		};
	}
	async eventPreview(draft: EventDraft, photo: string, viewer: string) {
		const file = byId(draft.files, photo);
		const { blob } = await renderPackage(
			draft.id,
			photo,
			file.sealed,
			draft.key,
			viewer === 'base' ? { covered: true } : { family: await this.messageKey(viewer) }
		);
		return blob;
	}
	async publishEvent(
		draft: EventDraft,
		value: EventContent,
		days: number,
		progress: (n: number) => void
	) {
		// Sealed before anything is sent: words too long for the manifest are refused here rather than after
		// every photo has been uploaded.
		const content = await encryptData(value, draft.key, {
			purpose: 'event-content',
			event: draft.id
		});
		if (envelopeSize(content)! > maxEventContentBytes) throw new CodedError('event-too-long');
		// Retry the same immutable draft after a lost response. A new consent revision requires a new preview.
		await this.#signedIn(() =>
			request('POST', '/api/events', {
				id: draft.id,
				classroom: draft.classroom,
				catalog: draft.catalog,
				consent: draft.consent
			})
		);
		for (const [index, file] of draft.files.entries()) {
			await this.#signedIn(() =>
				request('PUT', `/api/events/${draft.id}/files/${file.id}`, file.sealed)
			).catch((cause) => {
				if (!(cause instanceof ApiError && (cause.code === 'stored' || cause.code === 'stale')))
					throw cause;
			});
			progress(index + 1);
		}
		await this.#signedIn(() =>
			request('PUT', `/api/events/${draft.id}`, {
				content,
				key: draft.envelope,
				files: draft.files.map((f) => f.id),
				days
			})
		);
		await this.loadEvents();
	}
	/** One of an event's photos, composed for whoever holds this card, and kept while the event is open. */
	eventPicture(event: OpenEvent, photo: string) {
		return this.#picture(eventFilePath(event.id, photo), (sealed) =>
			renderPackage(
				event.id,
				photo,
				sealed,
				event.key,
				this.#familyCard ? { family: this.#familyCard.familyKey } : { staff: this.#staff.staffKey }
			)
		);
	}

	/** Where the photo a board card shows is kept: the first of the event's gallery, and only that one. */
	eventCover(event: OpenEvent) {
		return this.eventPicture(event, event.value.photos[0].id);
	}

	/**
	 * Keeps the open event's photos while it's open, and lets go of them when it closes: what it gives back
	 * closes them, so a gallery uses it as it is, `$effect(() => app.showEventPictures(event))`.
	 */
	showEventPictures(event: OpenEvent) {
		this.#eventPictures = new Set(
			event.value.photos.map((photo) => eventFilePath(event.id, photo.id))
		);
		this.#keepPictures();
		return () => {
			this.#eventPictures.clear();
			this.#keepPictures();
		};
	}
	canDeleteEvent(event: OpenEvent) {
		return this.status === 'staff' && (this.admin || event.teacher === this.me?.id);
	}
	async deleteEvent(event: OpenEvent) {
		await this.#signedIn(() => request('DELETE', `/api/events/${event.id}`));
		await this.loadEvents();
	}

	conversations = $state.raw<Conversation[]>([]);
	messagePolicies = $state.raw<MessagePolicy[]>([]);
	/** The family a device writes as, which is simply whose card it holds; staff write as no family. */
	get messageFamily() {
		return this.#familyCard?.family ?? null;
	}
	messagesError = $state<string>();
	messagesVersion = $state(0);
	get unreadConversations() {
		return this.conversations.filter((item) => item.lastSequence > item.readSequence).length;
	}
	/** The key that opens a conversation: a family device's own, or the family's key a staff device holds. */
	async messageKey(family: string) {
		if (this.#familyCard) {
			if (this.#familyCard.family !== family) throw new UnreadableError();
			return this.#familyCard.familyKey;
		}
		const opening = this.#familyKeyForStaff(family);
		if (!opening) throw new UnreadableError();
		return opening;
	}
	#messageLoad = 0;
	#conversationCache = new Map<string, { key: CryptoKey; conversation: Conversation }>();
	async loadMessages() {
		const load = ++this.#messageLoad;
		const card = this.#card;
		try {
			const data = await request<Inbox>('GET', '/api/messages');
			const cache = new Map<string, { key: CryptoKey; conversation: Conversation }>();
			const opened = await Promise.allSettled(
				data.conversations.map(async (record) => {
					const key = await this.messageKey(record.family);
					const conversation = await openConversation(
						record,
						key,
						this.#conversationCache.get(record.id)
					);
					cache.set(record.id, { key, conversation });
					return conversation;
				})
			);
			if (this.#card !== card || load !== this.#messageLoad) return;
			// Replace the cache with this inbox only, dropping deleted or no-longer-readable conversations.
			this.#conversationCache = cache;
			this.conversations = opened.flatMap((result) =>
				result.status === 'fulfilled' ? [result.value] : []
			);
			this.messagePolicies = data.policies;
			this.messagesError = opened.some((result) => result.status === 'rejected')
				? 'unreadable-messages'
				: undefined;
			this.messagesVersion++;
		} catch (cause) {
			// What loaded before stays: a connection that dropped for a moment shouldn't empty the inbox, or
			// take away the settings an admin has open. Only the card going away clears them (`#disconnect`).
			if (this.#card !== card || load !== this.#messageLoad) return;
			this.messagesError = errorCode(cause);
		}
	}

	/** One conversation's messages, newest last, opened with the key the device holds for its family. */
	async readConversation(conversation: Conversation, before?: number): Promise<OpenMessage[]> {
		const records = await this.#signedIn(() =>
			request<MessageRecord[]>(
				'GET',
				`/api/messages/${conversation.id}${before ? `?before=${before}` : ''}`
			)
		);
		const key = await this.messageKey(conversation.family);
		const opened = await Promise.all(
			records.map((record) => openMessage(record, key, conversation.classroom, conversation.id))
		);
		// A page of older messages adds to what's open; a fresh look at a conversation replaces it, which
		// lets go of the pictures of the one left behind.
		if (!before) this.#messagePictures.clear();
		for (const message of opened)
			for (const file of message.files ?? [])
				this.#messagePictures.add(messageFilePath(conversation.id, message.id, file.id));
		this.#keepPictures();
		return opened;
	}

	/** Marks a conversation read up to `sequence`, and shows it as read without waiting for the inbox. */
	async markConversationRead(conversation: string, sequence: number) {
		await this.#signedIn(() =>
			request('PUT', `/api/messages/${conversation}`, { action: 'read', sequence })
		);
		this.conversations = this.conversations.map((row) =>
			row.id === conversation ? { ...row, readSequence: Math.max(row.readSequence, sequence) } : row
		);
	}

	/**
	 * Seals a message for a conversation, and the subject too when it starts one. The sealed payload is
	 * handed back so a send that failed can go again as the same message rather than a second one.
	 */
	async sealFor(
		classroom: string,
		family: string,
		conversation: string,
		content: MessageContent,
		subject?: string
	): Promise<SealedMessage> {
		const key = await this.messageKey(family);
		const message = createId();
		// Files attached in the form were sealed then; their names and keys go inside the message.
		const files = this.#contentFiles(content.files ?? []);
		const sealed = await sealMessage(
			{ ...content, ...(files.length ? { files } : {}) },
			key,
			classroom,
			message,
			conversation
		);
		const named = files.map((file) => file.id);
		return {
			conversation,
			message,
			start: subject !== undefined,
			payload:
				subject === undefined
					? { id: message, content: sealed, files: named }
					: {
							id: conversation,
							classroom,
							family,
							title: await sealSubject(subject, key, classroom, conversation),
							message,
							content: sealed,
							files: named
						}
		};
	}

	/**
	 * Sends a sealed message, with the bytes of the files a teacher attached, which go up first, as a notice's
	 * do: the message names them once they're there, and bytes an earlier try stored are left as they are.
	 */
	async sendMessage(sealed: SealedMessage, files: NewFile[] = []) {
		try {
			for (const file of files) {
				await this.#uploadFile(messageFilePath(sealed.conversation, sealed.message, file.id), file);
			}
			await this.#signedIn(() =>
				request(
					'POST',
					sealed.start ? '/api/messages' : `/api/messages/${sealed.conversation}`,
					sealed.payload
				)
			);
		} finally {
			await this.loadMessages();
		}
	}

	/** Fetches and decrypts one of a message's documents, and saves it on this device under its name. */
	saveMessageFile(conversation: string, message: OpenMessage, file: NoticeFile) {
		return this.#saveFile(messageFilePath(conversation, message.id, file.id), file);
	}

	/** One of a message's pictures, opened with the key its message holds (`#picture`). */
	messagePicture(conversation: string, message: OpenMessage, file: NoticeFile) {
		return this.#filePicture(messageFilePath(conversation, message.id, file.id), file);
	}

	async closeConversation(conversation: string) {
		await this.#signedIn(() =>
			request('PUT', `/api/messages/${conversation}`, { action: 'close' })
		);
		await this.loadMessages();
	}

	/** Takes a closed inquiry away for everyone, the family included. The inbox then no longer holds it. */
	async deleteConversation(conversation: string) {
		await this.#signedIn(() => request('DELETE', `/api/messages/${conversation}`));
		await this.loadMessages();
	}

	/**
	 * Saves what an admin decided about a classroom's messaging. The policy is loaded again either way, so a
	 * save refused as stale leaves the form showing what the other admin settled.
	 */
	async saveMessageSettings(settings: MessageSettings) {
		try {
			await this.#signedIn(() =>
				request('PUT', `/api/classrooms/${settings.classroom}/messages`, {
					enabled: settings.enabled,
					monthlyLimit: settings.monthlyLimit,
					revision: settings.revision,
					schedule: settings.schedule
				})
			);
		} finally {
			await this.loadMessages();
		}
	}

	meetings = $state.raw<MeetingSlot[]>([]);
	meetingChildren = $state.raw<MeetingChild[]>([]);
	meetingsError = $state<string>();
	meetingsLoaded = $state(false);
	#meetingLoad = 0;
	/** Puts the meetings back as they were before any card opened them, ignoring a load still on its way. */
	#clearMeetings() {
		this.#meetingLoad++;
		this.meetings = [];
		this.meetingChildren = [];
		this.meetingsLoaded = false;
		this.meetingsError = undefined;
	}
	async loadMeetings() {
		const load = ++this.#meetingLoad,
			card = this.#card;
		try {
			const data = await request<MeetingData>('GET', '/api/meetings');
			const children = await Promise.all(
				data.invites.map(async (invite) => {
					const key = await this.messageKey(invite.family);
					const content = (await decryptData(invite.label, key, {
						purpose: 'meeting-invite',
						classroom: invite.offer,
						child: invite.child
					})) as { name?: unknown };
					if (typeof content.name !== 'string') throw new UnreadableError();
					return { ...invite, name: content.name };
				})
			);
			if (card !== this.#card || load !== this.#meetingLoad) return;
			this.meetings = data.slots;
			this.meetingChildren = children;
			this.meetingsError = undefined;
			this.meetingsLoaded = true;
		} catch (cause) {
			if (card === this.#card && load === this.#meetingLoad) this.meetingsError = errorCode(cause);
		}
	}
	async publishMeetings(classroom: string, slots: { start: number; end: number }[]) {
		const id = createId();
		const children = this.catalog.children.filter((child) => child.classroom === classroom);
		const invites = await Promise.all(
			children.flatMap((child) =>
				child.families.map(async (family) => ({
					child: child.id,
					family,
					label: await encryptData({ name: child.name }, await this.messageKey(family), {
						purpose: 'meeting-invite',
						classroom: id,
						child: child.id
					})
				}))
			)
		);
		const offer: NewMeetingOffer = {
			id,
			classroom,
			revision: this.catalog.revision,
			slots: slots.map((slot) => ({ ...slot, id: createId() })),
			invites
		};
		await this.#signedIn(() => request('POST', '/api/meetings', offer));
		await this.loadMeetings();
	}
	async removeMeetingDay(classroom: string, date: string, slots: MeetingSlot[]) {
		try {
			await this.#signedIn(() =>
				request('POST', '/api/meetings/day', {
					classroom,
					date,
					slots: slots.map(({ id, version }) => ({ id, version }))
				})
			);
		} finally {
			await this.loadMeetings();
		}
	}

	async changeMeeting(slot: MeetingSlot, action: 'book' | 'cancel' | 'remove', child?: string) {
		try {
			await this.#signedIn(() =>
				request('PUT', `/api/meetings/${slot.id}`, { action, version: slot.version, child })
			);
		} finally {
			await this.loadMeetings();
		}
	}

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
	/** The kindergarten's info pages that open on this device, in the order admins put them in. */
	infoPages = $state.raw<InfoPage[]>([]);
	/** How many info pages didn't open on this device. */
	unreadableInfoPages = $state(0);
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
	 * The Info Key wrapped for staff, as the server last sent it to a staff device, which saves info pages and adds
	 * classrooms with it, once the first page made it.
	 */
	#infoKeyForStaff?: string;
	/** Every info page's ID, in order, as the server last sent them to a staff device, pages that didn't open too. */
	#infoPageIds: string[] = [];
	#loadedAt = 0;
	/** Invalidates asynchronous work when the device signs out or starts connecting another card. */
	#connectionVersion = 0;
	/** The load of the records and board under way, which a refresh meanwhile waits for. */
	#reloading?: Promise<void>;
	/** Whether something new came since the last load started, so the board loads again. */
	#stale = false;
	/**
	 * The board photos and the pictures on notices and info pages this device has opened, by where they're kept,
	 * while they're up.
	 */
	#pictures = new Map<string, Promise<Picture>>();
	/** The paths of the open conversation's pictures, which `#keepPictures` keeps while it's open. */
	#messagePictures = new Set<string>();
	/** The paths of the open event's photos, which `#keepPictures` keeps while it's open. */
	#eventPictures = new Set<string>();
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

	/**
	 * Which card this device is connected with, the ID alone and no key material: an unfinished event kept on
	 * the device belongs to it, so another person's card never opens it (src/lib/events/draft.ts).
	 */
	get myCredential() {
		return this.#card?.credential;
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
		const version = this.#connectionVersion;
		do {
			this.#stale = false;
			const card = this.#card;
			if (!this.connected || !card) return;
			try {
				// The session is the one the app opened with, so its subscription isn't sent again.
				await this.#open(await request<Access>('GET', '/api/session'), card, {
					resend: false,
					version
				});
				if (version !== this.#connectionVersion) return;
			} catch (cause) {
				if (version !== this.#connectionVersion) return;
				if (isDisconnection(cause)) await this.#disconnect('signed-out');
				// A load that failed, such as while a phone's connection wakes up, is tried again the next time
				// the app comes into view, without waiting out `refreshAfter`.
				else this.#loadedAt = 0;
			}
		} while (this.#stale);
	}

	async #resume() {
		const version = this.#connectionVersion;
		const card = this.#card;
		if (!card) {
			this.status = 'disconnected';
			return;
		}
		try {
			await this.#open(await request<Access>('GET', '/api/session'), card, { version });
		} catch (cause) {
			if (version !== this.#connectionVersion) return;
			if (isDisconnection(cause)) await this.#disconnect('signed-out');
			else this.status = errorCode(cause) === 'unreadable-records' ? 'unreadable' : 'offline';
		}
	}

	async #open(
		access: Access,
		card: DeviceCard,
		{ resend = true, version = this.#connectionVersion } = {}
	) {
		if (version !== this.#connectionVersion) return;
		if (this.#card?.credential !== card.credential) this.#clearMeetings();
		// A session or card that doesn't match the stored card means connecting again with a card.
		if (access.credential !== card.credential) throw new UnreadableError();
		let classrooms: FamilyClassroom[];
		if (access.kind === 'staff' && card.kind === 'staff') {
			const keys = await openStaffKeys(access, card.unlockKey);
			if (version !== this.#connectionVersion) return;
			this.#keys = keys;
			await this.#load(access.kindergarten, access.teacher);
			if (version !== this.#connectionVersion) return;
			classrooms = this.catalog.classrooms;
			await this.#openBoard(access.notices, classrooms);
			if (version !== this.#connectionVersion) return;
			await this.#showStaffInfo(access.info);
		} else if (
			access.kind === 'family' &&
			card.kind === 'family' &&
			access.family === card.family
		) {
			const opening = openFamily(access, card.familyKey);
			classrooms = await readable(opening, 'unreadable-records');
			if (version !== this.#connectionVersion) return;
			this.familyClassrooms = classrooms;
			await this.#openBoard(access.notices, classrooms, card);
			if (version !== this.#connectionVersion) return;
			const groupKeys = new Map(classrooms.map(({ id, groupKey }) => [id, groupKey]));
			this.#infoKeyForStaff = undefined;
			this.#infoPageIds = [];
			const info = await openInfoForFamily(access.info.pages, access.classrooms, groupKeys);
			if (version !== this.#connectionVersion) return;
			this.#showInfo(info);
		} else {
			throw new UnreadableError();
		}
		if (version !== this.#connectionVersion) return;
		await this.#showPhotos(access.photos, classrooms);
		if (version !== this.#connectionVersion) return;
		this.#card = card;
		this.#familyKeyEnvelope = access.kind === 'family' ? access.wrappedKey : undefined;
		this.#loadedAt = Date.now();
		this.status = this.install === 'android' ? 'install' : access.kind;
		// The inbox grows with every conversation the kindergarten has ever had, so the board doesn't wait for
		// it: it fills in beside the rest, and the pages that show it follow `messagesVersion`.
		void this.loadEvents();
		if (this.status === 'staff')
			for (const classroom of this.myClassrooms)
				void this.syncPhotoChildren(classroom.id).catch(() => {});
		void this.loadMessages();
		void this.loadMeetings();
		void this.#keepNotifications(resend);
	}

	/**
	 * Reads whether notifications are on and whether their card on home was put away. With `resend`, it also
	 * sends the subscription, which keeps it with the current session and renews one made with an earlier key.
	 */
	async #keepNotifications(resend: boolean) {
		const version = this.#connectionVersion;
		const [state, hidden] = await Promise.all([
			notificationState().catch(() => 'unsupported' as const),
			homeCardHidden().catch(() => false)
		]);
		if (version !== this.#connectionVersion) return;
		this.notifications = state;
		this.notificationCardHidden = hidden;
		if (resend && state === 'on') {
			const sent = await sendSubscription().catch(() => state);
			// Unless notifications were turned on or off in the meantime.
			if (version === this.#connectionVersion && this.notifications === state)
				this.notifications = sent;
		}
	}

	async #load(records: Kindergarten, teacher = this.me?.id) {
		const version = this.#connectionVersion;
		const opening = openCatalog(this.#staff.staffKey, records);
		const catalog = await readable(opening, 'unreadable-records');
		if (version !== this.#connectionVersion) return;
		this.catalog = catalog;
		this.me = catalog.teachers.find((candidate) => candidate.id === teacher);
	}

	/**
	 * A family's key on a staff device, opened from the envelope in the catalog. Notices, polls, and every
	 * conversation of that family share the one opening, which the device keeps until it disconnects: opening
	 * it again for each record would unwrap the same key hundreds of times.
	 */
	#familyKeyForStaff(family: string) {
		const record = this.catalog.families.find(({ id }) => id === family);
		if (!record) return undefined;
		const opening =
			this.#familyKeys.get(record.familyKeyForStaff) ??
			openFamilyKeyForStaff(this.#staff.staffKey, record);
		this.#familyKeys.set(record.familyKeyForStaff, opening);
		return opening;
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
		const version = this.#connectionVersion;
		const groupKeys = new Map(classrooms.map(({ id, groupKey }) => [id, groupKey]));
		const familyKeys: FamilyKeys = familyCard
			? async (family) => (family === familyCard.family ? familyCard.familyKey : undefined)
			: async (family) => this.#familyKeyForStaff(family);
		const { notices, unreadable } = await openBoard(records, groupKeys, familyKeys);
		if (version !== this.#connectionVersion) return;
		this.board = notices;
		this.unreadableNotices = unreadable;
		this.#keepPictures();
	}

	/** Shows the info pages that opened, and how many didn't, as notices are, and lets go of pictures no page has. */
	#showInfo({ pages, unreadable }: OpenedInfo) {
		this.infoPages = pages;
		this.unreadableInfoPages = unreadable;
		this.#keepPictures();
	}

	/**
	 * Shows the info pages as staff get them, keeping the Info Key's copy for staff, which saving pages and adding
	 * classrooms take, and every page's place, which moving one takes.
	 */
	async #showStaffInfo(info: StaffInfo) {
		const version = this.#connectionVersion;
		const opened = await openInfoForStaff(info, this.#staff.staffKey);
		if (version !== this.#connectionVersion) return;
		this.#infoKeyForStaff = info.infoKeyForStaff ?? undefined;
		this.#infoPageIds = info.pages.map(({ id }) => id);
		this.#showInfo(opened);
	}

	/** Runs a request made on purpose. A device whose session ended disconnects: only its card connects it again. */
	async #signedIn<T>(work: () => Promise<T>) {
		const version = this.#connectionVersion;
		try {
			return await work();
		} catch (cause) {
			if (version === this.#connectionVersion && cause instanceof ApiError && cause.status === 401)
				await this.#disconnect('signed-out');
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
		const version = this.#connectionVersion;
		try {
			await this.#signedIn(async () => {
				const response = await request<T>(method, path, body, headers);
				if (version === this.#connectionVersion) await open(response);
			});
		} catch (cause) {
			if (version !== this.#connectionVersion) throw cause;
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

	/** Sends an admin's change to the info pages, which come back as staff get them now. */
	#changeInfo(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) {
		return this.#send<StaffInfo>(method, path, body, (info) => this.#showStaffInfo(info));
	}

	async #disconnect(notice?: string) {
		this.#connectionVersion++;
		// Notifications end with the session, whose subscription the server forgets: after connecting again,
		// the device turns them on again.
		this.notifications = 'off';
		this.#card = undefined;
		this.#keys = undefined;
		this.#familyKeyEnvelope = undefined;
		this.#infoKeyForStaff = undefined;
		this.#infoPageIds = [];
		this.#familyKeys.clear();
		this.events = [];
		this.eventsError = undefined;
		this.#conversationCache.clear();
		this.#messagePictures.clear();
		this.#eventPictures.clear();
		this.#clearMeetings();
		this.conversations = [];
		this.messagePolicies = [];
		this.messagesError = undefined;
		this.me = undefined;
		this.catalog = emptyCatalog;
		this.familyClassrooms = [];
		this.board = [];
		this.unreadableNotices = 0;
		this.photos = [];
		this.infoPages = [];
		this.unreadableInfoPages = 0;
		this.#keepPictures();
		this.notice = notice;
		this.status = 'disconnected';
		// The unfinished event goes with the card: the next person to connect here must never see it.
		await Promise.all(
			[forgetCard(), forgetSubscription(), clearDraft()].map((done) => done.catch(() => {}))
		);
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
		const version = ++this.#connectionVersion;
		this.pendingCard = undefined;
		this.cardError = undefined;
		this.connecting = true;
		let connected = false;
		try {
			const { authToken, unlockKey } = await deriveCredential(secret);
			if (version !== this.#connectionVersion) return;
			const access = await request<Access>('POST', '/api/connect', { authToken });
			if (version !== this.#connectionVersion) return;
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
			await this.#open(access, card, { version });
			if (version !== this.#connectionVersion) return;
			await saveCard(card);
			if (version !== this.#connectionVersion) return;
			this.notice = undefined;
		} catch (cause) {
			if (version !== this.#connectionVersion) return;
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

	/** Adds a classroom, with the Info Key wrapped for it once the kindergarten has info pages. */
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
		await this.#saveChild(child, undefined, created, { share: values.share });
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

	/**
	 * Whether each of a classroom's children may be seen by its other families, as staff and families have
	 * left it: the consent records as they are now, so a change can name the revision it was made over.
	 */
	async photoSharing(classroom: string) {
		const { rows } = await request<ConsentSnapshot>(
			'GET',
			`/api/photo-consent?classroom=${classroom}`
		);
		const children = this.catalog.children.filter((c) => c.classroom === classroom);
		return { rows, shared: await sharing(children, rows, (f) => this.messageKey(f)) };
	}

	/**
	 * A family's own consent rows, one for each of its children, with the name staff wrote and the choice
	 * recorded so far already read with the family's key.
	 */
	async photoConsent() {
		const { rows } = await request<ConsentSnapshot>('GET', '/api/photo-consent');
		const key = await this.messageKey(this.messageFamily!);
		return await Promise.all(
			rows.map(async (row) => ({
				...row,
				name: await readLabel(row, key),
				share: await readChoice(row, key)
			}))
		);
	}

	/** Records a family's own choice for one of its children, over the revision it was read at. */
	async savePhotoConsent(row: ConsentRow, share: boolean) {
		await request('PUT', '/api/photo-consent', {
			child: row.child,
			revision: row.revision,
			choice: await sealChoice(share, await this.messageKey(row.family), row.child, row.family)
		});
	}

	/**
	 * Records what a child's consent form says, for every family card linked to the child. Families change
	 * the same choice themselves in the app, so this reads the records first and fails as stale if one
	 * changed meanwhile.
	 */
	async setPhotoSharing(child: Child, share: boolean) {
		const { rows } = await this.photoSharing(child.classroom);
		await this.#saveChild(child, child, [], { share, rows });
	}

	/** Saves a new child, or a change to `previous`, with the family links that follow from it. */
	async #saveChild(
		child: Child,
		previous?: Child,
		created: CreatedFamily[] = [],
		consent?: PhotoChoice
	) {
		const { staffKey } = this.#staff;
		const { catalog } = this;
		const others = catalog.children.filter(({ id }) => id !== child.id);
		const families = new Set([...(previous?.families ?? []), ...child.families]);
		const links = await familyLinks(staffKey, catalog, [...others, child], families, created);
		const body = {
			...links,
			classroom: child.classroom,
			meetingFamilies: child.families,
			photoFamilies: await Promise.all(
				child.families.map(async (family) => {
					const key =
						created.find((c) => c.family.id === family)?.familyKey ??
						(await this.messageKey(family));
					const context = { event: child.id, part: family };
					const row = consent?.rows?.find((r) => r.child === child.id && r.family === family);
					return {
						family,
						label: await encryptData({ name: child.name }, key, {
							purpose: 'photo-label',
							...context
						}),
						...(consent === undefined
							? {}
							: {
									choice: await sealChoice(consent.share, key, child.id, family),
									...(row === undefined ? {} : { revision: row.revision })
								})
					};
				})
			),
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

	/** The files a form attached or kept, as the content of a notice or an info page holds them. */
	#contentFiles(files: (NoticeFile | NewFile)[]): NoticeFile[] {
		return files.map((file) => ({
			id: file.id,
			name: file.name,
			bytes: file.bytes,
			key: file.key
		}));
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
		const files = this.#contentFiles(values.files);
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
	 * Adds an info page after the others, or changes `page`, sealed with the Info Key, or for the kindergarten's first
	 * page under a new key for staff and for every classroom, all of which an admin's device sees. The server learns
	 * nothing of a page's text, paper, or files' names and keys. Files attached in the form were sealed then, and are
	 * uploaded one at a time first.
	 */
	async saveInfoPage(values: InfoPageValues, page?: InfoPage) {
		const { staffKey } = this.#staff;
		const id = page?.id ?? createId();
		const files = this.#contentFiles(values.files);
		const content: InfoPageContent = { paper: values.paper, body: values.body };
		if (files.length) content.files = files;
		const envelope = this.#infoKeyForStaff;
		const sealed = envelope
			? await sealInfoPage(id, content, staffKey, envelope)
			: await sealFirstInfoPage(id, content, staffKey, this.catalog.classrooms);
		for (const file of values.files) {
			if ('sealed' in file) await this.#uploadFile(infoFilePath(id, file.id), file);
		}
		const body = { ...sealed, files: files.map((file) => file.id) };
		if (page) await this.#changeInfo('PUT', `/api/info/pages/${id}`, body);
		else await this.#changeInfo('POST', '/api/info/pages', { ...body, id });
	}

	deleteInfoPage(page: InfoPage) {
		return this.#changeInfo('DELETE', `/api/info/pages/${page.id}`);
	}

	/**
	 * Moves an info page one place up or down, past the page shown beside it, and sends every page's place, pages that
	 * didn't open on this device too. The server refuses an order that missed a page added or deleted meanwhile.
	 */
	async moveInfoPage(page: InfoPage, by: -1 | 1) {
		const index = this.infoPages.findIndex(({ id }) => id === page.id);
		const beside = index < 0 ? undefined : this.infoPages[index + by];
		if (!beside) return;
		const pages = this.#infoPageIds.map((id) =>
			id === page.id ? beside.id : id === beside.id ? page.id : id
		);
		await this.#changeInfo('PUT', '/api/info/order', { pages });
	}

	/** Fetches and decrypts one of a notice's documents, and saves it on this device under its name. */
	saveNoticeFile(notice: Notice, file: NoticeFile) {
		return this.#saveFile(noticeFilePath(notice.id, file.id), file);
	}

	/** Fetches and decrypts one of an info page's documents, and saves it on this device under its name. */
	saveInfoFile(page: InfoPage, file: NoticeFile) {
		return this.#saveFile(infoFilePath(page.id, file.id), file);
	}

	async #saveFile(path: string, file: NoticeFile) {
		const sealed = await this.#signedIn(() => requestBytes(path));
		saveFile(await readable(openFile(sealed, file), 'unreadable-file'), file.name);
	}

	/** A board photo, opened with its classroom's Group Key (`#picture`). */
	photoPicture(photo: PhotoRecord) {
		return this.#picture(photoPath(photo), async (sealed) => {
			const { groupKey } = byId(this.myClassrooms, photo.classroom);
			const opening = openPhoto(sealed, groupKey, photo.classroom, photo.id);
			return { blob: await readable(opening, 'unreadable-photo') };
		});
	}

	/** One of a notice's pictures, opened with the key its notice holds (`#picture`). */
	noticePicture(notice: Notice, file: NoticeFile) {
		return this.#filePicture(noticeFilePath(notice.id, file.id), file);
	}

	/** One of an info page's pictures, opened with the key the page holds (`#picture`). */
	infoPicture(page: InfoPage, file: NoticeFile) {
		return this.#filePicture(infoFilePath(page.id, file.id), file);
	}

	#filePicture(path: string, file: NoticeFile) {
		return this.#picture(path, async (sealed) => ({
			blob: await readable(openPicture(sealed, file), 'unreadable-file')
		}));
	}

	/**
	 * A picture, fetched from where it's kept and opened the first time it's shown, and kept while it's up. One
	 * that didn't open is tried again the next time it's shown.
	 */
	#picture(path: string, open: (sealed: Uint8Array<ArrayBuffer>) => Promise<Omit<Picture, 'url'>>) {
		let picture = this.#pictures.get(path);
		if (!picture) {
			picture = this.#signedIn(async () => {
				const opened = await open(await requestBytes(path));
				return { ...opened, url: URL.createObjectURL(opened.blob) };
			});
			this.#pictures.set(path, picture);
			picture.catch(() => this.#pictures.delete(path));
		}
		return picture;
	}

	/**
	 * Lets go of the pictures of board photos, of files on notices and info pages, and of the open
	 * conversation's and event's, that aren't up anymore.
	 */
	#keepPictures() {
		const up = new Set([
			...this.photos.map(photoPath),
			...this.board.flatMap(({ id, files = [] }) =>
				files.map((file) => noticeFilePath(id, file.id))
			),
			...this.infoPages.flatMap(({ id, files = [] }) =>
				files.map((file) => infoFilePath(id, file.id))
			),
			...this.#messagePictures,
			// The photo each event card on the board shows, which is up for as long as the card is.
			...this.events.map((event) => eventFilePath(event.id, event.value.photos[0].id)),
			...this.#eventPictures
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
		const version = this.#connectionVersion;
		const photos = await Promise.all(
			records.map(async (record): Promise<Photo> => {
				const groupKey = classrooms.find(({ id }) => id === record.classroom)?.groupKey;
				if (!record.details || !groupKey) return record;
				const opening = openPhotoDetails(record.details, groupKey, record.classroom, record.id);
				return { ...record, ...(await opening.catch(() => ({}))) };
			})
		);
		if (version !== this.#connectionVersion) return;
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
