<script lang="ts">
	import { messages, type Locale } from '$lib/i18n';
	import FaceTag from './FaceTag.svelte';
	import InfoDialog from './InfoDialog.svelte';

	// Every child of a classroom and whether its other families see the child's face, as the review before
	// publishing an event read the consent. It opens when mounted and only shows.
	let {
		locale,
		children,
		shared,
		onclose
	}: {
		locale: Locale;
		children: { id: string; name: string }[];
		shared: Set<string>;
		onclose: () => void;
	} = $props();

	const t = $derived(messages[locale].app.events);
	const sorted = $derived([...children].sort((a, b) => a.name.localeCompare(b.name, locale)));
</script>

<InfoDialog {locale} title={t.faceVisibility} hint={t.faceVisibilityHint} {onclose}>
	<ul class="mt-5 grid max-h-[50vh] gap-3 overflow-y-auto">
		{#each sorted as child (child.id)}
			<li class="flex items-center justify-between gap-3">
				<span class="min-w-0 font-semibold">{child.name}</span>
				<FaceTag {locale} visible={shared.has(child.id)} />
			</li>
		{/each}
	</ul>
</InfoDialog>
