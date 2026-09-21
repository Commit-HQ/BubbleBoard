// The order a family's device opens an event's photos in. Each one is decrypted and put together here
// (package.ts), which costs a request and a moment of work, so they come one after another rather than all at
// once, and the one being looked at comes first.

/**
 * Which photo to open next: the one nearest the photo the family is looking at that is still waiting, the
 * one after it before the one before it, or -1 when none is left. A gallery opened at the first photo is
 * simply opened in order.
 */
export function nextWaiting(waiting: readonly boolean[], from: number) {
	const start = Math.max(0, Math.min(waiting.length - 1, from));
	for (let step = 0; step < waiting.length; step++)
		for (const at of step ? [start + step, start - step] : [start])
			if (at >= 0 && at < waiting.length && waiting[at]) return at;
	return -1;
}
