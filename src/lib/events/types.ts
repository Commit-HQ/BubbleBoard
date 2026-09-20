export type ConsentRow = {
	child: string;
	family: string;
	label: string;
	choice: string | null;
	revision: number;
};
export type ConsentSnapshot = { catalog: number; revision: number; rows: ConsentRow[] };
export type EventRecord = {
	id: string;
	classroom: string;
	teacher: string | null;
	content: string;
	eventKey: string;
	postedAt: number;
	expiresAt: number;
};
export type EventContent = {
	version: 1;
	title: string;
	date: string;
	description: string;
	photos: { id: string; width: number; height: number }[];
};
export type OpenEvent = EventRecord & { value: EventContent; key: CryptoKey };
export const maxEventFileBytes = 32 * 1024 * 1024;
