<script lang="ts">
	import ConfirmDialog from '$lib/app/ConfirmDialog.svelte';
	import Connect from '$lib/app/Connect.svelte';
	import FamilyHome from '$lib/app/FamilyHome.svelte';
	import StaffHome from '$lib/app/StaffHome.svelte';
	import { getApp } from '$lib/app/state.svelte';
	import StatusView from '$lib/app/StatusView.svelte';
	import { alert } from '$lib/app/ui';
	import { errorMessage, messages, teacherName } from '$lib/i18n';
	import type { PageProps } from './$types';

	// Card links open this page, so it connects devices as well as being home.
	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app.connect);
	const connected = $derived(app.status === 'staff' || app.status === 'family');
	/** What this device stops being if a new card takes its place. */
	const replacing = $derived(
		app.me ? t.replaceStaff(teacherName(data.locale, app.me)) : t.replaceOther
	);
</script>

{#if connected && app.cardError}
	<p class="{alert} mb-6" role="alert">{errorMessage(data.locale, app.cardError)}</p>
{/if}

{#if app.status === 'disconnected'}
	<Connect locale={data.locale} />
{:else if app.status === 'staff'}
	<StaffHome locale={data.locale} />
{:else if app.status === 'family'}
	<FamilyHome locale={data.locale} />
{:else}
	<StatusView locale={data.locale} />
{/if}

{#if app.pendingCard}
	{@const secret = app.pendingCard}
	<ConfirmDialog
		title={t.replaceTitle}
		copy={replacing}
		confirmLabel={t.replaceConfirm}
		cancelLabel={t.keep}
		busyLabel={t.connecting}
		safe
		busy={app.connecting}
		onconfirm={() => app.connect(secret)}
		onclose={() => (app.pendingCard = undefined)}
	/>
{/if}
