<script lang="ts">
	import { surface } from '$lib/app/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { messages } from '$lib/i18n';
	import { privacyContact } from '$lib/project';
	import type { PageProps } from './$types';

	// A few short points on what an installation stores, where, and for how long (privacyPolicy in en.ts),
	// after who answers for it, as the installation's settings name them (src/lib/project.ts).
	let { data }: PageProps = $props();
	const t = $derived(messages[data.locale].privacyPolicy);
	const { email, kindergarten, operator } = privacyContact;
	const responsible = $derived(
		[
			kindergarten ? t.responsible.kindergarten(kindergarten) : t.responsible.yourKindergarten,
			operator ? t.responsible.operator(operator) : ''
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<svelte:head>
	<title>BubbleBoard · {t.title}</title>
	<meta name="description" content={t.description} />
</svelte:head>

<article>
	<h1 class="text-4xl sm:text-5xl">{t.title}</h1>
	<p class="mt-2 text-lg text-muted">{t.updated}</p>

	<div class="{surface} mt-6">
		<ul class="grid gap-6">
			<li>
				<h2 class="text-xl">{t.responsible.title}</h2>
				<p class="mt-1">{responsible}</p>
			</li>
			{#each t.points as { title, copy } (title)}
				<li>
					<h2 class="text-xl">{title}</h2>
					<p class="mt-1">{copy}</p>
				</li>
			{/each}
		</ul>
		<a
			class="mt-8 inline-flex items-center gap-2 font-semibold underline underline-offset-4"
			href="mailto:{email}"
		>
			<Icon name="mail" class="size-4 shrink-0" />{email}
		</a>
	</div>
</article>
