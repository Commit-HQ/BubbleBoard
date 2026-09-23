import { error } from '@sveltejs/kit';
import type {
	ChildChange,
	FamilyCard,
	FamilyLinks,
	InfoKey,
	InfoPageChange,
	Membership,
	MembershipKey,
	NewChild,
	NewClassroom,
	NewCredential,
	NewFamily,
	NewInfoKey,
	NewInfoPage,
	NewNotice,
	NewTeacher,
	NoticeChange,
	NoticeKey,
	PollAnswer,
	Setup,
	StaffRole,
	TeacherChange
} from '$lib/api';
import { fromBase64Url } from '$lib/base64url';
import {
	AUTH_TOKEN_BYTES,
	envelopeSize,
	isId,
	KEY_BYTES,
	SEALED_BYTES_OVERHEAD
} from '$lib/crypto';
import { maxFileBytes, maxNoticeFiles } from '$lib/files';
import { maxInfoBytes } from '$lib/info';
import { maxNoticeBytes, noticeDays } from '$lib/notices';
import { maxPhotoBytes } from '$lib/photos';
import { maxEventFileBytes } from '$lib/events/types';

// Request bodies, checked before anything reaches the database. The server can't open profiles, keys,
// photos, or files, so it checks their form; the browsers that open them check the rest.

type Fields = Record<string, unknown>;

/** Requests are small JSON; a big change to children and family cards stays far below this. */
const maxBytes = 64 * 1024;
/** A profile holds a name and a few IDs. */
const maxProfileBytes = 6 * 1024;
/** A private message or its subject: far longer than a profile, far shorter than a notice. */
const maxMessageBytes = 18000;

export function invalid(): never {
	error(400, 'invalid');
}

/**
 * Reads a body of one content type, refusing others and stopping as soon as it's larger than `max` bytes. Its
 * bytes are copied once, into one array.
 */
async function readBody(request: Request, type: string, max: number) {
	if (request.headers.get('content-type')?.split(';')[0].trim() !== type) error(415, 'invalid');
	if (Number(request.headers.get('content-length')) > max) error(413, 'too-large');
	const chunks: Uint8Array<ArrayBuffer>[] = [];
	let size = 0;
	const reader = request.body?.getReader();
	while (reader) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.length;
		if (size > max) {
			await reader.cancel();
			error(413, 'too-large');
		}
		chunks.push(value);
	}
	const body = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.length;
	}
	return body;
}

/** Reads a JSON object. */
export async function readJson(request: Request): Promise<Fields> {
	const body = await readBody(request, 'application/json', maxBytes);
	try {
		return fields(JSON.parse(new TextDecoder().decode(body)));
	} catch {
		invalid();
	}
}

/** Reads encrypted bytes that hold at least one byte, and at most `max` before they were encrypted. */
async function readSealed(request: Request, max: number) {
	const sealed = await readBody(request, 'application/octet-stream', max + SEALED_BYTES_OVERHEAD);
	return sealed.length > SEALED_BYTES_OVERHEAD ? sealed : invalid();
}

/** Reads a board photo's encrypted bytes. */
export const readPhoto = (request: Request) => readSealed(request, maxPhotoBytes);

/** Reads a notice file's encrypted bytes. */
export const readFile = (request: Request) => readSealed(request, maxFileBytes);

/** Reads an event photo's encrypted package. */
export const readEventPhoto = (request: Request) => readSealed(request, maxEventFileBytes);

export function fields(value: unknown): Fields {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Fields)
		: invalid();
}

export function list<T>(value: unknown, item: (value: unknown) => T, max = 200): T[] {
	return Array.isArray(value) && value.length <= max ? value.map(item) : invalid();
}

export const id = (value: unknown) => (isId(value) ? value : invalid());
export const ids = (value: unknown, max?: number) => [...new Set(list(value, id, max))];
export const flag = (value: unknown) => (typeof value === 'boolean' ? value : invalid());
export const revision = (value: unknown) =>
	Number.isSafeInteger(value) && (value as number) >= 0 ? (value as number) : invalid();

export const authToken = (value: unknown) =>
	typeof value === 'string' && fromBase64Url(value)?.length === AUTH_TOKEN_BYTES
		? value
		: invalid();

const wrappedKey = (value: unknown) =>
	envelopeSize(value) === KEY_BYTES ? (value as string) : invalid();

/** A value in envelope form that holds at most `max` bytes. */
export const envelope = (max: number) => (value: unknown) => {
	const size = envelopeSize(value);
	return size !== undefined && size <= max ? (value as string) : invalid();
};

export const profile = envelope(maxProfileBytes);

/**
 * A sealed message, subject, or invitation label: an envelope that holds something, and at most `max` bytes
 * before it was encrypted. Unlike `envelope`, an empty one is refused — nothing the app seals is empty.
 */
export function sealed(value: unknown, max = maxMessageBytes): string {
	const size = envelopeSize(value);
	return size !== undefined && size > 0 && size <= max ? (value as string) : invalid();
}

function credential(value: unknown): NewCredential {
	const body = fields(value);
	return {
		id: id(body.id),
		authToken: authToken(body.authToken),
		wrappedKey: wrappedKey(body.wrappedKey)
	};
}

export const newCredential = (body: Fields) => credential(body.credential);

/** New cards for families: each family once, each with a card of its own. */
export function familyCards(body: Fields): FamilyCard[] {
	const cards = list(body.cards, (value) => {
		const card = fields(value);
		return { family: id(card.family), credential: credential(card.credential) };
	});
	const families = new Set(cards.map((card) => card.family));
	const credentials = new Set(cards.map((card) => card.credential.id));
	const distinct = families.size === cards.length && credentials.size === cards.length;
	return cards.length && distinct ? cards : invalid();
}

export function setup(body: Fields): Setup {
	if (typeof body.token !== 'string' || body.token.length > 256) invalid();
	const teachers = list(body.teachers, (value) => {
		const teacher = fields(value);
		return {
			id: id(teacher.id),
			profile: profile(teacher.profile),
			credential: credential(teacher.credential)
		};
	});
	const distinct = new Set(teachers.flatMap((teacher) => [teacher.id, teacher.credential.id]));
	return teachers.length === 2 && distinct.size === 4 ? { token: body.token, teachers } : invalid();
}

/** A new classroom, which brings the Info Key once the kindergarten has info pages, as the database checks. */
export const newClassroom = (body: Fields): NewClassroom => ({
	id: id(body.id),
	profile: profile(body.profile),
	groupKeyForStaff: wrappedKey(body.groupKeyForStaff),
	...(body.infoKey === undefined ? {} : { infoKey: wrappedKey(body.infoKey) })
});

const infoContent = envelope(maxInfoBytes);

/** A new Info Key, for staff and for each classroom once. A kindergarten without classrooms has no copies. */
function newInfoKey(value: unknown): NewInfoKey {
	const key = fields(value);
	const classrooms = list(key.classrooms, (item): InfoKey => {
		const copy = fields(item);
		return { classroom: id(copy.classroom), infoKey: wrappedKey(copy.infoKey) };
	});
	const distinct = new Set(classrooms.map(({ classroom }) => classroom)).size === classrooms.length;
	return distinct ? { infoKeyForStaff: wrappedKey(key.infoKeyForStaff), classrooms } : invalid();
}

/** An info page as the head's device saves it, with the files its content holds, each once. */
export const infoPageChange = (body: Fields): InfoPageChange => ({
	content: infoContent(body.content),
	files: ids(body.files, maxNoticeFiles)
});

/** A new info page, which brings the new Info Key when it's the kindergarten's first. */
export function newInfoPage(body: Fields): NewInfoPage {
	const page = { id: id(body.id), ...infoPageChange(body) };
	return body.key === undefined ? page : { ...page, key: newInfoKey(body.key) };
}

/** The info pages in a new order, each once. */
export function infoOrder(body: Fields) {
	const pages = list(body.pages, id);
	return new Set(pages).size === pages.length ? pages : invalid();
}

const roles: StaffRole[] = ['teacher', 'lead', 'head'];
const staffRole = (value: unknown) =>
	roles.includes(value as StaffRole) ? (value as StaffRole) : invalid();

/** A teacher's role with the classrooms she holds. The head holds them all, so she's given none. */
function teacher(body: Fields) {
	const role = staffRole(body.role);
	const classrooms = ids(body.classrooms);
	return role === 'head' && classrooms.length
		? invalid()
		: { role, profile: profile(body.profile), classrooms };
}

export const teacherChange = (body: Fields): TeacherChange => ({
	revision: revision(body.revision),
	...teacher(body)
});

export const newTeacher = (body: Fields): NewTeacher => ({
	id: id(body.id),
	...teacher(body),
	credential: credential(body.credential)
});

function newFamily(value: unknown): NewFamily {
	const family = fields(value);
	return {
		id: id(family.id),
		profile: profile(family.profile),
		familyKeyForStaff: wrappedKey(family.familyKeyForStaff),
		credential: credential(family.credential)
	};
}

function membershipKey(value: unknown): MembershipKey {
	const membership = fields(value);
	return { family: id(membership.family), classroom: id(membership.classroom) };
}

const membership = (value: unknown): Membership => ({
	...membershipKey(value),
	groupKeyForFamily: wrappedKey(fields(value).groupKeyForFamily)
});

/**
 * Family links for a change to a child in `classroom`: no membership repeats, and every new family
 * reaches that classroom. A child being removed is in no classroom, so its links add no family.
 */
export function familyLinks(body: Fields, classroom?: string): FamilyLinks {
	const links = {
		revision: revision(body.revision),
		newFamilies: list(body.newFamilies, newFamily, 20),
		addMemberships: list(body.addMemberships, membership),
		removeMemberships: list(body.removeMemberships, membershipKey),
		removeFamilies: ids(body.removeFamilies)
	};
	const added = links.addMemberships.map((link) => `${link.family}/${link.classroom}`);
	if (new Set(added).size !== added.length) invalid();
	if (links.newFamilies.some((family) => !added.includes(`${family.id}/${classroom}`))) invalid();
	return links;
}

export function childChange(body: Fields): ChildChange {
	const classroom = id(body.classroom);
	return {
		classroom,
		profile: profile(body.profile),
		...familyLinks(body, classroom),
		meetingFamilies: ids(body.meetingFamilies),
		...(body.photoFamilies === undefined
			? {}
			: {
					photoFamilies: list(
						body.photoFamilies,
						(value) => {
							const row = fields(value);
							return {
								family: id(row.family),
								label: profile(row.label),
								// Staff recording a consent form send the choice and the row they read it over.
								...(row.choice === undefined ? {} : { choice: sealed(row.choice, 256) }),
								...(row.revision === undefined ? {} : { revision: revision(row.revision) })
							};
						},
						20
					)
				})
	};
}

export const newChild = (body: Fields): NewChild => ({ id: id(body.id), ...childChange(body) });

const noticeContent = envelope(maxNoticeBytes);

/** How long a notice or event stays up, in days, from the retention policy in $lib/notices. */
export const days = (value: unknown) =>
	noticeDays.includes(value as (typeof noticeDays)[number]) ? (value as number) : invalid();

/** A notice's key for each of its classrooms: at least one, and each classroom once. */
function noticeKeys(value: unknown): NoticeKey[] {
	const keys = list(value, (item) => {
		const key = fields(item);
		return { classroom: id(key.classroom), noticeKey: wrappedKey(key.noticeKey) };
	});
	const classrooms = new Set(keys.map(({ classroom }) => classroom));
	return keys.length && classrooms.size === keys.length ? keys : invalid();
}

/**
 * The files a notice's content holds, each once. Every device sends them, so one from before notices carried
 * files is refused, rather than taking a notice's files off it when it changes the notice.
 */
const noticeFiles = (value: unknown) => ids(value, maxNoticeFiles);

/** Whether a notice has a poll, and whether families see its counts, which only a poll can show. */
function poll(body: Fields) {
	const [hasPoll, counts] = [flag(body.poll), flag(body.counts)];
	return counts && !hasPoll ? invalid() : { poll: hasPoll, counts };
}

export const newNotice = (body: Fields): NewNotice => ({
	id: id(body.id),
	content: noticeContent(body.content),
	days: days(body.days),
	...poll(body),
	classrooms: noticeKeys(body.classrooms),
	files: noticeFiles(body.files)
});

export const noticeChange = (body: Fields): NoticeChange => ({
	content: noticeContent(body.content),
	days: days(body.days),
	announce: flag(body.announce),
	...poll(body),
	classrooms: noticeKeys(body.classrooms),
	files: noticeFiles(body.files)
});

/** A family's answer to a poll holds the ID of the option it chose. */
const choice = envelope(256);

/**
 * A family's answer, and whether its device read the poll as one whose counts families see. Every device
 * sends that, so one from before families could see counts is refused rather than answering with the wrong key.
 */
export const pollAnswer = (body: Fields): PollAnswer => ({
	choice: choice(body.choice),
	counts: flag(body.counts)
});

/** A board photo's details hold who put it up. */
const details = envelope(1024);

/** A board photo's encrypted details, which come in a header beside its bytes. */
export const photoDetails = (request: Request) =>
	details(request.headers.get('bubbleboard-photo-details'));
