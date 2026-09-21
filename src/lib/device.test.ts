import { describe, expect, it } from 'vitest';
import { createId } from './crypto';
import { openDevices, sealDeviceName } from './device';

const familyKey = () =>
	crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);

describe('a device’s name', () => {
	it('opens for its family, on the device it was written for', async () => {
		const [key, otherKey] = [await familyKey(), await familyKey()];
		const [mum, grandpa, unnamed] = [createId(), createId(), createId()];
		const name = await sealDeviceName(mum, 'Mum', key);
		const records = [
			{ id: mum, name, current: true },
			// Moved to another device, it doesn't open, and the device shows as one without a name.
			{ id: grandpa, name, current: false },
			{ id: unnamed, name: null, current: false }
		];

		expect(await openDevices(records, key)).toEqual([
			{ id: mum, name: 'Mum', current: true },
			{ id: grandpa, current: false },
			{ id: unnamed, current: false }
		]);
		expect(await openDevices(records, otherKey)).toEqual(
			records.map(({ id, current }) => ({ id, current }))
		);
	});
});
