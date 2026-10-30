import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { locales } from '$lib/i18n';
import { posterWidths, tourSources } from '$lib/tour';

// The tour's files against what src/lib/tour.ts says of them. A browser trusts a <source>'s codecs to skip
// what it can't play, so they must be the files' own; Cloudflare refuses a static file over 25 MiB; and a
// file whose index comes after its data can't start playing until it has downloaded whole. Read from the
// files' MP4 boxes, so nothing beyond the repository is needed.

const dir = 'src/lib/assets/tour';

type Box = { type: string; start: number; end: number; body: number };

/** The boxes between `start` and `end` of an MP4 file. */
function boxes(data: Buffer, start = 0, end = data.length): Box[] {
	const found: Box[] = [];
	let at = start;
	while (at + 8 <= end) {
		let size = data.readUInt32BE(at);
		const type = data.toString('latin1', at + 4, at + 8);
		let body = at + 8;
		if (size === 1) {
			size = Number(data.readBigUInt64BE(at + 8));
			body = at + 16;
		} else if (size === 0) size = end - at;
		found.push({ type, start: at, end: at + size, body });
		at += size;
	}
	return found;
}

/** The first box along a path of nested box types. */
function find(
	data: Buffer,
	path: string[],
	within: Box = { type: '', start: 0, end: data.length, body: 0 }
) {
	let box: Box | undefined = within;
	for (const type of path) {
		box = boxes(data, box.body, box.end).find((b) => b.type === type);
		if (!box) return undefined;
	}
	return box;
}

const hex = (n: number) => n.toString(16).padStart(2, '0');

/** A track's sample entry and the codec it names, as a MIME type's `codecs` would. */
function codecOf(data: Buffer, track: Box) {
	const stsd = find(data, ['mdia', 'minf', 'stbl', 'stsd'], track)!;
	// A full box with an entry count before the entries.
	const [entry] = boxes(data, stsd.body + 8, stsd.end);
	if (entry.type === 'avc1') {
		const avcC = boxes(data, entry.body + 78, entry.end).find((b) => b.type === 'avcC')!;
		const [, profile, constraints, level] = data.subarray(avcC.body, avcC.body + 4);
		return {
			codec: `avc1.${hex(profile)}${hex(constraints)}${hex(level)}`,
			width: data.readUInt16BE(entry.body + 24),
			height: data.readUInt16BE(entry.body + 26)
		};
	}
	if (entry.type === 'av01') {
		const av1C = boxes(data, entry.body + 78, entry.end).find((b) => b.type === 'av1C')!;
		const profile = data[av1C.body + 1] >> 5;
		const level = data[av1C.body + 1] & 0x1f;
		const flags = data[av1C.body + 2];
		const tier = flags & 0x80 ? 'H' : 'M';
		const depth = flags & 0x20 ? 12 : flags & 0x40 ? 10 : 8;
		return {
			codec: `av01.${profile}.${String(level).padStart(2, '0')}${tier}.${String(depth).padStart(2, '0')}`,
			width: data.readUInt16BE(entry.body + 24),
			height: data.readUInt16BE(entry.body + 26)
		};
	}
	if (entry.type === 'Opus') return { codec: 'opus' };
	if (entry.type === 'mp4a') {
		// The decoder config's object type (0x40, MPEG-4 audio), and the audio object type in the first five
		// bits of its specific info (2, AAC-LC).
		const esds = boxes(data, entry.body + 28, entry.end).find((b) => b.type === 'esds')!;
		const es = descriptor(data, esds.body + 4);
		// After the stream's ID and flags, the optional fields its flags announce.
		const flags = data[es.body + 2];
		let at = es.body + 3;
		if (flags & 0x80) at += 2;
		if (flags & 0x40) at += 1 + data[at];
		if (flags & 0x20) at += 2;
		const config = descriptor(data, at);
		const specific = descriptor(data, config.body + 13);
		return { codec: `mp4a.${hex(data[config.body])}.${data[specific.body] >> 3}` };
	}
	return { codec: entry.type };
}

/** An MPEG-4 descriptor: its tag, and where its body starts, after a length of up to four bytes. */
function descriptor(data: Buffer, at: number) {
	let body = at + 1;
	while (data[body] & 0x80) body++;
	return { tag: data[at], body: body + 1 };
}

describe.each(locales)('the %s tour', (locale) => {
	it.each(tourSources)('$name plays as its <source> says', (source) => {
		const path = `${dir}/tour-${locale}-${source.name}.mp4`;
		expect(statSync(path).size).toBeLessThan(25 * 1024 * 1024);
		const data = readFileSync(path);

		const top = boxes(data).map((b) => b.type);
		expect(top.indexOf('moov')).toBeGreaterThan(-1);
		expect(top.indexOf('moov')).toBeLessThan(top.indexOf('mdat'));

		const moov = find(data, ['moov'])!;
		const tracks = boxes(data, moov.body, moov.end)
			.filter((b) => b.type === 'trak')
			.map((track) => codecOf(data, track));
		const video = tracks.find((t) => 'width' in t);
		expect(video).toEqual({ codec: source.video, width: source.width, height: source.height });
		expect(tracks.map((t) => t.codec)).toContain(source.audio);
	});

	it('has its poster at every width', () => {
		for (const width of posterWidths)
			expect(statSync(`${dir}/tour-${locale}-${width}.avif`).size).toBeGreaterThan(0);
		expect(statSync(`${dir}/tour-${locale}-1280.webp`).size).toBeGreaterThan(0);
	});
});
