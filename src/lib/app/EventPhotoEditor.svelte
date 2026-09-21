<script lang="ts">
	import { goto, beforeNavigate } from '$app/navigation';
	import { onDestroy, onMount, tick, untrack } from 'svelte';
	import { createId } from '$lib/crypto';
	import { LocalFaceDetector } from '$lib/events/detector';
	import {
		assign,
		boundedRect,
		commit,
		coverRest,
		detectionRegion,
		dropMissing,
		emptyEdit,
		manualRegion,
		maxRegions,
		overlaps,
		redo,
		undo,
		unresolved,
		type History,
		type Rect
	} from '$lib/events/editor';
	import {
		clearDraft,
		draftPhoto,
		forgetDraftPhoto,
		loadDraft,
		saveDraft,
		savedDraft,
		saveDraftPhoto,
		type SavedDraft
	} from '$lib/events/draft';
	import { prepareEditorImage, safePreview } from '$lib/events/images';
	import { errorMessage, formatDay, messages, type Locale } from '$lib/i18n';
	import { maxEventPhotoBytes, maxEventPhotos } from '$lib/events/limits';
	import { maxEventPhotoText } from '$lib/events/types';
	import type { NoticeDocument } from '$lib/notices';
	import type { EventDraft } from '$lib/events/publishing';
	import { nextSticker, type Sticker } from '$lib/events/stickers';
	import { appPath } from '$lib/paths';
	import { errorCode } from '$lib/errors';
	import Icon from '$lib/components/Icon.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import EventDetails from './EventDetails.svelte';
	import EventPhotoStrip from './EventPhotoStrip.svelte';
	import FaceCanvas from './FaceCanvas.svelte';
	import FaceNames from './FaceNames.svelte';
	import FacePanel from './FacePanel.svelte';
	import { getApp, Task } from './state.svelte';
	import { alert, button, field, filePicker, segment, surface } from './ui';

	// Preparing an event's gallery, in the three steps the teacher works through: the event itself, then its
	// photos one at a time, then the review that publishes them. Photos are opened, covered and packaged on
	// this device, and the unfinished event waits on it too, so half an hour of work survives a phone call
	// (src/lib/events/draft.ts, docs/events-editor.md).
	type Photo = {
		id: string;
		blob: Blob;
		url: string;
		width: number;
		height: number;
		/** The few words the teacher writes under this photo, which everyone who opens the event reads. */
		text: string;
		history: History;
		detection: 'pending' | 'ready' | 'failed' | 'manual';
		generation: number;
	};
	let {
		locale,
		/** The development fixture (src/routes/editor-check) only prepares photos; it cannot publish. */
		publishable = true
	}: { locale: Locale; publishable?: boolean } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app.eventEditor);
	const e = $derived(messages[locale].app.events);
	const a = $derived(messages[locale].app.actions);
	const limit = $derived(t.limit(maxEventPhotos, maxEventPhotoBytes / (1024 * 1024)));

	let step = $state<'details' | 'photos' | 'review'>('details');
	let title = $state(''),
		date = $state(new Date().toLocaleDateString('en-CA')),
		days = $state(30);
	/** The event's words, kept here while the first step's editor is unmounted. */
	let description = $state.raw<NoticeDocument>({ type: 'doc', content: [] });
	let details = $state<ReturnType<typeof EventDetails>>();
	let editorReady = $state(false);
	let draft = $state.raw<EventDraft>();
	const task = new Task();
	let progress = $state(0),
		sending = $state(false);
	let viewer = $state('base');
	let classroom = $state(app.myClassrooms.length === 1 ? app.myClassrooms[0].id : '');
	let photos = $state.raw<Photo[]>([]);
	let current = $state('');
	/** Which of the photos being opened this one is, so a phone full of photos says how far it's got. */
	let opening = $state({ done: 0, total: 0 });
	const loading = $derived(opening.total > 0);
	let detecting = $state('');
	let error = $state('');
	let feedback = $state('');
	let removing = $state(false);
	let original = $state(false);
	let zoom = $state(1);
	let viewCenter = $state<{ x: number; y: number }>();
	/** The final render of each photo for the audience being checked, prepared one photo at a time. */
	let previews = $state.raw<Record<string, { url?: string; failed?: boolean }>>({});
	/** Which photo of the review grid is open large, so its covers can be read properly. */
	let enlarged = $state('');
	/** The photo's heading, brought back to the top of the screen whenever another photo is opened. */
	let heading = $state<HTMLElement>();
	/** Where someone was going when asked whether to leave work this device hasn't kept. */
	/** The photo opened large in the review, which sits above a grid that may be several screens long. */
	let largeView = $state<HTMLElement>();
	let leaving = $state<URL>();
	let leaveAnyway = false;
	/** The card this device is connected with. Without one, as in the development fixture, nothing is kept. */
	const credential = app.myCredential;
	/** The unfinished event this device kept, while the teacher chooses whether to go on with it. */
	let found = $state.raw<SavedDraft>();
	/** Whether everything done so far is on the device, so leaving the page loses nothing. */
	let draftSaved = $state(false);
	let saveTimer: ReturnType<typeof setTimeout>;
	let disposed = false;
	const detector = new LocalFaceDetector();
	const urls = new Set<string>();
	const photo = $derived(photos.find((p) => p.id === current));
	const edit = $derived(photo?.history.present);
	const selected = $derived(edit?.regions.find((r) => r.id === edit.selected));
	const children = $derived(app.catalog.children.filter((c) => c.classroom === classroom));
	const nameOf = (child: string) => children.find((c) => c.id === child)?.name ?? '';
	const reviewedCount = $derived(photos.filter((p) => p.history.present.reviewed).length);
	const allReviewed = $derived(
		photos.length > 0 && reviewedCount === photos.length && !loading && !detecting
	);
	const previewsPending = $derived(step === 'review' && photos.some((p) => !previews[p.id]));
	const previewsFailed = $derived(photos.some((p) => previews[p.id]?.failed));
	const large = $derived(photos.find((p) => p.id === enlarged));
	const nextUnreviewed = $derived(
		photos.find((p) => p.id !== current && !p.history.present.reviewed)?.id
	);
	const detailsDone = $derived(
		!!classroom && (!publishable || (!!title.trim() && !!date && editorReady))
	);
	const overlap = $derived(
		edit?.regions.some((one, index) =>
			edit.regions.slice(index + 1).some((two) => overlaps(one, two))
		) ?? false
	);
	const roster = $derived(children.map((c) => `${c.id}:${c.name}`).join('|'));
	let lastRoster = untrack(() => roster);
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
							regions: dropMissing(
								p.history.present.regions,
								children.map((c) => c.id)
							)
						}
					}
				}));
				backToPhotos();
				feedback = t.rosterChanged;
			}
		}
	});
	// The unfinished event, kept on the device as the teacher works and put back when the page opens again.
	// Saving is best effort: a write that doesn't make it only leaves the page worth a warning before leaving.
	onMount(async () => {
		if (!credential) return;
		const saved = await loadDraft(credential);
		if (saved && !photos.length) found = saved;
	});
	const keeping = $derived(
		credential && photos.length && !found
			? savedDraft(credential, { classroom, title, date, days, description, step }, photos)
			: undefined
	);
	$effect(() => {
		if (!keeping) return;
		draftSaved = false;
		saveTimer = setTimeout(keep, 400);
		return () => clearTimeout(saveTimer);
	});
	/** Writes the draft now. A page put in the background has its timers stopped, so it doesn't wait for one. */
	async function keep() {
		clearTimeout(saveTimer);
		const saving = keeping;
		if (saving) draftSaved = await saveDraft(saving);
	}
	/** Puts the kept event back: its photos, what was marked on them, and the step the teacher was on. */
	async function continueDraft(saved: SavedDraft) {
		classroom = saved.classroom;
		title = saved.title;
		date = saved.date;
		days = saved.days;
		description = saved.description;
		const ids = children.map((c) => c.id);
		const restored: Photo[] = [];
		let dropped = false;
		for (const item of saved.photos) {
			const blob = await draftPhoto(item.id);
			if (!blob) continue;
			const regions = dropMissing(item.edit.regions, ids);
			const changed = regions.some((region, index) => region !== item.edit.regions[index]);
			dropped ||= changed;
			restored.push({
				id: item.id,
				blob,
				url: url(blob),
				width: item.width,
				height: item.height,
				text: item.text,
				detection: item.detection,
				generation: 0,
				history: {
					past: [],
					future: [],
					present: { ...item.edit, regions, reviewed: item.edit.reviewed && !changed }
				}
			});
		}
		// The draft came with its classroom, so this is the roster the restored photos were named against.
		lastRoster = roster;
		photos = restored;
		current = restored[0]?.id ?? '';
		step = restored.length ? saved.step : 'details';
		found = undefined;
		if (dropped) feedback = t.rosterChanged;
		for (const item of restored) if (item.detection === 'pending') await detect(item.id);
	}
	/** Nothing of the kept event stays: the teacher starts again. */
	async function startOver() {
		found = undefined;
		await clearDraft();
	}
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
	function switchPhoto(id: string, scroll = true) {
		current = id;
		original = false;
		zoom = 1;
		viewCenter = undefined;
		feedback = '';
		error = '';
		if (scroll) void bringUp(() => heading);
	}
	/** "Reviewed, next photo" sits below a long page, so the photo that follows it comes back up to the top. */
	async function bringUp(element: () => HTMLElement | undefined) {
		await tick();
		element()?.scrollIntoView({
			behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
				? 'instant'
				: 'smooth',
			block: 'start'
		});
	}
	/** On to the photos, keeping the words written so far; an event's words may be more than a gallery shows. */
	function toPhotos() {
		const written = details?.text();
		if (!written) {
			error = errorMessage(locale, 'event-too-long');
			return;
		}
		description = written;
		error = '';
		step = 'photos';
	}
	function backToPhotos() {
		if (step === 'review') step = 'photos';
		draft = undefined;
		original = false;
		enlarged = '';
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
		setHistory(
			commit(
				photo.history,
				[...edit.regions, { ...region, sticker: nextSticker(edit.regions.length) }],
				region.id
			)
		);
		original = false;
	}
	function nameFace(child: string | null) {
		if (!photo || !selected) return;
		setHistory(assign(photo.history, selected.id, child));
		original = false;
		feedback = child ? t.assigned(nameOf(child)) : '';
	}
	function coverTheRest() {
		if (!photo || !edit) return;
		const left = unresolved(edit);
		setHistory(coverRest(photo.history));
		original = false;
		feedback = t.coveredRest(left);
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
								[
									...p.history.present.regions,
									...additions.map((region, index) => ({
										...region,
										sticker: nextSticker(p.history.present.regions.length + index)
									}))
								],
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
			files.some((f) => f.size > maxEventPhotoBytes)
		) {
			error = limit;
			return;
		}
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
						text: '',
						history: emptyEdit(),
						detection: 'pending',
						generation: 0
					};
					photos = [...photos, item];
					if (credential) void saveDraftPhoto(item.id, image.blob);
					if (!current) switchPhoto(item.id, false);
					await detect(item.id);
				} catch {
					if (!disposed) error = t.unusable;
				}
			}
		} finally {
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
		// With its last photo gone there is no event left to keep, only a record naming photos that aren't there.
		if (credential) void (photos.length ? forgetDraftPhoto(id) : clearDraft());
		switchPhoto(photos[0]?.id ?? '');
		draft = undefined;
		removing = false;
	}
	// The whole gallery as the chosen audience will see it. The renders are made one after another, because a
	// phone that composed thirty photos at once would run out of memory, and each tile waits its turn.
	$effect(() => {
		const list = photos,
			prepared = draft,
			recipient = viewer;
		untrack(forgetPreviews);
		if (step !== 'review') return;
		let cancelled = false;
		void (async () => {
			for (const item of list) {
				if (cancelled || disposed) return;
				try {
					const blob = await (prepared
						? app.eventPreview(prepared, item.id, recipient)
						: safePreview(item.blob, item.history.present.regions));
					if (cancelled || disposed) return;
					previews = { ...previews, [item.id]: { url: url(blob) } };
				} catch {
					if (cancelled || disposed) return;
					previews = { ...previews, [item.id]: { failed: true } };
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	});
	function forgetPreviews() {
		for (const shot of Object.values(previews)) if (shot.url) revoke(shot.url);
		previews = {};
	}
	function startPreview() {
		original = false;
		progress = 0;
		return task.run(async () => {
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
		});
	}
	function publish() {
		if (!draft || !title.trim() || !date) return;
		const publishing = draft;
		sending = true;
		progress = 0;
		return task
			.run(async () => {
				await app.publishEvent(
					publishing,
					{
						version: 1,
						title: title.trim(),
						description,
						date,
						photos: publishing.files.map(({ id, width, height }) => ({
							id,
							width,
							height,
							text: photos.find((p) => p.id === id)?.text.trim() || undefined
						}))
					},
					days,
					(n) => (progress = n)
				);
				if (disposed) return;
				for (const p of photos) revoke(p.url);
				photos = [];
				draft = undefined;
				await clearDraft();
				await goto(appPath(locale));
			})
			.finally(() => (sending = false));
	}
	beforeNavigate((navigation) => {
		// Only work the device hasn't kept is worth a warning; a saved event waits here on the way back.
		if (!photos.length || draftSaved || leaveAnyway) return;
		navigation.cancel();
		// Closing the tab or leaving the site gets the browser's own question instead.
		if (!navigation.willUnload && navigation.to) leaving = navigation.to.url;
	});
	async function leave() {
		if (!leaving) return;
		leaveAnyway = true;
		try {
			await goto(leaving);
		} finally {
			leaveAnyway = false;
		}
	}
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
		if (photos.length && !draftSaved) {
			event.preventDefault();
			event.returnValue = '';
		}
	}}
/>
<svelte:document
	onvisibilitychange={() => {
		if (!document.hidden) return;
		original = false;
		if (!draftSaved) void keep();
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

{#snippet viewSwitch()}
	<div class="{segment.group} justify-self-start" role="group" aria-label={e.view}>
		<button
			type="button"
			class={segment.option}
			aria-pressed={!original}
			onclick={() => (original = false)}>{e.finalView}</button
		>
		<button
			type="button"
			class={segment.option}
			aria-pressed={original}
			onclick={() => (original = true)}>{e.originalView}</button
		>
	</div>
{/snippet}

{#snippet photoView(item: Photo, source: string, label: string)}
	<!-- Inside a tile the button carries the name, so the picture itself is left out of the reading. -->
	<svg
		viewBox={`0 0 ${item.width} ${item.height}`}
		class="block w-full bg-ink/5"
		role={label ? 'img' : 'presentation'}
		aria-label={label || undefined}
	>
		<image href={source} x="0" y="0" width={item.width} height={item.height} />
		{#if !original}<FaceNames regions={item.history.present.regions} name={nameOf} />{/if}
	</svg>
{/snippet}

{#snippet busy()}
	{#if task.busy}
		<div class="grid gap-2" role="status">
			<p class="font-semibold text-muted">
				{sending ? e.uploading : e.preparing} ({progress}/{photos.length})
			</p>
			<progress value={progress} max={photos.length}></progress>
		</div>
	{/if}
{/snippet}

{#if found}
	<div class="{surface} grid justify-items-start gap-4">
		<div>
			<h2 class="text-2xl">{t.draftFound}</h2>
			<p class="mt-2 text-muted">{t.draftFoundCopy(found.photos.length)}</p>
		</div>
		<div class="flex flex-wrap gap-3">
			<button type="button" class={button.primary} onclick={() => continueDraft(found!)}>
				{t.draftContinue}<Icon name="arrowRight" class="size-4" />
			</button>
			<button type="button" class={button.secondary} onclick={startOver}>{t.draftDiscard}</button>
		</div>
	</div>
{:else if !app.myClassrooms.length}
	<p class="text-muted">{messages[locale].app.notices.noClassrooms}</p>
{:else}
	<fieldset disabled={task.busy} class="grid min-w-0 gap-5">
		{@render steps(step === 'details' ? 0 : step === 'photos' ? 1 : 2)}

		{#if error}<p class={alert} role="alert">{error}</p>{/if}
		{#if task.error}<p role="alert" class={alert}>
				{task.error === 'stale' ? e.stale : errorMessage(locale, task.error)}
			</p>{/if}

		{#if step === 'details'}
			<EventDetails
				bind:this={details}
				{locale}
				classrooms={app.myClassrooms}
				{publishable}
				locked={photos.length > 0}
				{description}
				bind:classroom
				bind:title
				bind:date
				bind:days
				bind:ready={editorReady}
			/>
			<button
				type="button"
				class="{button.primary} justify-self-start"
				disabled={!detailsDone}
				onclick={toPhotos}
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
					<p class={field.hint}>{limit}</p>
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
				<div bind:this={heading} class="flex flex-wrap items-center justify-between gap-2">
					<h2 class="text-2xl">{t.photo(photos.indexOf(photo) + 1, photos.length)}</h2>
					<button
						type="button"
						class={button.icon}
						aria-label={t.removePhoto}
						title={t.removePhoto}
						onclick={() => (removing = true)}><Icon name="trash" /></button
					>
				</div>

				<!-- The tools are a card of their own, so the photo itself keeps its own square edges. -->
				<div class="grid gap-3">
					<div
						class="flex flex-wrap items-center gap-1 rounded-2xl bg-white/60 p-1.5 ring-1 ring-ink/15"
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
						<!-- A phone zooms with two fingers on the photo itself, so the slider is only where there's a mouse. -->
						<label
							class="ml-auto hidden min-h-11 items-center gap-2 pr-2 text-sm pointer-fine:flex"
						>
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
							name={nameOf}
							onselect={select}
							onchange={changeRegion}
							onviewchange={(center) => (viewCenter = center)}
						/>
					{/key}
				</div>
				{@render viewSwitch()}

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
					remaining={unresolved(edit)}
					{feedback}
					onassign={nameFace}
					oncoverrest={coverTheRest}
					onremove={removeCover}
					onsticker={setSticker}
				/>

				{#if overlap}<p class="rounded-2xl bg-apricot/20 p-3 text-sm">{t.overlap}</p>{/if}

				<label class={field.label}>
					<span class={field.name}>{t.caption}</span>
					<input
						class={field.input}
						maxlength={maxEventPhotoText}
						value={photo.text}
						placeholder={t.captionPlaceholder}
						oninput={(event) => {
							const written = event.currentTarget.value;
							update(photo!.id, (p) => ({ ...p, text: written }));
						}}
					/>
				</label>

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
						{#if unresolved(edit)}
							<p class="text-sm font-semibold text-muted" role="status">
								{t.remaining(unresolved(edit))}
							</p>
						{/if}
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

			{#if draft}
				<label class={field.label}>
					<span class={field.name}>{e.previewAs}</span>
					<select class={field.input} bind:value={viewer}>
						<option value="base">{e.base}</option>
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

			{#if previewsFailed}<p class={alert} role="alert">{t.previewFailed}</p>{/if}

			{#if large}
				{@const shot = previews[large.id]}
				<div bind:this={largeView} class="grid gap-3">
					<div class="flex flex-wrap items-center justify-between gap-2">
						{@render viewSwitch()}
						<button type="button" class={button.secondary} onclick={() => (enlarged = '')}>
							<Icon name="chevronLeft" class="size-4" />{t.backToGrid}
						</button>
					</div>
					{#if original}
						{@render photoView(large, large.url, e.originalView)}
					{:else if shot?.url}
						{@render photoView(large, shot.url, e.finalView)}
					{:else}
						<p class="font-semibold text-muted" role="status">
							{shot?.failed ? e.failed : e.loading}
						</p>
					{/if}
				</div>
			{/if}

			<!-- The whole gallery at once, as the chosen audience sees it, so a missed face stands out. -->
			<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label={t.photos}>
				{#each photos as item, index (item.id)}
					{@const shot = previews[item.id]}
					<li>
						<button
							type="button"
							class="relative block w-full overflow-hidden rounded-2xl ring-1 ring-ink/10 transition hover:ring-ink/25 aria-pressed:ring-3 aria-pressed:ring-accent"
							aria-label={t.photo(index + 1, photos.length)}
							aria-pressed={item.id === enlarged}
							onclick={() => {
								original = false;
								enlarged = item.id;
								void bringUp(() => largeView);
							}}
						>
							{#if shot?.url}
								{@render photoView(item, shot.url, '')}
							{:else}
								<!-- Already the photo's own shape, so the grid doesn't jump as each render arrives. -->
								<span
									class="grid place-items-center bg-ink/5 p-3 text-center text-sm font-semibold text-muted"
									style:aspect-ratio="{item.width} / {item.height}"
								>
									{shot?.failed ? e.failed : e.loading}
								</span>
							{/if}
							<span
								class="absolute top-1 left-1 rounded-full bg-ink/70 px-2 py-0.5 text-xs font-bold text-white"
								aria-hidden="true">{index + 1}</span
							>
						</button>
					</li>
				{/each}
			</ul>

			{@render busy()}

			<div class="flex flex-wrap gap-3 border-t border-ink/10 pt-5">
				{#if draft}
					<button
						type="button"
						class={button.primary}
						disabled={previewsPending || previewsFailed || task.error === 'stale'}
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

	{#if leaving}
		<ConfirmDialog
			{locale}
			title={t.leaveTitle}
			copy={t.leaveCopy}
			confirmLabel={t.leave}
			cancelLabel={t.stay}
			safe
			onconfirm={leave}
			onclose={() => (leaving = undefined)}
		/>
	{/if}
{/if}
