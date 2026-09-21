// Image-space rectangles, independent of zoom and viewport size. A region's entire rectangle is opaque;
// sticker artwork is decorative and must never define the protection boundary.
export type Rect = { x: number; y: number; width: number; height: number };
export type Region = Rect & {
	id: string;
	sticker?: import('./stickers').Sticker;
	child: string | null;
	covered: boolean;
	source: 'manual' | 'detected';
	minWidth: number;
	minHeight: number;
};
export type Edit = { regions: Region[]; selected: string | null; reviewed: boolean };
export type History = { past: Edit[]; present: Edit; future: Edit[] };
export const maxRegions = 100;

export function emptyEdit(): History {
	return { past: [], present: { regions: [], selected: null, reviewed: false }, future: [] };
}

export function boundedRect(rect: Rect, width: number, height: number): Rect {
	const w = Math.min(width, Math.max(1, Math.ceil(rect.width)));
	const h = Math.min(height, Math.max(1, Math.ceil(rect.height)));
	return {
		x: Math.max(0, Math.min(width - w, Math.floor(rect.x))),
		y: Math.max(0, Math.min(height - h, Math.floor(rect.y))),
		width: w,
		height: h
	};
}

/** Pad detections before clipping, including heads at the image's edge. */
export function detectionRegion(id: string, box: Rect, width: number, height: number): Region {
	const left = Math.max(0, Math.floor(box.x - box.width * 0.25));
	const top = Math.max(0, Math.floor(box.y - box.height * 0.35));
	const right = Math.min(width, Math.ceil(box.x + box.width * 1.25));
	const bottom = Math.min(height, Math.ceil(box.y + box.height * 1.2));
	const rect = boundedRect(
		{ x: left, y: top, width: right - left, height: bottom - top },
		width,
		height
	);
	return {
		...rect,
		id,
		child: null,
		covered: false,
		source: 'detected',
		minWidth: Math.min(4, width),
		minHeight: Math.min(4, height)
	};
}

export function manualRegion(
	id: string,
	width: number,
	height: number,
	x = width / 2,
	y = height / 2
): Region {
	const size = Math.max(24, Math.round(Math.min(width, height) * 0.18));
	return {
		...boundedRect({ x: x - size / 2, y: y - size / 2, width: size, height: size }, width, height),
		id,
		child: null,
		covered: false,
		source: 'manual',
		minWidth: Math.min(4, width),
		minHeight: Math.min(4, height)
	};
}

export function unresolved(edit: Edit) {
	return edit.regions.filter((region) => !region.child && !region.covered).length;
}

/** A data change always invalidates review. Selection alone does not. */
export function commit(
	history: History,
	regions: Region[],
	selected = history.present.selected
): History {
	return {
		past: [...history.past.slice(-49), history.present],
		present: { regions, selected, reviewed: false },
		future: []
	};
}

export function assign(history: History, id: string, child: string | null): History {
	const regions = history.present.regions.map((region) =>
		region.id === id ? { ...region, child, covered: child === null } : region
	);
	const index = regions.findIndex((region) => region.id === id);
	const ordered = [...regions.slice(index + 1), ...regions.slice(0, index)];
	const next = ordered.find((region) => !region.child && !region.covered);
	return commit(history, regions, next?.id ?? null);
}

export function undo(history: History): History {
	const previous = history.past.at(-1);
	return previous
		? {
				past: history.past.slice(0, -1),
				present: { ...previous, reviewed: false },
				future: [history.present, ...history.future]
			}
		: history;
}

export function redo(history: History): History {
	const next = history.future[0];
	return next
		? {
				past: [...history.past, history.present],
				present: { ...next, reviewed: false },
				future: history.future.slice(1)
			}
		: history;
}

export function overlaps(a: Rect, b: Rect) {
	return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** Base pixels for a safe preview/export. Overwrite all RGBA channels; no hidden source pixels remain. */
export function coverPixels(
	source: Uint8ClampedArray,
	width: number,
	height: number,
	regions: Rect[]
) {
	if (
		source.length !== width * height * 4 ||
		!Number.isInteger(width) ||
		!Number.isInteger(height) ||
		width < 1 ||
		height < 1
	)
		throw new Error('Invalid raster');
	const pixels = source.slice();
	for (const region of regions) {
		if (
			![region.x, region.y, region.width, region.height].every(Number.isFinite) ||
			region.width <= 0 ||
			region.height <= 0
		)
			throw new Error('Invalid region');
		const x0 = Math.max(0, Math.floor(region.x)),
			y0 = Math.max(0, Math.floor(region.y));
		const x1 = Math.min(width, Math.ceil(region.x + region.width)),
			y1 = Math.min(height, Math.ceil(region.y + region.height));
		for (let y = y0; y < y1; y++)
			for (let x = x0; x < x1; x++) {
				const offset = (y * width + x) * 4;
				pixels[offset] = 247;
				pixels[offset + 1] = 212;
				pixels[offset + 2] = 112;
				pixels[offset + 3] = 255;
			}
	}
	return pixels;
}
