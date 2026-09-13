<script lang="ts">
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import { UnreadableError } from '$lib/crypto';
	import { messages, type Locale } from '$lib/i18n';
	import {
		allowedLink,
		readDocument,
		textColours,
		type NoticeDocument,
		type TextColour
	} from '$lib/notices';
	import type { ChainedCommands, Editor } from '@tiptap/core';
	import { onMount } from 'svelte';
	import { button, field, noticeText, textColourClass } from './ui';

	// The notice editor: Tiptap 3, imported when this component mounts, so only the page where notices are
	// written downloads it (next-step-plan.md, Editor). Its schema holds what boards render: paragraphs,
	// lists, bold, italic, links, and palette colours. Tiptap's injected stylesheet is off for the CSP, with
	// its rules in app.css, and a colour is a mark that renders a class.
	let {
		locale,
		content,
		labelledby,
		paper,
		ready = $bindable(false)
	}: {
		locale: Locale;
		content?: NoticeDocument;
		/** The ID of the text that names the editor. */
		labelledby: string;
		/** The background class of the notice's paper. */
		paper: string;
		ready?: boolean;
	} = $props();

	const t = $derived(messages[locale].app.editor);
	const emoji = [
		'😊',
		'😂',
		'🥰',
		'👍',
		'👏',
		'🙏',
		'❤️',
		'⭐',
		'🎉',
		'🎈',
		'🎂',
		'🎁',
		'🎨',
		'🎵',
		'📚',
		'✏️',
		'🧸',
		'⚽',
		'🍎',
		'🍕',
		'🧃',
		'☀️',
		'🌈',
		'🌳',
		'🍂',
		'❄️',
		'☔',
		'🧤',
		'📅',
		'⏰',
		'🚌',
		'🏠'
	];
	let element = $state<HTMLDivElement>();
	let editor = $state.raw<Editor>();
	/** The formatting at the selection, for the toolbar. */
	let active = $state.raw({
		bold: false,
		italic: false,
		bulletList: false,
		orderedList: false,
		link: false,
		colour: undefined as TextColour | undefined
	});
	let panel = $state<'link' | 'colour' | 'emoji'>();
	let linkInput = $state<HTMLInputElement>();
	let linkRefused = $state(false);

	onMount(() => {
		let closed = false;
		let instance: Editor | undefined;
		(async () => {
			const [{ Editor, Mark }, { default: StarterKit }] = await Promise.all([
				import('@tiptap/core'),
				import('@tiptap/starter-kit')
			]);
			if (closed || !element) return;
			const Colour = Mark.create({
				name: 'colour',
				addAttributes() {
					return {
						colour: {
							default: null,
							parseHTML: (node) => node.dataset.colour,
							renderHTML: ({ colour }) => ({
								'data-colour': colour,
								class: textColourClass[colour as TextColour]
							})
						}
					};
				},
				parseHTML() {
					const known = (node: HTMLElement) =>
						textColours.includes(node.dataset.colour as TextColour);
					return [{ tag: 'span[data-colour]', getAttrs: (node) => (known(node) ? null : false) }];
				},
				renderHTML({ HTMLAttributes }) {
					return ['span', HTMLAttributes, 0];
				}
			});
			instance = new Editor({
				element,
				injectCSS: false,
				extensions: [
					StarterKit.configure({
						blockquote: false,
						code: false,
						codeBlock: false,
						heading: false,
						horizontalRule: false,
						strike: false,
						underline: false,
						link: {
							openOnClick: false,
							autolink: true,
							defaultProtocol: 'https',
							isAllowedUri: (url) => allowedLink(url)
						}
					}),
					Colour
				],
				content: content ?? '',
				editorProps: {
					attributes: {
						class: `min-h-48 px-5 py-4 focus:outline-none ${noticeText}`,
						role: 'textbox',
						'aria-multiline': 'true',
						'aria-labelledby': labelledby
					}
				},
				onTransaction: ({ editor: current }) => show(current)
			});
			editor = instance;
			show(instance);
			ready = true;
		})();
		return () => {
			closed = true;
			instance?.destroy();
			ready = false;
		};
	});

	function show(current: Editor) {
		active = {
			bold: current.isActive('bold'),
			italic: current.isActive('italic'),
			bulletList: current.isActive('bulletList'),
			orderedList: current.isActive('orderedList'),
			link: current.isActive('link'),
			colour: textColours.find((colour) => current.isActive('colour', { colour }))
		};
	}

	/** The notice's text as boards will read it, or undefined when it holds more than they show. */
	export function getDocument(): NoticeDocument | undefined {
		if (!editor) return undefined;
		try {
			return readDocument(editor.getJSON());
		} catch (cause) {
			if (cause instanceof UnreadableError) return undefined;
			throw cause;
		}
	}

	export function isEmpty() {
		return editor?.isEmpty ?? true;
	}

	function run(command: (chain: ChainedCommands) => ChainedCommands) {
		if (editor) command(editor.chain().focus()).run();
	}

	function toggle(choice: 'link' | 'colour' | 'emoji') {
		panel = panel === choice ? undefined : choice;
		linkRefused = false;
	}

	/** Links the selection, or adds the address as a link where there's no selection. */
	function addLink() {
		const typed = linkInput?.value.trim() ?? '';
		const href = /^[a-z][\w+.-]*:/i.test(typed)
			? typed
			: typed.includes('@') && !typed.includes('/')
				? `mailto:${typed}`
				: `https://${typed}`;
		if (!typed || !allowedLink(href)) {
			linkRefused = true;
			return;
		}
		const empty = editor?.state.selection.empty && !editor.isActive('link');
		run((chain) =>
			empty
				? chain.insertContent({
						type: 'text',
						text: typed,
						marks: [{ type: 'link', attrs: { href } }]
					})
				: chain.extendMarkRange('link').setLink({ href })
		);
		panel = undefined;
	}

	function removeLink() {
		run((chain) => chain.extendMarkRange('link').unsetLink());
		panel = undefined;
	}
</script>

{#snippet tool(icon: IconName, label: string, pressed: boolean | undefined, onclick: () => void)}
	<button
		class="grid size-11 place-items-center rounded-xl text-ink transition hover:bg-ink/5 disabled:opacity-40 aria-expanded:bg-ink/10 aria-pressed:bg-ink aria-pressed:text-white"
		type="button"
		aria-label={label}
		title={label}
		aria-pressed={pressed}
		disabled={!editor}
		{onclick}
	>
		<Icon name={icon} class="size-5" />
	</button>
{/snippet}

<div
	class="overflow-hidden rounded-3xl ring-1 ring-ink/15 transition focus-within:ring-2 focus-within:ring-accent {paper}"
>
	<div
		class="flex flex-wrap gap-1 border-b border-ink/10 bg-white/50 p-1.5"
		role="toolbar"
		aria-label={t.toolbar}
	>
		{@render tool('bold', t.bold, active.bold, () => run((chain) => chain.toggleBold()))}
		{@render tool('italic', t.italic, active.italic, () => run((chain) => chain.toggleItalic()))}
		{@render tool('list', t.bulletList, active.bulletList, () =>
			run((chain) => chain.toggleBulletList())
		)}
		{@render tool('listOrdered', t.orderedList, active.orderedList, () =>
			run((chain) => chain.toggleOrderedList())
		)}
		{@render tool('link', t.link, undefined, () => toggle('link'))}
		{@render tool('palette', t.colour, undefined, () => toggle('colour'))}
		{@render tool('smile', t.emoji, undefined, () => toggle('emoji'))}
	</div>

	{#if panel === 'link'}
		<div class="grid gap-2 border-b border-ink/10 bg-white/50 p-3">
			<label class={field.label}>
				<span class="text-sm font-semibold">{t.linkAddress}</span>
				<input
					bind:this={linkInput}
					class={field.input}
					type="text"
					inputmode="url"
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
					placeholder="https://"
					value={editor?.getAttributes('link').href ?? ''}
					onkeydown={(event) => {
						// Enter adds the link instead of sending the notice's form.
						if (event.key === 'Enter') {
							event.preventDefault();
							addLink();
						}
					}}
				/>
			</label>
			{#if linkRefused}<p class="text-sm font-semibold text-red-800" role="alert">
					{t.invalidLink}
				</p>{/if}
			<div class="flex flex-wrap gap-2">
				<button class={button.secondary} type="button" onclick={addLink}>{t.addLink}</button>
				{#if active.link}
					<button class={button.quiet} type="button" onclick={removeLink}>{t.removeLink}</button>
				{/if}
			</div>
		</div>
	{:else if panel === 'colour'}
		<div
			class="flex flex-wrap gap-2 border-b border-ink/10 bg-white/50 p-3"
			role="group"
			aria-label={t.colour}
		>
			{#each [undefined, ...textColours] as colour (colour ?? 'ink')}
				<button
					class="grid size-11 place-items-center rounded-full ring-1 ring-ink/10 hover:bg-ink/5 aria-pressed:ring-3 aria-pressed:ring-accent"
					type="button"
					aria-label={t.colours[colour ?? 'ink']}
					title={t.colours[colour ?? 'ink']}
					aria-pressed={active.colour === colour}
					onclick={() =>
						run((chain) =>
							colour ? chain.setMark('colour', { colour }) : chain.unsetMark('colour')
						)}
				>
					<span
						class="size-6 rounded-full bg-current {colour ? textColourClass[colour] : 'text-ink'}"
					></span>
				</button>
			{/each}
		</div>
	{:else if panel === 'emoji'}
		<div
			class="flex flex-wrap gap-1 border-b border-ink/10 bg-white/50 p-2"
			role="group"
			aria-label={t.emoji}
		>
			{#each emoji as symbol (symbol)}
				<button
					class="grid size-11 place-items-center rounded-xl text-2xl hover:bg-ink/5"
					type="button"
					onclick={() => run((chain) => chain.insertContent(symbol))}>{symbol}</button
				>
			{/each}
		</div>
	{/if}

	{#if !editor}<p class="px-5 py-4 text-lg text-muted" role="status">{t.loading}</p>{/if}
	<div bind:this={element}></div>
</div>
