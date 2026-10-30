// Byte ranges of the static files the Worker serves itself: the landing page's tour videos (worker/index.js,
// and `run_worker_first` in wrangler.jsonc). Cloudflare's static assets come whole whatever `Range` asks
// for, and Safari plays no video from a server that does that: it asks for the first two bytes before
// anything else, then for the bytes it needs as it plays and seeks. So the Worker fetches the whole file from
// the assets, with the headers `_headers` gives it, and sends only the bytes asked for. The assets don't say
// how long the file is, so the build writes down each video's size for the Worker (vite.config.ts). Imports
// stay relative: Wrangler bundles this for the Worker without SvelteKit.

type Assets = { fetch: (request: Request) => Promise<Response> };

export type ByteRange = { start: number; end: number };

/**
 * The bytes a `Range` header asks for in a file of `size` bytes: one range, `'unsatisfiable'` when it starts
 * past the end, or `null` for the whole file, which answers no header, one that is invalid (RFC 9110 §14.1),
 * and one asking for several ranges at once, which players don't do and the RFC lets a server ignore.
 */
export function parseRange(
	header: string | null,
	size: number
): ByteRange | 'unsatisfiable' | null {
	const match = header ? /^bytes=(\d*)-(\d*)$/.exec(header.trim()) : null;
	if (!match) return null;
	const [, first, last] = match;
	if (first === '') {
		// The last so many bytes.
		if (last === '') return null;
		const length = Number(last);
		if (length === 0 || size === 0) return 'unsatisfiable';
		return { start: Math.max(0, size - length), end: size - 1 };
	}
	const start = Number(first);
	if (last !== '' && Number(last) < start) return null;
	if (start >= size) return 'unsatisfiable';
	return { start, end: last === '' ? size - 1 : Math.min(Number(last), size - 1) };
}

/**
 * How much of a file a range reads at a time. The file arrives in chunks of a few kilobytes, and a call for
 * each would run thousands of times to reach a range near the end of a video, close to the 10 ms of CPU time
 * the Free plan gives a request; the Workers runtime fills a whole block without running any script. Small
 * enough that many requests at once stay well within a Worker's memory.
 */
const block = 256 * 1024;

/** The Workers runtime's reader of a byte stream, which can fill a view with at least `min` bytes at once. */
type BlockReader = ReadableStreamBYOBReader & {
	readAtLeast(
		min: number,
		view: Uint8Array<ArrayBuffer>
	): Promise<ReadableStreamReadResult<Uint8Array<ArrayBuffer>>>;
};

/** Writes the bytes from `start` to `end` of a byte stream to `writable`, and stops reading the stream there. */
async function copy(
	body: ReadableStream<Uint8Array>,
	{ start, end }: ByteRange,
	writable: WritableStream<Uint8Array>
) {
	const reader = body.getReader({ mode: 'byob' }) as BlockReader;
	const writer = writable.getWriter();
	try {
		let position = 0;
		// The bytes before the range all pass through the same block.
		let skipped = new ArrayBuffer(Math.min(block, start));
		while (position < start) {
			const length = Math.min(block, start - position);
			const { value } = await reader.readAtLeast(length, new Uint8Array(skipped, 0, length));
			if (!value || value.length < length) throw new Error('The file ended before the range');
			skipped = value.buffer;
			position += length;
		}
		while (position <= end) {
			const length = Math.min(block, end + 1 - position);
			const { value } = await reader.readAtLeast(length, new Uint8Array(length));
			if (!value || value.length < length) throw new Error('The file ended within the range');
			await writer.write(value);
			position += length;
		}
		await writer.close();
	} catch (error) {
		// The client sees a response cut short, as when it goes away itself.
		await writer.abort(error).catch(() => {});
	} finally {
		await reader.cancel().catch(() => {});
	}
}

/** Answers a GET or HEAD for a static file of `size` bytes with the byte range it asks for. */
export async function serveRange(
	request: Request,
	assets: Assets,
	size: number
): Promise<Response> {
	// The whole file, whatever the request's own conditions and range.
	const whole = await assets.fetch(new Request(request.url));
	if (whole.status !== 200 || !whole.body) return whole;

	const headers = new Headers(whole.headers);
	headers.set('Accept-Ranges', 'bytes');
	// A range is only for the file the client already has part of; the files are content-hashed, so this only
	// matters to a client that kept a part from elsewhere.
	const ifRange = request.headers.get('If-Range');
	const current = !ifRange || ifRange === whole.headers.get('ETag');
	const range = current ? parseRange(request.headers.get('Range'), size) : null;
	const head = request.method === 'HEAD';

	if (range === 'unsatisfiable') {
		await whole.body.cancel();
		headers.set('Content-Range', `bytes */${size}`);
		headers.set('Content-Length', '0');
		return new Response(null, { status: 416, headers });
	}
	if (!range || (range.start === 0 && range.end === size - 1)) {
		// The whole file, which needs no cutting.
		if (range) headers.set('Content-Range', `bytes 0-${size - 1}/${size}`);
		headers.set('Content-Length', String(size));
		if (head) await whole.body.cancel();
		return new Response(head ? null : whole.body, { status: range ? 206 : 200, headers });
	}
	const length = range.end - range.start + 1;
	headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
	headers.set('Content-Length', String(length));
	if (head) {
		await whole.body.cancel();
		return new Response(null, { status: 206, headers });
	}
	// A body of a known length, so the response says how long it is instead of being chunked, as players expect
	// of a range.
	const { readable, writable } = new FixedLengthStream(length);
	void copy(whole.body, range, writable);
	return new Response(readable, { status: 206, headers });
}
