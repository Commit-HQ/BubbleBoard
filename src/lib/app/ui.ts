import { browser } from '$app/environment';
import { page } from '$app/state';
import type { Paper, TextColour } from '$lib/notices';

// Class names and small helpers shared by the app's screens, in the landing page's style: an ink pill for
// the main action, soft white pills for the rest.

const pill =
	'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 font-semibold transition disabled:pointer-events-none disabled:opacity-50';

export const button = {
	primary: `${pill} bg-ink text-white shadow-lg shadow-ink/20 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0`,
	secondary: `${pill} bg-white/70 text-ink ring-1 ring-ink/10 hover:bg-white`,
	quiet: `${pill} px-3 text-muted hover:bg-ink/5 hover:text-ink`,
	danger: `${pill} px-3 text-red-700 hover:bg-red-50`,
	dangerSolid: `${pill} bg-red-700 text-white hover:bg-red-800`
};

export const field = {
	label: 'grid gap-1.5',
	name: 'font-semibold',
	hint: 'text-sm text-muted',
	input:
		'block min-h-12 w-full rounded-2xl border border-ink/15 bg-white/80 px-4 py-3 text-base text-ink placeholder:text-muted/60 focus-visible:border-accent focus-visible:outline-offset-0',
	check: 'size-5 shrink-0 accent-accent'
};

/** A panel for a form or a group of actions. */
export const surface = 'rounded-4xl glass p-6 sm:p-8';

/** The buttons under a page-sized panel's text. */
export const buttonRow = 'mt-8 flex flex-wrap gap-3';

/** An error, said gently. */
export const alert = 'rounded-2xl bg-blush/10 px-4 py-3 font-semibold text-red-800';

/** A text field from a submitted form, trimmed. */
export function formText(form: FormData, name: string) {
	return String(form.get(name) ?? '').trim();
}

/** A query parameter of the current page, such as a record ID. Prerendered pages have no query. */
export function queryParam(name: string) {
	return browser ? page.url.searchParams.get(name) : null;
}

/** The background of each notice paper (src/lib/notices.ts), from the theme in app.css. */
export const paperClass: Record<Paper, string> = {
	white: 'bg-white',
	yellow: 'bg-paper-yellow',
	peach: 'bg-paper-peach',
	pink: 'bg-paper-pink',
	lilac: 'bg-paper-lilac',
	blue: 'bg-paper-blue',
	green: 'bg-paper-green'
};

/** The colour of each notice text colour: at least 4.5:1 on every paper. */
export const textColourClass: Record<TextColour, string> = {
	red: 'text-red-700',
	orange: 'text-orange-800',
	green: 'text-green-800',
	blue: 'text-blue-700',
	purple: 'text-purple-700'
};
