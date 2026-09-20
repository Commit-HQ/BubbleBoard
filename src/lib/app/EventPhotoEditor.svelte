<script lang="ts">
	import { goto, beforeNavigate } from '$app/navigation';
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
	import { errorMessage, formatDay, messages, type Locale } from '$lib/i18n';
	import type { EventDraft } from '$lib/events/publishing';
	import type { Sticker } from '$lib/events/stickers';
	import { appPath } from '$lib/paths';
	import { errorCode } from '$lib/errors';
	import Icon from '$lib/components/Icon.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import EventDetails from './EventDetails.svelte';
	import EventPhotoStrip from './EventPhotoStrip.svelte';
	import FaceCanvas from './FaceCanvas.svelte';
	import FacePanel from './FacePanel.svelte';
	import PhotoComparison from './PhotoComparison.svelte';
	import { getApp } from './state.svelte';
	import { alert, button, field, filePicker, surface } from './ui';

	// Preparing an event's gallery, in the three steps the teacher works through: the event itself, then its
	// photos one at a time, then the review that publishes them. Photos are opened, covered and packaged on
	// this device; the draft lives only on this page (docs/events-editor.md).
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
	const e = $derived(messages[locale].app.events);
	const a = $derived(messages[locale].app.actions);
	const publishable = typeof app.prepareEvent === 'function';

	let step = $state<'details' | 'photos' | 'review'>('details');
	let title = $state(''),
		description = $state(''),
		date = $state(new Date().toLocaleDateString('en-CA')),
		days = $state(30);
	let draft = $state.raw<EventDraft>();
	let working = $state(false),
		progress = $state(0),
		sending = $state(false);
	let viewer = $state('base');
	let compare = $state(false);
	let publicationError = $state('');
	let classroom = $state(app.myClassrooms.length === 1 ? app.myClassrooms[0].id : '');
	let photos = $state.raw<Photo[]>([]);
	let current = $state('');
	let loading = $state(false);
	/** Which of the photos being opened this one is, so a phone full of photos says how far it's got. */
	let opening = $state({ done: 0, total: 0 });
	let detecting = $state('');
	let error = $state('');
	let feedback = $state('');
	let removing = $state(false);
	let original = $state(false);
	let zoom = $state(1);
	let viewCenter = $state<{ x: number; y: number }>();
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
	const reviewedCount = $derived(photos.filter((p) => p.history.present.reviewed).length);
	const allReviewed = $derived(
		photos.length > 0 && reviewedCount === photos.length && !loading && !detecting
	);
	const nextUnreviewed = $derived(
		photos.find((p) => p.id !== current && !p.history.present.reviewed)?.id
	);
	const ready = $derived(!!classroom && (!publishable || (!!title.trim() && !!date)));
	const overlap = $derived(
		edit?.regions.some((one, index) =>
			edit.regions.slice(index + 1).some((two) => overlaps(one, two))
		) ?? false
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
				backToPhotos();
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
	}
	function switchPhoto(id: string) {
		current = id;
		original = false;
		zoom = 1;
		viewCenter = undefined;
		feedback = '';
		error = '';
	}
	/** Back from the review: the prepared draft is no longer the photos as they are. */
	function backToPhotos() {
		if (step === 'review') step = 'photos';
		draft = undefined;
		original = false;
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
	}
	function nameFace(child: string | null) {
		if (!photo || !selected) return;
		setHistory(assign(photo.history, selected.id, child));
		original = false;
		feedback = child ? t.assigned(children.find((c) => c.id === child)?.name ?? '') : t.coveredDone;
	}
	function setSticker(sticker: Sticker) {
		if (!photo || !edit || !selected) return;
		setHistory(
			commit(
				photo.history,
				edit.regions.map((r) => (r.id === selected.id ? { ...r, sticker } : r))
			)
		);
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
		opening = { done: 0, total: files.length };
		try {
			for (const file of files) {
				if (disposed) break;
				opening = { ...opening, done: opening.done + 1 };
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
			opening = { done: 0, total: 0 };
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
		draft = undefined;
		removing = false;
	}
	$effect(() => {
		const target = photo;
		const prepared = draft,
			recipient = viewer;
		if (step !== 'review' || !target) {
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
		(prepared
			? app.eventPreview(prepared, target.id, recipient)
			: safePreview(target.blob, target.history.present.regions)
		)
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
	async function startPreview() {
		original = false;
		publicationError = '';
		progress = 0;
		working = true;
		try {
			if (publishable) {
				const prepared = await app.prepareEvent(
					classroom,
					photos.map((p) => ({ id: p.id, blob: p.blob, regions: p.history.present.regions })),
					(n) => (progress = n)
				);
				if (disposed) return;
				if (!allReviewed) throw new Error('stale');
				draft = prepared;
			}
			step = 'review';
		} catch (cause) {
			publicationError = errorCode(cause);
		} finally {
			working = false;
		}
	}
	async function publish() {
		if (!draft || working || !title.trim() || !date) return;
		working = true;
		sending = true;
		progress = 0;
		publicationError = '';
		try {
			await app.publishEvent(
				draft,
				{
					version: 1,
					title: title.trim(),
					description: description.trim(),
					date,
					photos: draft.files.map(({ id, width, height }) => ({ id, width, height }))
				},
				days,
				(n) => (progress = n)
			);
			if (disposed) return;
			for (const p of photos) revoke(p.url);
			photos = [];
			draft = undefined;
			await goto(appPath(locale));
		} catch (cause) {
			publicationError = errorCode(cause);
		} finally {
			working = false;
			sending = false;
		}
	}
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

{#snippet steps(now: number)}
	<ol class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold">
		{#each t.steps as label, index (label)}
			<li class="flex items-center gap-2" aria-current={index === now ? 'step' : undefined}>
				{#if index}<Icon name="chevronRight" class="size-4 text-muted" />{/if}
				<span class="flex items-center gap-2 {index === now ? 'text-ink' : 'text-muted'}">
					<span
						class="grid size-6 place-items-center rounded-full text-xs {index < now
							? 'bg-ink text-white'
							: index === now
								? 'bg-accent text-white'
								: 'bg-ink/10 text-muted'}"
					>
						{#if index < now}<Icon name="check" class="size-3.5" />{:else}{index + 1}{/if}
					</span>
					{label}
				</span>
			</li>
		{/each}
	</ol>
{/snippet}

{#snippet addButton(style: string, label: string)}
	<label class="{style} {filePicker}">
		<Icon name="plus" class="size-4" />{label}
		<input
			class="sr-only"
			type="file"
			accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
			multiple
			onchange={addPhotos}
			disabled={!classroom || loading || !!detecting || photos.length >= maxEventPhotos}
		/>
	</label>
{/snippet}

{#snippet busy()}
	{#if working}
		<div class="grid gap-2" role="status">
			<p class="font-semibold text-muted">
				{sending ? e.uploading : e.preparing} ({progress}/{photos.length})
			</p>
			<progress value={progress} max={photos.length}></progress>
		</div>
	{/if}
{/snippet}

{#if !app.myClassrooms.length}
	<p class="text-muted">{messages[locale].app.notices.noClassrooms}</p>
{:else}
	<fieldset disabled={working} class="grid min-w-0 gap-5">
		{@render steps(step === 'details' ? 0 : step === 'photos' ? 1 : 2)}

		{#if error}<p class={alert} role="alert">{error}</p>{/if}
		{#if publicationError}<p role="alert" class={alert}>
				{publicationError === 'stale' ? e.stale : errorMessage(locale, publicationError)}
			</p>{/if}

		{#if step === 'details'}
			<EventDetails
				{locale}
				classrooms={app.myClassrooms}
				{publishable}
				locked={photos.length > 0}
				bind:classroom
				bind:title
				bind:date
				bind:description
				bind:days
			/>
			<button
				type="button"
				class="{button.primary} justify-self-start"
				disabled={!ready}
				onclick={() => (step = 'photos')}
			>
				{t.continue}<Icon name="arrowRight" class="size-4" />
			</button>
		{:else if step === 'photos'}
			<p class="flex items-start gap-2 text-sm text-muted">
				<Icon name="info" class="mt-0.5 size-4 shrink-0" />{t.local}
			</p>

			{#if !photos.length}
				<div class="{surface} grid justify-items-start gap-4">
					<p class="text-muted">{t.none}</p>
					{@render addButton(button.primary, t.add)}
					<p class={field.hint}>{t.limit}</p>
				</div>
			{:else}
				<div class="flex flex-wrap items-center justify-between gap-3">
					<p class="font-semibold" role="status">{t.progress(reviewedCount, photos.length)}</p>
					{@render addButton(button.secondary, t.addMore)}
				</div>
				<EventPhotoStrip {locale} {photos} {current} onpick={switchPhoto} />
			{/if}

			{#if loading}
				<p class="font-semibold text-muted" role="status">
					{opening.total > 1 ? t.adding(opening.done, opening.total) : t.loading}
				</p>
			{/if}

			{#if photo && edit}
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h2 class="text-2xl">{t.photo(photos.indexOf(photo) + 1, photos.length)}</h2>
					<button type="button" class={button.danger} onclick={() => (removing = true)}>
						<Icon name="trash" class="size-4" />{t.removePhoto}
					</button>
				</div>

				<div class="overflow-hidden rounded-3xl bg-white/50 ring-1 ring-ink/15">
					<div
						class="flex flex-wrap items-center gap-1 border-b border-ink/10 bg-white/50 p-1.5"
						role="toolbar"
						aria-label={t.tools}
					>
						<button
							type="button"
							class={button.secondary}
							onclick={addCover}
							disabled={edit.regions.length >= maxRegions}
						>
							<Icon name="plus" class="size-4" />{t.addCover}
						</button>
						<button
							type="button"
							class="{button.secondary} aria-pressed:bg-ink aria-pressed:text-white aria-pressed:ring-ink aria-pressed:hover:bg-ink"
							aria-pressed={original}
							onclick={() => (original = !original)}>{original ? t.covers : t.original}</button
						>
						<button
							type="button"
							class="{button.icon} disabled:opacity-40"
							aria-label={t.undo}
							title={t.undo}
							disabled={!photo.history.past.length}
							onclick={() => setHistory(undo(photo!.history))}><Icon name="undo" /></button
						>
						<button
							type="button"
							class="{button.icon} disabled:opacity-40"
							aria-label={t.redo}
							title={t.redo}
							disabled={!photo.history.future.length}
							onclick={() => setHistory(redo(photo!.history))}><Icon name="redo" /></button
						>
						<label class="ml-auto flex min-h-11 items-center gap-2 pr-2 text-sm">
							<span class="whitespace-nowrap">{t.zoom}</span>
							<input
								type="range"
								class="w-24 sm:w-36"
								min="1"
								max="4"
								step="0.25"
								bind:value={zoom}
							/>
							<span class="w-9 text-right text-muted tabular-nums">{zoom}×</span>
						</label>
					</div>
					{#key photo.id}
						<FaceCanvas
							url={photo.url}
							width={photo.width}
							height={photo.height}
							regions={edit.regions}
							selected={edit.selected}
							{original}
							bind:zoom
							label={t.photo(photos.indexOf(photo) + 1, photos.length)}
							regionLabel={(n) =>
								`${t.face(n)}: ${children.find((c) => c.id === edit.regions[n - 1].child)?.name ?? (edit.regions[n - 1].covered ? t.covered : t.who)}`}
							onselect={select}
							onchange={changeRegion}
							onviewchange={(center) => (viewCenter = center)}
						/>
					{/key}
				</div>
				<p class={field.hint}>{t.gesture}</p>

				{#if photo.detection === 'pending'}
					<p class="flex flex-wrap items-center gap-3" role="status">
						<span class="font-semibold text-muted">{t.detecting}</span>
						<button type="button" class={button.quiet} onclick={manual}>{t.manual}</button>
					</p>
				{:else if photo.detection === 'failed'}
					<div class="grid justify-items-start gap-3">
						<p class={alert} role="status">{t.failed}</p>
						<button
							type="button"
							class={button.secondary}
							disabled={!!detecting || loading}
							onclick={() => detect(photo!.id)}
						>
							<Icon name="refresh" class="size-4" />{t.retry}
						</button>
					</div>
				{:else if !edit.regions.length}
					<p class="text-muted">{photo.detection === 'ready' ? t.noFaces : t.noCovers}</p>
				{/if}

				<FacePanel
					{locale}
					url={photo.url}
					width={photo.width}
					height={photo.height}
					regions={edit.regions}
					{selected}
					{children}
					{feedback}
					onassign={nameFace}
					onremove={removeCover}
					onsticker={setSticker}
				/>

				{#if overlap}<p class="rounded-2xl bg-apricot/20 p-3 text-sm">{t.overlap}</p>{/if}

				<div class="flex flex-wrap items-center gap-3">
					{#if edit.reviewed}
						<p class="flex items-center gap-2 font-semibold text-green-800">
							<Icon name="check" class="size-4" />{t.reviewed}
						</p>
						{#if nextUnreviewed}
							<button
								type="button"
								class={button.secondary}
								onclick={() => switchPhoto(nextUnreviewed)}
							>
								{t.nextPhoto}<Icon name="arrowRight" class="size-4" />
							</button>
						{/if}
					{:else}
						<button
							type="button"
							class={button.primary}
							disabled={unresolved(edit) > 0 || photo.detection === 'pending'}
							onclick={reviewPhoto}
						>
							<Icon name="check" class="size-4" />{t.review}
						</button>
						<p class="text-sm font-semibold text-muted" role="status">
							{unresolved(edit) ? t.remaining(unresolved(edit)) : t.checkHint}
						</p>
					{/if}
				</div>
			{/if}

			{@render busy()}

			<div class="flex flex-wrap gap-3 border-t border-ink/10 pt-5">
				<button type="button" class={button.primary} disabled={!allReviewed} onclick={startPreview}>
					{publishable ? e.review : t.preview}<Icon name="arrowRight" class="size-4" />
				</button>
				<button type="button" class={button.secondary} onclick={() => (step = 'details')}>
					<Icon name="chevronLeft" class="size-4" />{t.backToDetails}
				</button>
			</div>
		{:else}
			<div>
				<h2 class="text-3xl">{e.review}</h2>
				<p class="mt-2 text-muted">{e.ready}</p>
				{#if publishable}
					<p class="mt-2 text-sm text-muted">
						{title} · {formatDay(locale, date)} · {messages[locale].app.notices.dayCount(days)}
					</p>
				{/if}
			</div>

			{#if photos.length > 1}
				<EventPhotoStrip {locale} {photos} {current} onpick={switchPhoto} />
			{/if}

			{#if draft}
				<label class={field.label}>
					<span class={field.name}>{e.previewAs}</span>
					<select class={field.input} bind:value={viewer}>
						<option value="base">{e.base}</option>
						<option value="">{e.groupView}</option>
						<option value="staff">{e.staffView}</option>
						{#each app.catalog.families.filter( (f) => f.classrooms.includes(classroom) ) as family (family.id)}
							<option value={family.id}
								>{family.name} — {children
									.filter((c) => c.families.includes(family.id))
									.map((c) => c.name)
									.join(', ')}</option
							>
						{/each}
					</select>
				</label>
			{/if}

			<div class="flex flex-wrap gap-2">
				<button
					type="button"
					class={button.chip}
					aria-pressed={!compare}
					onclick={() => (compare = false)}>{e.finalView}</button
				>
				<button
					type="button"
					class={button.chip}
					aria-pressed={compare}
					onclick={() => (compare = true)}>{e.compareView}</button
				>
			</div>

			{#if previewBusy}
				<p class="font-semibold text-muted" role="status">{e.loading}</p>
			{:else if previewError}
				<p class={alert} role="alert">{t.previewFailed}</p>
			{:else if previewUrl && photo}
				{#if compare}
					<PhotoComparison
						original={photo.url}
						covered={previewUrl}
						width={photo.width}
						height={photo.height}
						label={t.compare}
						beforeLabel={e.before}
						afterLabel={e.after}
					/>
				{:else}
					<img src={previewUrl} alt={e.finalView} class="w-full rounded-2xl" />
				{/if}
			{/if}

			{@render busy()}

			<div class="flex flex-wrap gap-3 border-t border-ink/10 pt-5">
				{#if draft}
					<button
						type="button"
						class={button.primary}
						disabled={previewBusy || previewError || publicationError === 'stale'}
						onclick={publish}
					>
						<Icon name="check" class="size-4" />{sending ? a.working : e.publish}
					</button>
				{/if}
				<button type="button" class={button.secondary} onclick={backToPhotos}>
					<Icon name="chevronLeft" class="size-4" />{t.back}
				</button>
			</div>
		{/if}
	</fieldset>

	{#if removing}
		<ConfirmDialog
			{locale}
			title={t.removePhoto}
			copy={t.removePhotoCopy}
			confirmLabel={t.removePhoto}
			danger
			onconfirm={async () => removePhoto()}
			onclose={() => (removing = false)}
		/>
	{/if}
{/if}
