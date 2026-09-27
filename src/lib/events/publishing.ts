import type { PreparedPhoto } from './package';
export type EventDraft = {
	id: string;
	key: CryptoKey;
	/** The key envelope its classroom opens it with. An event already up keeps the one it went up under. */
	envelope?: string;
	catalog: number;
	consent: number;
	classroom: string;
	/** The classroom's children whose face its other families see in these photos, as consent stood then. */
	shared: Set<string>;
	files: PreparedPhoto[];
};
