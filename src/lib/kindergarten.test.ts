import { describe, expect, it } from 'vitest';
import type { Access, Membership, NewClassroom, NewCredential, Staff } from './api';
import { createId, deriveCredential, UnreadableError } from './crypto';
import {
	byId,
	childProfile,
	createKindergarten,
	EmptyNameError,
	familyCard,
	familyLinks,
	newClassroom,
	newFamily,
	oneTimeCard,
	openCatalog,
	openFamily,
	openFamilyKey,
	openStaffKeys,
	planFamilyLinks,
	staffCard
} from './kindergarten';

// The records a staff device builds, opened the way devices get them back from the server. Synthetic
// names only.

const noRecords = { revision: 0, classrooms: [], teachers: [], families: [], children: [] };

function staffAccess(credential: NewCredential, admin: boolean): Staff {
	const { id, wrappedKey } = credential;
	return { kind: 'staff', credential: id, wrappedKey, teacher: createId(), admin };
}

async function setUpKindergarten() {
	const kindergarten = await createKindergarten('Ana');
	const access = staffAccess(kindergarten.teachers[0].credential, true);
	return { ...kindergarten, keys: await openStaffKeys(access, kindergarten.admin.unlockKey) };
}

describe('family links', () => {
	const current = [{ id: 'family', classrooms: ['bubbles'] }];

	it('follow the classrooms a family’s children are in', () => {
		const children = [{ classroom: 'owls', families: ['family'] }];
		expect(planFamilyLinks(current, children, ['family'])).toEqual({
			addMemberships: [{ family: 'family', classroom: 'owls' }],
			removeMemberships: [{ family: 'family', classroom: 'bubbles' }],
			removeFamilies: []
		});
	});

	it('keep a classroom while a brother or sister is still in it', () => {
		const children = [
			{ classroom: 'owls', families: ['family'] },
			{ classroom: 'bubbles', families: ['family'] }
		];
		expect(planFamilyLinks(current, children, ['family'])).toEqual({
			addMemberships: [{ family: 'family', classroom: 'owls' }],
			removeMemberships: [],
			removeFamilies: []
		});
	});

	it('remove a family left without children, and leave the families a change didn’t touch', () => {
		const families = [...current, { id: 'untouched', classrooms: ['bubbles'] }];
		expect(planFamilyLinks(families, [], ['family'])).toEqual({
			addMemberships: [],
			removeMemberships: [],
			removeFamilies: ['family']
		});
	});
});

describe('kindergarten records', () => {
	it('set up an admin and a nameless recovery card, both opening the same records', async () => {
		const { teachers, recovery, keys } = await setUpKindergarten();
		const records = {
			...noRecords,
			teachers: teachers.map(({ id, profile }) => ({ id, profile, admin: true, classrooms: [] }))
		};
		const catalog = await openCatalog(keys.staffKey, records);
		expect(catalog.teachers.map(({ name, recovery }) => ({ name, recovery }))).toEqual([
			{ name: 'Ana', recovery: false },
			{ name: '', recovery: true }
		]);

		const recoveryAccess = staffAccess(teachers[1].credential, true);
		const recoveryKeys = await openStaffKeys(recoveryAccess, recovery.unlockKey);
		expect((await openCatalog(recoveryKeys.staffKey, records)).teachers).toHaveLength(2);
	});

	it('refuse a blank name before encrypting it, and keep names trimmed', async () => {
		await expect(createKindergarten('   ')).rejects.toThrow(EmptyNameError);
		const { staffKey } = (await setUpKindergarten()).keys;
		await expect(newClassroom(staffKey, '')).rejects.toThrow(EmptyNameError);
		await expect(newFamily(staffKey, ' \n ')).rejects.toThrow(EmptyNameError);
		await expect(
			childProfile(staffKey, { id: createId(), name: '  ', families: [] })
		).rejects.toThrow(EmptyNameError);

		const classroom = await newClassroom(staffKey, '  Bubbles ');
		const catalog = await openCatalog(staffKey, { ...noRecords, classrooms: [classroom] });
		expect(catalog.classrooms.map(({ name }) => name)).toEqual(['Bubbles']);
	});

	it('open for a teacher card made later, children with their families included', async () => {
		const { keys } = await setUpKindergarten();
		const classroom = await newClassroom(keys.staffKey, 'Bubbles');
		const child = { id: createId(), name: 'Luka', families: [createId()] };
		const profile = await childProfile(keys.staffKey, child);
		const records = {
			...noRecords,
			classrooms: [classroom],
			children: [{ id: child.id, classroom: classroom.id, profile }]
		};

		const card = await staffCard(keys);
		const { unlockKey } = await deriveCredential(card.secret);
		const teacherKeys = await openStaffKeys(staffAccess(card.credential, false), unlockKey);
		const catalog = await openCatalog(teacherKeys.staffKey, records);
		expect(catalog.classrooms.map(({ name }) => name)).toEqual(['Bubbles']);
		expect(catalog.children).toMatchObject([{ name: 'Luka', families: child.families }]);
	});

	it('open a family card’s classrooms, only those, and again after the card is replaced', async () => {
		const { staffKey } = (await setUpKindergarten()).keys;
		const classrooms = await Promise.all(
			['Bubbles', 'Ladybirds', 'Owls'].map((name) => newClassroom(staffKey, name))
		);
		const [bubbles, ladybirds, owls] = classrooms;
		const catalog = await openCatalog(staffKey, { ...noRecords, classrooms });
		const created = await newFamily(staffKey, 'Ivana (mum)');
		const { family } = created;

		// A brother and a sister in two classrooms, with one family card.
		const children = [ladybirds, bubbles].map(({ id }) => ({
			classroom: id,
			families: [family.id]
		}));
		const links = await familyLinks(staffKey, catalog, children, [family.id], [created]);

		const open = async (
			secret: Uint8Array<ArrayBuffer>,
			credential: NewCredential,
			memberships: Membership[] = links.addMemberships
		) => {
			const access = familyAccess(family.id, credential, memberships, classrooms);
			const { unlockKey } = await deriveCredential(secret);
			const opened = await openFamily(access, await openFamilyKey(access, unlockKey));
			return opened.map(({ name }) => name);
		};
		expect(await open(created.secret, family.credential)).toEqual(['Bubbles', 'Ladybirds']);

		// A Group Key served as another classroom's doesn't open.
		const misplaced = [{ ...links.addMemberships[0], classroom: owls.id }];
		await expect(open(created.secret, family.credential, misplaced)).rejects.toThrow(
			UnreadableError
		);

		const replacement = await familyCard(staffKey, {
			...family,
			name: 'Ivana (mum)',
			classrooms: []
		});
		expect(await open(replacement.secret, replacement.credential)).toEqual([
			'Bubbles',
			'Ladybirds'
		]);
		await expect(open(created.secret, replacement.credential)).rejects.toThrow(UnreadableError);
	});

	it('open a family’s classrooms on another of its devices, with a one-time card from one it connected', async () => {
		const { staffKey } = (await setUpKindergarten()).keys;
		const classroom = await newClassroom(staffKey, 'Bubbles');
		const catalog = await openCatalog(staffKey, { ...noRecords, classrooms: [classroom] });
		const created = await newFamily(staffKey, 'Horvat family');
		const { family } = created;
		const children = [{ classroom: classroom.id, families: [family.id] }];
		const links = await familyLinks(staffKey, catalog, children, [family.id], [created]);
		// A device connecting with a card: the classrooms it opens, and what it keeps to make one-time cards.
		const connect = async (secret: Uint8Array<ArrayBuffer>, credential: NewCredential) => {
			const access = familyAccess(family.id, credential, links.addMemberships, [classroom]);
			const { unlockKey } = await deriveCredential(secret);
			const classrooms = await openFamily(access, await openFamilyKey(access, unlockKey));
			const own = { credential: credential.id, unlockKey, wrappedKey: credential.wrappedKey };
			return { names: classrooms.map(({ name }) => name), own };
		};

		const parent = await connect(created.secret, family.credential);
		const card = await oneTimeCard(parent.own);
		const grandparent = await connect(card.secret, card.credential);
		expect(grandparent.names).toEqual(['Bubbles']);
		// A device a one-time card connected makes the next one.
		const next = await oneTimeCard(grandparent.own);
		expect((await connect(next.secret, next.credential)).names).toEqual(['Bubbles']);
		await expect(connect(created.secret, card.credential)).rejects.toThrow(UnreadableError);
	});
});

function familyAccess(
	family: string,
	credential: NewCredential,
	memberships: Membership[],
	classrooms: NewClassroom[]
): Extract<Access, { kind: 'family' }> {
	return {
		kind: 'family',
		credential: credential.id,
		wrappedKey: credential.wrappedKey,
		family,
		classrooms: memberships.map(({ classroom, groupKeyForFamily }) => ({
			id: classroom,
			profile: byId(classrooms, classroom).profile,
			groupKeyForFamily
		})),
		notices: [],
		photos: []
	};
}
