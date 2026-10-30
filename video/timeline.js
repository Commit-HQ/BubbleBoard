// The beat grid the picture and the score share. Every scene starts on a bar line, so cuts land on the
// music, and score.js arranges the tune from the same table.

export const bpm = 120;
export const beat = 60 / bpm;
export const bar = beat * 4;
export const fps = 60;
export const width = 1920;
export const height = 1080;

// [name, bars], in order: each scene starts where the one before it ends.
const plan = [
	['open', 4],
	['logo', 4],
	['board', 3],
	['qr', 2],
	['photos', 3],
	['messages', 2],
	['meetings', 2],
	['notify', 2],
	['locked', 4],
	['languages', 2],
	['values', 4],
	['finale', 4]
];

let at = 0;
/** Each scene's start and end, in seconds. */
export const scenes = plan.map(([name, bars]) => {
	const scene = { name, start: at * bar, end: (at + bars) * bar, bars, firstBar: at };
	at += bars;
	return scene;
});

export const duration = at * bar;
