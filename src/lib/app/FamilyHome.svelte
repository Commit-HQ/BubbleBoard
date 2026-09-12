<script lang="ts">
	import Bubble from '$lib/components/Bubble.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { listNames, messages, type Locale } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import Board from './Board.svelte';
	import { getApp } from './state.svelte';
	import { button } from './ui';

	// A family's home: the board of its children's classrooms.
	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app);
</script>

<section class="grid gap-8">
	<div class="relative isolate">
		<!-- The logo's big and small bubbles, drifting beside the heading. -->
		<Bubble class="-top-6 right-0 -z-10 size-20 sm:size-24" />
		<Bubble class="top-14 right-20 -z-10 size-9 sm:right-28" />
		<h1 class="pr-24 text-4xl sm:text-5xl">{t.notices.title}</h1>
		<p class="mt-2 text-lg text-muted">
			{listNames(
				locale,
				app.familyClassrooms.map(({ name }) => name)
			)}
		</p>
	</div>
	<div class="grid gap-4">
		<Board {locale} empty={t.notices.empty} />
	</div>
	<a class="{button.secondary} justify-self-start" href={appPath(locale, 'device')}>
		<Icon name="phone" class="size-4" />{t.home.device}
	</a>
</section>
