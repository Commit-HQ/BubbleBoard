// Requests between the app and its Worker. Everything in them is opaque to the server: random IDs, auth
// tokens, wrapped keys, and profiles encrypted in the browser (docs/access-format.md).

/** A new card as the server stores it: it keeps only a hash of the auth token, and the key stays wrapped. */
export type NewCredential = { id: string; authToken: string; wrappedKey: string };

export type NewClassroom = { id: string; profile: string; groupKeyForStaff: string };
type TeacherRecord = { admin: boolean; profile: string; classrooms: string[] };
export type NewTeacher = TeacherRecord & { id: string; credential: NewCredential };
/**
 * A change to a teacher carries the catalog `revision` it was made from, as `FamilyLinks` do, so a form
 * left open can't restore rights another admin has withdrawn.
 */
export type TeacherChange = TeacherRecord & { revision: number };
export type NewFamily = {
	id: string;
	profile: string;
	familyKeyForStaff: string;
	credential: NewCredential;
};

export type MembershipKey = { family: string; classroom: string };
/** A family's access to a classroom: the classroom's Group Key, wrapped for the Family Key. */
export type Membership = MembershipKey & { groupKeyForFamily: string };

/**
 * How families change along with a child. A family's classrooms follow from its children, which only the
 * browser can read, so the browser works these out and the server applies them in one transaction. They
 * carry the catalog `revision` they were worked out from, so a change made from outdated records fails as
 * stale instead of undoing another device's change.
 */
export type FamilyLinks = {
	revision: number;
	newFamilies: NewFamily[];
	addMemberships: Membership[];
	removeMemberships: MembershipKey[];
	/** Families left without children. Their cards stop working. */
	removeFamilies: string[];
};

export type ChildChange = FamilyLinks & { classroom: string; profile: string };
export type NewChild = ChildChange & { id: string };

/** The first setup: the admin's card and the recovery card, both admins. */
export type Setup = {
	token: string;
	teachers: Pick<NewTeacher, 'id' | 'profile' | 'credential'>[];
};

/** Whose card a session belongs to, and the wrapped key that card opens. */
export type Identity = { credential: string; wrappedKey: string } & (
	{ kind: 'staff'; teacher: string; admin: boolean } | { kind: 'family'; family: string }
);
export type Staff = Extract<Identity, { kind: 'staff' }>;

/** The records a staff member may see: everything for admins, their own classrooms for teachers. */
export type Kindergarten = {
	/** Moves on with every change a `TeacherChange` or `FamilyLinks` makes. */
	revision: number;
	classrooms: { id: string; profile: string; groupKeyForStaff: string }[];
	teachers: { id: string; admin: boolean; profile: string; classrooms: string[] }[];
	children: { id: string; classroom: string; profile: string }[];
	families: { id: string; profile: string; familyKeyForStaff: string; classrooms: string[] }[];
};

/** What a connected device opens: a staff member's records, or the classrooms a family's card joined. */
export type Access =
	| (Staff & { kindergarten: Kindergarten })
	| (Extract<Identity, { kind: 'family' }> & {
			classrooms: { id: string; profile: string; groupKeyForFamily: string }[];
	  });

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
