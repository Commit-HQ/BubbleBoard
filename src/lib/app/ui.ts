import { browser } from '$app/environment';
import { page } from '$app/state';
import type { Paper } from '$lib/notices';
import { onMount } from 'svelte';

// Class names and small helpers shared by the app's screens, in the landing page's style: an ink pill for
// the main action, soft white pills for the rest.

// Each kind sets its own padding: when two classes set the same property, the stylesheet's order picks one,
// not the order of the class list.
const pill =
	'inline-flex min-h-11 items-center justify-center gap-2 rounded-full py-2.5 font-semibold transition disabled:pointer-events-none disabled:opacity-50';
/** A round button the size of a tap target, holding one icon and nothing else. */
const iconPill = 'grid size-11 shrink-0 place-items-center rounded-full transition';
/** The look a list's view-pickers share, whether each is a button or they're all one menu. */
const chipLook =
	'min-h-9 rounded-full bg-white/60 text-sm font-semibold ring-1 ring-ink/10 transition';

export const button = {
	primary: `${pill} bg-ink px-5 text-white shadow-lg shadow-ink/20 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0`,
	secondary: `${pill} bg-white/70 px-5 text-ink ring-1 ring-ink/10 hover:bg-white`,
	quiet: `${pill} px-3 text-muted hover:bg-ink/5 hover:text-ink`,
	danger: `${pill} px-3 text-red-700 hover:bg-red-50`,
	dangerSolid: `${pill} bg-red-700 px-5 text-white hover:bg-red-800`,
	/** Over a picture, such as Save in the picture viewer. */
	frosted: `${pill} frosted px-5 text-ink`,
	/** A small icon beside what it changes, such as a pencil beside a name. Give it an `aria-label`. */
	icon: `${iconPill} text-muted hover:bg-ink/5 hover:text-ink`,
	/** The main action as one icon, such as Send beside the box a message is written in. */
	iconPrimary: `${iconPill} bg-ink text-white shadow-lg shadow-ink/20 disabled:pointer-events-none disabled:opacity-40`,
	/** A small pill that picks one view of a list. Mark the chosen one with `aria-pressed`. */
	chip: `${chipLook} inline-flex items-center justify-center px-4 hover:bg-white aria-pressed:bg-ink aria-pressed:text-white aria-pressed:ring-ink`,
	/** The same picker as a menu, for when there are too many views to line up as chips. */
	chipSelect: `${chipLook} px-3 text-ink`
};

/** The focus ring of a label whose input is hidden inside it. */
export const labelFocus =
	'has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent';

/** A label drawn as a button, with a file input hidden inside it, faded while it can't be used. */
export const filePicker = `cursor-pointer has-disabled:pointer-events-none has-disabled:opacity-50 ${labelFocus}`;

/**
 * Checkboxes and radios drawn as cards: the input sits hidden in its label, whose look follows it. A button
 * with `aria-pressed` looks the same, for a choice that's sent as soon as it's made, such as a poll's answer.
 * A `card` is a row, and a `tile` a block with an icon. Put a check icon with `choice.check` in a
 * `choice.box`, or in a round `choice.circle` for a radio: the icon marks the state where forced colours
 * remove fills. A disabled input keeps its card's look, which then can't be changed. `choice.option` is a
 * radio that fills with ink when chosen; forced colours drop the fill, so mark the chosen one another way there.
 */
const choosable = `group cursor-pointer border border-ink/10 bg-white/60 text-left transition hover:bg-white has-checked:border-accent has-checked:bg-white has-disabled:pointer-events-none aria-pressed:border-accent aria-pressed:bg-white ${labelFocus}`;
const mark =
	'grid size-6 shrink-0 place-items-center border-2 border-ink/20 bg-white text-white transition group-has-checked:border-accent group-has-checked:bg-accent group-aria-pressed:border-accent group-aria-pressed:bg-accent';

export const choice = {
	card: `${choosable} flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3`,
	tile: `${choosable} flex flex-col gap-3 rounded-3xl p-4`,
	box: `${mark} rounded-lg`,
	circle: `${mark} rounded-full`,
	check: 'size-4 opacity-0 group-has-checked:opacity-100 group-aria-pressed:opacity-100',
	option: `cursor-pointer border border-ink/10 bg-white/60 transition hover:bg-white has-checked:border-ink has-checked:bg-ink has-checked:text-white ${labelFocus}`
};

/** What every field is made of; each kind below sets only its own size and corners. */
const inputLook =
	'border border-ink/15 bg-white/80 text-base text-ink placeholder:text-muted/60 focus-visible:border-accent focus-visible:outline-offset-0';

export const field = {
	label: 'grid gap-1.5',
	name: 'font-semibold',
	hint: 'text-sm text-muted',
	input: `block min-h-12 w-full rounded-2xl px-4 py-3 ${inputLook}`,
	/** A time on one line of the week, narrower than a field of its own with a label above it. */
	time: `min-h-11 rounded-xl px-2 py-1.5 ${inputLook}`
};

/** A panel for a form or a group of actions. */
export const surface = 'rounded-4xl glass p-6 sm:p-8';

/**
 * A row in a list of records, linking to its page: the same shell whatever it holds, so an inbox lines up
 * with every other list (ListLink.svelte, InquiryLink.svelte).
 */
export const listRow =
	'flex items-center gap-4 rounded-3xl glass px-5 py-4 transition hover:bg-white/75';

/** A dialog in the middle of the screen, over the dimmed page. Each sets its own padding. */
export const modal =
	'm-auto w-[calc(100%-2rem)] max-w-md rounded-4xl bg-white text-ink shadow-2xl shadow-indigo-950/25 backdrop:bg-ink/30';

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

/**
 * Moves a screen's clock on every half minute for as long as it's up, saying whether anyone is looking, so
 * that screens which count minutes down also ask for fresh records — but only while they're on show.
 */
export function everyHalfMinute(tick: (visible: boolean) => void) {
	onMount(() => {
		const timer = setInterval(() => tick(document.visibilityState === 'visible'), 30000);
		return () => clearInterval(timer);
	});
}

/**
 * How a notice's text looks, the same on the board (NoticeBody.svelte) and in the editor that writes it. Long
 * links and words break anywhere, as on the rest of the page (app.css), so they never widen a notice.
 */
export const noticeText =
	'text-lg leading-relaxed [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_li>*+*]:mt-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol>*+*]:mt-1 [&_ul]:list-disc [&_ul]:pl-6 [&_ul>*+*]:mt-1 [&>*+*]:mt-3';

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
