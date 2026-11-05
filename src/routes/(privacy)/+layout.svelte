<script lang="ts">
	import BuildLabel from '$lib/components/BuildLabel.svelte';
	import LanguageSwitch from '$lib/components/LanguageSwitch.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { messages } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import { siteUrl } from '$lib/project';
	import type { LayoutProps } from './$types';

	// The privacy policy's frame, in the app's look: the logo, the language switch, and a footer like the
	// app's. The app's footer links here in the same window, and an installed app has no Back button on
	// iPhone and iPad, so the logo leads to the app.
	let { children, data }: LayoutProps = $props();
	const t = $derived(messages[data.locale].footer);
</script>

<div class="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 sm:px-8">
	<SiteHeader href={appPath(data.locale)}>
		<LanguageSwitch locale={data.locale} />
	</SiteHeader>

	<main id="main" class="grow pt-6 pb-8 sm:pt-8">
		{@render children()}
	</main>

	<!-- Each link here opens in a window of its own: this page may be open in the installed app's window,
	where Commit's site, the licenses, or the version's code would leave no way back to the app. The site
	isn't told which installation, and so which kindergarten, it was opened from. -->
	<footer class="flex flex-wrap justify-between gap-x-6 gap-y-2 px-2 pb-6 text-sm text-muted">
		<div class="flex flex-wrap gap-x-6 gap-y-2">
			<a
				class="hover:text-ink"
				href={siteUrl[data.locale]}
				target="_blank"
				rel="noopener noreferrer"
			>
				<span aria-hidden="true">🫧</span>
				{t.about}
			</a>
			<a class="hover:text-ink" href="/third-party-notices.txt" target="_blank" rel="noopener">
				{t.credits}
			</a>
		</div>
		<BuildLabel locale={data.locale} />
	</footer>
</div>
