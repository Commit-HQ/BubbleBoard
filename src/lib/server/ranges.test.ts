import { describe, expect, it } from 'vitest';
import { parseRange, serveRange } from './ranges';

// The byte ranges the Worker answers for the tour videos, against a stand-in for the static assets that sends
// a file as the real ones do: a byte stream in chunks of a few kilobytes, without saying how long it is.

describe('parseRange', () => {
	const size = 1000;

	it('reads one range, and fits its end to the file', () => {
		expect(parseRange('bytes=0-1', size)).toEqual({ start: 0, end: 1 });
		expect(parseRange('bytes=10-', size)).toEqual({ start: 10, end: 999 });
		expect(parseRange('bytes=900-5000', size)).toEqual({ start: 900, end: 999 });
		expect(parseRange(' bytes=0-0 ', size)).toEqual({ start: 0, end: 0 });
	});

	it('reads the last so many bytes', () => {
		expect(parseRange('bytes=-10', size)).toEqual({ start: 990, end: 999 });
		expect(parseRange('bytes=-5000', size)).toEqual({ start: 0, end: 999 });
		expect(parseRange('bytes=-0', size)).toBe('unsatisfiable');
	});

	it('refuses a range that starts past the end', () => {
		expect(parseRange('bytes=1000-', size)).toBe('unsatisfiable');
		expect(parseRange('bytes=0-', 0)).toBe('unsatisfiable');
	});

	it('sends the whole file for no range, an invalid one, or several', () => {
		expect(parseRange(null, size)).toBeNull();
		expect(parseRange('bytes=5-2', size)).toBeNull();
		expect(parseRange('bytes=-', size)).toBeNull();
		expect(parseRange('bytes=0-1,4-5', size)).toBeNull();
		expect(parseRange('items=0-1', size)).toBeNull();
	});
});

// What the Workers runtime has and Node doesn't: a stream for a body of a known length, which fails unless it
// carries exactly that many bytes, and a read that fills a view with at least so many bytes, here a read at a
// time, counted.
class FixedLengthStream extends TransformStream<Uint8Array, Uint8Array> {
	constructor(length: number) {
		let carried = 0;
		super({
			transform(chunk, controller) {
				carried += chunk.length;
				if (carried > length) throw new Error(`More than ${length} bytes`);
				controller.enqueue(chunk);
			},
			flush() {
				if (carried < length) throw new Error(`${carried} bytes, not ${length}`);
			}
		});
	}
}
const reads = { calls: 0 };
Object.assign(globalThis, { FixedLengthStream });
Object.assign(ReadableStreamBYOBReader.prototype, {
	async readAtLeast(this: ReadableStreamBYOBReader, min: number, view: Uint8Array<ArrayBuffer>) {
		reads.calls++;
		// Each read moves the bytes to a new buffer, leaving the view empty.
		const { byteOffset, length } = view;
		let buffer = view.buffer;
		let filled = 0;
		for (;;) {
			const { value, done } = await this.read(
				new Uint8Array(buffer, byteOffset + filled, length - filled)
			);
			if (value) {
				buffer = value.buffer;
				filled += value.byteLength;
			}
			if (done || filled >= min)
				return { value: new Uint8Array(buffer, byteOffset, filled), done: done && !filled };
		}
	}
});

describe('serveRange', () => {
	const size = 1_000_000;
	const file = Uint8Array.from({ length: size }, (_, i) => (i * 7) % 251);
	const url = 'https://bubbleboard.example.com/_app/immutable/assets/tour-hr-720-h264.abc123.mp4';

	/** Stands in for the static assets: the file in chunks of 4 KB, and how many chunks were read. */
	function assets(status = 200) {
		const read = { chunks: 0, cancelled: false };
		return {
			read,
			fetch: async (request: Request) => {
				expect(request.headers.has('Range')).toBe(false);
				let offset = 0;
				const body = new ReadableStream({
					type: 'bytes',
					pull(controller) {
						if (offset >= size) {
							controller.close();
							controller.byobRequest?.respond(0);
							return;
						}
						read.chunks++;
						controller.enqueue(file.slice(offset, offset + 4096));
						offset += 4096;
					},
					cancel() {
						read.cancelled = true;
					}
				});
				return new Response(status === 200 ? body : 'Not found', {
					status,
					headers: {
						'Content-Type': 'video/mp4',
						ETag: '"abc123"',
						'Cache-Control': 'public, immutable, max-age=31536000'
					}
				});
			}
		};
	}

	const get = (headers: Record<string, string> = {}, method = 'GET') =>
		new Request(url, { method, headers });
	/** Whether a response carries exactly these bytes of the file. */
	const carries = async (response: Response, start: number, end = size) =>
		Buffer.from(await response.arrayBuffer()).equals(file.subarray(start, end));

	it('sends the whole file to a request without a range, saying ranges are welcome', async () => {
		const response = await serveRange(get(), assets(), size);
		expect(response.status).toBe(200);
		expect(response.headers.get('Accept-Ranges')).toBe('bytes');
		expect(response.headers.get('Content-Length')).toBe(String(size));
		expect(response.headers.get('Cache-Control')).toBe('public, immutable, max-age=31536000');
		expect(await carries(response, 0)).toBe(true);
	});

	it('sends the first two bytes Safari asks for first, and reads no further', async () => {
		const source = assets();
		const response = await serveRange(get({ Range: 'bytes=0-1' }), source, size);
		expect(response.status).toBe(206);
		expect(response.headers.get('Content-Range')).toBe(`bytes 0-1/${size}`);
		expect(response.headers.get('Content-Length')).toBe('2');
		expect(response.headers.get('Content-Type')).toBe('video/mp4');
		expect(await carries(response, 0, 2)).toBe(true);
		expect(source.read.chunks).toBe(1);
		expect(source.read.cancelled).toBe(true);
	});

	it('cuts a range that spans chunks', async () => {
		const response = await serveRange(get({ Range: 'bytes=5000-12999' }), assets(), size);
		expect(response.status).toBe(206);
		expect(response.headers.get('Content-Range')).toBe(`bytes 5000-12999/${size}`);
		expect(await carries(response, 5000, 13000)).toBe(true);
	});

	it('sends the rest of the file from where a player seeks to, reading it in a few large blocks', async () => {
		const source = assets();
		reads.calls = 0;
		const response = await serveRange(get({ Range: 'bytes=900000-' }), source, size);
		expect(response.headers.get('Content-Range')).toBe(`bytes 900000-999999/${size}`);
		expect(response.headers.get('Content-Length')).toBe('100000');
		expect(await carries(response, 900_000)).toBe(true);
		expect(source.read.chunks).toBeGreaterThan(200);
		expect(reads.calls).toBeLessThanOrEqual(5);
	});

	it('sends a range of several blocks', async () => {
		const response = await serveRange(get({ Range: 'bytes=100000-799999' }), assets(), size);
		expect(await carries(response, 100_000, 800_000)).toBe(true);
	});

	it('sends the whole file as a range when asked for all of it', async () => {
		const response = await serveRange(get({ Range: 'bytes=0-' }), assets(), size);
		expect(response.status).toBe(206);
		expect(response.headers.get('Content-Range')).toBe(`bytes 0-999999/${size}`);
		expect(response.headers.get('Content-Length')).toBe(String(size));
		expect(await carries(response, 0)).toBe(true);
	});

	it('sends the last bytes', async () => {
		const response = await serveRange(get({ Range: 'bytes=-10' }), assets(), size);
		expect(response.headers.get('Content-Range')).toBe(`bytes 999990-999999/${size}`);
		expect(await carries(response, 999_990)).toBe(true);
	});

	it('refuses a range past the end, saying how long the file is', async () => {
		const response = await serveRange(get({ Range: `bytes=${size}-` }), assets(), size);
		expect(response.status).toBe(416);
		expect(response.headers.get('Content-Range')).toBe(`bytes */${size}`);
		expect(await carries(response, 0, 0)).toBe(true);
	});

	it('answers HEAD with the headers alone', async () => {
		const response = await serveRange(get({ Range: 'bytes=0-99' }, 'HEAD'), assets(), size);
		expect(response.status).toBe(206);
		expect(response.headers.get('Content-Length')).toBe('100');
		expect(response.body).toBeNull();
		const whole = await serveRange(get({}, 'HEAD'), assets(), size);
		expect(whole.status).toBe(200);
		expect(whole.headers.get('Content-Length')).toBe(String(size));
		expect(whole.body).toBeNull();
	});

	it('sends the whole file when the client holds part of another version', async () => {
		const stale = await serveRange(
			get({ Range: 'bytes=0-1', 'If-Range': '"old"' }),
			assets(),
			size
		);
		expect(stale.status).toBe(200);
		expect(await carries(stale, 0)).toBe(true);
		const same = await serveRange(
			get({ Range: 'bytes=0-1', 'If-Range': '"abc123"' }),
			assets(),
			size
		);
		expect(same.status).toBe(206);
	});

	it('cuts the response short when the file is shorter than the build said', async () => {
		const response = await serveRange(get({ Range: 'bytes=999000-1000999' }), assets(), 2 * size);
		expect(response.status).toBe(206);
		await expect(response.arrayBuffer()).rejects.toThrow();
	});

	it('passes on what the assets answer when there is no such file', async () => {
		const response = await serveRange(get({ Range: 'bytes=0-1' }), assets(404), size);
		expect(response.status).toBe(404);
		expect(response.headers.has('Content-Range')).toBe(false);
	});
});
