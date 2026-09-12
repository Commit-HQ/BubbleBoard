// Installing BubbleBoard, which phones and tablets need before anything else (next-step-plan.md): on
// iPhone and iPad, notifications reach only the Home Screen app, whose storage Safari doesn't share.
// Browser-only.

/** What installing takes on this device: its steps on a phone or tablet, or nothing on a computer. */
export type InstallPlatform = 'ios' | 'android' | 'in-app' | undefined;

/** Chromium's install prompt event, which the DOM types don't describe. */
export type InstallPrompt = Event & {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/** Which install steps a device needs, from its user agent and how many touch points its screen takes. */
export function installPlatform(userAgent: string, touchPoints: number): InstallPlatform {
	// iPadOS reports itself as a Mac, and a Mac has no touch screen.
	const ios =
		/iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && touchPoints > 1);
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
	const installed =
		matchMedia('(display-mode: standalone)').matches ||
		(navigator as Navigator & { standalone?: boolean }).standalone === true;
	return installed ? undefined : installPlatform(navigator.userAgent, navigator.maxTouchPoints);
}
