<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { onDestroy, untrack } from 'svelte';
	import { createId } from '$lib/crypto';
	import { LocalFaceDetector } from '$lib/events/detector';
	import {
		assign,
		boundedRect,
		commit,
		detectionRegion,
		emptyEdit,
		manualRegion,
		maxEventPhotos,
		maxRegions,
		overlaps,
		redo,
		undo,
		unresolved,
		type History,
		type Rect
	} from '$lib/events/editor';
	import { prepareEditorImage, safePreview } from '$lib/events/images';
	import { messages, type Locale } from '$lib/i18n';
	import Icon from '$lib/components/Icon.svelte';
	import FaceCanvas from './FaceCanvas.svelte';
	import { getApp } from './state.svelte';
	import { alert, button, field, filePicker } from './ui';

	type Photo = {
		id: string;
		blob: Blob;
		url: string;
		width: number;
		height: number;
		history: History;
		detection: 'pending' | 'ready' | 'failed' | 'manual';
		generation: number;
	};
	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app.eventEditor);
	let classroom = $state(app.myClassrooms.length === 1 ? app.myClassrooms[0].id : '');
	let photos = $state.raw<Photo[]>([]);
	let current = $state('');
	let loading = $state(false);
	let detecting = $state('');
	let error = $state('');
	let feedback = $state('');
	let search = $state('');
	let original = $state(false);
	let zoom = $state(1);
	let viewCenter = $state<{ x: number; y: number }>();
	let preview = $state(false);
	let previewUrl = $state('');
	let previewBusy = $state(false);
	let previewError = $state(false);
	let disposed = false;
	const detector = new LocalFaceDetector();
	const urls = new Set<string>();
	const photo = $derived(photos.find((p) => p.id === current));
	const edit = $derived(photo?.history.present);
	const selected = $derived(edit?.regions.find((r) => r.id === edit.selected));
	const children = $derived(app.catalog.children.filter((c) => c.classroom === classroom));
	const filtered = $derived(
		children.filter((c) =>
			c.name.toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale))
		)
	);
	const allReviewed = $derived(
		photos.length > 0 && photos.every((p) => p.history.present.reviewed) && !loading && !detecting
	);
	const overlap = $derived(
		edit?.regions.some((a, i) => edit.regions.slice(i + 1).some((b) => overlaps(a, b))) ?? false
	);
	const roster = $derived(children.map((c) => `${c.id}:${c.name}`).join('|'));
	let lastRoster = $state(untrack(() => roster));
	$effect(() => {
		if (roster !== lastRoster) {
			lastRoster = roster;
			if (photos.length) {
				photos = photos.map((p) => ({
					...p,
					history: {
						past: [],
						future: [],
						present: {
							...p.history.present,
							reviewed: false,
							regions: p.history.present.regions.map((r) =>
								r.child && !children.some((c) => c.id === r.child)
									? { ...r, child: null, covered: false }
									: r
							)
						}
					}
				}));
				preview = false;
				feedback = t.rosterChanged;
			}
		}
	});
	function url(blob: Blob) {
		const value = URL.createObjectURL(blob);
		urls.add(value);
		return value;
	}
	function revoke(value: string) {
		if (value) {
			URL.revokeObjectURL(value);
			urls.delete(value);
		}
	}
	function update(id: string, change: (photo: Photo) => Photo) {
		photos = photos.map((p) => (p.id === id ? change(p) : p));
	}
	function setHistory(history: History) {
		if (photo) update(photo.id, (p) => ({ ...p, history }));
	}
	function select(id: string) {
		if (photo)
			setHistory({ ...photo.history, present: { ...photo.history.present, selected: id } });
		search = '';
	}
	function switchPhoto(id: string) {
		current = id;
		original = false;
		zoom = 1;
		viewCenter = undefined;
		search = '';
		feedback = '';
	}
	function changeRegion(id: string, rect: Rect) {
		if (!photo) return;
		setHistory(
			commit(
				photo.history,
				photo.history.present.regions.map((r) =>
					r.id === id ? { ...r, ...boundedRect(rect, photo.width, photo.height) } : r
				),
				id
			)
		);
	}
	function addCover() {
		if (!photo || !edit || edit.regions.length >= maxRegions) {
			error = t.tooManyFaces;
			return;
		}
		const region = manualRegion(
			createId(),
			photo.width,
			photo.height,
			viewCenter?.x,
			viewCenter?.y
		);
		setHistory(commit(photo.history, [...edit.regions, region], region.id));
		original = false;
		search = '';
	}
	function nameFace(child: string | null) {
		if (!photo || !selected) return;
		setHistory(assign(photo.history, selected.id, child));
		search = '';
		original = false;
		feedback = child ? t.assigned(children.find((c) => c.id === child)?.name ?? '') : t.coveredDone;
	}
	function removeCover() {
		if (!photo || !selected) return;
		setHistory(
			commit(
				photo.history,
				photo.history.present.regions.filter((r) => r.id !== selected.id),
				null
			)
		);
	}
	async function detect(id: string) {
		const target = photos.find((p) => p.id === id);
		if (!target || detecting) return;
		const generation = target.generation + 1;
		update(id, (p) => ({ ...p, generation, detection: 'pending' }));
		detecting = id;
		try {
			const bitmap = await createImageBitmap(target.blob);
			if (disposed || photos.find((p) => p.id === id)?.generation !== generation) {
				bitmap.close();
				return;
			}
			const boxes = await detector.detect(bitmap);
			if (disposed) return;
			update(id, (p) => {
				if (p.generation !== generation) return p;
				// Never replace manual corrections. Overlapping neighbouring faces still need separate labels.
				const additions = boxes
					.filter(
						(b) =>
							b.width > 0 && b.height > 0 && [b.x, b.y, b.width, b.height].every(Number.isFinite)
					)
					.map((b) => detectionRegion(createId(), b, p.width, p.height))
					.filter(
						(b) =>
							!p.history.present.regions.some((r) => {
								const area =
									Math.max(0, Math.min(r.x + r.width, b.x + b.width) - Math.max(r.x, b.x)) *
									Math.max(0, Math.min(r.y + r.height, b.y + b.height) - Math.max(r.y, b.y));
								return area / (r.width * r.height + b.width * b.height - area) > 0.8;
							})
					);
				if (p.history.present.regions.length + additions.length > maxRegions) {
					error = t.tooManyFaces;
					return { ...p, detection: 'failed' };
				}
				return {
					...p,
					detection: 'ready',
					history: additions.length
						? commit(
								p.history,
								[...p.history.present.regions, ...additions],
								p.history.present.selected ?? additions[0].id
							)
						: p.history
				};
			});
		} catch {
			if (!disposed)
				update(id, (p) => (p.generation === generation ? { ...p, detection: 'failed' } : p));
		} finally {
			if (detecting === id) detecting = '';
		}
	}
	function manual() {
		if (!photo) return;
		const id = photo.id;
		update(id, (p) => ({ ...p, generation: p.generation + 1, detection: 'manual' }));
		if (detecting === id) detector.close();
	}
	async function addPhotos(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		input.value = '';
		if (!files.length) return;
		if (
			files.length + photos.length > maxEventPhotos ||
			files.some((f) => f.size > 50 * 1024 * 1024)
		) {
			error = t.limit;
			return;
		}
		loading = true;
		error = '';
		try {
			for (const file of files) {
				if (disposed) break;
				try {
					const image = await prepareEditorImage(file);
					if (disposed) break;
					const item: Photo = {
						...image,
						id: createId(),
						url: url(image.blob),
						history: emptyEdit(),
						detection: 'pending',
						generation: 0
					};
					photos = [...photos, item];
					if (!current) switchPhoto(item.id);
					await detect(item.id);
				} catch {
					if (!disposed) error = t.unusable;
				}
			}
		} finally {
			loading = false;
		}
	}
	function reviewPhoto() {
		if (!photo || unresolved(photo.history.present) || photo.detection === 'pending') return;
		setHistory({
			...photo.history,
			present: { ...photo.history.present, selected: null, reviewed: true }
		});
		const next = photos.find((p) => !p.history.present.reviewed);
		if (next) switchPhoto(next.id);
		else {
			original = false;
			feedback = t.allReviewed;
		}
	}
	function removePhoto() {
		if (!photo) return;
		const id = photo.id;
		if (detecting === id) detector.close();
		revoke(photo.url);
		photos = photos.filter((p) => p.id !== id);
		switchPhoto(photos[0]?.id ?? '');
		if (!photos.length) preview = false;
	}
	$effect(() => {
		const target = photo;
		if (!preview || !target) {
			untrack(() => {
				revoke(previewUrl);
				previewUrl = '';
			});
			return;
		}
		let cancelled = false;
		previewBusy = true;
		previewError = false;
		untrack(() => {
			revoke(previewUrl);
			previewUrl = '';
		});
		safePreview(target.blob, target.history.present.regions)
			.then((blob) => {
				if (!cancelled && !disposed) previewUrl = url(blob);
			})
			.catch(() => {
				if (!cancelled) previewError = true;
			})
			.finally(() => {
				if (!cancelled) previewBusy = false;
			});
		return () => {
			cancelled = true;
		};
	});
	beforeNavigate(({ cancel, type }) => {
		if (photos.length && type !== 'leave' && !window.confirm(t.leave)) cancel();
	});
	onDestroy(() => {
		disposed = true;
		detector.close();
		for (const value of urls) URL.revokeObjectURL(value);
		urls.clear();
	});
</script>

<svelte:window
	onblur={() => (original = false)}
	onbeforeunload={(event) => {
		if (photos.length) {
			event.preventDefault();
			event.returnValue = '';
		}
	}}
/>
<svelte:document
	onvisibilitychange={() => {
		if (document.hidden) original = false;
	}}
/>

<div class="grid gap-5">
	<p class="text-sm text-muted">{t.local}</p>
	{#if error}<p class={alert} role="alert">{error}</p>{/if}
	<div class="flex flex-wrap items-end gap-3">
		<label class="{field.label} min-w-48 flex-1"
			><span class={field.name}>{t.classroom}</span><select
				class={field.input}
				bind:value={classroom}
				disabled={photos.length > 0 || loading}
				><option value="" disabled>{t.classroom}</option>{#each app.myClassrooms as c}<option
						value={c.id}>{c.name}</option
					>{/each}</select
			></label
		>
		{#if !preview}<label class="{button.primary} {filePicker}"
				>{t.add}<input
					class="sr-only"
					type="file"
					accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
					multiple
					onchange={addPhotos}
					disabled={!classroom || loading || !!detecting || photos.length >= maxEventPhotos}
				/></label
			>{/if}
	</div>
	{#if loading}<p role="status">{t.loading}</p>{/if}
	{#if photos.length}
		<div class="flex flex-wrap gap-2" aria-label={t.title}>
			{#each photos as item, i (item.id)}
				<button
					type="button"
					class="{button.chip} gap-2"
					aria-pressed={item.id === current}
					onclick={() => switchPhoto(item.id)}
					><img src={item.url} alt="" class="size-10 rounded-lg object-cover" /><span>{i + 1}</span
					><span
						>{item.history.present.reviewed
							? t.reviewed
							: item.detection === 'pending'
								? t.detecting
								: t.reviewNeeded}</span
					></button
				>
			{/each}
		</div>
	{/if}
	{#if photo && edit}
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h2 class="text-2xl">{t.photo(photos.indexOf(photo) + 1, photos.length)}</h2>
			{#if !preview}<button type="button" class={button.danger} onclick={removePhoto}
					>{t.removePhoto}</button
				>{/if}
		</div>
		{#if preview}
			<p class="text-muted">{t.previewHint}</p>
			{#if previewBusy}<p role="status">{t.loading}</p>{:else if previewError}<p
					class={alert}
					role="alert"
				>
					{t.previewFailed}
				</p>{:else if previewUrl}<img
					src={previewUrl}
					alt={t.photo(photos.indexOf(photo) + 1, photos.length)}
					class="max-h-[70dvh] w-full rounded-2xl object-contain"
				/>{/if}
			<button
				type="button"
				class="{button.secondary} justify-self-start"
				onclick={() => {
					preview = false;
					original = false;
				}}>{t.back}</button
			>
		{:else}
			{#if photo.detection === 'pending'}<div
					class="flex flex-wrap items-center gap-3"
					role="status"
				>
					<span>{t.detecting}</span><button type="button" class={button.secondary} onclick={manual}
						>{t.manual}</button
					>
				</div>
			{:else if photo.detection === 'failed'}<p class={alert} role="status">{t.failed}</p>
				<button
					class="{button.secondary} justify-self-start"
					type="button"
					disabled={!!detecting || loading}
					onclick={() => detect(photo!.id)}>{t.retry}</button
				>
			{:else if photo.detection === 'ready' && !edit.regions.length}<p class="text-muted">
					{t.noFaces}
				</p>{/if}
			<div class="grid min-w-0 gap-3">
				<div class="grid min-w-0 gap-3">
					<div class="flex flex-wrap items-center gap-2">
						<button
							type="button"
							class={button.primary}
							onclick={addCover}
							disabled={edit.regions.length >= maxRegions}>{t.addCover}</button
						><button
							type="button"
							class="{button.secondary} aria-pressed:ring-2 aria-pressed:ring-ink"
							aria-pressed={original}
							onclick={() => (original = !original)}>{original ? t.covers : t.original}</button
						><button
							type="button"
							class="{button.icon} disabled:opacity-40"
							aria-label={t.undo}
							title={t.undo}
							disabled={!photo.history.past.length}
							onclick={() => setHistory(undo(photo!.history))}><Icon name="undo" /></button
						><button
							type="button"
							class="{button.icon} disabled:opacity-40"
							aria-label={t.redo}
							title={t.redo}
							disabled={!photo.history.future.length}
							onclick={() => setHistory(redo(photo!.history))}><Icon name="redo" /></button
						>
						<label class="ml-auto flex min-h-11 items-center gap-3"
							><span class="text-sm whitespace-nowrap">{t.zoom}: {zoom}×</span><input
								type="range"
								class="w-28 sm:w-40"
								min="1"
								max="4"
								step="0.25"
								bind:value={zoom}
							/></label
						>
					</div>
					{#key photo.id}<FaceCanvas
							url={photo.url}
							width={photo.width}
							height={photo.height}
							regions={edit.regions}
							selected={edit.selected}
							{original}
							bind:zoom
							label={t.photo(photos.indexOf(photo) + 1, photos.length)}
							regionLabel={t.face}
							onselect={select}
							onchange={changeRegion}
							onviewchange={(center) => (viewCenter = center)}
						/>{/key}
				</div>
				<div class="grid gap-3">
					{#if selected}
						<div class="flex items-center gap-3">
							<svg
								viewBox={`${selected.x} ${selected.y} ${selected.width} ${selected.height}`}
								class="size-20 shrink-0 rounded-xl bg-ink/5"
								role="img"
								aria-label={t.crop}
								><image
									href={photo.url}
									x="0"
									y="0"
									width={photo.width}
									height={photo.height}
								/></svg
							>
							<div>
								<h3 class="font-sans text-lg font-semibold">{t.who}</h3>
							</div>
						</div>
						<label class={field.label}
							><span class="sr-only">{t.search}</span><input
								class={field.input}
								type="search"
								bind:value={search}
								placeholder={t.search}
							/></label
						>
						<div class="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
							{#each filtered as child}<button
									type="button"
									class={button.chip}
									aria-pressed={selected.child === child.id}
									onclick={() => nameFace(child.id)}
									>{child.name}{#if edit.regions.some((r) => r.id !== selected.id && r.child === child.id)}<span
											class="sr-only"
										>
											— {t.already}</span
										>{/if}</button
								>{/each}
							{#if !filtered.length}<p class="text-muted">{t.empty}</p>{/if}
						</div>
						<div class="flex flex-wrap gap-2">
							<button
								type="button"
								class={button.secondary}
								aria-pressed={selected.covered}
								onclick={() => nameFace(null)}>{t.covered}</button
							>
							<button type="button" class={button.danger} onclick={removeCover}
								><Icon name="trash" />{t.removeCover}</button
							>
						</div>
					{:else}<h3 class="font-sans text-lg font-semibold">{t.who}</h3>{/if}
					{#if unresolved(edit)}<p role="status">{t.remaining(unresolved(edit))}</p>{/if}
					<p role="status" class="sr-only">{feedback}</p>
				</div>
			</div>
			{#if overlap}<p class="rounded-2xl bg-apricot/20 p-3 text-sm">{t.overlap}</p>{/if}
			<div class="flex flex-wrap gap-3">
				<button
					type="button"
					class={button.primary}
					disabled={unresolved(edit) > 0 || photo.detection === 'pending'}
					onclick={reviewPhoto}>{edit.reviewed ? t.reviewed : t.review}</button
				>
			</div>
			<button
				type="button"
				class="{button.secondary} justify-self-start"
				disabled={!allReviewed}
				onclick={() => {
					original = false;
					preview = true;
				}}>{t.preview}</button
			>
		{/if}
	{/if}
</div>
