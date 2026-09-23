// Installing BubbleBoard, which phones and tablets need before anything else (decisions.md): on
// iPhone and iPad, notifications reach only the Home Screen app, whose storage Safari doesn't share.
// Browser-only.

/**
 * What installing takes on this device, or nothing on a computer and in the installed app.
 *
 * - `ios`: Safari, or another browser on iPhone or iPad, adds BubbleBoard from its Share menu.
 * - `ios-in-app`: a browser inside another app on iPhone or iPad, such as Viber's, has no Add to Home
 *   Screen, so the link is opened in Safari first.
 * - `android`: Chrome installs BubbleBoard, and the app it installs shares its connection.
 * - `android-other`: another browser on Android, such as Samsung Internet or Firefox, is asked to install
 *   from its menu, with Chrome as the way out when that only adds a shortcut.
 * - `android-in-app`: a browser inside another app, and Brave, which adds a shortcut that opens the browser
 *   instead of the app (brave/brave-browser#56133), so the link is opened in Chrome first.
 */
export type InstallPlatform =
	'ios' | 'ios-in-app' | 'android' | 'android-other' | 'android-in-app' | undefined;

/** Chromium's install prompt event, which the DOM types don't describe. */
export type InstallPrompt = Event & {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/** Whether a device is an iPhone, iPad, or iPod touch. iPadOS reports itself as a Mac, which has no touch screen. */
export function isAppleTouch(userAgent: string, touchPoints: number) {
	return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && touchPoints > 1);
}

/**
 * Which install steps a device needs, from its user agent, how many touch points its screen takes, and
 * whether the browser says it's Brave, which hides in Chrome's user agent (`isBrave`).
 */
export function installPlatform(
	userAgent: string,
	touchPoints: number,
	brave = false
): InstallPlatform {
	const ios = isAppleTouch(userAgent, touchPoints);
	if (!ios && !/Android/.test(userAgent)) return undefined;
	// Browsers inside other apps name the app, or are Android's web view. On iPhone and iPad, every real
	// browser says `Safari/`, and the web view inside an app doesn't.
	const inApp =
		/FBAN|FBAV|Instagram|LinkedInApp|Snapchat|TikTok|Line\/|MicroMessenger|GSA\/|Viber|; wv\)/.test(
			userAgent
		) ||
		(ios && !/Safari\//.test(userAgent));
	if (ios) return inApp ? 'ios-in-app' : 'ios';
	if (inApp || brave) return 'android-in-app';
	const chrome =
		/Chrome\//.test(userAgent) &&
		!/SamsungBrowser|Firefox\/|EdgA\/|OPR\/|OPT\/|HuaweiBrowser|MiuiBrowser|UCBrowser|DuckDuckGo/.test(
			userAgent
		);
	return chrome ? 'android' : 'android-other';
}

/** Whether this browser is Brave, which says so only when asked. */
export async function isBrave() {
	const { brave } = navigator as Navigator & { brave?: { isBrave?: () => Promise<boolean> } };
	try {
		return (await brave?.isBrave?.()) === true;
	} catch {
		return false;
	}
}

/** The install steps this device still needs: none in the installed app or on a computer. */
export async function installStep(): Promise<InstallPlatform> {
	const installed = matchMedia('(display-mode: standalone)').matches || onAppleHomeScreen();
	if (installed) return undefined;
	return installPlatform(navigator.userAgent, navigator.maxTouchPoints, await isBrave());
}

/**
 * Whether the browser connects with a card link itself: on a computer, and in an Android browser, whose
 * installed app shares its storage. Elsewhere installing comes first, and the link stays whole in the
 * address bar: for the Home Screen app on iPhone and iPad, or for the browser the link is handed on to.
 */
export function connectsInBrowser(step: InstallPlatform) {
	return step === undefined || step === 'android' || step === 'android-other';
}

/**
 * The address that opens a link in Chrome on Android, from any other browser there: an Android intent
 * naming Chrome's package. The link's fragment stays, since Android takes the intent's fields from the
 * last `#`, and browsers that don't know the package fall back to the link itself.
 */
export function chromeLink(link: string) {
	const { host, pathname, search, hash } = new URL(link);
	const fallback = encodeURIComponent(link);
	return `intent://${host}${pathname}${search}${hash}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
}

/** The address that opens a link in Safari on iPhone and iPad, from a browser inside another app (iOS 17 and later). */
export function safariLink(link: string) {
	return link.replace(/^https:/, 'x-safari-https:');
}

/**
 * Whether a browser, given a manifest without start_url, adds the app with the address of the page it was
 * added from, fragment and all, to a Home Screen app that doesn't share its storage: Safari and the other
 * browsers on iPhone and iPad, where WebKit falls back to the page's address (ApplicationManifestParser). They
 * get such a manifest, and Safari keeps a card's link in the address bar, so the app opens with that card.
 * iPadOS reports a Mac; Safari on a Mac gets the same manifest, which does no harm there.
 */
export function startsWhereAdded(userAgent: string) {
	return (
		/iPhone|iPad|iPod/.test(userAgent) ||
		(/Macintosh/.test(userAgent) && !/Chrome\/|Firefox\/|Edg\//.test(userAgent))
	);
}

/** Whether this is the Home Screen app on iPhone or iPad, which opens at the address it was added from. */
export function onAppleHomeScreen() {
	return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
