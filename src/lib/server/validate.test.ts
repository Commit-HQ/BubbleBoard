import { expect, it } from 'vitest';
import { toBase64Url } from '$lib/base64url';
import { createId } from '$lib/crypto';
import { familyLinks, newChild, setup } from './validate';

// Structure the server enforces on requests it can't read. Envelopes only need the right form here.

const envelope = (bytes: number) =>
	`1.${toBase64Url(new Uint8Array(12))}.${toBase64Url(new Uint8Array(bytes))}`;
const credential = () => ({
	id: createId(),
	authToken: toBase64Url(new Uint8Array(32)),
	wrappedKey: envelope(48)
});

it('refuses a new family card that wouldn’t reach its child’s classroom', () => {
	const classroom = createId();
	const family = {
		id: createId(),
		profile: envelope(20),
		familyKeyForStaff: envelope(48),
		credential: credential()
	};
	const request = {
		revision: 0,
		id: createId(),
		classroom,
		profile: envelope(20),
		newFamilies: [family],
		removeMemberships: [],
		removeFamilies: []
	};
	const reaching = [{ family: family.id, classroom, groupKeyForFamily: envelope(48) }];
	expect(newChild({ ...request, addMemberships: reaching }).newFamilies).toHaveLength(1);
	expect(() => newChild({ ...request, addMemberships: [] })).toThrow();
	expect(() => newChild({ ...request, addMemberships: [...reaching, ...reaching] })).toThrow();
	// A child being removed is in no classroom, so its links can't add a family.
	expect(() => familyLinks({ ...request, addMemberships: reaching })).toThrow();
});

it('refuses a setup whose two cards share an ID', () => {
	const teacher = () => ({ id: createId(), profile: envelope(20), credential: credential() });
	const [admin, recovery] = [teacher(), teacher()];
	expect(setup({ token: 'token', teachers: [admin, recovery] }).teachers).toHaveLength(2);
	const shared = { ...recovery, credential: { ...recovery.credential, id: admin.credential.id } };
	expect(() => setup({ token: 'token', teachers: [admin, shared] })).toThrow();
});
