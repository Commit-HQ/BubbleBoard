import { describe, expect, it } from 'vitest';
import { assign, boundedRect, commit, coverPixels, detectionRegion, emptyEdit, manualRegion, redo, undo, unresolved } from './editor';

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
	it('does not carry a review through a change, undo, or redo', () => {
		let history = commit(emptyEdit(), [manualRegion('a', 100, 100)]);
		history = assign(history, 'a', 'child');
		history.present = { ...history.present, reviewed: true };
		const moved = commit(history, history.present.regions.map(r => ({ ...r, x: 0 })));
		expect(moved.present.reviewed).toBe(false);
		const restored = undo(moved);
		expect(restored.present.regions).toEqual(history.present.regions);
		expect(restored.present.reviewed).toBe(false);
		expect(redo(restored).present.regions[0].x).toBe(0);
		expect(redo(restored).present.reviewed).toBe(false);
	});
	it('pads and clips detections at the edge and keeps manual moves inside the image', () => {
		const r = detectionRegion('a', { x: 0, y: 0, width: 20, height: 20 }, 40, 30);
		expect(r).toMatchObject({ x: 0, y: 0, width: 25, height: 24 });
		expect(boundedRect({ x: -20, y: 110, width: 30, height: 40 },100,100)).toEqual({ x: 0, y: 60, width: 30, height: 40 });
	});
	it('overwrites every source channel beneath manual and overlapping covers without changing outside pixels', () => {
		const source = new Uint8ClampedArray(8*8*4).map((_,i) => i%251);
		const regions = [{ x: 1.2,y: 1.2,width: 2,height: 2 }, { x: 3,y: 3,width: 2,height: 2 }];
		const result = coverPixels(source,8,8,regions);
		for(let y=0;y<8;y++) for(let x=0;x<8;x++) {
			const covered = (x>=1&&x<4&&y>=1&&y<4)||(x>=3&&x<5&&y>=3&&y<5);
			const offset = (y*8+x)*4;
			expect([...result.slice(offset,offset+4)]).toEqual(covered ? [247,212,112,255] : [...source.slice(offset,offset+4)]);
		}
		expect(result).not.toBe(source);
		expect(() => coverPixels(source,8,8,[{ x: NaN,y:0,width:2,height:2 }])).toThrow();
	});
});
