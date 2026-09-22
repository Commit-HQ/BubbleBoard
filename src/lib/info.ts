import type { InfoPageRecord, NewInfoKey, StaffInfo } from '$lib/api';
import {
	createKey,
	decryptData,
	encryptData,
	envelopeSize,
	fields,
	rewrapKey,
	UnreadableError,
	unwrapKey,
	wrapping
} from '$lib/crypto';
import { CodedError } from '$lib/errors';
import type { NoticeFile } from '$lib/files';
import {
	maxNoticeBytes,
	papers,
	readDocument,
	readFiles,
	type NoticeDocument,
	type Paper
} from '$lib/notices';

// The kindergarten's info pages, as devices write and read them (docs/access-format.md): text on paper, with files,
// for everyone who uses the app, such as opening hours, meals, and contacts, in the order the head put them in. Every
// page is encrypted with the kindergarten's Info Key, made with its first page and kept for good, which the server
// keeps wrapped with the Staff Key, for staff, and with the Group Key of every classroom, for families; a classroom
// added later gets the key when it's added. A page's files are sealed as a notice's are (src/lib/files.ts).

/** What a page holds inside its envelope: text on its paper, as a notice's, and files. */
export type InfoPageContent = { paper: Paper; body: NoticeDocument; files?: NoticeFile[] };
/** A page as a device shows it, with when it was last saved. */
export type InfoPage = InfoPageContent & { id: string; editedAt: number };
/** The pages that opened on a device, in their order, and how many didn't. */
export type OpenedInfo = { pages: InfoPage[]; unreadable: number };

/** The most a page's content may take, in bytes of JSON, as a notice's, which the server also holds it to. */
export const maxInfoBytes = maxNoticeBytes;
/** The most pages a kindergarten keeps, which come with every device's records. The server holds it to this. */
export const maxInfoPages = 20;

function fail(): never {
	throw new UnreadableError();
}

async function seal(page: string, content: InfoPageContent, key: CryptoKey) {
	const sealed = await encryptData(content, key, { purpose: 'info-page', page });
	// Measured as the server measures it.
	if (envelopeSize(sealed)! > maxInfoBytes) throw new CodedError('info-too-long');
	return sealed;
}

/** Seals a page with the Info Key, which staff open from its copy for them. */
export async function sealInfoPage(
	page: string,
	content: InfoPageContent,
	staffKey: CryptoKey,
	infoKeyForStaff: string
) {
	const key = await unwrapKey(infoKeyForStaff, wrapping.infoKeyForStaff(staffKey));
	return { content: await seal(page, content, key) };
}

/** Seals the kindergarten's first page under a new Info Key, wrapped for staff and for each classroom. */
export async function sealFirstInfoPage(
	page: string,
	content: InfoPageContent,
	staffKey: CryptoKey,
	classrooms: { id: string; groupKey: CryptoKey }[]
) {
	const { key, envelopes } = await createKey([
		wrapping.infoKeyForStaff(staffKey),
		...classrooms.map(({ id, groupKey }) => wrapping.infoKeyForClassroom(groupKey, id))
	]);
	const [infoKeyForStaff, ...infoKeys] = envelopes;
	const newKey: NewInfoKey = {
		infoKeyForStaff,
		classrooms: classrooms.map(({ id }, index) => ({ classroom: id, infoKey: infoKeys[index] }))
	};
	return { content: await seal(page, content, key), key: newKey };
}

/** The Info Key wrapped with a new classroom's Group Key, from its copy for staff. */
export async function infoKeyForClassroom(
	staffKey: CryptoKey,
	infoKeyForStaff: string,
	classroom: { id: string; groupKey: CryptoKey }
) {
	const [infoKey] = await rewrapKey(infoKeyForStaff, wrapping.infoKeyForStaff(staffKey), [
		wrapping.infoKeyForClassroom(classroom.groupKey, classroom.id)
	]);
	return infoKey;
}

/**
 * A page's content as a device may show it, checked as a notice's is: anyone holding the Info Key, every family
 * included, could have written it.
 */
async function openPage(record: InfoPageRecord, key: CryptoKey): Promise<InfoPage> {
	const data = await decryptData(record.content, key, { purpose: 'info-page', page: record.id });
	const { paper, body, files } = fields(data);
	if (!papers.includes(paper as Paper)) fail();
	const page: InfoPage = {
		id: record.id,
		editedAt: record.editedAt,
		paper: paper as Paper,
		body: readDocument(body)
	};
	if (files !== undefined) page.files = readFiles(files);
	return page;
}

/**
 * Opens pages with the Info Key `opening` gives, in the order the server sends them. A page that doesn't open is
 * left out and counted, so one bad page doesn't hide the rest; without the key, none opens.
 */
async function openPages(
	records: InfoPageRecord[],
	opening: () => Promise<CryptoKey>
): Promise<OpenedInfo> {
	if (!records.length) return { pages: [], unreadable: 0 };
	const key = await opening().catch((cause: unknown) => {
		if (cause instanceof UnreadableError) return undefined;
		throw cause;
	});
	if (!key) return { pages: [], unreadable: records.length };
	const results = await Promise.allSettled(records.map((record) => openPage(record, key)));
	const pages: InfoPage[] = [];
	for (const result of results) {
		if (result.status === 'fulfilled') pages.push(result.value);
		else if (!(result.reason instanceof UnreadableError)) throw result.reason;
	}
	return { pages, unreadable: records.length - pages.length };
}

/** Opens the pages on a staff device, with the Staff Key. */
export function openInfoForStaff({ infoKeyForStaff, pages }: StaffInfo, staffKey: CryptoKey) {
	return openPages(pages, async () =>
		infoKeyForStaff ? unwrapKey(infoKeyForStaff, wrapping.infoKeyForStaff(staffKey)) : fail()
	);
}

/**
 * Opens the pages on a family device, with the Group Key of any of its classrooms, each of which holds a copy of the
 * Info Key.
 */
export function openInfoForFamily(
	records: InfoPageRecord[],
	classrooms: { id: string; infoKey: string | null }[],
	groupKeys: ReadonlyMap<string, CryptoKey>
) {
	return openPages(records, async () => {
		const copy = classrooms.find(({ id, infoKey }) => infoKey !== null && groupKeys.has(id));
		if (!copy?.infoKey) fail();
		const opening = wrapping.infoKeyForClassroom(groupKeys.get(copy.id)!, copy.id);
		return unwrapKey(copy.infoKey, opening);
	});
}
