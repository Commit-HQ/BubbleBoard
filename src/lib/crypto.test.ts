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
	UnreadableError,
	unwrapKey,
	type Role,
	type Wrapping
} from './crypto';

// Synthetic content only.
const profileData = { name: 'Bubbles', welcome: 'Welcome to our classroom!' };
const adminData = { children: [{ name: 'Test Child' }] };

type Card = Awaited<ReturnType<typeof createCard>>;
type Classroom = Awaited<ReturnType<typeof createClassroom>>;
type Family = Awaited<ReturnType<typeof addFamily>>;

async function createCard(role: Role) {
	const secret = createSecret();
	return { id: createId(), secret, ...(await deriveCredential(secret, role)) };
}

// A classroom as setup creates it: one Teacher Key for a teacher card and a recovery card, a Group Key,
// and the encrypted profile and administration records.
async function createClassroom() {
	const classroom = createId();
	const [teacherCard, recoveryCard] = [await createCard('teacher'), await createCard('teacher')];
	const teacherKey = await createKey(
		[teacherCard, recoveryCard].map((card): Wrapping => ({
			key: card.unlockKey,
			context: { purpose: 'teacher-key-for-credential', classroom, credential: card.id }
		}))
	);
	const groupKey = await createKey([
		{ key: teacherKey.key, context: { purpose: 'group-key-for-teacher', classroom } }
	]);
	return {
		classroom,
		teacherCard,
		recoveryCard,
		teacherKey: teacherKey.key,
		teacherKeyForCard: teacherKey.envelopes[0],
		teacherKeyForRecovery: teacherKey.envelopes[1],
		groupKey: groupKey.key,
		groupKeyForTeacher: groupKey.envelopes[0],
		profile: await encryptData(profileData, groupKey.key, {
			purpose: 'classroom-profile',
			classroom
		}),
		admin: await encryptData(adminData, teacherKey.key, { purpose: 'classroom-admin', classroom })
	};
}

// A family as a teacher device adds it: a Family Key wrapped for the teacher and the family card, and
// the Group Key re-wrapped from the teacher's copy.
async function addFamily({ classroom, teacherKey, groupKeyForTeacher }: Classroom) {
	const family = createId();
	const card = await createCard('family');
	const familyKey = await createKey([
		{ key: teacherKey, context: { purpose: 'family-key-for-teacher', classroom, family } },
		{
			key: card.unlockKey,
			context: { purpose: 'family-key-for-credential', classroom, credential: card.id }
		}
	]);
	const [groupKeyForFamily] = await rewrapKey(
		groupKeyForTeacher,
		{ key: teacherKey, context: { purpose: 'group-key-for-teacher', classroom } },
		[{ key: familyKey.key, context: { purpose: 'group-key-for-family', classroom, family } }]
	);
	return {
		family,
		card,
		familyKeyForTeacher: familyKey.envelopes[0],
		familyKeyForCard: familyKey.envelopes[1],
		groupKeyForFamily
	};
}

// What a family device does with a scanned card: open the Family Key, then the Group Key, then the
// classroom profile.
async function openAsFamily(
	{ classroom, profile }: Classroom,
	{ family, card, familyKeyForCard, groupKeyForFamily }: Family,
	secret = card.secret,
	envelope = familyKeyForCard
) {
	const { unlockKey } = await deriveCredential(secret, 'family');
	const familyKey = await unwrapKey(envelope, {
		key: unlockKey,
		context: { purpose: 'family-key-for-credential', classroom, credential: card.id }
	});
	const groupKey = await unwrapKey(groupKeyForFamily, {
		key: familyKey,
		context: { purpose: 'group-key-for-family', classroom, family }
	});
	return decryptData(profile, groupKey, { purpose: 'classroom-profile', classroom });
}

// What a teacher device does with a scanned card: open the Teacher Key, then classroom administration.
async function openAsTeacher({ classroom, admin }: Classroom, card: Card, envelope: string) {
	const { unlockKey } = await deriveCredential(card.secret, 'teacher');
	const teacherKey = await unwrapKey(envelope, {
		key: unlockKey,
		context: { purpose: 'teacher-key-for-credential', classroom, credential: card.id }
	});
	return decryptData(admin, teacherKey, { purpose: 'classroom-admin', classroom });
}

// Flips one bit in an envelope's IV (part 1) or ciphertext (part 2), keeping the encoding valid.
function tamper(envelope: string, part: 1 | 2, index: number) {
	const parts = envelope.split('.');
	const bytes = fromBase64Url(parts[part])!;
	bytes[(index + bytes.length) % bytes.length] ^= 1;
	parts[part] = toBase64Url(bytes);
	return parts.join('.');
}

describe('cards', () => {
	it('derive a stable auth token, different for each card and role', async () => {
		const secret = createSecret();
		const { authToken } = await deriveCredential(secret, 'family');
		expect(authToken).toMatch(/^[\w-]{43}$/);
		expect((await deriveCredential(secret, 'family')).authToken).toBe(authToken);
		expect((await deriveCredential(secret, 'teacher')).authToken).not.toBe(authToken);
		expect((await deriveCredential(createSecret(), 'family')).authToken).not.toBe(authToken);
	});

	it('reject secrets of the wrong length', async () => {
		await expect(deriveCredential(new Uint8Array(31), 'family')).rejects.toThrow(UnreadableError);
	});

	it('open nothing with the auth token alone', async () => {
		const c = await createClassroom();
		const token = fromBase64Url(c.teacherCard.authToken)!;
		const tokenAsKey = await crypto.subtle.importKey('raw', token, 'AES-GCM', false, ['decrypt']);
		const tokenAsSecret = (await deriveCredential(token, 'teacher')).unlockKey;
		for (const key of [tokenAsKey, tokenAsSecret]) {
			const context = {
				purpose: 'teacher-key-for-credential',
				classroom: c.classroom,
				credential: c.teacherCard.id
			} as const;
			await expect(unwrapKey(c.teacherKeyForCard, { key, context })).rejects.toThrow(
				UnreadableError
			);
		}
	});
});

describe('envelopes', () => {
	it('refuse the wrong key', async () => {
		const c = await createClassroom();
		const other = await createClassroom();
		const family = await addFamily(c);
		await expect(
			decryptData(c.profile, other.groupKey, {
				purpose: 'classroom-profile',
				classroom: c.classroom
			})
		).rejects.toThrow(UnreadableError);
		await expect(
			unwrapKey(c.teacherKeyForCard, {
				key: family.card.unlockKey,
				context: {
					purpose: 'teacher-key-for-credential',
					classroom: c.classroom,
					credential: c.teacherCard.id
				}
			})
		).rejects.toThrow(UnreadableError);
	});

	it('refuse modified envelopes', async () => {
		const c = await createClassroom();
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
		const c = await createClassroom();
		const [a, b] = [await addFamily(c), await addFamily(c)];
		const forTeacher = (family: string) =>
			({ purpose: 'family-key-for-teacher', classroom: c.classroom, family }) as const;

		// Family A's key served in family B's record: the Teacher Key opens both, only in their own.
		await expect(
			unwrapKey(a.familyKeyForTeacher, { key: c.teacherKey, context: forTeacher(b.family) })
		).rejects.toThrow(UnreadableError);
		await expect(
			unwrapKey(a.familyKeyForTeacher, { key: c.teacherKey, context: forTeacher(a.family) })
		).resolves.toBeInstanceOf(CryptoKey);

		// The Group Key passed off as a Family Key.
		await expect(
			unwrapKey(c.groupKeyForTeacher, { key: c.teacherKey, context: forTeacher(a.family) })
		).rejects.toThrow(UnreadableError);

		// Administration read as the profile, or as another classroom's.
		await expect(
			decryptData(c.admin, c.teacherKey, { purpose: 'classroom-profile', classroom: c.classroom })
		).rejects.toThrow(UnreadableError);
		await expect(
			decryptData(c.admin, c.teacherKey, { purpose: 'classroom-admin', classroom: createId() })
		).rejects.toThrow(UnreadableError);

		// The teacher card's envelope under the recovery card's credential.
		await expect(
			unwrapKey(c.teacherKeyForCard, {
				key: c.teacherCard.unlockKey,
				context: {
					purpose: 'teacher-key-for-credential',
					classroom: c.classroom,
					credential: c.recoveryCard.id
				}
			})
		).rejects.toThrow(UnreadableError);
	});

	it('produce keys that cannot be exported', async () => {
		const c = await createClassroom();
		const unwrapped = await unwrapKey(c.teacherKeyForCard, {
			key: c.teacherCard.unlockKey,
			context: {
				purpose: 'teacher-key-for-credential',
				classroom: c.classroom,
				credential: c.teacherCard.id
			}
		});
		for (const key of [c.teacherKey, c.teacherCard.unlockKey, unwrapped]) {
			expect(key.extractable).toBe(false);
			await expect(crypto.subtle.exportKey('raw', key)).rejects.toThrow();
		}
	});

	it('never re-wrap a key as another kind of key', async () => {
		const c = await createClassroom();
		await expect(
			rewrapKey(
				c.groupKeyForTeacher,
				{
					key: c.teacherKey,
					context: { purpose: 'group-key-for-teacher', classroom: c.classroom }
				},
				[
					{
						key: c.recoveryCard.unlockKey,
						context: {
							purpose: 'teacher-key-for-credential',
							classroom: c.classroom,
							credential: c.recoveryCard.id
						}
					}
				]
			)
		).rejects.toThrow(TypeError);
	});
});

describe('classroom access', () => {
	it('lets a family device open the classroom profile', async () => {
		const c = await createClassroom();
		expect(await openAsFamily(c, await addFamily(c))).toEqual(profileData);
	});

	it('restores teacher access with the recovery card alone, including issuing a new card', async () => {
		const c = await createClassroom();
		expect(await openAsTeacher(c, c.recoveryCard, c.teacherKeyForRecovery)).toEqual(adminData);

		const card = await createCard('teacher');
		const [envelope] = await rewrapKey(
			c.teacherKeyForRecovery,
			{
				key: c.recoveryCard.unlockKey,
				context: {
					purpose: 'teacher-key-for-credential',
					classroom: c.classroom,
					credential: c.recoveryCard.id
				}
			},
			[
				{
					key: card.unlockKey,
					context: {
						purpose: 'teacher-key-for-credential',
						classroom: c.classroom,
						credential: card.id
					}
				}
			]
		);
		expect(await openAsTeacher(c, card, envelope)).toEqual(adminData);
	});

	it('keeps the Family Key when a family card is replaced, and retires the old card', async () => {
		const c = await createClassroom();
		const f = await addFamily(c);

		// Replaced in place: same credential ID, a new secret, and the Family Key re-wrapped from the
		// teacher's copy. The family's Group Key envelope doesn't change.
		const replacement = createSecret();
		const { unlockKey } = await deriveCredential(replacement, 'family');
		const [envelope] = await rewrapKey(
			f.familyKeyForTeacher,
			{
				key: c.teacherKey,
				context: { purpose: 'family-key-for-teacher', classroom: c.classroom, family: f.family }
			},
			[
				{
					key: unlockKey,
					context: {
						purpose: 'family-key-for-credential',
						classroom: c.classroom,
						credential: f.card.id
					}
				}
			]
		);

		expect(await openAsFamily(c, f, replacement, envelope)).toEqual(profileData);
		await expect(openAsFamily(c, f, f.card.secret, envelope)).rejects.toThrow(UnreadableError);
	});

	it("keeps each family's keys to that family", async () => {
		const c = await createClassroom();
		const [a, b] = [await addFamily(c), await addFamily(c)];
		await expect(openAsFamily(c, a, b.card.secret)).rejects.toThrow(UnreadableError);

		const familyKeyB = await unwrapKey(b.familyKeyForCard, {
			key: b.card.unlockKey,
			context: {
				purpose: 'family-key-for-credential',
				classroom: c.classroom,
				credential: b.card.id
			}
		});
		await expect(
			unwrapKey(a.groupKeyForFamily, {
				key: familyKeyB,
				context: { purpose: 'group-key-for-family', classroom: c.classroom, family: a.family }
			})
		).rejects.toThrow(UnreadableError);
		await expect(
			unwrapKey(a.familyKeyForTeacher, {
				key: familyKeyB,
				context: { purpose: 'family-key-for-teacher', classroom: c.classroom, family: a.family }
			})
		).rejects.toThrow(UnreadableError);
	});
});
