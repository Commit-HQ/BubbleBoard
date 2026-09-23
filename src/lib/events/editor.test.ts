import { describe, expect, it } from 'vitest';
import {
	assign,
	boundedRect,
	insideRect,
	commit,
	coverPixels,
	coverRest,
	detectionRegion,
	emptyEdit,
	manualRegion,
	redo,
	undo,
	unresolved
} from './editor';

describe('event photo editing', () => {
	it('lets teachers add a missed face, assign it, and then follows their chosen order', () => {
		let history = emptyEdit();
		const detected = detectionRegion('a', { x: 40, y: 40, width: 20, height: 20 }, 200, 100);
		const manual = manualRegion('b', 200, 100);
		history = commit(history, [detected, manual], 'b');
		expect(unresolved(history.present)).toBe(2);
		history = assign(history, 'b', 'child-2');
		expect(history.present.selected).toBe('a');
		history = assign(history, 'a', null);
		expect(history.present.selected).toBeNull();
		expect(unresolved(history.present)).toBe(0);
		expect(history.present.regions[0].covered).toBe(true);
		expect(history.present.regions[1].child).toBe('child-2');
	});
	it('covers every face still waiting in one step a teacher can undo', () => {
		let history = commit(emptyEdit(), [
			manualRegion('a', 200, 200, 40, 40),
			manualRegion('b', 200, 200, 120, 40),
			manualRegion('c', 200, 200, 40, 120)
		]);
		history = assign(history, 'a', 'child-1');
		history.present = { ...history.present, reviewed: true };
		const covered = coverRest(history);
		expect(unresolved(covered.present)).toBe(0);
		expect(covered.present.selected).toBeNull();
		// Naming is never touched, and the photo still has to be reviewed by hand.
		expect(covered.present.regions[0]).toMatchObject({ child: 'child-1', covered: false });
		expect(covered.present.regions.slice(1).every((r) => r.covered && !r.child)).toBe(true);
		expect(covered.present.reviewed).toBe(false);
		expect(undo(covered).present.regions).toEqual(history.present.regions);
	});
	it('does not carry a review through a change, undo, or redo', () => {
		let history = commit(emptyEdit(), [manualRegion('a', 100, 100)]);
		history = assign(history, 'a', 'child');
		history.present = { ...history.present, reviewed: true };
		const moved = commit(
			history,
			history.present.regions.map((r) => ({ ...r, x: 0 }))
		);
		expect(moved.present.reviewed).toBe(false);
		const restored = undo(moved);
		expect(restored.present.regions).toEqual(history.present.regions);
		expect(restored.present.reviewed).toBe(false);
		expect(redo(restored).present.regions[0].x).toBe(0);
		expect(redo(restored).present.reviewed).toBe(false);
	});
	it('lets covers hang off the edge while their centre stays on the image', () => {
		const r = detectionRegion('a', { x: 0, y: 0, width: 20, height: 20 }, 40, 40);
		expect(r).toMatchObject({ x: -5, y: -7, width: 30, height: 31 });
		expect(insideRect(r, 40, 40)).toEqual({ x: 0, y: 0, width: 25, height: 24 });
		expect(boundedRect({ x: -20, y: 110, width: 30, height: 40 }, 100, 100)).toEqual({
			x: -15,
			y: 80,
			width: 30,
			height: 40
		});
		expect(boundedRect({ x: 0, y: 0, width: 300, height: 40 }, 100, 100)).toMatchObject({
			x: 0,
			width: 100
		});
	});
	it('overwrites every source channel beneath small manual and overlapping covers without changing outside pixels', () => {
		// A cover this small has no corner outside its ellipse once the fill runs a pixel beyond it.
		const source = new Uint8ClampedArray(8 * 8 * 4).map((_, i) => i % 251);
		const regions = [
			{ x: 1.2, y: 1.2, width: 2, height: 2 },
			{ x: 3, y: 3, width: 2, height: 2 }
		];
		const result = coverPixels(source, 8, 8, regions);
		for (let y = 0; y < 8; y++)
			for (let x = 0; x < 8; x++) {
				const covered =
					(x >= 1 && x < 4 && y >= 1 && y < 4) || (x >= 3 && x < 5 && y >= 3 && y < 5);
				const offset = (y * 8 + x) * 4;
				expect([...result.slice(offset, offset + 4)]).toEqual(
					covered ? [247, 212, 112, 255] : [...source.slice(offset, offset + 4)]
				);
			}
		expect(result).not.toBe(source);
		expect(() => coverPixels(source, 8, 8, [{ x: NaN, y: 0, width: 2, height: 2 }])).toThrow();
	});
	it('fills a cover to the edges of its box on both axes and leaves the corners alone', () => {
		const source = new Uint8ClampedArray(20 * 20 * 4).map((_, i) => i % 251);
		const result = coverPixels(source, 20, 20, [{ x: 2, y: 2, width: 16, height: 12 }]);
		const covered = (x: number, y: number) =>
			result[(y * 20 + x) * 4 + 3] === 255 && result[(y * 20 + x) * 4] === 247;
		expect([covered(10, 2), covered(10, 13), covered(2, 8), covered(17, 8), covered(9, 7)]).toEqual(
			[true, true, true, true, true]
		);
		expect([covered(2, 2), covered(17, 2), covered(2, 13), covered(17, 13)]).toEqual([
			false,
			false,
			false,
			false
		]);
		const corner = (2 * 20 + 2) * 4;
		expect([...result.slice(corner, corner + 4)]).toEqual([...source.slice(corner, corner + 4)]);
	});
});
