// A zip file, put together in the browser, so a set of pictures can be kept in one go (src/lib/files.ts).
// Entries are stored as they are, not deflated: what goes in has already been through an image encoder, so
// compressing it again would cost seconds on a phone and save almost nothing. Names are written as UTF-8,
// which bit 11 of an entry's flags declares.

const signature = { local: 0x04034b50, entry: 0x02014b50, end: 0x06054b50 };
/** Stored, not deflated, with names as UTF-8. */
const stored = { method: 0, flags: 0x0800, version: 20 };
/** Sizes and offsets are four bytes each; a zip of more needs a format the app never has to write. */
const mostBytes = 0xffffffff;

const table = Uint32Array.from({ length: 256 }, (_, index) => {
	let value = index;
	for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
	return value;
});

/** The checksum an entry carries, which whoever opens the file checks its bytes against. */
function crc32(bytes: Uint8Array) {
	let crc = 0xffffffff;
	for (const byte of bytes) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
	return (crc ^ 0xffffffff) >>> 0;
}

/** When the files were made, in the two packed fields a zip has recorded since DOS. */
function stamp(when: Date) {
	const year = Math.max(1980, when.getFullYear());
	return {
		time: (when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1),
		day: ((year - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate()
	};
}

/** One record of a zip: little-endian fields of two or four bytes, then the name the record is about. */
function record(
	fields: [width: 2 | 4, value: number][],
	name: Uint8Array
): Uint8Array<ArrayBuffer> {
	const size = fields.reduce((total, [width]) => total + width, 0);
	const bytes = new Uint8Array(size + name.length);
	const view = new DataView(bytes.buffer);
	let at = 0;
	for (const [width, value] of fields) {
		if (width === 2) view.setUint16(at, value, true);
		else view.setUint32(at, value, true);
		at += width;
	}
	bytes.set(name, size);
	return bytes;
}

/**
 * The files in one zip, in the order given, each under its own name. Every computer and phone opens such a
 * file, so a whole gallery can be kept with one tap instead of one download per photo.
 */
export async function zipFiles(files: File[]) {
	const encoder = new TextEncoder();
	const { time, day } = stamp(new Date());
	const parts: BlobPart[] = [];
	const directory: Uint8Array<ArrayBuffer>[] = [];
	let offset = 0;
	for (const file of files) {
		const name = encoder.encode(file.name);
		const bytes = new Uint8Array(await file.arrayBuffer());
		const crc = crc32(bytes);
		const local = record(
			[
				[4, signature.local],
				[2, stored.version],
				[2, stored.flags],
				[2, stored.method],
				[2, time],
				[2, day],
				[4, crc],
				[4, bytes.length],
				[4, bytes.length],
				[2, name.length],
				[2, 0]
			],
			name
		);
		directory.push(
			record(
				[
					[4, signature.entry],
					[2, stored.version],
					[2, stored.version],
					[2, stored.flags],
					[2, stored.method],
					[2, time],
					[2, day],
					[4, crc],
					[4, bytes.length],
					[4, bytes.length],
					[2, name.length],
					[2, 0],
					[2, 0],
					[2, 0],
					[2, 0],
					[4, 0],
					[4, offset]
				],
				name
			)
		);
		parts.push(local, bytes);
		offset += local.length + bytes.length;
		if (offset > mostBytes) throw new Error('These files are too large for one zip');
	}
	const listing = directory.reduce((total, entry) => total + entry.length, 0);
	const end = record(
		[
			[4, signature.end],
			[2, 0],
			[2, 0],
			[2, files.length],
			[2, files.length],
			[4, listing],
			[4, offset],
			[2, 0]
		],
		new Uint8Array()
	);
	return new Blob([...parts, ...directory, end], { type: 'application/zip' });
}
