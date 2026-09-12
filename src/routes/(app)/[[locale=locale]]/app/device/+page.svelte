<script lang="ts">
	import { goto } from '$app/navigation';
	import ConfirmDialog from '$lib/app/ConfirmDialog.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp, Task } from '$lib/app/state.svelte';
	import { button } from '$lib/app/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { errorMessage, listNames, messages, teacherName } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app);
	const task = new Task(app);
	let confirming = $state(false);

	async function signOut() {
		if (await task.run(() => app.signOut())) await goto(appPath(data.locale));
	}
</script>

<Screen locale={data.locale} title={t.device.title} need="anyone">
	<section class="rounded-4xl glass p-6 sm:p-8">
		<span class="grid size-11 place-items-center rounded-2xl bg-ink text-white">
			<Icon name="phone" />
		</span>
		{#if app.status === 'staff' && app.me}
			<p class="mt-5 font-display text-3xl">
				{t.device.staff(teacherName(data.locale, app.me))}
			</p>
			{#if !app.me.recovery}
				<p class="mt-1 text-muted">{app.admin ? t.card.kinds.admin : t.card.kinds.teacher}</p>
			{/if}
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
			title={t.device.signOutTitle}
			copy={t.device.signOutCopy}
			confirmLabel={t.device.signOut}
			cancelLabel={t.actions.cancel}
			busy={task.busy}
			error={task.error && errorMessage(data.locale, task.error)}
			onconfirm={signOut}
			onclose={() => (confirming = false)}
		/>
	{/if}
</Screen>
