// What a push says happened. The words themselves live in the service worker, which knows the language
// notifications were turned on in; a push carries one letter and nothing else, so it never says which
// notice, whose message, or which child. Every letter is one byte, so every push is the same size and its
// length gives nothing away either. This file stays free of imports: the Worker bundles it for the queue
// handler, and the service worker takes it without the rest of the app.

export const pushKinds = ['notice', 'message', 'slots', 'booking', 'photos'] as const;
export type PushKind = (typeof pushKinds)[number];

/** The letter that goes over the wire. Each kind starts with a different one. */
export const pushCode = (kind: PushKind) => kind[0];

/** What a device received, or a notice: an empty push, or anything unreadable, says the least. */
export function pushKind(code: string | undefined): PushKind {
	return pushKinds.find((kind) => pushCode(kind) === code) ?? 'notice';
}
