// Requests between the app and its Worker. Everything in them is opaque to the server: random IDs, auth
// tokens, wrapped keys, and profiles encrypted in the browser (docs/access-format.md).

/** A new card as the server stores it: it keeps only a hash of the auth token, and the key stays wrapped. */
export type NewCredential = { id: string; authToken: string; wrappedKey: string };

export type NewClassroom = { id: string; profile: string; groupKeyForStaff: string };
export type TeacherChange = { admin: boolean; profile: string; classrooms: string[] };
export type NewTeacher = TeacherChange & { id: string; credential: NewCredential };
export type NewFamily = {
	id: string;
	profile: string;
	familyKeyForStaff: string;
	credential: NewCredential;
};

/** A family's access to a classroom: the classroom's Group Key, wrapped for the Family Key. */
export type Membership = { family: string; classroom: string; groupKeyForFamily: string };
export type MembershipKey = { family: string; classroom: string };

/**
 * How families change along with a child. A family's classrooms follow from its children, which only the
 * browser can read, so the browser works these out and the server applies them in one transaction.
 */
export type FamilyLinks = {
	newFamilies: NewFamily[];
	addMemberships: Membership[];
	removeMemberships: MembershipKey[];
	/** Families left without children. Their cards stop working. */
	removeFamilies: string[];
};

/**
 * Changes to children carry the catalog `revision` they were based on (`Kindergarten.revision`), so a
 * change made from outdated records fails as stale instead of undoing another device's change.
 */
type Revised = { revision: number };

export type NewChild = FamilyLinks & Revised & { id: string; classroom: string; profile: string };
export type ChildChange = FamilyLinks & Revised & { classroom: string; profile: string };
export type ChildRemoval = Pick<FamilyLinks, 'removeMemberships' | 'removeFamilies'> & Revised;

/** The first setup: the admin's card and the recovery card, both admins. */
export type Setup = {
	token: string;
	teachers: { id: string; profile: string; credential: NewCredential }[];
};

/** What a connected device needs to open its keys. */
export type Access =
	| { kind: 'staff'; credential: string; wrappedKey: string; teacher: string; admin: boolean }
	| {
			kind: 'family';
			credential: string;
			wrappedKey: string;
			family: string;
			classrooms: { id: string; profile: string; groupKeyForFamily: string }[];
	  };

/** The records a staff member may see: everything for admins, their own classrooms for teachers. */
export type Kindergarten = Revised & {
	classrooms: { id: string; profile: string; groupKeyForStaff: string }[];
	teachers: { id: string; admin: boolean; profile: string; classrooms: string[] }[];
	children: { id: string; classroom: string; profile: string }[];
	families: { id: string; profile: string; familyKeyForStaff: string; classrooms: string[] }[];
};

/** A request that failed: `status` is 0 when the server couldn't be reached, and `code` says why. */
export class ApiError extends Error {
	readonly status: number;
	readonly code: string;

	constructor(status: number, code: string, options?: ErrorOptions) {
		super(`Request failed: ${code}`, options);
		this.name = 'ApiError';
		this.status = status;
		this.code = code;
	}
}

export async function request<T = void>(
	method: 'GET' | 'POST' | 'PUT' | 'DELETE',
	path: string,
	body?: unknown
): Promise<T> {
	const headers: Record<string, string> = { accept: 'application/json' };
	if (body !== undefined) headers['content-type'] = 'application/json';
	let response: Response;
	try {
		response = await fetch(path, {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body)
		});
	} catch (cause) {
		throw new ApiError(0, 'offline', { cause });
	}
	const payload: unknown =
		response.status === 204 ? undefined : await response.json().catch(() => {});
	if (response.ok) return payload as T;
	const code = (payload as { message?: unknown } | undefined)?.message;
	throw new ApiError(response.status, typeof code === 'string' ? code : 'unexpected');
}
