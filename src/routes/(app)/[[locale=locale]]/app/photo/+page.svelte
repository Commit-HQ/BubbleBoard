<script lang="ts">
	import { goto } from '$app/navigation';
	import ChoiceTile from '$lib/app/ChoiceTile.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp, Task } from '$lib/app/state.svelte';
	import { alert, button, filePicker, queryParam, surface } from '$lib/app/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { errorMessage, messages } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import { preparePhoto } from '$lib/photos';
	import type { PageProps } from './$types';

	// Putting up a photo of a classroom's board: the classroom, when there are several, then the camera or a
	// photo from the device. The photo is made smaller first and shown as families will see it, then it goes
	// up in place of the classroom's photo.
	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app);
	const task = new Task();
	const classrooms = $derived(app.catalog.classrooms);
	/** The classroom tile tapped on this page. Until then, the classroom the page was opened for. */
	let picked = $state<string>();
	const classroom = $derived(
		classrooms.find(({ id }) => id === (picked ?? queryParam('classroom'))) ??
			(classrooms.length === 1 ? classrooms[0] : undefined)
	);
	const current = $derived(app.photos.find((photo) => photo.classroom === classroom?.id));
	/** The photo, made ready to go up. */
	let photo = $state.raw<Blob>();
	const preview = $derived(photo && URL.createObjectURL(photo));
	$effect(() => {
		const url = preview;
		return () => {
			if (url) URL.revokeObjectURL(url);
		};
	});

	function choose(event: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		const input = event.currentTarget;
		const [chosen] = input.files ?? [];
		input.value = '';
		if (!chosen) return;
		photo = undefined;
		task.run(async () => {
			photo = await preparePhoto(chosen);
		});
	}

	function putUp() {
		if (!photo || !classroom) return;
		const [ready, target] = [photo, classroom.id];
		task.run(async () => {
			await app.putUpPhoto(target, ready);
			await goto(appPath(data.locale));
		});
	}
</script>

<Screen locale={data.locale} title={t.photos.photo} subtitle={t.photos.newCopy}>
	{#if classrooms.length}
		<div class="{surface} grid gap-7">
			{#if classrooms.length > 1}
				<fieldset>
					<legend class="mb-3 font-semibold">{t.photos.classroom}</legend>
					<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
						{#each classrooms as option (option.id)}
							<ChoiceTile
								name="classroom"
								value={option.id}
								checked={option.id === classroom?.id}
								onchange={() => (picked = option.id)}
								icon="shapes"
								title={option.name}
							/>
						{/each}
					</div>
				</fieldset>
			{/if}

			{#if preview}
				<img
					src={preview}
					alt={t.photos.preview}
					class="max-h-[60dvh] w-full rounded-3xl bg-ink/5 object-contain"
				/>
			{/if}

			<div class="grid gap-3">
				<div class="flex flex-wrap gap-2">
					<!-- On phones and tablets, the camera opens; computers choose a file instead. -->
					<label class="{photo ? button.secondary : button.primary} {filePicker}">
						<Icon name="camera" class="size-4" />{photo ? t.photos.retake : t.photos.take}
						<input
							class="sr-only"
							type="file"
							accept="image/*"
							capture="environment"
							disabled={!classroom || task.busy}
							onchange={choose}
						/>
					</label>
					<label class="{button.secondary} {filePicker}">
						<Icon name="image" class="size-4" />{t.photos.choose}
						<input
							class="sr-only"
							type="file"
							accept="image/*"
							disabled={!classroom || task.busy}
							onchange={choose}
						/>
					</label>
				</div>
				{#if !classroom}<p class="text-sm text-muted">{t.photos.chooseClassroom}</p>{/if}
			</div>

			{#if task.error}
				<p class={alert} role="alert">{errorMessage(data.locale, task.error)}</p>
			{/if}
			{#if photo}
				<div class="grid justify-items-start gap-2">
					<button
						class={button.primary}
						type="button"
						disabled={task.busy || !classroom}
						onclick={putUp}
					>
						<Icon name="check" class="size-4" />{task.busy ? t.actions.working : t.photos.putUp}
					</button>
					{#if current}<p class="text-sm text-muted">{t.photos.replaces}</p>{/if}
				</div>
			{:else if task.busy}
				<p class="font-semibold text-muted" role="status">{t.photos.preparing}</p>
			{/if}
		</div>
	{:else}
		<p class="text-muted">{t.notices.noClassrooms}</p>
	{/if}
</Screen>
