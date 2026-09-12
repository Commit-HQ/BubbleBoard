import { describe, expect, it } from 'vitest';
import { fromBase64Url, toBase64Url } from './base64url';
import {
	createId,
	createKey,
	createSecret,
	decryptData,
	deriveCredential,
	encryptData,
	rewrapKey,
	SECRET_BYTES,
	UnreadableError,
	unwrapKey,
	type Wrapping
} from './crypto';

// Synthetic content only.
const profileData = { name: 'Bubbles' };
const teacherData = { name: 'Test Teacher' };

type Card = Awaited<ReturnType<typeof createCard>>;
type Kindergarten = Awaited<ReturnType<typeof setUp>>;
type Classroom = Awaited<ReturnType<typeof addClassroom>>;
type Family = Awaited<ReturnType<typeof addFamily>>;

async function createCard() {
	const secret = createSecret();
	return { id: createId(), secret, ...(await deriveCredential(secret)) };
}

// A kindergarten as setup creates it: one Staff Key for the admin's card and a recovery card, and the
// admin's encrypted teacher profile.
async function setUp() {
	const teacher = createId();
	const [adminCard, recoveryCard] = [await createCard(), await createCard()];
	const staffKey = await createKey(
		[adminCard, recoveryCard].map((card): Wrapping => ({
			key: card.unlockKey,
			context: { purpose: 'staff-key-for-credential', credential: card.id }
		}))
	);
	return {
		teacher,
		adminCard,
		recoveryCard,
		staffKey: staffKey.key,
		staffKeyForAdmin: staffKey.envelopes[0],
		staffKeyForRecovery: staffKey.envelopes[1],
		teacherProfile: await encryptData(teacherData, staffKey.key, {
			purpose: 'teacher-profile',
			teacher
		})
	};
}

// A classroom as an admin device adds it: a Group Key wrapped for staff, and the encrypted profile.
async function addClassroom({ staffKey }: Kindergarten) {
	const classroom = createId();
	const groupKey = await createKey([
		{ key: staffKey, context: { purpose: 'group-key-for-staff', classroom } }
	]);
	return {
		classroom,
		groupKey: groupKey.key,
		groupKeyForStaff: groupKey.envelopes[0],
		profile: await encryptData(profileData, groupKey.key, {
			purpose: 'classroom-profile',
			classroom
		})
	};
}

// A family as an admin device adds it: a Family Key wrapped for staff and the family card, and the Group
// Key of each classroom its children are in, re-wrapped from the staff copy.
async function addFamily({ staffKey }: Kindergarten, classrooms: Classroom[]) {
	const family = createId();
	const card = await createCard();
	const familyKey = await createKey([
		{ key: staffKey, context: { purpose: 'family-key-for-staff', family } },
		{ key: card.unlockKey, context: { purpose: 'family-key-for-credential', credential: card.id } }
	]);
	const groupKeysForFamily: Record<string, string> = {};
	for (const { classroom, groupKeyForStaff } of classrooms) {
		const [envelope] = await rewrapKey(
			groupKeyForStaff,
			{ key: staffKey, context: { purpose: 'group-key-for-staff', classroom } },
			[{ key: familyKey.key, context: { purpose: 'group-key-for-family', classroom, family } }]
		);
		groupKeysForFamily[classroom] = envelope;
	}
	return {
		family,
		card,
		familyKeyForStaff: familyKey.envelopes[0],
		familyKeyForCard: familyKey.envelopes[1],
		groupKeysForFamily
	};
}

// What a family device does with a scanned card: open the Family Key, then a classroom's Group Key, then
// that classroom's profile.
async function openAsFamily(
	{ classroom, profile }: Classroom,
	{ family, card, familyKeyForCard, groupKeysForFamily }: Family,
	secret = card.secret
) {
	const { unlockKey } = await deriveCredential(secret);
	const familyKey = await unwrapKey(familyKeyForCard, {
		key: unlockKey,
		context: { purpose: 'family-key-for-credential', credential: card.id }
	});
	const groupKey = await unwrapKey(groupKeysForFamily[classroom] ?? '', {
		key: familyKey,
		context: { purpose: 'group-key-for-family', classroom, family }
	});
	return decryptData(profile, groupKey, { purpose: 'classroom-profile', classroom });
}

// What a staff device does with a scanned card: open the Staff Key, then a teacher profile.
async function openAsStaff(
	{ teacher, teacherProfile }: Kindergarten,
	card: Card,
	envelope: string
) {
	const { unlockKey } = await deriveCredential(card.secret);
	const staffKey = await unwrapKey(envelope, {
		key: unlockKey,
		context: { purpose: 'staff-key-for-credential', credential: card.id }
	});
	return decryptData(teacherProfile, staffKey, { purpose: 'teacher-profile', teacher });
}

// Flips one bit in an envelope's IV (part 1) or ciphertext (part 2), keeping the encoding valid.
function tamper(envelope: string, part: 1 | 2, index: number) {
	const parts = envelope.split('.');
	const bytes = fromBase64Url(parts[part])!;
	bytes[(index + bytes.length) % bytes.length] ^= 1;
	parts[part] = toBase64Url(bytes);
	return parts.join('.');
}

describe('card secrets', () => {
	it('derive a stable auth token, different for each card', async () => {
		const secret = createSecret();
		const { authToken } = await deriveCredential(secret);
		expect(authToken).toMatch(/^[\w-]{43}$/);
		expect((await deriveCredential(secret)).authToken).toBe(authToken);
		expect((await deriveCredential(createSecret())).authToken).not.toBe(authToken);
	});

	it('reject secrets of the wrong length', async () => {
		for (const length of [SECRET_BYTES - 1, SECRET_BYTES + 1, 32]) {
			await expect(deriveCredential(new Uint8Array(length))).rejects.toThrow(UnreadableError);
		}
	});

	it('open nothing with the auth token alone', async () => {
		const k = await setUp();
		const token = fromBase64Url(k.adminCard.authToken)!;
		// The token used directly as a key, and put through the documented unlock-key derivation.
		const tokenAsKey = await crypto.subtle.importKey('raw', token, 'AES-GCM', false, ['decrypt']);
		const tokenAsSecret = await crypto.subtle.deriveKey(
			{
				name: 'HKDF',
				hash: 'SHA-256',
				salt: new Uint8Array(),
				info: new TextEncoder().encode('BubbleBoard card 1 key-wrap')
			},
			await crypto.subtle.importKey('raw', token, 'HKDF', false, ['deriveKey']),
			{ name: 'AES-GCM', length: 256 },
			false,
			['decrypt']
		);
		const context = { purpose: 'staff-key-for-credential', credential: k.adminCard.id } as const;
		for (const key of [tokenAsKey, tokenAsSecret]) {
			await expect(unwrapKey(k.staffKeyForAdmin, { key, context })).rejects.toThrow(
				UnreadableError
			);
		}
	});
});

describe('envelopes', () => {
	it('refuse the wrong key', async () => {
		const k = await setUp();
		const [a, b] = [await addClassroom(k), await addClassroom(k)];
		const family = await addFamily(k, [a]);
		await expect(
			decryptData(a.profile, b.groupKey, { purpose: 'classroom-profile', classroom: a.classroom })
		).rejects.toThrow(UnreadableError);
		await expect(
			unwrapKey(k.staffKeyForAdmin, {
				key: family.card.unlockKey,
				context: { purpose: 'staff-key-for-credential', credential: k.adminCard.id }
			})
		).rejects.toThrow(UnreadableError);
	});

	it('refuse modified envelopes', async () => {
		const c = await addClassroom(await setUp());
		const context = { purpose: 'classroom-profile', classroom: c.classroom } as const;
		for (const envelope of [
			tamper(c.profile, 1, 0),
			tamper(c.profile, 2, 0),
			tamper(c.profile, 2, -1),
			c.profile.replace(/^1\./, '2.'),
			c.profile.slice(0, -2),
			`${c.profile}.`,
			''
		]) {
			await expect(decryptData(envelope, c.groupKey, context), envelope).rejects.toThrow(
				UnreadableError
			);
		}
		expect(await decryptData(c.profile, c.groupKey, context)).toEqual(profileData);
	});

	it('refuse an envelope moved to another record, even under the right key', async () => {
		const k = await setUp();
		const [a, b] = [await addClassroom(k), await addClassroom(k)];
		const [x, y] = [await addFamily(k, [a]), await addFamily(k, [a])];
		const familyForStaff = (family: string) =>
			({ purpose: 'family-key-for-staff', family }) as const;
		const groupForStaff = (classroom: string) =>
			({ purpose: 'group-key-for-staff', classroom }) as const;

		// Family X's key served in family Y's record: the Staff Key opens both, only in their own.
		await expect(
			unwrapKey(x.familyKeyForStaff, { key: k.staffKey, context: familyForStaff(y.family) })
		).rejects.toThrow(UnreadableError);
		await expect(
			unwrapKey(x.familyKeyForStaff, { key: k.staffKey, context: familyForStaff(x.family) })
		).resolves.toBeInstanceOf(CryptoKey);

		// One classroom's Group Key served as another's, or passed off as a Family Key.
		await expect(
			unwrapKey(a.groupKeyForStaff, { key: k.staffKey, context: groupForStaff(b.classroom) })
		).rejects.toThrow(UnreadableError);
		await expect(
			unwrapKey(a.groupKeyForStaff, { key: k.staffKey, context: familyForStaff(x.family) })
		).rejects.toThrow(UnreadableError);

		// A teacher profile read as a family profile with the same ID, or as another teacher's.
		await expect(
			decryptData(k.teacherProfile, k.staffKey, { purpose: 'family-profile', family: k.teacher })
		).rejects.toThrow(UnreadableError);
		await expect(
			decryptData(k.teacherProfile, k.staffKey, { purpose: 'teacher-profile', teacher: createId() })
		).rejects.toThrow(UnreadableError);

		// The admin card's envelope under the recovery card's credential.
		await expect(
			unwrapKey(k.staffKeyForAdmin, {
				key: k.adminCard.unlockKey,
				context: { purpose: 'staff-key-for-credential', credential: k.recoveryCard.id }
			})
		).rejects.toThrow(UnreadableError);
	});

	it('produce keys that cannot be exported', async () => {
		const k = await setUp();
		const unwrapped = await unwrapKey(k.staffKeyForAdmin, {
			key: k.adminCard.unlockKey,
			context: { purpose: 'staff-key-for-credential', credential: k.adminCard.id }
		});
		for (const key of [k.staffKey, k.adminCard.unlockKey, unwrapped]) {
			expect(key.extractable).toBe(false);
			await expect(crypto.subtle.exportKey('raw', key)).rejects.toThrow();
		}
	});

	it('never re-wrap a key as another kind of key', async () => {
		const k = await setUp();
		const c = await addClassroom(k);
		await expect(
			rewrapKey(
				c.groupKeyForStaff,
				{ key: k.staffKey, context: { purpose: 'group-key-for-staff', classroom: c.classroom } },
				[
					{
						key: k.recoveryCard.unlockKey,
						context: { purpose: 'staff-key-for-credential', credential: k.recoveryCard.id }
					}
				]
			)
		).rejects.toThrow(TypeError);
	});
});

describe('kindergarten access', () => {
	it('lets a family card open every classroom its children are in, and no other', async () => {
		const k = await setUp();
		const [a, b, other] = [await addClassroom(k), await addClassroom(k), await addClassroom(k)];
		const f = await addFamily(k, [a, b]);
		expect(await openAsFamily(a, f)).toEqual(profileData);
		expect(await openAsFamily(b, f)).toEqual(profileData);
		await expect(openAsFamily(other, f)).rejects.toThrow(UnreadableError);

		// Classroom A's Group Key envelope, served as the other classroom's, doesn't open.
		const familyKey = await unwrapKey(f.familyKeyForCard, {
			key: f.card.unlockKey,
			context: { purpose: 'family-key-for-credential', credential: f.card.id }
		});
		await expect(
			unwrapKey(f.groupKeysForFamily[a.classroom], {
				key: familyKey,
				context: { purpose: 'group-key-for-family', classroom: other.classroom, family: f.family }
			})
		).rejects.toThrow(UnreadableError);
	});

	it('restores staff access with the recovery card alone, including issuing a new card', async () => {
		const k = await setUp();
		expect(await openAsStaff(k, k.recoveryCard, k.staffKeyForRecovery)).toEqual(teacherData);

		const card = await createCard();
		const [envelope] = await rewrapKey(
			k.staffKeyForRecovery,
			{
				key: k.recoveryCard.unlockKey,
				context: { purpose: 'staff-key-for-credential', credential: k.recoveryCard.id }
			},
			[
				{
					key: card.unlockKey,
					context: { purpose: 'staff-key-for-credential', credential: card.id }
				}
			]
		);
		expect(await openAsStaff(k, card, envelope)).toEqual(teacherData);
	});

	it('keeps the Family Key when a family card is replaced, and retires the old card', async () => {
		const k = await setUp();
		const c = await addClassroom(k);
		const f = await addFamily(k, [c]);

		// A new card gets the Family Key re-wrapped from the staff copy. The family's Group Key envelopes
		// don't change.
		const card = await createCard();
		const [envelope] = await rewrapKey(
			f.familyKeyForStaff,
			{ key: k.staffKey, context: { purpose: 'family-key-for-staff', family: f.family } },
			[
				{
					key: card.unlockKey,
					context: { purpose: 'family-key-for-credential', credential: card.id }
				}
			]
		);
		const replaced = { ...f, card, familyKeyForCard: envelope };

		expect(await openAsFamily(c, replaced)).toEqual(profileData);
		await expect(openAsFamily(c, replaced, f.card.secret)).rejects.toThrow(UnreadableError);
	});

	it("keeps each family's keys to that family", async () => {
		const k = await setUp();
		const c = await addClassroom(k);
		const [a, b] = [await addFamily(k, [c]), await addFamily(k, [c])];
		await expect(openAsFamily(c, a, b.card.secret)).rejects.toThrow(UnreadableError);

		const familyKeyB = await unwrapKey(b.familyKeyForCard, {
			key: b.card.unlockKey,
			context: { purpose: 'family-key-for-credential', credential: b.card.id }
		});
		await expect(
			unwrapKey(a.groupKeysForFamily[c.classroom], {
				key: familyKeyB,
				context: { purpose: 'group-key-for-family', classroom: c.classroom, family: a.family }
			})
		).rejects.toThrow(UnreadableError);
		await expect(
			unwrapKey(a.familyKeyForStaff, {
				key: familyKeyB,
				context: { purpose: 'family-key-for-staff', family: a.family }
			})
		).rejects.toThrow(UnreadableError);
	});
});
