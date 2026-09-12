import { expect, it } from 'vitest';
import { appPath, homePath, localizedPath } from './paths';

it('leaves the default language unprefixed', () => {
	expect([homePath('hr'), homePath('en'), appPath('hr'), appPath('en')]).toEqual([
		'/',
		'/en',
		'/app',
		'/en/app'
	]);
});

it('switches the language of the current page', () => {
	expect(localizedPath('/', 'en')).toBe('/en');
	expect(localizedPath('/en', 'hr')).toBe('/');
	expect(localizedPath('/en', 'en')).toBe('/en');
	expect(localizedPath('/app', 'en')).toBe('/en/app');
	expect(localizedPath('/en/app', 'hr')).toBe('/app');
	expect(localizedPath('/english', 'en')).toBe('/en/english');
});
