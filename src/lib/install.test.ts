import { expect, it } from 'vitest';
import { chromeLink, installPlatform, safariLink, startsWhereAdded } from './install';

it('tells each phone browser its install steps, browsers inside apps to open a real browser, and computers nothing', () => {
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
			'android-other'
		],
		[`Mozilla/5.0 (Android 14; Mobile; rv:141.0) Gecko/141.0 Firefox/141.0`, 5, 'android-other'],
		[
			`Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 390.0.0.0`,
			5,
			'ios-in-app'
		],
		[
			`Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/500.0.0]`,
			5,
			'ios-in-app'
		],
		// Viber's browser, and any other web view inside an app on iPhone, which doesn't say Safari.
		[
			`Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Viber/27.5`,
			5,
			'ios-in-app'
		],
		[
			`Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148`,
			5,
			'ios-in-app'
		],
		[
			`Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/139.0.0.0 Mobile Safari/537.36`,
			5,
			'android-in-app'
		],
		[`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ${safari} Safari/605.1.15`, 0, undefined],
		[`Mozilla/5.0 (Windows NT 10.0; Win64; x64) ${chrome} Safari/537.36`, 10, undefined],
		[`Mozilla/5.0 (X11; CrOS x86_64 16181.0.0) ${chrome} Safari/537.36`, 10, undefined]
	] as const) {
		expect(installPlatform(userAgent, touchPoints), userAgent).toBe(platform);
	}
});

it('sends Brave, which looks like Chrome, to Chrome', () => {
	const brave =
		'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36';
	expect(installPlatform(brave, 5, true)).toBe('android-in-app');
	expect(installPlatform(brave, 5, false)).toBe('android');
});

it('hands a card link to Chrome or Safari with its code', () => {
	const link = 'https://bubbleboard.fyi/app#card=K7Q2M9PX3HDRW8TN6CJVABQE4RZ5';
	expect(chromeLink(link)).toBe(
		'intent://bubbleboard.fyi/app#card=K7Q2M9PX3HDRW8TN6CJVABQE4RZ5#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Fbubbleboard.fyi%2Fapp%23card%3DK7Q2M9PX3HDRW8TN6CJVABQE4RZ5;end'
	);
	expect(safariLink(link)).toBe(
		'x-safari-https://bubbleboard.fyi/app#card=K7Q2M9PX3HDRW8TN6CJVABQE4RZ5'
	);
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
