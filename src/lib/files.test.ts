import { describe, expect, it } from 'vitest';
import type { NoticeRecord } from './api';
import { createId, UnreadableError } from './crypto';
import { isFileName, maxFileBytes, maxNoticeFiles, openFile, prepareFile, sealFile } from './files';
import { openNotice, sealNotice, type NoticeContent } from './notices';

// Files attached to notices, sealed as a staff device attaches them and opened as devices get them back.
// Synthetic content only. Pictures are made ready with a canvas, which tests don't have.

const encoder = new TextEncoder();
const text = async (file: Blob) => new Uint8Array(await file.arrayBuffer());

describe('notice files', () => {
	it('open only with the key their notice holds, as the file they were sealed as', async () => {
		const data = encoder.encode('Menu for October');
		const { file, sealed } = await sealFile(createId(), 'menu.txt', data);
		expect(file).toMatchObject({ name: 'menu.txt', bytes: data.length });
		const opened = await openFile(sealed, file);
		expect(opened.type).toBe('text/plain');
		expect(await text(opened)).toEqual(data);

		const other = await sealFile(createId(), 'menu.txt', data);
		await expect(openFile(sealed, { ...file, key: other.file.key })).rejects.toThrow(
			UnreadableError
		);
		await expect(openFile(sealed, { ...file, id: other.file.id })).rejects.toThrow(UnreadableError);
	});

	it('open as the kind of file their name says, never as a page', async () => {
		const page = encoder.encode('<script>alert(1)</script>');
		const { file, sealed } = await sealFile(createId(), 'form.pdf', page);
		expect((await openFile(sealed, file)).type).toBe('application/pdf');
		for (const name of [
			'page.html',
			'drawing.svg',
			'photo.png',
			'no-extension',
			'../menu.pdf',
			'back\\slash.pdf',
			`${'a'.repeat(200)}.pdf`
		]) {
			expect(isFileName(name), name).toBe(false);
		}
	});

	it('take documents of the kinds notices carry, up to the size the server keeps, sealed as they’re attached', async () => {
		const plan = await prepareFile(new File(['Hello'], 'Plan for week 1.docx'));
		expect(plan).toMatchObject({ name: 'Plan for week 1.docx', bytes: 5 });
		expect(await text(await openFile(plan.sealed, plan))).toEqual(encoder.encode('Hello'));
		await expect(prepareFile(new File(['<svg/>'], 'drawing.svg'))).rejects.toMatchObject({
			code: 'file-type'
		});
		await expect(
			prepareFile(new File([new Uint8Array(maxFileBytes + 1)], 'scan.pdf'))
		).rejects.toMatchObject({ code: 'file-too-large' });
		// A long name is shortened, keeping its kind.
		const long = await prepareFile(new File(['x'], `${'a'.repeat(300)}.PDF`));
		expect(long.name).toMatch(/^a+\.pdf$/);
		expect(isFileName(long.name)).toBe(true);
	});

	it('ride inside their notice, which doesn’t open with files it couldn’t name', async () => {
		const groupKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
			'encrypt',
			'decrypt'
		]);
		const classroom = { id: createId(), groupKey };
		const keys = new Map([[classroom.id, groupKey]]);
		const { file } = await sealFile(createId(), 'menu.pdf', new Uint8Array(4));
		const served = async (files: unknown[]): Promise<NoticeRecord> => {
			const id = createId();
			const content = { paper: 'white', body: { type: 'doc', content: [] }, files };
			const sealed = await sealNotice(id, content as NoticeContent, [classroom]);
			return {
				id,
				teacher: null,
				content: sealed.content,
				postedAt: 1,
				announcedAt: 1,
				editedAt: null,
				expiresAt: 2,
				seen: [],
				votes: [],
				classrooms: sealed.classrooms
			};
		};

		expect(await openNotice(await served([file]), keys)).toMatchObject({ files: [file] });
		for (const files of [
			[file, file],
			[{ ...file, name: 'page.html' }],
			[{ ...file, key: 'short' }],
			[{ ...file, bytes: -1 }],
			Array.from({ length: maxNoticeFiles + 1 }, () => ({ ...file, id: createId() }))
		]) {
			await expect(openNotice(await served(files), keys)).rejects.toThrow(UnreadableError);
		}
	});
});
