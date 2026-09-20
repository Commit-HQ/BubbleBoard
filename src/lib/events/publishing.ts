import type { PreparedPhoto } from './package';
export type EventDraft = {
	id: string;
	key: CryptoKey;
	envelope: string;
	catalog: number;
	consent: number;
	classroom: string;
	files: PreparedPhoto[];
};
