import { describe, expect, it } from 'vitest';
import { cardLink, formatCardCode, readCard } from './card';
import { createSecret } from './crypto';

const origin = 'https://bubbleboard.example.com';
const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

describe('card codes', () => {
	it('read back their secret however they are typed', () => {
		const secret = createSecret();
		const code = formatCardCode(secret);
		expect(code).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){6}[0-9A-HJKMNP-TV-Z]{4}$/);
		for (const typed of [
			code,
			code.toLowerCase(),
			code.replaceAll('-', ''),
			code.replaceAll('-', ' '),
			` ${code}\n`
		]) {
			expect(readCard(typed, origin), typed).toEqual({ secret });
		}
	});

	it('read the look-alikes O, I, and L as digits', () => {
		const zeros = new Uint8Array(16);
		expect(readCard(formatCardCode(zeros).replaceAll('0', 'o'), origin)).toEqual({ secret: zeros });

		const one = new Uint8Array(16);
		one[0] = 0x08; // The first symbol is 1.
		const code = formatCardCode(one);
		expect(code.startsWith('1')).toBe(true);
		expect(readCard(code.replace('1', 'l'), origin)).toEqual({ secret: one });
		expect(readCard(code.replace('1', 'I'), origin)).toEqual({ secret: one });
	});

	it('catch every mistyped character and every swap of two secret characters', () => {
		const code = formatCardCode(createSecret()).replaceAll('-', '');
		for (let i = 0; i < code.length; i++) {
			for (const char of alphabet.replace(code[i], '')) {
				const typo = `${code.slice(0, i)}${char}${code.slice(i + 1)}`;
				expect(readCard(typo, origin), typo).toEqual({ error: 'mistyped' });
			}
		}
		for (let i = 0; i < 26; i++) {
			for (let j = i + 1; j < 26; j++) {
				if (code[i] === code[j]) continue;
				const chars = [...code];
				[chars[i], chars[j]] = [chars[j], chars[i]];
				expect(readCard(chars.join(''), origin)).toEqual({ error: 'mistyped' });
			}
		}
	});

	it('reject anything that is not a card code', () => {
		const code = formatCardCode(createSecret());
		for (const text of ['', 'hello', code.slice(0, -1), `${code}0`, `U${code.slice(1)}`]) {
			expect(readCard(text, origin), text).toEqual({ error: 'invalid' });
		}
	});

	it('accept only one spelling of each secret', () => {
		const values = [...formatCardCode(createSecret()).replaceAll('-', '')]
			.slice(0, 26)
			.map((char) => alphabet.indexOf(char));
		values[25] |= 1; // A spare bit, with a matching check.
		const sum = values.reduce((total, value, i) => (total + (i + 1) * value) % 1021, 0);
		const code = [...values, sum >> 5, sum & 31].map((value) => alphabet[value]).join('');
		expect(readCard(code, origin)).toEqual({ error: 'invalid' });
	});
});

describe('card links', () => {
	it('open the app in either language, with the code only in the fragment', () => {
		const secret = createSecret();
		for (const [locale, path] of [
			['hr', '/app'],
			['en', '/en/app']
		] as const) {
			const url = new URL(cardLink(origin, locale, secret));
			expect(`${url.origin}${url.pathname}${url.search}`).toBe(`${origin}${path}`);
			expect(readCard(url.href, origin)).toEqual({ secret });
		}
	});

	it('keep working if app paths change', () => {
		const secret = createSecret();
		const link = cardLink(origin, 'hr', secret).replace('/app#', '/elsewhere#');
		expect(readCard(link, origin)).toEqual({ secret });
	});

	it('reject links without exactly one card code', () => {
		const code = formatCardCode(createSecret()).replaceAll('-', '');
		for (const text of [
			`${origin}/app`,
			`${origin}/app?card=${code}`,
			`${origin}/app#family=${code}`,
			`${origin}/app#card=${code}&card=${code}`
		]) {
			expect(readCard(text, origin), text).toEqual({ error: 'invalid' });
		}
	});

	it('recognize a card from another installation', () => {
		const link = cardLink('https://other.example.org', 'hr', createSecret());
		expect(readCard(link, origin)).toEqual({ error: 'other-installation' });
	});
});
