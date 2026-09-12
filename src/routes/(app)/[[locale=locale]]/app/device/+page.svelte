<script lang="ts">
	import { goto } from '$app/navigation';
	import ConfirmDialog from '$lib/app/ConfirmDialog.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp } from '$lib/app/state.svelte';
	import { button, surface } from '$lib/app/ui';
	import Icon from '$lib/components/Icon.svelte';
	import IconTile from '$lib/components/IconTile.svelte';
	import { listNames, messages, teacherName } from '$lib/i18n';
	import { cardKind } from '$lib/kindergarten';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app);
	let confirming = $state(false);

	async function signOut() {
		await app.signOut();
		await goto(appPath(data.locale));
	}
</script>

<Screen locale={data.locale} title={t.device.title} need="anyone">
	<section class={surface}>
		<IconTile icon="phone" tone="ink" />
		{#if app.status === 'staff' && app.me}
			{@const kind = cardKind(app.me)}
			<p class="mt-5 font-display text-3xl">
				{t.device.staff(teacherName(data.locale, app.me))}
			</p>
			<!-- The recovery card's name already says what it is. -->
			{#if kind !== 'recovery'}<p class="mt-1 text-muted">{t.card.kinds[kind]}</p>{/if}
		{:else}
			<p class="mt-5 font-display text-3xl">{t.device.family}</p>
			<p class="mt-1 text-muted">{listNames(data.locale, app.joined)}</p>
		{/if}
		<button class="{button.secondary} mt-7" type="button" onclick={() => (confirming = true)}>
			<Icon name="logOut" class="size-4" />{t.device.signOut}
		</button>
	</section>

	{#if confirming}
		<ConfirmDialog
			locale={data.locale}
			title={t.device.signOutTitle}
			copy={t.device.signOutCopy}
			confirmLabel={t.device.signOut}
			onconfirm={signOut}
			onclose={() => (confirming = false)}
		/>
	{/if}
</Screen>
