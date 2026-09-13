import { browser } from '$app/environment';
import { page } from '$app/state';
import type { Paper, TextColour } from '$lib/notices';

// Class names and small helpers shared by the app's screens, in the landing page's style: an ink pill for
// the main action, soft white pills for the rest.

// Each kind sets its own padding: when two classes set the same property, the stylesheet's order picks one,
// not the order of the class list.
const pill =
	'inline-flex min-h-11 items-center justify-center gap-2 rounded-full py-2.5 font-semibold transition disabled:pointer-events-none disabled:opacity-50';

export const button = {
	primary: `${pill} bg-ink px-5 text-white shadow-lg shadow-ink/20 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0`,
	secondary: `${pill} bg-white/70 px-5 text-ink ring-1 ring-ink/10 hover:bg-white`,
	quiet: `${pill} px-3 text-muted hover:bg-ink/5 hover:text-ink`,
	danger: `${pill} px-3 text-red-700 hover:bg-red-50`,
	dangerSolid: `${pill} bg-red-700 px-5 text-white hover:bg-red-800`,
	/** A small icon beside what it changes, such as a pencil beside a name. Give it an `aria-label`. */
	icon: 'grid size-11 shrink-0 place-items-center rounded-full text-muted transition hover:bg-ink/5 hover:text-ink'
};

/** The focus ring of a label whose input is hidden inside it. */
export const labelFocus =
	'has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent';

/**
 * Checkboxes and radios drawn as cards: the input sits hidden in its label, whose look follows it. A
 * `card` is a row, and a `tile` a block with an icon. Put a check icon with `choice.check` in a
 * `choice.box`, or in a round `choice.circle` for a radio: the icon marks the state where forced colours
 * remove fills. `choice.option` is a radio that fills with ink when chosen; forced colours drop the fill,
 * so mark the chosen one another way there.
 */
const choosable = `group cursor-pointer border border-ink/10 bg-white/60 transition hover:bg-white has-checked:border-accent has-checked:bg-white ${labelFocus}`;
const mark =
	'grid size-6 shrink-0 place-items-center border-2 border-ink/20 bg-white text-white transition group-has-checked:border-accent group-has-checked:bg-accent';

export const choice = {
	card: `${choosable} flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3`,
	tile: `${choosable} flex flex-col gap-3 rounded-3xl p-4`,
	box: `${mark} rounded-lg`,
	circle: `${mark} rounded-full`,
	check: 'size-4 opacity-0 group-has-checked:opacity-100',
	option: `cursor-pointer border border-ink/10 bg-white/60 transition hover:bg-white has-checked:border-ink has-checked:bg-ink has-checked:text-white ${labelFocus}`
};

export const field = {
	label: 'grid gap-1.5',
	name: 'font-semibold',
	hint: 'text-sm text-muted',
	input:
		'block min-h-12 w-full rounded-2xl border border-ink/15 bg-white/80 px-4 py-3 text-base text-ink placeholder:text-muted/60 focus-visible:border-accent focus-visible:outline-offset-0'
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

/** How a notice's text looks, the same on the board (NoticeBody.svelte) and in the editor that writes it. */
export const noticeText =
	'text-lg leading-relaxed wrap-break-word [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_li>*+*]:mt-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol>*+*]:mt-1 [&_ul]:list-disc [&_ul]:pl-6 [&_ul>*+*]:mt-1 [&>*+*]:mt-3';

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
