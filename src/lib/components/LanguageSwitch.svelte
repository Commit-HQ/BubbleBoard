<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { locales, messages, type Locale } from '$lib/i18n';
	import { localizedPath } from '$lib/paths';

	let { locale }: { locale: Locale } = $props();
	// App pages keep their query, which holds record IDs, never a card. Prerendering can't read it.
	const search = $derived(browser ? page.url.search : '');
</script>

<nav class="flex rounded-full bg-ink/5 p-0.5" aria-label={messages[locale].language}>
	{#each locales as option (option)}
		<!-- Forced colours drop the dark fill, so the current language is underlined there instead. -->
		<a
			class="grid min-h-11 min-w-11 place-items-center rounded-full text-sm font-bold text-muted transition-colors aria-[current=page]:bg-ink aria-[current=page]:text-white forced-colors:aria-[current=page]:underline"
			href={localizedPath(page.url.pathname, option) + search}
			hreflang={option}
			lang={option}
			aria-label={messages[option].languageName}
			aria-current={option === locale ? 'page' : undefined}>{option.toUpperCase()}</a
		>
	{/each}
</nav>
