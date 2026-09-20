import type { Rect, Region } from './editor';
/** Partition overlaps by the exact set of covering faces. No cell belongs to two grants. */
export function overlapAreas(regions: Region[]) {
	const xs = [...new Set(regions.flatMap((r) => [r.x, r.x + r.width]))].sort((a, b) => a - b);
	const ys = [...new Set(regions.flatMap((r) => [r.y, r.y + r.height]))].sort((a, b) => a - b);
	const groups = new Map<string, { members: Region[]; cells: Rect[] }>();
	for (let y = 0; y < ys.length - 1; y++)
		for (let x = 0; x < xs.length - 1; x++) {
			const members = regions.filter(
				(r) =>
					r.x <= xs[x] && r.x + r.width >= xs[x + 1] && r.y <= ys[y] && r.y + r.height >= ys[y + 1]
			);
			if (members.length < 2 || members.some((r) => !r.child)) continue;
			const key = members
				.map((r) => r.id)
				.sort()
				.join('/');
			const group = groups.get(key) ?? { members, cells: [] };
			group.cells.push({ x: xs[x], y: ys[y], width: xs[x + 1] - xs[x], height: ys[y + 1] - ys[y] });
			groups.set(key, group);
		}
	return [...groups.values()].map((group) => {
		const x = Math.min(...group.cells.map((c) => c.x)),
			y = Math.min(...group.cells.map((c) => c.y));
		return {
			...group,
			x,
			y,
			width: Math.max(...group.cells.map((c) => c.x + c.width)) - x,
			height: Math.max(...group.cells.map((c) => c.y + c.height)) - y
		};
	});
}
/** Zero-fill gaps inside an overlap's bounding rectangle, then copy only its exact cells. */
export function overlapPixels(
	source: Uint8ClampedArray,
	width: number,
	area: Rect & { cells: Rect[] }
) {
	const result = new Uint8ClampedArray(area.width * area.height * 4);
	for (const cell of area.cells)
		for (let y = cell.y; y < cell.y + cell.height; y++) {
			result.set(
				source.subarray((y * width + cell.x) * 4, (y * width + cell.x + cell.width) * 4),
				((y - area.y) * area.width + cell.x - area.x) * 4
			);
		}
	return result;
}
export function overlapAudience(
	children: { id: string; families: string[] }[],
	shared: Set<string>
) {
	if (children.every((c) => shared.has(c.id))) return [];
	return [...new Set(children.flatMap((c) => c.families))].filter((f) =>
		children.every((c) => shared.has(c.id) || c.families.includes(f))
	);
}
