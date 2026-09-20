import { describe, expect, it } from 'vitest';
import { zipFiles } from './zip';

// The zip a gallery is saved as, read back the way a computer reads one: from the listing at the end of the
// file, which says where every entry starts, rather than by scanning the bytes from the front.

const decoder = new TextDecoder();
const file = (name: string, text: string) => new File([text], name, { type: 'text/plain' });

/** What an unpacker finds in a zip: each entry's name, its checksum, and the text it holds. */
async function unzip(zip: Blob) {
	const bytes = new Uint8Array(await zip.arrayBuffer());
	const view = new DataView(bytes.buffer);
	const end = bytes.length - 22;
	expect(view.getUint32(end, true)).toBe(0x06054b50);
	expect(view.getUint32(end + 12, true)).toBe(bytes.length - 22 - view.getUint32(end + 16, true));
	let at = view.getUint32(end + 16, true);
	const entries = [];
	for (let index = 0; index < view.getUint16(end + 10, true); index++) {
		expect(view.getUint32(at, true)).toBe(0x02014b50);
		const length = view.getUint16(at + 28, true);
		const name = decoder.decode(bytes.subarray(at + 46, at + 46 + length));
		const size = view.getUint32(at + 24, true);
		// The listing points at the entry itself, which repeats its name before its bytes.
		const local = view.getUint32(at + 42, true);
		expect(view.getUint32(local, true)).toBe(0x04034b50);
		expect(decoder.decode(bytes.subarray(local + 30, local + 30 + length))).toBe(name);
		const data = local + 30 + length + view.getUint16(local + 28, true);
		entries.push({
			name,
			crc: view.getUint32(at + 16, true),
			text: decoder.decode(bytes.subarray(data, data + size))
		});
		at += 46 + length;
	}
	expect(at).toBe(bytes.length - 22);
	return entries;
}

describe('zip', () => {
	it('holds every file under its own name, in the order they were given', async () => {
		const zip = await zipFiles([file('Izlet-1.jpg', 'first'), file('Izlet-2.jpg', 'second')]);
		expect(zip.type).toBe('application/zip');
		expect(await unzip(zip)).toMatchObject([
			{ name: 'Izlet-1.jpg', text: 'first' },
			{ name: 'Izlet-2.jpg', text: 'second' }
		]);
	});

	it('checksums what it holds, so an unpacker can tell the bytes arrived whole', async () => {
		const [entry] = await unzip(await zipFiles([file('hello.txt', 'hello')]));
		expect(entry.crc).toBe(0x3610a686);
	});

	it('writes names as UTF-8, counting their bytes rather than their letters', async () => {
		const [entry] = await unzip(await zipFiles([file('Božić-1.jpg', 'tree')]));
		expect(entry).toMatchObject({ name: 'Božić-1.jpg', text: 'tree' });
	});

	it('is a zip holding nothing when there is nothing to hold', async () => {
		expect((await zipFiles([])).size).toBe(22);
		expect(await unzip(await zipFiles([]))).toEqual([]);
	});
});
