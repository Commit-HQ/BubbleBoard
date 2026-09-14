// Requests between the app and its Worker. Everything in them is opaque to the server: random IDs, auth
// tokens, wrapped keys, and profiles and photos encrypted in the browser (docs/access-format.md).

/** A new card as the server stores it: it keeps only a hash of the auth token, and the key stays wrapped. */
export type NewCredential = { id: string; authToken: string; wrappedKey: string };

/** A new classroom, with the Info Key wrapped for its Group Key once the kindergarten has info pages. */
export type NewClassroom = {
	id: string;
	profile: string;
	groupKeyForStaff: string;
	infoKey?: string;
};
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
/** A new card for a family, in place of the one it has. */
export type FamilyCard = { family: string; credential: NewCredential };

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
export type FamilyIdentity = Extract<Identity, { kind: 'family' }>;

/** The records a staff member may see: everything for admins, their own classrooms for teachers. */
export type Kindergarten = {
	/** Moves on with every change a `TeacherChange` or `FamilyLinks` makes. */
	revision: number;
	classrooms: { id: string; profile: string; groupKeyForStaff: string }[];
	teachers: (TeacherRecord & { id: string })[];
	children: { id: string; classroom: string; profile: string }[];
	families: { id: string; profile: string; familyKeyForStaff: string; classrooms: string[] }[];
};

/** A notice's key, wrapped with the Group Key of one of its classrooms. */
export type NoticeKey = { classroom: string; noticeKey: string };

/** A notice as the server stores it, with its keys for the classrooms the device belongs to. */
export type NoticeRecord = {
	id: string;
	/** The teacher who posted it, until they're removed. */
	teacher: string | null;
	content: string;
	postedAt: number;
	/** When it last went to the top of the board: when posted, or changed with `announce`. */
	announcedAt: number;
	editedAt: number | null;
	expiresAt: number;
	classrooms: NoticeKey[];
	/**
	 * The families that marked it as seen, of those the device may know about: a family device's own family,
	 * the families in a teacher's classrooms, or every family for an admin.
	 */
	seen: string[];
	/**
	 * The answers to its poll, from the same families as `seen`, and on a family device, when families see the
	 * poll's counts, from every family the notice is for.
	 */
	votes: VoteRecord[];
};

/** A family's answer to a notice's poll, encrypted with its Family Key, or with the poll's key when counted. */
export type VoteRecord = { family: string; choice: string };

/**
 * A family's answer as its device sends it, with whether the device read the poll as one whose counts families
 * see, which says which key the answer is encrypted with.
 */
export type PollAnswer = { choice: string; counts: boolean };

/** A notice as a device changes it, sealed again under a new Notice Key. */
export type NoticeChange = {
	content: string;
	/** How long it stays up, counted from when it was first posted. */
	days: number;
	/** Puts the notice back at the top of the board. */
	announce: boolean;
	/** Whether its content holds a poll for families to answer. Taking the poll off removes the answers. */
	poll: boolean;
	/**
	 * Whether families see how many chose each of the poll's answers, which only a poll can show. Changing it
	 * removes the answers, which were encrypted with another key.
	 */
	counts: boolean;
	classrooms: NoticeKey[];
	/** The files its content holds, uploaded just before. The files a change leaves out are deleted. */
	files: string[];
};
export type NewNotice = Omit<NoticeChange, 'announce'> & { id: string };

/**
 * The photo a classroom's board shows, as the server keeps it, with its details, who put it up, encrypted with
 * the classroom's Group Key; photos put up before details were kept have none. Its encrypted bytes are fetched
 * on their own.
 */
export type PhotoRecord = {
	id: string;
	classroom: string;
	postedAt: number;
	details: string | null;
};

/** One of the kindergarten's info pages as the server keeps it: its content, encrypted with the Info Key. */
export type InfoPageRecord = { id: string; content: string; editedAt: number };
/**
 * The kindergarten's info pages as staff get them, in the order admins put them in, with the Info Key wrapped for
 * the Staff Key, which the first page brings.
 */
export type StaffInfo = { infoKeyForStaff: string | null; pages: InfoPageRecord[] };
/** The Info Key, wrapped with the Group Key of one classroom. */
export type InfoKey = { classroom: string; infoKey: string };
/** A new Info Key, wrapped for staff and for every classroom. */
export type NewInfoKey = { infoKeyForStaff: string; classrooms: InfoKey[] };
/**
 * An info page as an admin's device saves it: its content, sealed with the Info Key, and the files the content
 * holds, uploaded just before. The files a change leaves out are deleted.
 */
export type InfoPageChange = { content: string; files: string[] };
/** A new info page, which goes after the others. The kindergarten's first brings the new Info Key. */
export type NewInfoPage = InfoPageChange & { id: string; key?: NewInfoKey };

/**
 * What a connected device opens: a staff member's records, or the classrooms a family's card joined, each with
 * its copy of the Info Key, with the notices and board photos of the classrooms it sees, and the kindergarten's
 * info pages.
 */
export type Access = (
	| (Staff & { kindergarten: Kindergarten; info: StaffInfo })
	| (FamilyIdentity & {
			classrooms: {
				id: string;
				profile: string;
				groupKeyForFamily: string;
				infoKey: string | null;
			}[];
			info: Pick<StaffInfo, 'pages'>;
	  })
) & { notices: NoticeRecord[]; photos: PhotoRecord[] };

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

async function send(path: string, init?: RequestInit) {
	try {
		return await fetch(path, init);
	} catch (cause) {
		throw new ApiError(0, 'offline', { cause });
	}
}

/** The error a failed response carries: the server sends its code as `message`. */
async function failure(response: Response) {
	const payload: unknown = await response.json().catch(() => {});
	const code = (payload as { message?: unknown } | undefined)?.message;
	return new ApiError(response.status, typeof code === 'string' ? code : 'unexpected');
}

/**
 * Sends JSON, or encrypted bytes such as a photo's with the `extra` headers that go with them, and reads the
 * JSON that comes back.
 */
export async function request<T = void>(
	method: 'GET' | 'POST' | 'PUT' | 'DELETE',
	path: string,
	body?: unknown,
	extra: Record<string, string> = {}
): Promise<T> {
	const headers: Record<string, string> = { ...extra, accept: 'application/json' };
	let content: BodyInit | undefined;
	if (body instanceof Uint8Array) {
		headers['content-type'] = 'application/octet-stream';
		content = body as Uint8Array<ArrayBuffer>;
	} else if (body !== undefined) {
		headers['content-type'] = 'application/json';
		content = JSON.stringify(body);
	}
	const response = await send(path, { method, headers, body: content });
	if (!response.ok) throw await failure(response);
	return (response.status === 204 ? undefined : await response.json().catch(() => {})) as T;
}

/** Fetches encrypted bytes the server keeps, such as a board photo's. */
export async function requestBytes(path: string) {
	const response = await send(path);
	if (!response.ok) throw await failure(response);
	return new Uint8Array(await response.arrayBuffer());
}
