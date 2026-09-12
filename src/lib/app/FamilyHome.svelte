<script lang="ts">
	import Bubble from '$lib/components/Bubble.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { messages, type Locale } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import { getApp } from './state.svelte';
	import { button } from './ui';

	// What a family sees once connected, until notices arrive: the classrooms its card has joined.
	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app);
</script>

<section
	class="relative isolate my-auto overflow-hidden rounded-4xl glass px-7 py-12 text-center sm:px-12 sm:py-16"
>
	<Bubble class="-top-16 -right-16 -z-10 size-48 sm:size-64" />
	<Bubble class="bottom-10 -left-5 -z-10 size-16" />
	<span class="mx-auto grid size-14 place-items-center rounded-2xl bg-sunrise text-white">
		<Icon name="smile" class="size-7" />
	</span>
	<h1 class="mx-auto mt-6 max-w-lg text-4xl sm:text-5xl">{t.family.joined(app.joined)}</h1>
	<p class="mx-auto mt-4 max-w-md text-lg text-muted">{t.family.copy}</p>
	<a class="{button.secondary} mt-8" href={appPath(locale, 'device')}>
		<Icon name="phone" class="size-4" />{t.home.device}
	</a>
</section>
