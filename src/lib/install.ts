// Installing BubbleBoard, which phones and tablets need before anything else (decisions.md): on
// iPhone and iPad, notifications reach only the Home Screen app, whose storage Safari doesn't share.
// Browser-only.

/** What installing takes on this device: its steps on a phone or tablet, or nothing on a computer. */
export type InstallPlatform = 'ios' | 'android' | 'in-app' | undefined;

/** Chromium's install prompt event, which the DOM types don't describe. */
export type InstallPrompt = Event & {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/** Whether a device is an iPhone, iPad, or iPod touch. iPadOS reports itself as a Mac, which has no touch screen. */
export function isAppleTouch(userAgent: string, touchPoints: number) {
	return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && touchPoints > 1);
}

/** Which install steps a device needs, from its user agent and how many touch points its screen takes. */
export function installPlatform(userAgent: string, touchPoints: number): InstallPlatform {
	const ios = isAppleTouch(userAgent, touchPoints);
	if (!ios && !/Android/.test(userAgent)) return undefined;
	// Browsers inside other apps, and Android's web views, can't install web apps.
	if (
		/FBAN|FBAV|Instagram|LinkedInApp|Snapchat|TikTok|Line\/|MicroMessenger|GSA\/|; wv\)/.test(
			userAgent
		)
	) {
		return 'in-app';
	}
	return ios ? 'ios' : 'android';
}

/** The install steps this device still needs: none in the installed app or on a computer. */
export function installStep(): InstallPlatform {
	const installed = matchMedia('(display-mode: standalone)').matches || onAppleHomeScreen();
	return installed ? undefined : installPlatform(navigator.userAgent, navigator.maxTouchPoints);
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
