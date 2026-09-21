import { expect, it } from 'vitest';
import { appPath, explorePath, homePath, localizedPath, pathLocale, privacyPath } from './paths';

it('leaves the default language unprefixed', () => {
	expect([homePath('hr'), homePath('en'), appPath('hr'), appPath('en')]).toEqual([
		'/',
		'/en',
		'/app',
		'/en/app'
	]);
	expect([privacyPath('hr'), privacyPath('en')]).toEqual(['/privacy', '/en/privacy']);
	expect(localizedPath('/privacy', 'en')).toBe('/en/privacy');
	expect(localizedPath('/en/privacy', 'hr')).toBe('/privacy');
	expect([explorePath('hr', 'parents'), explorePath('en', 'teachers')]).toEqual([
		'/explore/parents',
		'/en/explore/teachers'
	]);
	expect(localizedPath('/en/explore/teachers', 'hr')).toBe('/explore/teachers');
});

it('puts record IDs in the query of app pages', () => {
	expect(appPath('en', 'child', { id: 'mZxpy8xpAEm4t5zbrn9CrA' })).toBe(
		'/en/app/child?id=mZxpy8xpAEm4t5zbrn9CrA'
	);
	expect(appPath('hr', 'teacher/new')).toBe('/app/teacher/new');
});

it('reads the language of a path, including one no page has', () => {
	expect(['/', '/app', '/api/session', '/english', '/nothing-here'].map(pathLocale)).toEqual([
		'hr',
		'hr',
		'hr',
		'hr',
		'hr'
	]);
	expect(['/en', '/en/app/options', '/en/nothing-here'].map(pathLocale)).toEqual([
		'en',
		'en',
		'en'
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
