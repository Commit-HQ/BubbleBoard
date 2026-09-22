import { describe, expect, it } from 'vitest';
import type { NoticeRecord } from './api';
import { createId, UnreadableError } from './crypto';
import {
	isFileName,
	isPicture,
	maxFileBytes,
	maxNoticeFiles,
	nameWith,
	openFile,
	openPicture,
	prepareFile,
	sealFile
} from './files';
import { openNotice, sealNotice, type NoticeContent } from './notices';

// Files attached to notices, sealed as a staff device attaches them and opened as devices get them back.
// Synthetic content only. Pictures are made ready with a canvas, which tests don't have.

const encoder = new TextEncoder();
const text = async (file: Blob) => new Uint8Array(await file.arrayBuffer());

describe('notice files', () => {
	it('open only with the key their notice holds, as the file they were sealed as', async () => {
		const data = encoder.encode('Menu for October');
		const file = await sealFile(createId(), 'menu.txt', data);
		expect(file).toMatchObject({ name: 'menu.txt', bytes: data.length });
		const opened = await openFile(file.sealed, file);
		expect(opened.type).toBe('text/plain');
		expect(await text(opened)).toEqual(data);

		const other = await sealFile(createId(), 'menu.txt', data);
		await expect(openFile(file.sealed, { ...file, key: other.key })).rejects.toThrow(
			UnreadableError
		);
		await expect(openFile(file.sealed, { ...file, id: other.id })).rejects.toThrow(UnreadableError);
	});

	it('open as the kind of file their name says, never as a page', async () => {
		const page = encoder.encode('<script>alert(1)</script>');
		const file = await sealFile(createId(), 'form.pdf', page);
		expect((await openFile(file.sealed, file)).type).toBe('application/pdf');
		for (const name of [
			'page.html',
			'drawing.svg',
			'photo.gif',
			'no-extension',
			'../menu.pdf',
			'back\\slash.pdf',
			`${'a'.repeat(200)}.pdf`
		]) {
			expect(isFileName(name), name).toBe(false);
		}
	});

	it('show on the board as pictures only when named as one and holding a JPEG, PNG, or WebP image', async () => {
		// A see-through picture, attached from Safari, which can't write WebP.
		const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
		const logo = await sealFile(createId(), 'logo.png', png);
		expect(isFileName(logo.name)).toBe(true);
		expect(isPicture(logo)).toBe(true);
		expect(isPicture({ name: 'menu.pdf' })).toBe(false);
		const opened = await openPicture(logo.sealed, logo);
		expect(opened.type).toBe('image/png');
		expect(await text(opened)).toEqual(png);
		// Anyone holding a classroom's key could name something else a picture.
		const page = await sealFile(
			createId(),
			'trip.webp',
			encoder.encode('<svg onload="alert(1)"/>')
		);
		await expect(openPicture(page.sealed, page)).rejects.toThrow(UnreadableError);
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
		// The file as its notice's content holds it, without its sealed bytes.
		const { sealed: _, ...file } = await sealFile(createId(), 'menu.pdf', new Uint8Array(4));
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
				elsewhere: false,
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

describe('saved names', () => {
	it('keep a title whole, dots and all, and number a photo after it', () => {
		expect(nameWith('Izlet 12.5.2026.', 'jpg', '-3')).toBe('Izlet 12.5.2026.-3.jpg');
		expect(nameWith('Izlet 12.5.2026.', 'zip')).toBe('Izlet 12.5.2026..zip');
		expect(nameWith('  Jesen/2026  ', 'jpg')).toBe('Jesen2026.jpg');
		expect(nameWith('///', 'jpg')).toBe('file.jpg');
	});

	it('stay short enough for a notice to name them, the number included', () => {
		const long = nameWith('a'.repeat(300), 'jpg', '-10');
		expect(long).toMatch(/^a+-10\.jpg$/);
		expect(isFileName(long)).toBe(true);
		expect(nameWith('a'.repeat(300), 'jpg').length).toBe(long.length);
	});

	it('give an attached file its kind anew, in place of the one it came with', async () => {
		const plan = await prepareFile(new File(['Hello'], 'Plan v1.2.docx'));
		expect(plan.name).toBe('Plan v1.2.docx');
	});
});
