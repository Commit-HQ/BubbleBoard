import { describe, expect, it } from 'vitest';
import { createSecret } from './crypto';
import { appPath, cardLink, homePath, localizedPath, readCardLink } from './paths';

const origin = 'https://bubbleboard.example.com';

describe('paths', () => {
	it('leave the default language unprefixed', () => {
		expect([homePath('hr'), homePath('en'), appPath('hr'), appPath('en')]).toEqual([
			'/',
			'/en',
			'/app',
			'/en/app'
		]);
	});

	it('switch the language of the current page', () => {
		expect(localizedPath('/', 'en')).toBe('/en');
		expect(localizedPath('/en', 'hr')).toBe('/');
		expect(localizedPath('/en', 'en')).toBe('/en');
		expect(localizedPath('/app', 'en')).toBe('/en/app');
		expect(localizedPath('/en/app', 'hr')).toBe('/app');
		expect(localizedPath('/english', 'en')).toBe('/en/english');
	});
});

describe('card links', () => {
	it('read back the role and secret they were made with, in either language', () => {
		const secret = createSecret();
		for (const locale of ['hr', 'en'] as const) {
			for (const role of ['teacher', 'family'] as const) {
				const link = cardLink(origin, locale, role, secret);
				expect(link.startsWith(`${origin}${appPath(locale)}#${role}=`)).toBe(true);
				expect(readCardLink(link, origin)).toEqual({ role, secret });
			}
		}
	});

	it('keep the secret out of everything a browser sends', () => {
		const url = new URL(cardLink(origin, 'hr', 'family', createSecret()));
		expect(`${url.origin}${url.pathname}${url.search}`).toBe(`${origin}/app`);
	});

	it('keep working if app paths change', () => {
		const link = cardLink(origin, 'hr', 'family', createSecret());
		expect(readCardLink(link.replace('/app#', '/elsewhere#'), origin)).toMatchObject({
			role: 'family'
		});
	});

	it('reject anything but exactly one card secret', () => {
		const secret = cardLink(origin, 'hr', 'family', createSecret()).split('=')[1];
		for (const text of [
			'',
			'not a link',
			`${origin}/app`,
			`${origin}/app?family=${secret}`,
			`${origin}/app#family=${secret.slice(1)}`,
			`${origin}/app#family=${secret}A`,
			`${origin}/app#parent=${secret}`,
			`${origin}/app#family=${secret}&teacher=${secret}`,
			`${origin}/app#family=${secret}&family=${secret}`
		]) {
			expect(readCardLink(text, origin), text).toEqual({ error: 'invalid' });
		}
	});

	it('recognize a card from another installation', () => {
		const link = cardLink('https://other.example.org', 'hr', 'family', createSecret());
		expect(readCardLink(link, origin)).toEqual({ error: 'other-installation' });
	});
});
