import * as publicEnv from '$env/static/public';

export const repositoryUrl = 'https://github.com/Commit-HQ/BubbleBoard';
export const organizationUrl = 'https://github.com/Commit-HQ';
export const contactEmail = 'commit-devs@proton.me';

// The public origin this installation is served from, set at build time in `.env` (see `.env.example`).
// Prerendered pages can't take absolute links such as canonical URLs and link previews from a request,
// and a Worker variable set later can't change HTML that was already generated. A namespace import lets
// a missing variable reach the check below instead of failing the bundler with a missing export.
const siteOrigin = parseSiteOrigin((publicEnv as { PUBLIC_SITE_URL?: string }).PUBLIC_SITE_URL);

export function absoluteUrl(path: string) {
	return new URL(path, siteOrigin).href;
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
