import { error } from '@sveltejs/kit';
import type {
	ChildChange,
	FamilyLinks,
	Membership,
	MembershipKey,
	NewChild,
	NewClassroom,
	NewCredential,
	NewFamily,
	NewTeacher,
	Setup,
	TeacherChange
} from '$lib/api';
import { fromBase64Url } from '$lib/base64url';
import { AUTH_TOKEN_BYTES, envelopeSize, isId, KEY_BYTES } from '$lib/crypto';

// Request bodies, checked before anything reaches the database. The server can't open profiles or keys,
// so it checks their form; the browsers that open them check the rest.

type Fields = Record<string, unknown>;

/** Requests are small JSON; a big change to children and family cards stays far below this. */
const maxBytes = 64 * 1024;
/** A profile holds a name and a few IDs. */
const maxProfileBytes = 6 * 1024;

function invalid(): never {
	error(400, 'invalid');
}

/** Reads a JSON object, refusing other content types and stopping as soon as the body is too large. */
export async function readJson(request: Request): Promise<Fields> {
	if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
		error(415, 'invalid');
	}
	if (Number(request.headers.get('content-length')) > maxBytes) error(413, 'too-large');
	const chunks: Uint8Array<ArrayBuffer>[] = [];
	let size = 0;
	const reader = request.body?.getReader();
	while (reader) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.length;
		if (size > maxBytes) {
			await reader.cancel();
			error(413, 'too-large');
		}
		chunks.push(value);
	}
	try {
		return fields(JSON.parse(await new Blob(chunks).text()));
	} catch {
		invalid();
	}
}

function fields(value: unknown): Fields {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Fields)
		: invalid();
}

function list<T>(value: unknown, item: (value: unknown) => T, max = 200): T[] {
	return Array.isArray(value) && value.length <= max ? value.map(item) : invalid();
}

const id = (value: unknown) => (isId(value) ? value : invalid());
const ids = (value: unknown) => [...new Set(list(value, id))];
const flag = (value: unknown) => (typeof value === 'boolean' ? value : invalid());
const revision = (value: unknown) =>
	Number.isSafeInteger(value) && (value as number) >= 0 ? (value as number) : invalid();

export const authToken = (value: unknown) =>
	typeof value === 'string' && fromBase64Url(value)?.length === AUTH_TOKEN_BYTES
		? value
		: invalid();

const wrappedKey = (value: unknown) =>
	envelopeSize(value) === KEY_BYTES ? (value as string) : invalid();

export function profile(value: unknown) {
	const size = envelopeSize(value);
	return size !== undefined && size <= maxProfileBytes ? (value as string) : invalid();
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

export const newClassroom = (body: Fields): NewClassroom => ({
	id: id(body.id),
	profile: profile(body.profile),
	groupKeyForStaff: wrappedKey(body.groupKeyForStaff)
});

export const teacherChange = (body: Fields): TeacherChange => ({
	admin: flag(body.admin),
	profile: profile(body.profile),
	classrooms: ids(body.classrooms)
});

export const newTeacher = (body: Fields): NewTeacher => ({
	id: id(body.id),
	...teacherChange(body),
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
	return { classroom, profile: profile(body.profile), ...familyLinks(body, classroom) };
}

export const newChild = (body: Fields): NewChild => ({ id: id(body.id), ...childChange(body) });
