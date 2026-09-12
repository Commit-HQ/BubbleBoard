import type {
	Access,
	FamilyLinks,
	Kindergarten,
	MembershipKey,
	NewClassroom,
	NewCredential,
	NewFamily
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
	type Wrapping
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

type StaffAccess = Extract<Access, { kind: 'staff' }>;
type FamilyAccess = Extract<Access, { kind: 'family' }>;

/** A staff device's keys: its card's unlock key, and the Staff Key that card opens. */
export type StaffKeys = {
	staffKey: CryptoKey;
	unlockKey: CryptoKey;
	credential: string;
	wrappedKey: string;
};

/** A card that was just made: the secret, printed once, and the credential for the server. */
export type NewCard = { secret: Uint8Array<ArrayBuffer>; credential: NewCredential };

/** How each kind of key is wrapped for whoever opens it (docs/access-format.md). */
const wrapping = {
	staffKeyForCard: (key: CryptoKey, credential: string): Wrapping => ({
		key,
		context: { purpose: 'staff-key-for-credential', credential }
	}),
	familyKeyForCard: (key: CryptoKey, credential: string): Wrapping => ({
		key,
		context: { purpose: 'family-key-for-credential', credential }
	}),
	familyKeyForStaff: (key: CryptoKey, family: string): Wrapping => ({
		key,
		context: { purpose: 'family-key-for-staff', family }
	}),
	groupKeyForStaff: (key: CryptoKey, classroom: string): Wrapping => ({
		key,
		context: { purpose: 'group-key-for-staff', classroom }
	}),
	groupKeyForFamily: (key: CryptoKey, classroom: string, family: string): Wrapping => ({
		key,
		context: { purpose: 'group-key-for-family', classroom, family }
	})
};

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

export async function openStaffKeys(access: StaffAccess, unlockKey: CryptoKey): Promise<StaffKeys> {
	const { credential, wrappedKey } = access;
	const staffKey = await unwrapKey(wrappedKey, wrapping.staffKeyForCard(unlockKey, credential));
	return { staffKey, unlockKey, credential, wrappedKey };
}

export function openFamilyKey(access: FamilyAccess, unlockKey: CryptoKey) {
	return unwrapKey(access.wrappedKey, wrapping.familyKeyForCard(unlockKey, access.credential));
}

/** The names of the classrooms a family's card opens, sorted. */
export async function openFamily(access: FamilyAccess, familyKey: CryptoKey) {
	const names = await Promise.all(
		access.classrooms.map(async ({ id, profile, groupKeyForFamily }) => {
			const groupKey = await unwrapKey(
				groupKeyForFamily,
				wrapping.groupKeyForFamily(familyKey, id, access.family)
			);
			return readName(
				await decryptData(profile, groupKey, { purpose: 'classroom-profile', classroom: id })
			);
		})
	);
	return names.sort(collator.compare);
}

/** Decrypts what a staff member may see, sorted by name. Anything that doesn't open fails the whole read. */
export async function openCatalog(staffKey: CryptoKey, records: Kindergarten): Promise<Catalog> {
	const [classrooms, teachers, families, children] = await Promise.all([
		Promise.all(
			records.classrooms.map(async ({ id, profile, groupKeyForStaff }) => {
				const groupKey = await unwrapKey(groupKeyForStaff, wrapping.groupKeyForStaff(staffKey, id));
				const data = await decryptData(profile, groupKey, {
					purpose: 'classroom-profile',
					classroom: id
				});
				return { id, name: readName(data), groupKey, groupKeyForStaff };
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
		teachers: byName(teachers),
		families: byName(families),
		children: byName(children)
	};
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

export async function newClassroom(staffKey: CryptoKey, name: string): Promise<NewClassroom> {
	const id = createId();
	const { key, envelopes } = await createKey([wrapping.groupKeyForStaff(staffKey, id)]);
	const profile = await encryptData({ name }, key, { purpose: 'classroom-profile', classroom: id });
	return { id, profile, groupKeyForStaff: envelopes[0] };
}

export function classroomProfile(classroom: Classroom, name: string) {
	return encryptData({ name }, classroom.groupKey, {
		purpose: 'classroom-profile',
		classroom: classroom.id
	});
}

export function teacherProfile(staffKey: CryptoKey, teacher: string, name: string) {
	return encryptData({ name }, staffKey, { purpose: 'teacher-profile', teacher });
}

export function familyProfile(staffKey: CryptoKey, family: string, name: string) {
	return encryptData({ name }, staffKey, { purpose: 'family-profile', family });
}

export function childProfile(staffKey: CryptoKey, child: Pick<Child, 'id' | 'name' | 'families'>) {
	const { id, name, families } = child;
	return encryptData({ name, families }, staffKey, { purpose: 'child-profile', child: id });
}

/** A card for a teacher: the Staff Key, re-wrapped from this device's own card. */
export async function staffCard(keys: StaffKeys): Promise<NewCard> {
	const card = await blankCard();
	const [envelope] = await rewrapKey(
		keys.wrappedKey,
		wrapping.staffKeyForCard(keys.unlockKey, keys.credential),
		[wrapping.staffKeyForCard(card.unlockKey, card.id)]
	);
	return { secret: card.secret, credential: credential(card, envelope) };
}

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
		add: [] as MembershipKey[],
		remove: [] as MembershipKey[],
		removeFamilies: [] as string[]
	};
	for (const [family, classrooms] of wanted) {
		const before = had.get(family) ?? [];
		if (!classrooms.size) {
			if (had.has(family)) plan.removeFamilies.push(family);
			continue;
		}
		for (const classroom of classrooms) {
			if (!before.includes(classroom)) plan.add.push({ family, classroom });
		}
		for (const classroom of before) {
			if (!classrooms.has(classroom)) plan.remove.push({ family, classroom });
		}
	}
	return plan;
}

/** The family links for a change, with the Group Key wrapped for each family that gains a classroom. */
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
		plan.add.map(async ({ family, classroom }) => {
			const familyKey =
				createdKeys.get(family) ??
				(await unwrapKey(
					byId(catalog.families, family).familyKeyForStaff,
					wrapping.familyKeyForStaff(staffKey, family)
				));
			const [groupKeyForFamily] = await rewrapKey(
				byId(catalog.classrooms, classroom).groupKeyForStaff,
				wrapping.groupKeyForStaff(staffKey, classroom),
				[wrapping.groupKeyForFamily(familyKey, classroom, family)]
			);
			return { family, classroom, groupKeyForFamily };
		})
	);
	return {
		newFamilies: created.map(({ family }) => family),
		addMemberships,
		removeMemberships: plan.remove,
		removeFamilies: plan.removeFamilies
	};
}

export function byId<T extends { id: string }>(items: T[], id: string) {
	const item = items.find((candidate) => candidate.id === id);
	if (!item) throw new Error(`No record ${id} on this device`);
	return item;
}
