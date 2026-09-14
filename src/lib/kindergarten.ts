import type {
	Access,
	FamilyLinks,
	Kindergarten,
	MembershipKey,
	NewClassroom,
	NewCredential,
	NewFamily,
	Staff
} from '$lib/api';
import {
	createId,
	createKey,
	createSecret,
	decryptData,
	deriveCredential,
	encryptData,
	isId,
	rewrapKey,
	UnreadableError,
	unwrapKey,
	wrapping
} from '$lib/crypto';

// The kindergarten as a device sees it once decrypted, and the encrypted records its changes send. Only
// browsers run this; the server stores what it builds without being able to open any of it.

export type Classroom = { id: string; name: string; groupKey: CryptoKey; groupKeyForStaff: string };
/** The recovery card is a teacher without a name, so every language can label it. */
export type Teacher = {
	id: string;
	name: string;
	recovery: boolean;
	admin: boolean;
	classrooms: string[];
};
export type Family = { id: string; name: string; familyKeyForStaff: string; classrooms: string[] };
export type Child = { id: string; name: string; classroom: string; families: string[] };
export type Catalog = {
	/** The revision the records were read at; changes to children send it back. */
	revision: number;
	classrooms: Classroom[];
	teachers: Teacher[];
	families: Family[];
	children: Child[];
};
export type CardKind = 'admin' | 'teacher' | 'recovery' | 'family';

type FamilyAccess = Extract<Access, { kind: 'family' }>;

/** A staff device's keys: its card's unlock key, and the Staff Key that card opens. */
export type StaffKeys = {
	staffKey: CryptoKey;
	unlockKey: CryptoKey;
	credential: string;
	wrappedKey: string;
};

/** A card that was just made: the secret, printed once, and the credential for the server. */
type NewCard = { secret: Uint8Array<ArrayBuffer>; credential: NewCredential };

/** A new secret with its credential ID and derived values, before any key is wrapped for it. */
async function blankCard() {
	const secret = createSecret();
	return { secret, id: createId(), ...(await deriveCredential(secret)) };
}

function credential(
	card: Awaited<ReturnType<typeof blankCard>>,
	wrappedKey: string
): NewCredential {
	return { id: card.id, authToken: card.authToken, wrappedKey };
}

/** The first setup: one Staff Key, wrapped for the admin's card and for the recovery card. */
export async function createKindergarten(adminName: string) {
	const [admin, recovery] = await Promise.all([blankCard(), blankCard()]);
	const staffKey = await createKey([
		wrapping.staffKeyForCard(admin.unlockKey, admin.id),
		wrapping.staffKeyForCard(recovery.unlockKey, recovery.id)
	]);
	const adminTeacher = createId();
	const recoveryTeacher = createId();
	const teachers = [
		{
			id: adminTeacher,
			profile: await teacherProfile(staffKey.key, adminTeacher, adminName),
			credential: credential(admin, staffKey.envelopes[0])
		},
		{
			id: recoveryTeacher,
			profile: await encryptData({ recovery: true }, staffKey.key, {
				purpose: 'teacher-profile',
				teacher: recoveryTeacher
			}),
			credential: credential(recovery, staffKey.envelopes[1])
		}
	];
	return { teachers, admin: { ...admin, name: adminName }, recovery };
}

export async function openStaffKeys(access: Staff, unlockKey: CryptoKey): Promise<StaffKeys> {
	const { credential, wrappedKey } = access;
	const staffKey = await unwrapKey(wrappedKey, wrapping.staffKeyForCard(unlockKey, credential));
	return { staffKey, unlockKey, credential, wrappedKey };
}

export function openFamilyKey(access: FamilyAccess, unlockKey: CryptoKey) {
	return unwrapKey(access.wrappedKey, wrapping.familyKeyForCard(unlockKey, access.credential));
}

export type FamilyClassroom = { id: string; name: string; groupKey: CryptoKey };

/** The classrooms a family's card opens, with their Group Keys, sorted by name. */
export async function openFamily(
	access: FamilyAccess,
	familyKey: CryptoKey
): Promise<FamilyClassroom[]> {
	const classrooms = await Promise.all(
		access.classrooms.map(async ({ id, profile, groupKeyForFamily }) => {
			const groupKey = await unwrapKey(
				groupKeyForFamily,
				wrapping.groupKeyForFamily(familyKey, id, access.family)
			);
			return { id, name: await openClassroomName(groupKey, id, profile), groupKey };
		})
	);
	return byName(classrooms);
}

/**
 * Decrypts what a staff member may see, sorted by name, with the recovery card after the teachers: it's
 * kept away, not someone at work. Anything that doesn't open fails the whole read.
 */
export async function openCatalog(staffKey: CryptoKey, records: Kindergarten): Promise<Catalog> {
	const [classrooms, teachers, families, children] = await Promise.all([
		Promise.all(
			records.classrooms.map(async ({ id, profile, groupKeyForStaff }) => {
				const groupKey = await unwrapKey(groupKeyForStaff, wrapping.groupKeyForStaff(staffKey, id));
				return {
					id,
					name: await openClassroomName(groupKey, id, profile),
					groupKey,
					groupKeyForStaff
				};
			})
		),
		Promise.all(
			records.teachers.map(async ({ id, admin, profile, classrooms }) => {
				const data = await decryptData(profile, staffKey, {
					purpose: 'teacher-profile',
					teacher: id
				});
				return { id, admin, classrooms, ...readTeacher(data) };
			})
		),
		Promise.all(
			records.families.map(async ({ id, profile, familyKeyForStaff, classrooms }) => {
				const data = await decryptData(profile, staffKey, {
					purpose: 'family-profile',
					family: id
				});
				return { id, name: readName(data), familyKeyForStaff, classrooms };
			})
		),
		Promise.all(
			records.children.map(async ({ id, classroom, profile }) => {
				const data = await decryptData(profile, staffKey, { purpose: 'child-profile', child: id });
				return { id, classroom, ...readChild(data) };
			})
		)
	]);
	return {
		revision: records.revision,
		classrooms: byName(classrooms),
		teachers: byName(teachers).sort((a, b) => Number(a.recovery) - Number(b.recovery)),
		families: byName(families),
		children: byName(children)
	};
}

async function openClassroomName(groupKey: CryptoKey, classroom: string, profile: string) {
	return readName(
		await decryptData(profile, groupKey, { purpose: 'classroom-profile', classroom })
	);
}

// Anyone holding a key could have written a profile, so its shape is checked like any other input.
function readName(data: unknown) {
	const name = (data as { name?: unknown } | null)?.name;
	if (typeof name !== 'string' || !name) throw new UnreadableError();
	return name;
}

function readTeacher(data: unknown) {
	if ((data as { recovery?: unknown } | null)?.recovery === true)
		return { name: '', recovery: true };
	return { name: readName(data), recovery: false };
}

function readChild(data: unknown) {
	const families = (data as { families?: unknown } | null)?.families;
	if (!Array.isArray(families) || !families.every(isId)) throw new UnreadableError();
	return { name: readName(data), families };
}

const collator = new Intl.Collator(undefined, { numeric: true });

function byName<T extends { name: string }>(items: T[]) {
	return items.sort((a, b) => collator.compare(a.name, b.name));
}

/** Which kind of card a staff member holds. */
export function cardKind(teacher: Pick<Teacher, 'admin' | 'recovery'>): CardKind {
	return teacher.recovery ? 'recovery' : teacher.admin ? 'admin' : 'teacher';
}

export async function newClassroom(staffKey: CryptoKey, name: string): Promise<NewClassroom> {
	const id = createId();
	const { key, envelopes } = await createKey([wrapping.groupKeyForStaff(staffKey, id)]);
	return { id, profile: await classroomProfile(key, id, name), groupKeyForStaff: envelopes[0] };
}

/** A name that is empty once trimmed. Readers refuse such a record, so it's never written. */
export class EmptyNameError extends Error {
	readonly code = 'empty-name';

	constructor() {
		super('Empty name');
		this.name = 'EmptyNameError';
	}
}

/** Every name goes through here before it's encrypted, so a record is never one its readers refuse. */
function writeName(name: string) {
	const trimmed = name.trim();
	if (!trimmed) throw new EmptyNameError();
	return trimmed;
}

export async function classroomProfile(groupKey: CryptoKey, classroom: string, name: string) {
	return encryptData({ name: writeName(name) }, groupKey, {
		purpose: 'classroom-profile',
		classroom
	});
}

export async function teacherProfile(staffKey: CryptoKey, teacher: string, name: string) {
	return encryptData({ name: writeName(name) }, staffKey, { purpose: 'teacher-profile', teacher });
}

export async function familyProfile(staffKey: CryptoKey, family: string, name: string) {
	return encryptData({ name: writeName(name) }, staffKey, { purpose: 'family-profile', family });
}

export async function childProfile(
	staffKey: CryptoKey,
	child: Pick<Child, 'id' | 'name' | 'families'>
) {
	const { id, name, families } = child;
	return encryptData({ name: writeName(name), families }, staffKey, {
		purpose: 'child-profile',
		child: id
	});
}

/** What a device's own card opens its key with: the card's unlock key, and its credential with the envelope. */
export type OwnCard = { unlockKey: CryptoKey; credential: string; wrappedKey: string };

/** A new card for the key this device's own card opens, re-wrapped from it as the kind `wrap` makes. */
async function cardFromOwn(own: OwnCard, wrap: typeof wrapping.staffKeyForCard): Promise<NewCard> {
	const card = await blankCard();
	const [envelope] = await rewrapKey(own.wrappedKey, wrap(own.unlockKey, own.credential), [
		wrap(card.unlockKey, card.id)
	]);
	return { secret: card.secret, credential: credential(card, envelope) };
}

/** A card for a teacher: the Staff Key, re-wrapped from this device's own card. */
export const staffCard = (keys: StaffKeys) => cardFromOwn(keys, wrapping.staffKeyForCard);

/**
 * A one-time card for another of a family's devices: the Family Key, re-wrapped from this device's own card. The
 * server lets it connect only one device, within a day.
 */
export const oneTimeCard = (own: OwnCard) => cardFromOwn(own, wrapping.familyKeyForCard);

/** A replacement card for a family, for the Family Key it already has. */
export async function familyCard(staffKey: CryptoKey, family: Family): Promise<NewCard> {
	const card = await blankCard();
	const [envelope] = await rewrapKey(
		family.familyKeyForStaff,
		wrapping.familyKeyForStaff(staffKey, family.id),
		[wrapping.familyKeyForCard(card.unlockKey, card.id)]
	);
	return { secret: card.secret, credential: credential(card, envelope) };
}

/** A new family: a Family Key, wrapped for staff and for its first card. */
export async function newFamily(staffKey: CryptoKey, name: string) {
	const id = createId();
	const card = await blankCard();
	const { key, envelopes } = await createKey([
		wrapping.familyKeyForStaff(staffKey, id),
		wrapping.familyKeyForCard(card.unlockKey, card.id)
	]);
	const family: NewFamily = {
		id,
		profile: await familyProfile(staffKey, id, name),
		familyKeyForStaff: envelopes[0],
		credential: credential(card, envelopes[1])
	};
	return { family, familyKey: key, secret: card.secret };
}

export type CreatedFamily = Awaited<ReturnType<typeof newFamily>>;

/**
 * Which classrooms `families` gain and lose when the children become `children`: a family reaches
 * exactly the classrooms its children are in, and a family left without children is removed. Families
 * outside `families` are left alone, so a change never undoes records this device hasn't seen.
 */
export function planFamilyLinks(
	current: Pick<Family, 'id' | 'classrooms'>[],
	children: Pick<Child, 'classroom' | 'families'>[],
	families: Iterable<string>
) {
	const wanted = new Map<string, Set<string>>();
	for (const family of families) wanted.set(family, new Set());
	for (const child of children) {
		for (const family of child.families) wanted.get(family)?.add(child.classroom);
	}
	const had = new Map(current.map((family) => [family.id, family.classrooms]));
	const plan = {
		addMemberships: [] as MembershipKey[],
		removeMemberships: [] as MembershipKey[],
		removeFamilies: [] as string[]
	};
	for (const [family, classrooms] of wanted) {
		const before = had.get(family) ?? [];
		if (!classrooms.size) {
			if (had.has(family)) plan.removeFamilies.push(family);
			continue;
		}
		for (const classroom of classrooms) {
			if (!before.includes(classroom)) plan.addMemberships.push({ family, classroom });
		}
		for (const classroom of before) {
			if (!classrooms.has(classroom)) plan.removeMemberships.push({ family, classroom });
		}
	}
	return plan;
}

/** A family's Family Key on a staff device, opened from its copy for staff. */
export function openFamilyKeyForStaff(
	staffKey: CryptoKey,
	family: Pick<Family, 'id' | 'familyKeyForStaff'>
) {
	return unwrapKey(family.familyKeyForStaff, wrapping.familyKeyForStaff(staffKey, family.id));
}

/**
 * The family links for a change, from the catalog's revision, with the Group Key wrapped for each family
 * that gains a classroom.
 */
export async function familyLinks(
	staffKey: CryptoKey,
	catalog: Catalog,
	children: Pick<Child, 'classroom' | 'families'>[],
	families: Iterable<string>,
	created: CreatedFamily[] = []
): Promise<FamilyLinks> {
	const plan = planFamilyLinks(catalog.families, children, families);
	const createdKeys = new Map(created.map(({ family, familyKey }) => [family.id, familyKey]));
	const addMemberships = await Promise.all(
		plan.addMemberships.map(async ({ family, classroom }) => {
			const familyKey =
				createdKeys.get(family) ??
				(await openFamilyKeyForStaff(staffKey, byId(catalog.families, family)));
			const [groupKeyForFamily] = await rewrapKey(
				byId(catalog.classrooms, classroom).groupKeyForStaff,
				wrapping.groupKeyForStaff(staffKey, classroom),
				[wrapping.groupKeyForFamily(familyKey, classroom, family)]
			);
			return { family, classroom, groupKeyForFamily };
		})
	);
	return {
		...plan,
		revision: catalog.revision,
		newFamilies: created.map(({ family }) => family),
		addMemberships
	};
}

export function byId<T extends { id: string }>(items: T[], id: string) {
	const item = items.find((candidate) => candidate.id === id);
	if (!item) throw new Error(`No record ${id} on this device`);
	return item;
}

/** The names of the records with these IDs, in the records' order. */
export function namesOf(items: { id: string; name: string }[], ids: string[]) {
	return items.filter(({ id }) => ids.includes(id)).map(({ name }) => name);
}
