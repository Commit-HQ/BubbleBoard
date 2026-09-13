<script lang="ts">
	import { goto } from '$app/navigation';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp, Task } from '$lib/app/state.svelte';
	import { alert, button, choice, labelFocus, queryParam, surface } from '$lib/app/ui';
	import Icon from '$lib/components/Icon.svelte';
	import IconTile from '$lib/components/IconTile.svelte';
	import { errorMessage, messages } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import { imageType, preparePhoto } from '$lib/photos';
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
	let photo = $state.raw<Uint8Array<ArrayBuffer>>();
	const preview = $derived(
		photo && URL.createObjectURL(new Blob([photo], { type: imageType(photo) }))
	);
	$effect(() => {
		const url = preview;
		return () => {
			if (url) URL.revokeObjectURL(url);
		};
	});
	/** A file input drawn as a button, faded while it can't be used. */
	const picker = `cursor-pointer has-disabled:pointer-events-none has-disabled:opacity-50 ${labelFocus}`;

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

<Screen locale={data.locale} title={t.photos.newTitle} subtitle={t.photos.newCopy}>
	{#if classrooms.length}
		<div class="{surface} grid gap-7">
			{#if classrooms.length > 1}
				<fieldset>
					<legend class="mb-3 font-semibold">{t.photos.classroom}</legend>
					<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
						{#each classrooms as option (option.id)}
							<label class={choice.tile}>
								<input
									class="sr-only"
									type="radio"
									name="classroom"
									value={option.id}
									checked={option.id === classroom?.id}
									onchange={() => (picked = option.id)}
								/>
								<span class="flex items-start justify-between gap-2">
									<IconTile icon="shapes" />
									<span class={choice.circle}><Icon name="check" class={choice.check} /></span>
								</span>
								<span class="mt-auto leading-snug font-bold">{option.name}</span>
							</label>
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
					<label class="{photo ? button.secondary : button.primary} {picker}">
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
					<label class="{button.secondary} {picker}">
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
