<script lang="ts">
	import Icon, { type IconName } from './Icon.svelte';
	import IconTile from './IconTile.svelte';
	import { messages, type Locale } from '$lib/i18n';

	type Group = keyof (typeof messages)[Locale]['faq']['groups'];

	// The frequently asked questions, on the landing page and on the walks through the app. The questions are
	// plain details elements, one open at a time in each group, so the page works without JavaScript.
	let { locale }: { locale: Locale } = $props();
	const t = $derived(messages[locale].faq);
	const icons: Record<Group, IconName> = { parents: 'heart', teachers: 'users', technical: 'lock' };
	const groups = $derived(
		(Object.keys(icons) as Group[]).map((key) => ({
			id: `faq-${key}`,
			icon: icons[key],
			...t.groups[key]
		}))
	);
</script>

<section
	id="faq"
	class="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16"
	aria-labelledby="faq-title"
>
	<!-- The intro stays in view while the groups scroll past; its links lead to each group. -->
	<div class="lg:sticky lg:top-24 lg:self-start">
		<h2 id="faq-title" class="mb-4 max-w-2xl text-4xl sm:text-5xl">{t.title}</h2>
		<p class="max-w-md text-lg text-muted">{t.copy}</p>
		<ul class="mt-6 grid gap-2">
			{#each groups as { id, icon, title } (id)}
				<li>
					<a
						class="inline-flex min-h-11 items-center gap-2 font-semibold underline-offset-4 hover:underline"
						href="#{id}"
					>
						<Icon name={icon} class="size-4 shrink-0 text-accent" />{title}
					</a>
				</li>
			{/each}
		</ul>
	</div>
	<div class="grid gap-5">
		{#each groups as { id, icon, title, items } (id)}
			<section {id} class="scroll-mt-24 rounded-4xl glass p-6 sm:p-8" aria-labelledby="{id}-title">
				<h3 id="{id}-title" class="flex items-center gap-4 text-2xl sm:text-3xl">
					<IconTile {icon} tone="ink" />{title}
				</h3>
				<div class="mt-4 divide-y divide-ink/10">
					{#each items as { q, a } (q)}
						<!-- One open question per group: details sharing a name close each other. -->
						<details class="group py-4" name={id}>
							<summary
								class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-bold [&::-webkit-details-marker]:hidden"
							>
								{q}
								<Icon
									name="plus"
									class="size-5 shrink-0 text-accent transition-transform group-open:rotate-45"
								/>
							</summary>
							<p class="mt-2 max-w-prose text-muted">{a}</p>
						</details>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</section>

<style>
	/* A question opens and closes smoothly: the browser animates the answer's height from 0 to its
	   natural size and fades it in. Browsers without ::details-content simply open at once. */
	details {
		interpolate-size: allow-keywords;
	}
	details::details-content {
		height: 0;
		overflow: clip;
		opacity: 0;
		transition:
			height 0.3s ease,
			opacity 0.3s ease,
			content-visibility 0.3s allow-discrete;
	}
	details[open]::details-content {
		height: auto;
		opacity: 1;
	}
	@media (prefers-reduced-motion: reduce) {
		details::details-content {
			transition: none;
		}
	}
</style>
