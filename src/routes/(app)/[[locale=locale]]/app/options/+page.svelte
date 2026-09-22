<script lang="ts">
	import { goto } from '$app/navigation';
	import PhotoConsent from '$lib/app/PhotoConsent.svelte';
	import Checklist from '$lib/app/Checklist.svelte';
	import ConfirmDialog from '$lib/app/ConfirmDialog.svelte';
	import Devices from '$lib/app/Devices.svelte';
	import NotificationSwitch from '$lib/app/NotificationSwitch.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp, Task } from '$lib/app/state.svelte';
	import { alert, button, field, surface } from '$lib/app/ui';
	import Icon from '$lib/components/Icon.svelte';
	import IconTile from '$lib/components/IconTile.svelte';
	import LanguageSwitch from '$lib/components/LanguageSwitch.svelte';
	import { errorMessage, listNames, messages, teacherName } from '$lib/i18n';
	import { cardKind } from '$lib/kindergarten';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';

	// Settings, from the header of a connected device's pages: its notifications, then the language, on a family
	// device the family's devices, those connected and adding another, and its card with signing out at the
	// bottom. They open on any device, because the header also has them while the app starts; a device
	// that turns out not to be connected sees only the language.
	let { data }: PageProps = $props();
	const app = getApp();
	const m = $derived(messages[data.locale]);
	const t = $derived(m.app);
	let confirming = $state(false);
	/**
	 * The classrooms the head hears about, the other side of the muted ones the server keeps. She belongs to
	 * no classroom, so without this she'd hear about every one of them.
	 */
	let notified = $state<string[]>([]);
	const notifyTask = new Task();
	let notifySaved = $state(false);

	// The server's word always wins: what it sent on connecting, and what it sends back after a save.
	$effect(() => {
		notified = app.catalog.classrooms
			.map(({ id }) => id)
			.filter((id) => !app.mutedClassrooms.includes(id));
	});

	/**
	 * A row of tick boxes has nothing to submit, so each tick saves on its own. A tick made while a save is
	 * still on its way saves again once it's done, so no choice is lost to the one before it.
	 */
	let saving: Promise<void> | undefined;
	function saveNotified() {
		notifySaved = false;
		const wanted = [...notified];
		const previous = saving ?? Promise.resolve();
		saving = previous.then(() =>
			notifyTask.run(async () => {
				await app.setNotifiedClassrooms(wanted);
				notifySaved = true;
			})
		);
	}

	async function signOut() {
		await app.signOut();
		await goto(appPath(data.locale));
	}
</script>

<Screen locale={data.locale} title={t.options.title} need="nothing">
	{#if app.connected}
		<section class={surface} aria-labelledby="notifications-title">
			<IconTile icon="bell" tone="ink" />
			<h2 id="notifications-title" class="mt-5 text-3xl">{t.notifications.title}</h2>
			<p class="mt-1 text-muted">{t.notifications[app.notifications]}</p>
			<NotificationSwitch locale={data.locale} />
			{#if app.head && app.catalog.classrooms.length}
				<div class="mt-7 grid gap-3 border-t border-ink/10 pt-6" onchange={saveNotified}>
					<Checklist
						locale={data.locale}
						label={t.notifications.classrooms}
						options={app.catalog.classrooms.map(({ id, name }) => ({ value: id, label: name }))}
						bind:chosen={notified}
					/>
					<p class={field.hint}>{t.notifications.classroomsHint}</p>
					{#if notifyTask.error}
						<p class={alert} role="alert">{errorMessage(data.locale, notifyTask.error)}</p>
					{:else if notifySaved}
						<p class="font-semibold text-muted" role="status">{t.actions.saved}</p>
					{/if}
				</div>
			{/if}
		</section>
	{/if}

	<section class={surface} aria-labelledby="language-title">
		<IconTile icon="globe" tone="ink" />
		<h2 id="language-title" class="mt-5 text-3xl">{m.language}</h2>
		<div class="mt-6 max-w-sm">
			<LanguageSwitch locale={data.locale} names />
		</div>
	</section>

	{#if app.status === 'family'}
		<PhotoConsent locale={data.locale} />
		<Devices locale={data.locale} />
	{/if}

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
				<p class="mt-3 text-sm text-muted">{t.options.lostCode}</p>
			{/if}
			<button class="{button.secondary} mt-7" type="button" onclick={() => (confirming = true)}>
				<Icon name="logOut" class="size-4" />{t.options.signOut}
			</button>
		</section>
	{/if}

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
