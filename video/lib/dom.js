// Building blocks for the stage: elements, styles, and text split into pieces that can move on their own.

const SVG = 'http://www.w3.org/2000/svg';

function build(node, attrs, children) {
	for (const [key, value] of Object.entries(attrs ?? {})) {
		if (value === undefined || value === null || value === false) continue;
		if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
		else if (key === 'text') node.textContent = value;
		else if (key === 'html') node.innerHTML = value;
		else node.setAttribute(key, value === true ? '' : value);
	}
	for (const child of children.flat()) {
		if (child === undefined || child === null || child === false) continue;
		node.append(typeof child === 'string' ? document.createTextNode(child) : child);
	}
	return node;
}

/** An HTML element: `el('div', { class: 'card', style: { left: '4px' } }, child, 'text')`. */
export const el = (tag, attrs, ...children) => build(document.createElement(tag), attrs, children);

/** An SVG element, the same way. */
export const svg = (tag, attrs, ...children) =>
	build(document.createElementNS(SVG, tag), attrs, children);

/** Sets several style properties at once; numbers become pixels where CSS needs a unit. */
const unitless = new Set(['opacity', 'zIndex', 'fontWeight', 'flexGrow', 'lineHeight', 'scale']);
export function css(node, styles) {
	for (const [key, value] of Object.entries(styles)) {
		if (key.startsWith('--')) node.style.setProperty(key, value);
		else node.style[key] = typeof value === 'number' && !unitless.has(key) ? `${value}px` : value;
	}
	return node;
}

/** A transform string from the common parts, in the order that reads naturally: move, turn, then size. */
export function transform({
	x = 0,
	y = 0,
	z = 0,
	rotate = 0,
	rotateX = 0,
	rotateY = 0,
	scale = 1,
	scaleX = 1,
	scaleY = 1,
	perspective = 0,
	skewX = 0
}) {
	let out = perspective ? `perspective(${perspective}px) ` : '';
	out += `translate3d(${x}px, ${y}px, ${z}px)`;
	if (rotateX) out += ` rotateX(${rotateX}deg)`;
	if (rotateY) out += ` rotateY(${rotateY}deg)`;
	if (rotate) out += ` rotate(${rotate}deg)`;
	if (skewX) out += ` skewX(${skewX}deg)`;
	if (scale !== 1 || scaleX !== 1 || scaleY !== 1)
		out += ` scale(${scale * scaleX}, ${scale * scaleY})`;
	return out;
}

/** Places a node: its transform, plus opacity and blur when given. */
export function place(node, { opacity, blur, ...parts }) {
	node.style.transform = transform(parts);
	if (opacity !== undefined) node.style.opacity = Math.max(0, Math.min(1, opacity));
	if (blur !== undefined) node.style.filter = blur > 0.05 ? `blur(${blur}px)` : 'none';
	return node;
}

/**
 * Fills `node` with `text`, one span per word, each in a mask that clips it, and one span per character
 * inside. Words keep their kerning when only words move; characters lose a little of it between them.
 * Returns the words, each with its mask, its inner span, and its characters.
 */
export function words(node, text, { chars = false } = {}) {
	node.textContent = '';
	const parts = text.split(' ');
	return parts.map((word, index) => {
		const inner = el('span', { class: 'word-inner' });
		const letters = [];
		if (chars) {
			for (const ch of word) {
				const span = el('span', { class: 'char' }, ch);
				inner.append(span);
				letters.push(span);
			}
		} else inner.textContent = word;
		const mask = el('span', { class: 'word-mask' }, inner);
		node.append(mask);
		if (index < parts.length - 1) node.append(' ');
		return { mask, inner, chars: letters, text: word };
	});
}

/** Characters only, without masks, for effects that change each character. */
export function letters(node, text) {
	node.textContent = '';
	return [...text].map((ch) => {
		const span = el('span', { class: ch === ' ' ? 'char space' : 'char' }, ch === ' ' ? ' ' : ch);
		node.append(span);
		return span;
	});
}

/**
 * Paints one gradient across a run of separately moving spans, as if the text were one piece: each span
 * shows the slice of the gradient under its place in `container`. Call once laid out.
 */
export function shareGradient(spans, container, gradient) {
	// Letters show only inside their word's box, which is a line tall, so each box reaches past its line for
	// the descenders and accents that stand out of it, while it moves by its line's height as before.
	for (const span of spans)
		css(span, { padding: '0.2em 0', margin: '-0.2em 0', transformBox: 'content-box' });
	const box = container.getBoundingClientRect();
	for (const span of spans) {
		const rect = span.getBoundingClientRect();
		const reach = parseFloat(getComputedStyle(span).paddingTop);
		css(span, {
			backgroundImage: gradient,
			backgroundSize: `${box.width}px ${box.height + 2 * reach}px`,
			backgroundPosition: `${box.left - rect.left}px ${box.top - reach - rect.top}px`,
			backgroundClip: 'text',
			webkitBackgroundClip: 'text',
			color: 'transparent'
		});
	}
}

/** Waits for every image under `root` to be decoded, so no frame catches one half loaded. */
export async function decoded(root) {
	const images = [...root.querySelectorAll('img')];
	await Promise.all(
		images.map((img) =>
			img.decode().catch(() => {
				throw new Error(`Couldn't load ${img.src}`);
			})
		)
	);
}
