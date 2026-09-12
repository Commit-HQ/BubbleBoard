import { hkdfSync } from 'node:crypto';
import { expect, it } from 'vitest';
import { readCard } from './card';
import { decryptData, deriveCredential, unwrapKey } from './crypto';

// A card and three records written in September 2026 by a separate implementation of
// docs/access-format.md that uses only Node's crypto module. Printed cards and stored records depend on
// exactly these bytes, so if this test fails, the change would break existing installations. Never
// update these values: add a new card or envelope format instead.
const fixture = {
	origin: 'https://bubbleboard.example.com',
	code: '72JW-BJCK-FFWA-K6H7-N3JH-XFNY-AW2A',
	authToken: '36WG-tLiB05ItIibuaV-vm9xOHWEeQldND_A0A5_ANE',
	credential: '8swgOBcWF7p2eAhP4GO_VA',
	classroom: 'mZxpy8xpAEm4t5zbrn9CrA',
	staffKeyForCredential:
		'1.wCPo21HzRwo9ZMZH.WklGu0jDhKDRxwux8ehT6E1fo9c2ah0L3_cNoiCMzGCD7jZMJ1fw2cBaQD0Mv7ne',
	groupKeyForStaff:
		'1.R1wPYFXD7rRWmi6a.kRX7VIb3AZ-oyfQCtQI7WGzWLh-Mr-ymci3p2YnXy5o3XDGsAQxk_oNNo8zB6KFx',
	classroomProfile:
		'1.xyFL9fiR8aijixJN.FDrNV3JWyhTzFVapMJNLDssHUAMFqoywGrAsL6o4I3t6vYtZodWCKbDEaG4',
	classroomProfileData: { name: 'Fixture Classroom' }
};

function readFixtureCard(text = fixture.code) {
	const reading = readCard(text, fixture.origin);
	if ('error' in reading)
		throw new Error(`The card format 1 fixture no longer reads: ${reading.error}`);
	return reading.secret;
}

it('reads a format 1 card, typed or scanned, into the same auth token', async () => {
	const secret = readFixtureCard();
	const link = `${fixture.origin}/app#card=${fixture.code.replaceAll('-', '')}`;
	expect(readFixtureCard(link)).toEqual(secret);
	expect((await deriveCredential(secret)).authToken).toBe(fixture.authToken);

	// The documented derivation, recomputed with Node's HKDF.
	const token = hkdfSync('sha256', secret, new Uint8Array(), 'BubbleBoard card 1 auth', 32);
	expect(Buffer.from(token).toString('base64url')).toBe(fixture.authToken);
});

it('opens format 1 envelopes with the keys that card unlocks', async () => {
	const { credential, classroom } = fixture;
	const { unlockKey } = await deriveCredential(readFixtureCard());
	const staffKey = await unwrapKey(fixture.staffKeyForCredential, {
		key: unlockKey,
		context: { purpose: 'staff-key-for-credential', credential }
	});
	const groupKey = await unwrapKey(fixture.groupKeyForStaff, {
		key: staffKey,
		context: { purpose: 'group-key-for-staff', classroom }
	});
	const profile = await decryptData(fixture.classroomProfile, groupKey, {
		purpose: 'classroom-profile',
		classroom
	});
	expect(profile).toEqual(fixture.classroomProfileData);
});
