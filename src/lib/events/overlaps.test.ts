import { describe, it, expect } from 'vitest';
import { overlapAreas, overlapPixels, overlapAudience } from './overlaps';
import { manualRegion } from './editor';
describe('overlap access', () => {
	it('requires permission for every intersecting child, including three-way overlaps', () => {
		const children = [
			{ id: 'a', families: ['parent', 'other'] },
			{ id: 'b', families: ['parent'] },
			{ id: 'c', families: ['third'] }
		];
		expect(overlapAudience(children.slice(0, 2), new Set())).toEqual(['parent']);
		expect(overlapAudience(children, new Set())).toEqual([]);
		expect(overlapAudience(children, new Set(['c']))).toEqual(['parent']);
		expect(overlapAudience(children, new Set(['a', 'b']))).toEqual(['third']);
	});
	it('partitions exact coverage sets and never copies permanent covers or unrelated pixels', () => {
		const regions = [
			{ ...manualRegion('a', 10, 10), child: 'a', x: 0, y: 0, width: 6, height: 6 },
			{ ...manualRegion('b', 10, 10), child: 'b', x: 2, y: 2, width: 6, height: 6 },
			{ ...manualRegion('c', 10, 10), child: null, covered: true, x: 3, y: 3, width: 2, height: 2 }
		];
		const areas = overlapAreas(regions);
		expect(areas).toHaveLength(1);
		const source = new Uint8ClampedArray(400).fill(255),
			a = areas[0],
			pixels = overlapPixels(source, 10, a);
		for (let y = 0; y < a.height; y++)
			for (let x = 0; x < a.width; x++)
				expect(pixels[(y * a.width + x) * 4]).toBe(
					x + a.x >= 3 && x + a.x < 5 && y + a.y >= 3 && y + a.y < 5 ? 0 : 255
				);
	});
});
