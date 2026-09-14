import type { InfoRecord, StaffInfoRecord } from '$lib/api';
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
import { maxNoticeBytes, readDocument, readFiles, type NoticeDocument } from '$lib/notices';

// The kindergarten's info page, as devices write and read it (docs/access-format.md): text and files for everyone
// who uses the app, such as opening hours and contacts, which admins write and which stays until they change it.
// Its content is encrypted with the page's Info Key, made at its first save and kept for good, which the server
// keeps wrapped with the Staff Key, for staff, and with the Group Key of every classroom, for families; a classroom
// added later gets the key when it's added. Its files are sealed as a notice's are (src/lib/files.ts).

/** What the page holds inside its envelope: text, as a notice's, and files. */
export type InfoContent = { body: NoticeDocument; files?: NoticeFile[] };
/** The page as a device shows it, with when it was last saved. */
export type Info = InfoContent & { editedAt: number };

/** The most the page's content may take, in bytes of JSON, as a notice's, which the server also holds it to. */
export const maxInfoBytes = maxNoticeBytes;

/** Whether the page shows nothing: no text, only empty lines, and no files. */
export function isBlank({ body, files }: InfoContent) {
	const text = body.content.some((block) => block.type !== 'paragraph' || block.content?.length);
	return !text && !files?.length;
}

async function seal(content: InfoContent, key: CryptoKey) {
	const sealed = await encryptData(content, key, { purpose: 'info-content' });
	// Measured as the server measures it.
	if (envelopeSize(sealed)! > maxInfoBytes) throw new CodedError('info-too-long');
	return sealed;
}

/** Seals a change to the page with the Info Key it has, which staff open from its copy for them. */
export async function sealInfo(content: InfoContent, staffKey: CryptoKey, infoKeyForStaff: string) {
	const key = await unwrapKey(infoKeyForStaff, wrapping.infoKeyForStaff(staffKey));
	return { content: await seal(content, key) };
}

/** Seals the page's first save under a new Info Key, wrapped for staff and for each classroom. */
export async function sealNewInfo(
	content: InfoContent,
	staffKey: CryptoKey,
	classrooms: { id: string; groupKey: CryptoKey }[]
) {
	const { key, envelopes } = await createKey([
		wrapping.infoKeyForStaff(staffKey),
		...classrooms.map(({ id, groupKey }) => wrapping.infoKeyForClassroom(groupKey, id))
	]);
	const [infoKeyForStaff, ...infoKeys] = envelopes;
	return {
		content: await seal(content, key),
		infoKeyForStaff,
		classrooms: classrooms.map(({ id }, index) => ({ classroom: id, infoKey: infoKeys[index] }))
	};
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
 * The page's content as a device may show it, checked as a notice's is: anyone holding its key, every family
 * included, could have written it.
 */
async function open(record: InfoRecord, key: CryptoKey): Promise<Info> {
	const data = await decryptData(record.content, key, { purpose: 'info-content' });
	const { body, files } = fields(data);
	const info: Info = { body: readDocument(body), editedAt: record.editedAt };
	if (files !== undefined) info.files = readFiles(files);
	return info;
}

/** Opens the page on a staff device, with the Staff Key. */
export async function openInfoForStaff(record: StaffInfoRecord, staffKey: CryptoKey) {
	return open(record, await unwrapKey(record.infoKeyForStaff, wrapping.infoKeyForStaff(staffKey)));
}

/**
 * Opens the page on a family device, with the Group Key of any of its classrooms, each of which holds a copy of
 * the Info Key.
 */
export async function openInfoForFamily(
	record: InfoRecord,
	classrooms: { id: string; infoKey: string | null }[],
	groupKeys: ReadonlyMap<string, CryptoKey>
) {
	const copy = classrooms.find(({ id, infoKey }) => infoKey !== null && groupKeys.has(id));
	if (!copy?.infoKey) throw new UnreadableError();
	const opening = wrapping.infoKeyForClassroom(groupKeys.get(copy.id)!, copy.id);
	return open(record, await unwrapKey(copy.infoKey, opening));
}
