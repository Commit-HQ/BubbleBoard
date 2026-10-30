// The reel's soundtrack, synthesized from nothing: a bright 120 BPM tune in F major on the same bar grid as
// the picture (timeline.js), and a sound for every cue the scenes asked for. No samples and no dependencies;
// everything is deterministic, so the same reel always gets the same score.
//
// The arrangement follows the scenes: a music-box intro under the cold open, the first drop on the pop, a
// darker turn while the message is locked, a build through the split-flap board, and the last drop on the
// refusals, resolving on the end card.

import fs from 'node:fs';
import { bar, beat, scenes } from './timeline.js';

const RATE = 48000;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------------------------------------
// Small DSP toolkit.

/** A seeded noise source, so every render of the score is identical. */
function noiseSource(seed) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
	};
}
const noise = noiseSource(2026);
const rnd = () => (noise() + 1) / 2;

const midi = (note) => 440 * 2 ** ((note - 69) / 12);
const seconds = (n) => Math.round(n * RATE);
const db = (value) => 10 ** (value / 20);

/** A biquad filter (RBJ cookbook) whose cutoff may change as it runs. */
class Biquad {
	constructor(type, freq, q = 0.707, gain = 0) {
		this.type = type;
		this.q = q;
		this.gain = gain;
		this.x1 = this.x2 = this.y1 = this.y2 = 0;
		this.set(freq);
	}
	set(freq) {
		const f = Math.min(Math.max(freq, 10), RATE * 0.45);
		const w = (TAU * f) / RATE;
		const cos = Math.cos(w);
		const alpha = Math.sin(w) / (2 * this.q);
		let b0, b1, b2, a0, a1, a2;
		if (this.type === 'lowpass') {
			b0 = (1 - cos) / 2;
			b1 = 1 - cos;
			b2 = (1 - cos) / 2;
			a0 = 1 + alpha;
			a1 = -2 * cos;
			a2 = 1 - alpha;
		} else if (this.type === 'highpass') {
			b0 = (1 + cos) / 2;
			b1 = -(1 + cos);
			b2 = (1 + cos) / 2;
			a0 = 1 + alpha;
			a1 = -2 * cos;
			a2 = 1 - alpha;
		} else if (this.type === 'bandpass') {
			b0 = alpha;
			b1 = 0;
			b2 = -alpha;
			a0 = 1 + alpha;
			a1 = -2 * cos;
			a2 = 1 - alpha;
		} else {
			// peaking
			const A = 10 ** (this.gain / 40);
			b0 = 1 + alpha * A;
			b1 = -2 * cos;
			b2 = 1 - alpha * A;
			a0 = 1 + alpha / A;
			a1 = -2 * cos;
			a2 = 1 - alpha / A;
		}
		this.b0 = b0 / a0;
		this.b1 = b1 / a0;
		this.b2 = b2 / a0;
		this.a1 = a1 / a0;
		this.a2 = a2 / a0;
	}
	run(x) {
		const y =
			this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
		this.x2 = this.x1;
		this.x1 = x;
		this.y2 = this.y1;
		this.y1 = y;
		return y;
	}
	/** Filters a whole buffer in place, with the cutoff from `sweep(progress)` when given. */
	process(buffer, sweep) {
		for (let i = 0; i < buffer.length; i++) {
			if (sweep && (i & 63) === 0) this.set(sweep(i / buffer.length));
			buffer[i] = this.run(buffer[i]);
		}
		return buffer;
	}
}

/** A band-limited sawtooth (polyBLEP). */
function sawAt(phase, inc) {
	let value = 2 * phase - 1;
	if (phase < inc) {
		const t = phase / inc;
		value -= t + t - t * t - 1;
	} else if (phase > 1 - inc) {
		const t = (phase - 1) / inc;
		value -= t * t + t + t + 1;
	}
	return value;
}

/** An envelope: quick attack, then exponential decay with the given time constant. */
const decay = (t, attack, tau) => (t < attack ? t / attack : Math.exp(-(t - attack) / tau));

// ---------------------------------------------------------------------------------------------------------
// Buses and mixing.

function stereo(length) {
	return { l: new Float32Array(length), r: new Float32Array(length) };
}

/** Adds a mono sound to a bus at `time` seconds, panned (−1 to 1) and sent to the effects. */
function mix(mixer, bus, time, sound, { gain = 1, pan = 0, verb = 0, echo = 0 } = {}) {
	if (sound.l) {
		mix(mixer, bus, time, sound.l, { gain, pan: -1, verb, echo });
		mix(mixer, bus, time, sound.r, { gain, pan: 1, verb, echo });
		return;
	}
	const start = seconds(time);
	const angle = ((pan + 1) * Math.PI) / 4;
	const gl = Math.cos(angle) * gain * Math.SQRT2;
	const gr = Math.sin(angle) * gain * Math.SQRT2;
	const target = mixer[bus];
	const end = Math.min(sound.length, target.l.length - start);
	for (let i = Math.max(0, -start); i < end; i++) {
		const s = sound[i];
		target.l[start + i] += s * gl;
		target.r[start + i] += s * gr;
		if (verb) {
			mixer.verb.l[start + i] += s * gl * verb;
			mixer.verb.r[start + i] += s * gr * verb;
		}
		if (echo) {
			mixer.echo.l[start + i] += s * gl * echo;
			mixer.echo.r[start + i] += s * gr * echo;
		}
	}
}

/** A stereo reverb after Freeverb: parallel damped combs, then allpasses, slightly different per side. */
function reverb(input, { room = 0.84, damp = 0.35 } = {}) {
	const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
	const allpasses = [556, 441, 341, 225];
	const scale = RATE / 44100;
	const side = (signal, spread) => {
		const out = new Float32Array(signal.length);
		const cs = combs.map((n) => ({
			buf: new Float32Array(Math.round((n + spread) * scale)),
			i: 0,
			store: 0
		}));
		const as = allpasses.map((n) => ({
			buf: new Float32Array(Math.round((n + spread) * scale)),
			i: 0
		}));
		for (let n = 0; n < signal.length; n++) {
			const x = signal[n] * 0.015;
			let sum = 0;
			for (const c of cs) {
				const y = c.buf[c.i];
				c.store = y * (1 - damp) + c.store * damp;
				c.buf[c.i] = x + c.store * room;
				c.i = (c.i + 1) % c.buf.length;
				sum += y;
			}
			for (const a of as) {
				const b = a.buf[a.i];
				const y = -sum + b;
				a.buf[a.i] = sum + b * 0.5;
				a.i = (a.i + 1) % a.buf.length;
				sum = y;
			}
			out[n] = sum;
		}
		return out;
	};
	return { l: side(input.l, 0), r: side(input.r, 23) };
}

/** A ping-pong echo, a dotted eighth apart, getting darker as it repeats. */
function echoes(input, { time = beat * 0.75, feedback = 0.38 } = {}) {
	const n = seconds(time);
	const l = new Float32Array(input.l.length);
	const r = new Float32Array(input.r.length);
	const toneL = new Biquad('lowpass', 3800);
	const toneR = new Biquad('lowpass', 3800);
	for (let i = 0; i < l.length; i++) {
		const fromL = i >= n ? l[i - n] : 0;
		const fromR = i >= n ? r[i - n] : 0;
		l[i] = toneL.run(input.r[i] + fromR * feedback);
		r[i] = toneR.run(input.l[i] + fromL * feedback);
	}
	return { l, r };
}

// ---------------------------------------------------------------------------------------------------------
// Instruments. Each returns a mono buffer.

function kick({ punch = 1, length = 0.42 } = {}) {
	const out = new Float32Array(seconds(length));
	let phase = 0;
	for (let i = 0; i < out.length; i++) {
		const t = i / RATE;
		const f = 50 + 110 * Math.exp(-t / 0.03) * punch;
		phase += f / RATE;
		const body = Math.sin(TAU * phase) * decay(t, 0.002, 0.15);
		const click = t < 0.004 ? noise() * (1 - t / 0.004) * 0.35 : 0;
		out[i] = Math.tanh((body + click) * 1.6) * 0.9;
	}
	return out;
}

function clap({ length = 0.35, tone = 1300 } = {}) {
	const out = new Float32Array(seconds(length));
	const band = new Biquad('bandpass', tone, 0.9);
	const air = new Biquad('highpass', 700);
	for (let i = 0; i < out.length; i++) {
		const t = i / RATE;
		let env = 0;
		for (let k = 0; k < 3; k++) {
			const s = t - k * 0.011;
			if (s >= 0) env = Math.max(env, Math.exp(-s / 0.006));
		}
		const s = t - 0.022;
		if (s >= 0) env = Math.max(env, Math.exp(-s / 0.075));
		out[i] = air.run(band.run(noise())) * env * 2.2;
	}
	return out;
}

function hat({ open = false, tone = 8000 } = {}) {
	const out = new Float32Array(seconds(open ? 0.32 : 0.07));
	const high = new Biquad('highpass', tone, 0.8);
	for (let i = 0; i < out.length; i++) {
		const t = i / RATE;
		out[i] = high.run(noise()) * decay(t, 0.001, open ? 0.09 : 0.018);
	}
	return out;
}

function shaker() {
	const out = new Float32Array(seconds(0.09));
	const band = new Biquad('bandpass', 6500, 1.2);
	for (let i = 0; i < out.length; i++) {
		const t = i / RATE;
		out[i] = band.run(noise()) * (t < 0.012 ? t / 0.012 : Math.exp(-(t - 0.012) / 0.025)) * 1.4;
	}
	return out;
}

function snare() {
	const out = new Float32Array(seconds(0.22));
	const band = new Biquad('bandpass', 2400, 0.7);
	let phase = 0;
	for (let i = 0; i < out.length; i++) {
		const t = i / RATE;
		phase += (190 + 60 * Math.exp(-t / 0.01)) / RATE;
		out[i] =
			band.run(noise()) * decay(t, 0.001, 0.05) * 1.2 +
			Math.sin(TAU * phase) * decay(t, 0.001, 0.04) * 0.5;
	}
	return out;
}

/** A marimba bar: three modes, the higher ones dying first, and a little mallet. */
function marimba(note, { length = 0.9, bright = 1 } = {}) {
	const f = midi(note);
	const out = new Float32Array(seconds(length));
	const modes = [
		[1, 1, 0.45],
		[3.93, 0.32 * bright, 0.09],
		[9.2, 0.1 * bright, 0.03]
	];
	for (let i = 0; i < out.length; i++) {
		const t = i / RATE;
		let s = 0;
		for (const [ratio, amp, tau] of modes) {
			if (f * ratio < RATE / 2.2) s += Math.sin(TAU * f * ratio * t) * amp * decay(t, 0.0015, tau);
		}
		if (t < 0.003) s += noise() * 0.12 * (1 - t / 0.003);
		out[i] = s * 0.8;
	}
	return out;
}

/** A celesta or music box: the modes of a struck steel bar. */
function bell(note, { length = 2.2, tau = 0.9 } = {}) {
	const f = midi(note);
	const out = new Float32Array(seconds(length));
	const modes = [
		[1, 1, tau],
		[2.756, 0.28, tau * 0.3],
		[5.404, 0.12, tau * 0.12],
		[8.933, 0.05, tau * 0.06]
	];
	for (let i = 0; i < out.length; i++) {
		const t = i / RATE;
		let s = 0;
		for (const [ratio, amp, k] of modes) {
			if (f * ratio < RATE / 2.2) s += Math.sin(TAU * f * ratio * t) * amp * decay(t, 0.001, k);
		}
		out[i] = s * 0.6;
	}
	return out;
}

/** A plucked string (Karplus–Strong), warm and short. */
function pluck(note, { length = 1.1, damping = 0.994 } = {}) {
	const f = midi(note);
	const n = Math.max(2, Math.round(RATE / f));
	const line = new Float32Array(n);
	const shape = new Biquad('lowpass', Math.min(9000, f * 9));
	for (let i = 0; i < n; i++) line[i] = shape.run(noise());
	const out = new Float32Array(seconds(length));
	let index = 0;
	for (let i = 0; i < out.length; i++) {
		const a = line[index];
		const b = line[(index + 1) % n];
		const value = (a + b) * 0.5 * damping;
		line[index] = value;
		index = (index + 1) % n;
		out[i] = a * 0.9;
	}
	return out;
}

/** The bass: a round sine with a little filtered saw on top for definition. */
function bassNote(note, length, { bite = 0.35 } = {}) {
	const f = midi(note);
	const out = new Float32Array(seconds(length + 0.05));
	const tone = new Biquad('lowpass', 520, 0.9);
	let phase = 0;
	for (let i = 0; i < out.length; i++) {
		const t = i / RATE;
		phase = (phase + f / RATE) % 1;
		const env =
			t < 0.004
				? t / 0.004
				: t < length
					? 0.65 + 0.35 * Math.exp(-(t - 0.004) / 0.12)
					: 0.65 * Math.exp(-(t - length) / 0.015);
		const saw = tone.run(sawAt(phase, f / RATE));
		out[i] = (Math.sin(TAU * phase) * 0.9 + saw * bite) * env;
	}
	return out;
}

/** A warm pad chord: three detuned saws per note through a low-pass, slow to swell and fade. */
function padChord(notes, length, { cutoff = 1500, attack = 0.35, release = 0.7, sweep } = {}) {
	const total = seconds(length + release);
	// Each side gets the centre voice and a voice detuned its own way, which spreads the chord wide.
	const sides = [
		[-0.11, 0],
		[0, 0.11]
	].map((detunes) => {
		const out = new Float32Array(total);
		for (const note of notes) {
			for (const detune of detunes) {
				const f = midi(note + detune);
				let phase = rnd();
				for (let i = 0; i < total; i++) {
					phase += f / RATE;
					if (phase >= 1) phase -= 1;
					out[i] += sawAt(phase, f / RATE);
				}
			}
		}
		const lp = new Biquad('lowpass', cutoff, 0.6);
		const lp2 = new Biquad('lowpass', cutoff, 0.6);
		const hp = new Biquad('highpass', 140);
		for (let i = 0; i < total; i++) {
			const t = i / RATE;
			if (sweep && (i & 63) === 0) {
				const c = sweep(Math.min(1, t / length));
				lp.set(c);
				lp2.set(c);
			}
			const env =
				t < attack ? (t / attack) ** 2 : t < length ? 1 : Math.exp(-(t - length) / (release / 3));
			out[i] = hp.run(lp2.run(lp.run(out[i]))) * env * 0.075;
		}
		return out;
	});
	return { l: sides[0], r: sides[1] };
}

/** A soft saw arpeggio voice for the dark stretch. */
function synthBlip(note, { length = 0.16, cutoff = 1400 } = {}) {
	const f = midi(note);
	const out = new Float32Array(seconds(length));
	const lp = new Biquad('lowpass', cutoff, 2.5);
	let phase = 0;
	for (let i = 0; i < out.length; i++) {
		const t = i / RATE;
		phase = (phase + f / RATE) % 1;
		lp.set(cutoff * (0.4 + 2.2 * Math.exp(-t / 0.04)));
		out[i] = lp.run(sawAt(phase, f / RATE)) * decay(t, 0.003, 0.07) * 0.5;
	}
	return out;
}

/** A short chord stab for the slams. */
function stab(notes, { length = 0.5 } = {}) {
	const out = new Float32Array(seconds(length));
	for (const note of notes) {
		for (const detune of [-0.08, 0.08]) {
			const f = midi(note + detune);
			let phase = rnd();
			for (let i = 0; i < out.length; i++) {
				phase = (phase + f / RATE) % 1;
				out[i] += sawAt(phase, f / RATE);
			}
		}
	}
	const lp = new Biquad('lowpass', 3000, 0.8);
	for (let i = 0; i < out.length; i++) {
		const t = i / RATE;
		lp.set(600 + 4200 * Math.exp(-t / 0.06));
		out[i] = lp.run(out[i]) * decay(t, 0.002, 0.14) * 0.09;
	}
	return out;
}

// ---------------------------------------------------------------------------------------------------------
// Sound effects, one per kind of cue.

function chirp(from, to, length, { tau = length / 3, shape = 'exp' } = {}) {
	const out = new Float32Array(seconds(length));
	let phase = 0;
	for (let i = 0; i < out.length; i++) {
		const t = i / RATE;
		const p = t / length;
		const f = shape === 'exp' ? from * (to / from) ** p : from + (to - from) * p;
		phase += f / RATE;
		out[i] = Math.sin(TAU * phase) * decay(t, 0.003, tau);
	}
	return out;
}

/** Noise through a band that sweeps from one frequency to another, swelling and fading. */
function sweepNoise(length, from, to, { q = 1.2, swell = 0.5, curve = 1 } = {}) {
	const out = new Float32Array(seconds(length));
	const band = new Biquad('bandpass', from, q);
	for (let i = 0; i < out.length; i++) {
		const p = i / out.length;
		if ((i & 31) === 0) band.set(from * (to / from) ** p);
		const env = p < swell ? (p / swell) ** curve : ((1 - p) / (1 - swell)) ** 1.5;
		out[i] = band.run(noise()) * env * 2.5;
	}
	return out;
}

function clicks(length, rate, { tone = 3000, q = 3, size = 0.003, fade = true } = {}) {
	const out = new Float32Array(seconds(length));
	const band = new Biquad('bandpass', tone, q);
	let next = 0;
	const raw = new Float32Array(out.length);
	while (next < length) {
		const at = seconds(next);
		const n = seconds(size);
		const amp = (fade ? 1 - (next / length) * 0.6 : 1) * (0.6 + rnd() * 0.4);
		for (let i = 0; i < n && at + i < raw.length; i++) raw[at + i] += noise() * amp * (1 - i / n);
		next += (1 / rate) * (0.4 + rnd() * 1.2);
	}
	for (let i = 0; i < out.length; i++) out[i] = band.run(raw[i]) * 2;
	return out;
}

const F5 = 77;
const pentatonic = [0, 2, 4, 7, 9];

/** The sound of each cue, with where it sits in the mix. */
const effects = {
	bloop: ({ pitch = 1 }) => [
		chirp(260 * pitch, 720 * pitch, 0.16, { tau: 0.05 }),
		{ gain: 0.32, verb: 0.25 }
	],
	blip: ({ count = 3, spacing = 0.06, pitch = 1 }) => {
		const out = new Float32Array(seconds(count * spacing + 0.1));
		for (let k = 0; k < count; k++) {
			const b = chirp(1400 * pitch * (1 + k * 0.03), 1500 * pitch * (1 + k * 0.03), 0.04, {
				tau: 0.012
			});
			const at = seconds(k * spacing);
			for (let i = 0; i < b.length; i++) out[at + i] += b[i] * (1 - (k / count) * 0.4);
		}
		return [out, { gain: 0.1, verb: 0.2, echo: 0.1 }];
	},
	pop: ({ pitch = 1 }) => {
		const tone = bell(F5 + 12 * Math.log2(pitch), { length: 0.5, tau: 0.16 });
		const snap = chirp(500 * pitch, 1700 * pitch, 0.035, { tau: 0.01 });
		for (let i = 0; i < snap.length; i++) tone[i] += snap[i] * 0.8;
		return [tone, { gain: 0.3, verb: 0.3, echo: 0.12, pan: (rnd() - 0.5) * 0.6 }];
	},
	popBig: () => {
		const out = new Float32Array(seconds(1.2));
		const snap = chirp(180, 1400, 0.06, { tau: 0.02 });
		const sub = chirp(70, 38, 0.6, { tau: 0.22 });
		const air = sweepNoise(0.5, 4000, 900, { swell: 0.02, q: 0.6 });
		for (let i = 0; i < out.length; i++) {
			out[i] = (snap[i] ?? 0) * 0.9 + (sub[i] ?? 0) * 0.9 + (air[i] ?? 0) * 0.25;
		}
		return [out, { gain: 0.75, verb: 0.45 }];
	},
	impact: ({ soft = false }) => {
		const sub = chirp(90, 34, 1.0, { tau: 0.35 });
		const hit = sweepNoise(0.6, 2400, 300, { swell: 0.01, q: 0.5 });
		for (let i = 0; i < hit.length; i++) sub[i] += hit[i] * 0.4;
		return [sub, { gain: soft ? 0.35 : 0.7, verb: 0.5 }];
	},
	whoosh: ({ length = 0.6 }) => [
		sweepNoise(length, 300, 3200, { swell: 0.6, curve: 1.6 }),
		{ gain: 0.22, verb: 0.3, pan: -0.3 }
	],
	swish: () => [sweepNoise(0.25, 1200, 5000, { swell: 0.4 }), { gain: 0.16, verb: 0.15, pan: 0.3 }],
	whip: ({ length = 0.7 }) => [
		sweepNoise(length, 400, 6000, { swell: 0.55, curve: 2.2, q: 0.9 }),
		{ gain: 0.3, verb: 0.2 }
	],
	suck: ({ length = 1 }) => {
		const out = sweepNoise(length, 400, 4000, { swell: 0.97, curve: 2.5, q: 1 });
		const tone = chirp(200, 900, length, { tau: 10 });
		for (let i = 0; i < out.length; i++) out[i] += tone[i] * (i / out.length) ** 3 * 0.25;
		return [out, { gain: 0.24, verb: 0.3 }];
	},
	riser: ({ length = 2 }) => {
		const out = sweepNoise(length, 500, 9000, { swell: 0.995, curve: 2.2, q: 0.7 });
		const tone = new Float32Array(out.length);
		let phase = 0;
		for (let i = 0; i < tone.length; i++) {
			const p = i / tone.length;
			const f = midi(53) * 2 ** (p * 2);
			phase = (phase + f / RATE) % 1;
			tone[i] = sawAt(phase, f / RATE) * p ** 2.5 * 0.06;
		}
		const lp = new Biquad('lowpass', 2000);
		for (let i = 0; i < out.length; i++) out[i] = out[i] * 0.6 + lp.run(tone[i]);
		return [out, { gain: 0.22, verb: 0.35 }];
	},
	shimmer: () => {
		const out = new Float32Array(seconds(2));
		[0, 2, 4, 7, 9, 12].forEach((step, k) => {
			const b = bell(F5 + 12 + step, { length: 1.4, tau: 0.5 });
			const at = seconds(k * 0.045);
			for (let i = 0; i < b.length && at + i < out.length; i++) out[at + i] += b[i] * (1 - k * 0.1);
		});
		return [out, { gain: 0.12, verb: 0.4, echo: 0.25 }];
	},
	sparkle: () => {
		const out = new Float32Array(seconds(1.6));
		for (let k = 0; k < 5; k++) {
			const b = bell(F5 + 24 + pentatonic[Math.floor(rnd() * 5)], { length: 1, tau: 0.3 });
			const at = seconds(k * 0.07 + rnd() * 0.03);
			for (let i = 0; i < b.length && at + i < out.length; i++) out[at + i] += b[i];
		}
		return [out, { gain: 0.07, verb: 0.4, echo: 0.3 }];
	},
	paper: ({ pitch = 1 }) => {
		const out = new Float32Array(seconds(0.2));
		const lp = new Biquad('lowpass', 1400 * pitch);
		const thump = chirp(140 * pitch, 70, 0.12, { tau: 0.03 });
		for (let i = 0; i < out.length; i++)
			out[i] = lp.run(noise()) * decay(i / RATE, 0.002, 0.03) * 1.4 + (thump[i] ?? 0) * 0.6;
		return [out, { gain: 0.3, verb: 0.15 }];
	},
	pin: ({ pitch = 1 }) => {
		const out = chirp(3200 * pitch, 3000 * pitch, 0.08, { tau: 0.02 });
		const hp = new Biquad('highpass', 2000);
		for (let i = 0; i < 200; i++) out[i] += hp.run(noise()) * (1 - i / 200);
		return [out, { gain: 0.12, verb: 0.2, pan: 0.25 }];
	},
	thud: () => [chirp(110, 48, 0.25, { tau: 0.07 }), { gain: 0.45 }],
	fill: ({ length = 0.9 }) => [
		chirp(400, 900, length, { tau: length * 0.6, shape: 'lin' }),
		{ gain: 0.05, verb: 0.3 }
	],
	tick: ({ pitch = 1 }) => [
		chirp(2000 * pitch, 2100 * pitch, 0.025, { tau: 0.007 }),
		{ gain: 0.08, verb: 0.1 }
	],
	snap: () => {
		const out = new Float32Array(seconds(0.15));
		[0, 0.045].forEach((at) => {
			const c = chirp(1800, 1700, 0.05, { tau: 0.01 });
			const hp = new Biquad('highpass', 1500);
			const s = seconds(at);
			for (let i = 0; i < c.length; i++)
				out[s + i] += c[i] * 0.6 + (i < 150 ? hp.run(noise()) * (1 - i / 150) : 0);
		});
		return [out, { gain: 0.22, verb: 0.15 }];
	},
	scan: ({ length = 0.6 }) => {
		const out = chirp(900, 1500, length, { tau: 10, shape: 'lin' });
		for (let i = 0; i < out.length; i++) {
			const t = i / RATE;
			out[i] *= (0.5 + 0.5 * Math.sin(TAU * 18 * t)) * Math.sin((Math.PI * i) / out.length);
		}
		return [out, { gain: 0.06, verb: 0.2 }];
	},
	success: () => {
		const out = new Float32Array(seconds(1.4));
		[
			[F5 + 7, 0],
			[F5 + 12, 0.09]
		].forEach(([note, at]) => {
			const b = bell(note, { length: 1.2, tau: 0.45 });
			const s = seconds(at);
			for (let i = 0; i < b.length && s + i < out.length; i++) out[s + i] += b[i];
		});
		return [out, { gain: 0.2, verb: 0.35, echo: 0.2 }];
	},
	type: ({ length = 0.6 }) => [
		clicks(length, 16, { tone: 2600, q: 2, size: 0.004, fade: false }),
		{ gain: 0.16, verb: 0.08, pan: -0.15 }
	],
	send: () => {
		const out = chirp(500, 1500, 0.18, { tau: 0.08 });
		const w = sweepNoise(0.18, 1500, 5000, { swell: 0.3 });
		for (let i = 0; i < out.length; i++) out[i] = out[i] * 0.5 + w[i] * 0.3;
		return [out, { gain: 0.2, verb: 0.2 }];
	},
	receive: () => {
		const out = new Float32Array(seconds(1));
		[
			[F5 + 4, 0],
			[F5 + 7, 0.08]
		].forEach(([note, at]) => {
			const m = marimba(note + 12, { length: 0.8 });
			const s = seconds(at);
			for (let i = 0; i < m.length && s + i < out.length; i++) out[s + i] += m[i];
		});
		return [out, { gain: 0.2, verb: 0.3, echo: 0.15 }];
	},
	flip: () => [sweepNoise(0.16, 3000, 900, { swell: 0.2, q: 1.5 }), { gain: 0.18, verb: 0.15 }],
	tap: () => {
		const out = chirp(220, 120, 0.05, { tau: 0.012 });
		for (let i = 0; i < 100; i++) out[i] += noise() * 0.3 * (1 - i / 100);
		return [out, { gain: 0.3 }];
	},
	bubbles: () => {
		const out = new Float32Array(seconds(1));
		for (let k = 0; k < 5; k++) {
			const p = 0.8 + rnd() * 0.9;
			const b = chirp(300 * p, 900 * p, 0.12, { tau: 0.035 });
			const s = seconds(k * 0.11 + rnd() * 0.04);
			for (let i = 0; i < b.length && s + i < out.length; i++) out[s + i] += b[i] * 0.7;
		}
		return [out, { gain: 0.22, verb: 0.3 }];
	},
	wake: () => [chirp(420, 640, 0.3, { tau: 0.12 }), { gain: 0.06, verb: 0.3 }],
	chime: ({ pitch = 1 }) => {
		const out = new Float32Array(seconds(1.6));
		const base = F5 + 12 + 12 * Math.log2(pitch);
		[
			[base, 0],
			[base + 7, 0.11]
		].forEach(([note, at]) => {
			const b = bell(note, { length: 1.4, tau: 0.55 });
			const s = seconds(at);
			for (let i = 0; i < b.length && s + i < out.length; i++) out[s + i] += b[i];
		});
		return [out, { gain: 0.16, verb: 0.35, echo: 0.2 }];
	},
	lockscreen: () => {
		const out = chirp(160, 90, 0.08, { tau: 0.02 });
		for (let i = 0; i < 120; i++) out[i] += noise() * 0.4 * (1 - i / 120);
		return [out, { gain: 0.25 }];
	},
	hum: ({ length = 7 }) => {
		const out = new Float32Array(seconds(length));
		for (let i = 0; i < out.length; i++) {
			const t = i / RATE;
			const env = Math.min(1, t / 1.2, (length - t) / 1.2);
			out[i] =
				(Math.sin(TAU * 55 * t) * 0.7 +
					Math.sin(TAU * 110 * t) * 0.25 +
					Math.sin(TAU * 165.4 * t) * 0.08) *
				env *
				(0.85 + 0.15 * Math.sin(TAU * 0.5 * t));
		}
		return [out, { gain: 0.07 }];
	},
	lock: () => {
		const out = new Float32Array(seconds(0.3));
		const thunk = chirp(260, 120, 0.12, { tau: 0.03 });
		const metal = chirp(2600, 2500, 0.1, { tau: 0.02 });
		for (let i = 0; i < thunk.length; i++) out[i] += thunk[i] * 0.6;
		const s = seconds(0.035);
		for (let i = 0; i < metal.length; i++) out[s + i] += metal[i] * 0.4;
		return [out, { gain: 0.35, verb: 0.25 }];
	},
	unlock: () => {
		const out = new Float32Array(seconds(0.6));
		const metal = chirp(2500, 2600, 0.1, { tau: 0.02 });
		const ping = bell(F5 + 12, { length: 0.5, tau: 0.2 });
		for (let i = 0; i < metal.length; i++) out[i] += metal[i] * 0.4;
		const s = seconds(0.05);
		for (let i = 0; i < ping.length && s + i < out.length; i++) out[s + i] += ping[i] * 0.6;
		return [out, { gain: 0.25, verb: 0.3 }];
	},
	data: ({ length = 2.5 }) => {
		const out = new Float32Array(seconds(length));
		let at = 0;
		while (at < length - 0.03) {
			const f = 900 + rnd() * 2400;
			const n = seconds(0.008 + rnd() * 0.012);
			const s = seconds(at);
			let phase = 0;
			for (let i = 0; i < n && s + i < out.length; i++) {
				phase = (phase + f / RATE) % 1;
				out[s + i] += (phase < 0.5 ? 1 : -1) * 0.25 * (1 - i / n);
			}
			at += 0.025 + rnd() * 0.04;
		}
		const lp = new Biquad('lowpass', 5000);
		lp.process(out);
		const fade = Math.min(out.length, seconds(0.3));
		for (let i = 0; i < fade; i++) {
			out[i] *= i / fade;
			out[out.length - 1 - i] *= i / fade;
		}
		return [out, { gain: 0.09, verb: 0.2, echo: 0.2 }];
	},
	denied: () => {
		const out = new Float32Array(seconds(0.6));
		[
			[64, 0],
			[60, 0.16]
		].forEach(([note, at]) => {
			const f = midi(note - 12);
			const s = seconds(at);
			const lp = new Biquad('lowpass', 1200);
			let phase = 0;
			for (let i = 0; i < seconds(0.18); i++) {
				phase = (phase + f / RATE) % 1;
				out[s + i] += lp.run(phase < 0.5 ? 0.6 : -0.6) * decay(i / RATE, 0.004, 0.08);
			}
		});
		return [out, { gain: 0.28, verb: 0.2 }];
	},
	flapwave: ({ length = 0.8 }) => [
		clicks(length, 70, { tone: 2200, q: 2.5 }),
		{ gain: 0.1, verb: 0.15 }
	],
	flap: ({ length = 1.2 }) => [
		clicks(length, 110, { tone: 3200, q: 3 }),
		{ gain: 0.12, verb: 0.12, pan: 0.1 }
	],
	stamp: ({ pitch = 1, soft = false }) => {
		const out = new Float32Array(seconds(0.7));
		const body = chirp(130 * pitch, 42, 0.45, { tau: 0.14 });
		const crack = clap({ length: 0.3, tone: 1600 * pitch });
		for (let i = 0; i < out.length; i++) out[i] = (body[i] ?? 0) * 0.9 + (crack[i] ?? 0) * 0.35;
		return [out, { gain: soft ? 0.3 : 0.55, verb: 0.3 }];
	},
	peel: () => {
		const out = sweepNoise(0.3, 1200, 9000, { swell: 0.7, curve: 1.4, q: 2 });
		return [out, { gain: 0.16, verb: 0.2, pan: 0.2 }];
	}
};

// ---------------------------------------------------------------------------------------------------------
// The tune.

// Chords for the pad and the bass's roots, by name.
const chords = {
	F: { pad: [53, 60, 64, 69], root: 41 },
	CE: { pad: [52, 60, 64, 67], root: 40 },
	Dm7: { pad: [50, 57, 60, 65], root: 38 },
	Bb: { pad: [46, 57, 62, 65], root: 34 },
	C: { pad: [48, 55, 64, 67], root: 36 },
	Dm9: { pad: [50, 53, 57, 64], root: 38 },
	Bb9: { pad: [46, 53, 57, 60], root: 34 },
	Gm9: { pad: [43, 50, 53, 57], root: 31 },
	C9: { pad: [48, 53, 58, 62], root: 36 },
	Fadd9: { pad: [53, 60, 67, 69, 72], root: 41 }
};
const loop = ['F', 'CE', 'Dm7', 'Bb'];

// The hook, in eighths, for the main loop and for the last drop.
const hookA = [
	[72, null, 69, 72, 77, null, 76, 72],
	[76, null, 74, 72, 67, null, null, null],
	[69, null, 72, 74, 77, null, 76, 74],
	[74, null, 72, 69, 72, null, null, null]
];
const hookB = [
	[81, null, 77, 81, 84, null, 81, 77],
	[79, null, 77, 74, 77, null, 74, 72],
	[72, 77, 81, 84, null, 81, 79, 77],
	[76, null, 79, 76, 72, null, 74, 76]
];

/** What plays in each bar: its chord, and how busy each part is. */
function arrangement() {
	const plan = [];
	const at = (name) => scenes.find((s) => s.name === name).firstBar;
	for (let b = 0; b < 36; b++) {
		const bar = { chord: loop[b % 4], drums: 0, bass: 0, hook: null, arp: 0, music: 1, dark: 0 };
		if (b < at('logo')) bar.intro = true;
		else if (b < at('locked')) {
			bar.drums = 2;
			bar.bass = 1;
			bar.arp = 1;
			if (b < at('logo') + 4) {
				bar.drums = 3;
				bar.hook = hookA[b % 4];
				bar.arp = 0;
			}
			if (b >= at('photos') && b < at('photos') + 2) bar.bells = hookA[b % 4];
			if (b >= at('messages') && b < at('notify')) bar.counter = true;
			if (b >= at('qr') && b < at('photos')) bar.dark = 1;
			if (b >= at('notify')) {
				bar.dark = 1;
				bar.drums = 1;
			}
		} else if (b < at('languages')) {
			bar.chord = ['Dm9', 'Bb9', 'Gm9', 'C9'][b - at('locked')];
			bar.breakdown = true;
			bar.dark = 2;
			if (b === at('languages') - 1) bar.build = true;
		} else if (b < at('values')) {
			bar.chord = ['Bb', 'C'][b - at('languages')];
			bar.drums = 1;
			bar.arp = 1;
			bar.build = true;
		} else if (b < at('finale')) {
			bar.chord = ['Dm7', 'Bb', 'F', 'C'][b - at('values')];
			bar.drums = 3;
			bar.bass = 2;
			bar.hook = hookB[b - at('values')];
			bar.arp = 1;
		} else if (b < at('finale') + 2) {
			bar.drums = 2;
			bar.bass = 1;
			bar.arp = 1;
		} else {
			bar.chord = 'Fadd9';
			bar.ending = true;
		}
		plan.push(bar);
	}
	return plan;
}

function compose(mixer, duration) {
	const plan = arrangement();
	const kicks = [];
	const endingBar = plan.findIndex((b) => b.ending);
	const finaleBar = scenes.find((s) => s.name === 'finale').firstBar;
	const gaps = [
		[
			scenes.find((s) => s.name === 'logo').start - beat,
			scenes.find((s) => s.name === 'logo').start
		],
		[
			scenes.find((s) => s.name === 'values').start - beat * 0.5,
			scenes.find((s) => s.name === 'values').start
		],
		[(finaleBar + 2) * bar - beat * 0.5, (finaleBar + 2) * bar]
	];
	const silent = (t) => gaps.some(([a, b]) => t >= a - 0.001 && t < b);

	plan.forEach((section, b) => {
		const start = b * bar;
		const chord = chords[section.chord];

		// Pad: every bar but the ending, which holds one long chord.
		if (section.ending) {
			if (b === endingBar)
				mix(
					mixer,
					'music',
					start,
					padChord(chord.pad, 3.6, { cutoff: 2600, attack: 0.05, release: 1.2 }),
					{
						gain: 1.1,
						verb: 0.5
					}
				);
		} else {
			const sweep = section.intro
				? (p) => 500 + (b / 4 + p / 4) ** 2 * 3500
				: section.breakdown
					? section.build
						? (p) => 900 + p * p * 5000
						: () => 900
					: undefined;
			const cutoff = section.dark === 1 ? 1400 : 2400;
			const length = bar - (silent(start + bar - 0.01) ? beat : 0);
			mix(mixer, 'pad', start, padChord(chord.pad, length, { cutoff, sweep }), {
				gain: section.intro ? 0.9 : 0.75,
				verb: 0.35
			});
		}

		// Intro: a music box climbing the chord, like bubbles rising.
		if (section.intro) {
			const tones = [
				...chord.pad.slice(-3).map((n) => n + 12),
				chord.pad[chord.pad.length - 1] + 17
			];
			tones.forEach((note, k) => {
				const t = start + k * beat * 0.5 + (k === 3 ? beat * 0.5 : 0);
				if (!silent(t))
					mix(mixer, 'music', t, bell(note, { length: 1.8, tau: 0.7 }), {
						gain: 0.16,
						verb: 0.45,
						echo: 0.3,
						pan: (k - 1.5) * 0.25
					});
			});
			if (b >= 2)
				for (let k = 0; k < 8; k++) {
					const t = start + k * beat * 0.5;
					if (!silent(t))
						mix(mixer, 'drums', t, shaker(), {
							gain: 0.1 * (0.6 + (k % 2) * 0.4) * (b - 1) * 0.5,
							pan: 0.3
						});
				}
		}

		// Drums.
		for (let k = 0; k < 16; k++) {
			const t = start + k * beat * 0.25;
			if (silent(t)) continue;
			const swing = k % 2 ? beat * 0.04 : 0;
			if (section.drums >= 1) {
				if (k % 4 === 0) {
					mix(mixer, 'drums', t, kick({ punch: section.drums >= 2 ? 1 : 0.7 }), {
						gain: section.drums >= 2 ? 0.85 : 0.6
					});
					kicks.push(t);
				}
				if (k % 4 === 2) mix(mixer, 'drums', t + swing, hat(), { gain: 0.12, pan: 0.25 });
			}
			if (section.drums >= 2) {
				if (k === 4 || k === 12) mix(mixer, 'drums', t, clap(), { gain: 0.42, verb: 0.25 });
				mix(mixer, 'drums', t + swing, shaker(), { gain: k % 2 ? 0.06 : 0.1, pan: -0.25 });
			}
			if (section.drums >= 3) {
				if (k % 4 === 2)
					mix(mixer, 'drums', t + swing, hat({ open: true }), { gain: 0.07, pan: 0.3 });
				if (k === 4 || k === 12) mix(mixer, 'drums', t, snare(), { gain: 0.18, verb: 0.2 });
			}
			if (section.breakdown && !section.build && (k === 0 || k === 6)) {
				mix(mixer, 'drums', t, kick({ punch: 0.5 }), { gain: 0.4 });
			}
		}
		if (section.build) {
			// A roll that tightens toward the bar line.
			for (let k = 0; k < 32; k++) {
				const p = k / 32;
				const step = p < 0.5 ? 4 : p < 0.75 ? 2 : 1;
				if (k % step) continue;
				const t = start + k * beat * 0.125;
				if (!silent(t)) mix(mixer, 'drums', t, snare(), { gain: 0.05 + p * 0.16, verb: 0.2 });
			}
			if (b < plan.length - 1 && plan[b + 1].build)
				for (let k = 0; k < 4; k++)
					mix(mixer, 'drums', start + k * beat, clap(), { gain: 0.25, verb: 0.3 });
		}

		// Bass: eighths on the root, with octave jumps when it's busy.
		if (section.bass) {
			const pattern = section.bass >= 2 ? [1, 1, 1, 1, 1, 1, 1, 1] : [1, 0, 1, 1, 0, 1, 1, 0];
			pattern.forEach((on, k) => {
				const t = start + k * beat * 0.5;
				if (!on || silent(t)) return;
				const note =
					chord.root +
					(section.bass >= 2 && k % 2 ? 12 : 0) +
					(k === 7 && section.bass < 2 ? 12 : 0);
				mix(mixer, 'bass', t, bassNote(note, beat * 0.42), { gain: 0.5 });
			});
		}
		if (section.breakdown) {
			mix(mixer, 'bass', start, bassNote(chord.root, bar - 0.05, { bite: 0.2 }), {
				gain: 0.32
			});
			// A soft arpeggio of the chord, like data going past.
			for (let k = 0; k < 16; k++) {
				const t = start + k * beat * 0.25;
				const note = chord.pad[k % chord.pad.length] + 12 + (k % 8 >= 4 ? 12 : 0);
				mix(mixer, 'music', t, synthBlip(note, { cutoff: section.build ? 1400 + k * 200 : 1200 }), {
					gain: 0.16,
					echo: 0.25,
					pan: k % 2 ? 0.35 : -0.35
				});
			}
		}
		if (section.ending && b === endingBar) {
			mix(mixer, 'bass', start, bassNote(chord.root, 3.2, { bite: 0.15 }), { gain: 0.45 });
			mix(mixer, 'drums', start, kick({ punch: 1.1, length: 0.8 }), { gain: 0.8 });
			[77, 81, 84, 89].forEach((note, k) =>
				mix(mixer, 'music', start + 0.6 + k * beat * 0.5, bell(note, { length: 2.4, tau: 0.9 }), {
					gain: 0.12,
					verb: 0.5,
					echo: 0.3,
					pan: (k - 1.5) * 0.3
				})
			);
		}

		// The hook on marimba, doubled by a pluck in the last drop.
		if (section.hook) {
			section.hook.forEach((note, k) => {
				const t = start + k * beat * 0.5;
				if (note === null || silent(t)) return;
				mix(mixer, 'music', t, marimba(note, { length: 1 }), {
					gain: 0.36,
					verb: 0.25,
					echo: 0.12,
					pan: -0.1
				});
				if (section.drums >= 3 && b >= scenes.find((s) => s.name === 'values').firstBar)
					mix(mixer, 'music', t, pluck(note - 12, { length: 0.8 }), {
						gain: 0.28,
						verb: 0.2,
						pan: 0.2
					});
			});
		}
		if (section.bells) {
			section.bells.forEach((note, k) => {
				const t = start + k * beat * 0.5;
				if (note !== null && !silent(t))
					mix(mixer, 'music', t, bell(note + 12, { length: 1.2, tau: 0.5 }), {
						gain: 0.1,
						verb: 0.35,
						echo: 0.25
					});
			});
		}

		// Sixteenth arpeggios on the marimba to keep it moving.
		if (section.arp) {
			const tones = chord.pad.map((n) => n + 12);
			const order = [0, 1, 2, 3, 2, 1, 2, 3];
			for (let k = 0; k < 16; k++) {
				const t = start + k * beat * 0.25;
				if (silent(t)) continue;
				const note = tones[order[k % 8] % tones.length];
				mix(
					mixer,
					'music',
					t + (k % 2 ? beat * 0.03 : 0),
					marimba(note, { length: 0.5, bright: 0.7 }),
					{
						gain: (section.hook ? 0.07 : 0.1) * (k % 4 === 0 ? 1 : 0.7),
						verb: 0.2,
						pan: k % 2 ? 0.35 : -0.35
					}
				);
			}
		}

		// A plucked counter-line in the middle of the reel.
		if (section.counter) {
			const line = [
				chord.pad[2] + 12,
				null,
				chord.pad[3] + 12,
				null,
				chord.pad[1] + 12,
				null,
				chord.pad[2] + 12,
				chord.pad[3] + 12
			];
			line.forEach((note, k) => {
				if (note !== null)
					mix(mixer, 'music', start + k * beat * 0.5, pluck(note, { length: 0.9 }), {
						gain: 0.2,
						verb: 0.25,
						echo: 0.2,
						pan: 0.3
					});
			});
		}
	});

	// The slams get a chord stab each.
	const values = scenes.find((s) => s.name === 'values');
	[
		['Dm7', 0],
		['Bb', 1],
		['C', 2]
	].forEach(([name, at]) =>
		mix(mixer, 'music', values.start + at, stab(chords[name].pad.map((n) => n + 12)), {
			gain: 0.9,
			verb: 0.3
		})
	);

	return { kicks, duration };
}

// ---------------------------------------------------------------------------------------------------------
// Mixing and mastering.

/** How much the pad and bass duck under each kick, as a gain curve. */
function sidechain(length, kicks, depth, release = 0.16) {
	const gain = new Float32Array(length).fill(1);
	for (const k of kicks) {
		const start = seconds(k);
		const n = seconds(release * 4);
		for (let i = 0; i < n && start + i < length; i++) {
			const t = i / RATE;
			const duck = t < 0.004 ? t / 0.004 : Math.exp(-(t - 0.004) / release);
			gain[start + i] = Math.min(gain[start + i], 1 - depth * duck);
		}
	}
	return gain;
}

/** Darkens the music while a scene is dark: a low-pass whose cutoff follows the picture. */
function darkness(t) {
	const at = (name) => scenes.find((s) => s.name === name);
	const ramp = (t0, t1, a, b) => a + (b - a) * Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
	if (t < at('logo').start) return ramp(0, at('logo').start, 1600, 9000);
	if (t >= at('qr').start && t < at('photos').start) return 4200;
	if (t >= at('notify').start && t < at('locked').start) return 5000;
	if (t >= at('locked').start && t < at('languages').start - bar) return 3000;
	if (t >= at('languages').start - bar && t < at('languages').start)
		return ramp(at('languages').start - bar, at('languages').start, 3000, 16000);
	return 18000;
}

function writeWav(file, l, r) {
	const frames = l.length;
	const data = Buffer.alloc(44 + frames * 4);
	data.write('RIFF', 0);
	data.writeUInt32LE(36 + frames * 4, 4);
	data.write('WAVE', 8);
	data.write('fmt ', 12);
	data.writeUInt32LE(16, 16);
	data.writeUInt16LE(1, 20);
	data.writeUInt16LE(2, 22);
	data.writeUInt32LE(RATE, 24);
	data.writeUInt32LE(RATE * 4, 28);
	data.writeUInt16LE(4, 32);
	data.writeUInt16LE(16, 34);
	data.write('data', 36);
	data.writeUInt32LE(frames * 4, 40);
	for (let i = 0; i < frames; i++) {
		const dither = (rnd() - rnd()) / 32768;
		data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, l[i] + dither)) * 32767), 44 + i * 4);
		data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r[i] + dither)) * 32767), 46 + i * 4);
	}
	fs.writeFileSync(file, data);
}

/** Synthesizes the score for a reel's cues and writes it to `file` as a 48 kHz WAV. */
export async function score({ cues, duration, file }) {
	const length = seconds(duration);
	const mixer = {
		music: stereo(length),
		pad: stereo(length),
		bass: stereo(length),
		drums: stereo(length),
		sfx: stereo(length),
		verb: stereo(length),
		echo: stereo(length)
	};
	const { kicks } = compose(mixer, duration);

	for (const cue of cues) {
		const make = effects[cue.type];
		if (!make) {
			console.warn(`score.js: no sound for a ${cue.type} cue`);
			continue;
		}
		const [sound, place] = make(cue);
		mix(mixer, 'sfx', cue.t, sound, place);
	}

	// Duck the pad and the bass under the kick, so the low end breathes with the beat.
	const duckPad = sidechain(length, kicks, 0.55);
	const duckBass = sidechain(length, kicks, 0.35, 0.09);
	for (let i = 0; i < length; i++) {
		mixer.pad.l[i] *= duckPad[i];
		mixer.pad.r[i] *= duckPad[i];
		mixer.bass.l[i] *= duckBass[i];
		mixer.bass.r[i] *= duckBass[i];
	}

	// The music bus, darkened with the picture.
	const music = stereo(length);
	const darkL = new Biquad('lowpass', 18000, 0.6);
	const darkR = new Biquad('lowpass', 18000, 0.6);
	for (let i = 0; i < length; i++) {
		if ((i & 127) === 0) {
			const c = darkness(i / RATE);
			darkL.set(c);
			darkR.set(c);
		}
		music.l[i] =
			darkL.run(mixer.music.l[i] + mixer.pad.l[i] + mixer.drums.l[i] * 0.85) + mixer.bass.l[i];
		music.r[i] =
			darkR.run(mixer.music.r[i] + mixer.pad.r[i] + mixer.drums.r[i] * 0.85) + mixer.bass.r[i];
	}

	const wet = reverb(mixer.verb);
	const delayed = echoes(mixer.echo);
	const l = new Float32Array(length);
	const r = new Float32Array(length);
	const lowL = new Biquad('highpass', 28);
	const lowR = new Biquad('highpass', 28);
	for (let i = 0; i < length; i++) {
		l[i] = lowL.run(music.l[i] * 0.9 + mixer.sfx.l[i] + wet.l[i] * 0.9 + delayed.l[i] * 0.5);
		r[i] = lowR.run(music.r[i] * 0.9 + mixer.sfx.r[i] + wet.r[i] * 0.9 + delayed.r[i] * 0.5);
	}

	// Bring the whole to a steady loudness, then catch the few peaks that are left with a limiter that looks a
	// little ahead, so nothing clips and nothing is squashed.
	const level = loudness(l, r);
	const makeup = db(-16.5) / level;
	const ahead = seconds(0.004);
	const ceiling = db(-1.2);
	const peaks = new Float32Array(length);
	for (let i = 0; i < length; i++) peaks[i] = Math.max(Math.abs(l[i]), Math.abs(r[i])) * makeup;
	// The loudest peak in the look-ahead window, for every sample, kept with a sliding maximum.
	const window = new Float32Array(length);
	const queue = new Int32Array(length);
	let head = 0;
	let tail = 0;
	for (let i = length - 1; i >= 0; i--) {
		while (tail > head && peaks[queue[tail - 1]] <= peaks[i]) tail--;
		queue[tail++] = i;
		while (queue[head] > i + ahead) head++;
		window[i] = peaks[queue[head]];
	}
	let gain = 1;
	const attack = 1 - Math.exp(-1 / (0.0015 * RATE));
	const release = 1 - Math.exp(-1 / (0.12 * RATE));
	for (let i = 0; i < length; i++) {
		const want = window[i] > ceiling ? ceiling / window[i] : 1;
		gain += (want - gain) * (want < gain ? attack : release);
		l[i] = Math.max(-ceiling, Math.min(ceiling, l[i] * makeup * gain));
		r[i] = Math.max(-ceiling, Math.min(ceiling, r[i] * makeup * gain));
	}
	// Fade the very end, after the last chord has rung.
	const fade = seconds(1.2);
	for (let i = 0; i < fade; i++) {
		const g = (i / fade) ** 1.5;
		l[length - 1 - i] *= g;
		r[length - 1 - i] *= g;
	}
	writeWav(file, l, r);
}

/**
 * The mix's level as an RMS over its louder half-second blocks, a plain stand-in for integrated loudness:
 * quiet stretches don't pull it down.
 */
function loudness(l, r) {
	const block = seconds(0.4);
	const levels = [];
	for (let i = 0; i + block <= l.length; i += block / 2) {
		let sum = 0;
		for (let k = i; k < i + block; k++) sum += l[k] * l[k] + r[k] * r[k];
		levels.push(sum / (block * 2));
	}
	const loudest = Math.max(...levels);
	const kept = levels.filter((v) => v > loudest * 0.01);
	return Math.sqrt(kept.reduce((a, b) => a + b, 0) / kept.length);
}
