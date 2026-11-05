import * as publicEnv from '$env/static/public';

export const repositoryUrl = 'https://github.com/Commit-HQ/BubbleBoard';
export const organizationUrl = 'https://github.com/Commit-HQ';
export const contactEmail = 'commit-devs@proton.me';

// The public origin this installation is served from, set at build time in `.env` (see `.env.example`).
// Prerendered pages can't take absolute links such as canonical URLs and link previews from a request,
// and a Worker variable set later can't change HTML that was already generated. A namespace import lets
// a missing variable reach the check below instead of failing the bundler with a missing export.
const env = publicEnv as {
	PUBLIC_SITE_URL?: string;
	PUBLIC_PRIVACY_EMAIL?: string;
	PUBLIC_KINDERGARTEN_NAME?: string;
	PUBLIC_OPERATOR_NAME?: string;
};
const siteOrigin = parseSiteOrigin(env.PUBLIC_SITE_URL);

export function absoluteUrl(path: string) {
	return new URL(path, siteOrigin).href;
}

/**
 * Whom the privacy policy names, also set at build time: the address families write to about their data,
 * which every installation sets, since it's the kindergarten's to answer and not the project's; the
 * kindergarten that answers for the data, when its name is set; and whoever runs the installation for it,
 * when that's someone else (docs/adr/0002-the-site-is-commits-alone.md).
 */
export const privacyContact = {
	email: parsePrivacyEmail(env.PUBLIC_PRIVACY_EMAIL),
	kindergarten: env.PUBLIC_KINDERGARTEN_NAME?.trim() || undefined,
	operator: env.PUBLIC_OPERATOR_NAME?.trim() || undefined
};

function parsePrivacyEmail(value: string | undefined) {
	const invalid = (reason: string) =>
		new Error(
			`PUBLIC_PRIVACY_EMAIL ${reason}. Set it in .env to the address families write to about their data, such as privacy@kindergarten.example (see .env.example).`
		);
	const email = value?.trim();
	if (!email) throw invalid('is not set');
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw invalid('is not an email address');
	return email;
}

/** Accepts `https://host[:port]`, with or without a trailing slash, and `http://` for localhost only. */
function parseSiteOrigin(value: string | undefined) {
	// The message never repeats the value, which could contain credentials.
	const invalid = (reason: string) =>
		new Error(
			`PUBLIC_SITE_URL ${reason}. Set it in .env to the public origin of this installation, such as https://bubbleboard.example.com (see .env.example).`
		);
	if (!value) throw invalid('is not set');
	if (!URL.canParse(value)) throw invalid('is not a valid URL');
	const url = new URL(value);
	const localhost = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
	if (url.protocol !== 'https:' && !(url.protocol === 'http:' && localhost)) {
		throw invalid('must start with https:// (http:// is allowed only for localhost)');
	}
	if (url.username || url.password) throw invalid('must not contain a username or password');
	if (url.pathname !== '/' || /[?#]/.test(value)) {
		throw invalid('must not have a path, query, or fragment');
	}
	return url.origin;
}
