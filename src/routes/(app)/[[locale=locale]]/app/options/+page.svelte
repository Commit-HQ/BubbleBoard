<script lang="ts">
	import { goto } from '$app/navigation';
	import ConfirmDialog from '$lib/app/ConfirmDialog.svelte';
	import NotificationSwitch from '$lib/app/NotificationSwitch.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp } from '$lib/app/state.svelte';
	import { button, surface } from '$lib/app/ui';
	import BuildLabel from '$lib/components/BuildLabel.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import IconTile from '$lib/components/IconTile.svelte';
	import LanguageSwitch from '$lib/components/LanguageSwitch.svelte';
	import { listNames, messages, teacherName } from '$lib/i18n';
	import { cardKind } from '$lib/kindergarten';
	import { appPath, homePath } from '$lib/paths';
	import type { PageProps } from './$types';

	// Settings, from the header of every app page. They open on any device, connected or not, because the
	// language is chosen here; a connected device also has its card and notifications.
	let { data }: PageProps = $props();
	const app = getApp();
	const m = $derived(messages[data.locale]);
	const t = $derived(m.app);
	let confirming = $state(false);

	async function signOut() {
		await app.signOut();
		await goto(appPath(data.locale));
	}
</script>

<Screen locale={data.locale} title={t.options.title} need="nothing">
	{#if app.connected}
		<section class={surface}>
			<IconTile icon="phone" tone="ink" />
			{#if app.status === 'staff' && app.me}
				{@const kind = cardKind(app.me)}
				<p class="mt-5 font-display text-3xl">
					{t.options.staff(teacherName(data.locale, app.me))}
				</p>
				<!-- The recovery card's name already says what it is. -->
				{#if kind !== 'recovery'}<p class="mt-1 text-muted">{t.card.kinds[kind]}</p>{/if}
			{:else}
				<p class="mt-5 font-display text-3xl">{t.options.family}</p>
				<p class="mt-1 text-muted">
					{listNames(
						data.locale,
						app.myClassrooms.map(({ name }) => name)
					)}
				</p>
			{/if}
			<button class="{button.secondary} mt-7" type="button" onclick={() => (confirming = true)}>
				<Icon name="logOut" class="size-4" />{t.options.signOut}
			</button>
		</section>

		<section class={surface} aria-labelledby="notifications-title">
			<IconTile icon="bell" tone="ink" />
			<h2 id="notifications-title" class="mt-5 text-3xl">{t.notifications.title}</h2>
			<p class="mt-1 text-muted">{t.notifications[app.notifications]}</p>
			<NotificationSwitch locale={data.locale} />
		</section>
	{/if}

	<section class={surface} aria-labelledby="language-title">
		<IconTile icon="globe" tone="ink" />
		<h2 id="language-title" class="mt-5 text-3xl">{m.language}</h2>
		<div class="mt-6 max-w-sm">
			<LanguageSwitch locale={data.locale} names />
		</div>
	</section>

	<div class="flex flex-wrap justify-between gap-x-6 gap-y-2 px-2 text-sm text-muted">
		<!-- In a window of its own: the installed app has no way back from the landing page. -->
		<a class="hover:text-ink" href={homePath(data.locale)} target="_blank" rel="noopener noreferrer"
			>{t.options.about}</a
		>
		<BuildLabel locale={data.locale} />
	</div>

	{#if confirming}
		<ConfirmDialog
			locale={data.locale}
			title={t.options.signOutTitle}
			copy={t.options.signOutCopy}
			confirmLabel={t.options.signOut}
			onconfirm={signOut}
			onclose={() => (confirming = false)}
		/>
	{/if}
</Screen>
