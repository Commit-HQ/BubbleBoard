import { PUBLIC_SITE_URL } from '$env/static/public';

export const repositoryUrl = 'https://github.com/Commit-HQ/BubbleBoard';
export const organizationUrl = 'https://github.com/Commit-HQ';
export const contactEmail = 'commit-devs@proton.me';

// Where this installation is served, read at build time from `.env` (see `.env.example`). Pages are
// prerendered, so absolute links such as canonical URLs and link previews can't come from the request.
const siteUrl = new URL(PUBLIC_SITE_URL);

export function absoluteUrl(path: string) {
	return new URL(path, siteUrl).href;
}
