<script lang="ts">
	import { page } from '$app/state';
	import { locales, messages, type Locale } from '$lib/i18n';
	import { localizedPath } from '$lib/paths';

	// Plain links to the current page in each language: codes in the landing page's header, or with `names`,
	// the languages' names, as in the app's settings.
	let { locale, names = false }: { locale: Locale; names?: boolean } = $props();
</script>

<nav class="flex rounded-full bg-ink/5 p-0.5" aria-label={messages[locale].language}>
	{#each locales as option (option)}
		<!-- Forced colours drop the dark fill, so the current language is underlined there instead. -->
		<a
			class="grid min-h-11 min-w-11 place-items-center rounded-full text-sm font-bold text-muted transition-colors aria-[current=page]:bg-ink aria-[current=page]:text-white forced-colors:aria-[current=page]:underline {names
				? 'grow px-5 text-base'
				: ''}"
			href={localizedPath(page.url.pathname, option)}
			hreflang={option}
			lang={option}
			aria-label={names ? undefined : messages[option].languageName}
			aria-current={option === locale ? 'page' : undefined}
			>{names ? messages[option].languageName : option.toUpperCase()}</a
		>
	{/each}
</nav>
