import { expect, it } from 'vitest';
import { installPlatform, startsWhereAdded } from './install';

it('asks phones and tablets to install, browsers inside apps to open a real browser, and computers nothing', () => {
	const safari = 'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5';
	const chrome = 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0';
	for (const [userAgent, touchPoints, platform] of [
		[
			`Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) ${safari} Mobile/15E148 Safari/604.1`,
			5,
			'ios'
		],
		// iPadOS, which reports a Mac.
		[`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ${safari} Safari/605.1.15`, 5, 'ios'],
		[
			`Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/139.0.0.0 Mobile/15E148 Safari/604.1`,
			5,
			'ios'
		],
		[`Mozilla/5.0 (Linux; Android 14; Pixel 8) ${chrome} Mobile Safari/537.36`, 5, 'android'],
		[`Mozilla/5.0 (Linux; Android 14; SM-X710) ${chrome} Safari/537.36`, 10, 'android'],
		[
			`Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36`,
			5,
			'android'
		],
		[
			`Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 390.0.0.0`,
			5,
			'in-app'
		],
		[
			`Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/500.0.0]`,
			5,
			'in-app'
		],
		[
			`Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/139.0.0.0 Mobile Safari/537.36`,
			5,
			'in-app'
		],
		[`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ${safari} Safari/605.1.15`, 0, undefined],
		[`Mozilla/5.0 (Windows NT 10.0; Win64; x64) ${chrome} Safari/537.36`, 10, undefined],
		[`Mozilla/5.0 (X11; CrOS x86_64 16181.0.0) ${chrome} Safari/537.36`, 10, undefined]
	] as const) {
		expect(installPlatform(userAgent, touchPoints), userAgent).toBe(platform);
	}
});

it('gives browsers on iPhone and iPad a manifest that starts where BubbleBoard was added, and others a start_url', () => {
	const webkit = 'AppleWebKit/605.1.15 (KHTML, like Gecko)';
	const chrome = 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0';
	for (const [userAgent, fromPage] of [
		[
			`Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) ${webkit} Version/18.5 Mobile/15E148 Safari/604.1`,
			true
		],
		[
			`Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) ${webkit} CriOS/139.0.0.0 Mobile/15E148 Safari/604.1`,
			true
		],
		// iPadOS, which reports a Mac, and Safari on a Mac, which gets the same manifest.
		[
			`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ${webkit} Version/18.5 Safari/605.1.15`,
			true
		],
		[`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ${chrome} Safari/537.36`, false],
		[`Mozilla/5.0 (Linux; Android 14; Pixel 8) ${chrome} Mobile Safari/537.36`, false],
		[`Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0`, false]
	] as const) {
		expect(startsWhereAdded(userAgent), userAgent).toBe(fromPage);
	}
});
