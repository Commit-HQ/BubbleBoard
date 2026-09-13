<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import { tick } from 'svelte';
	import { getApp, Task } from './state.svelte';
	import { alert, button, field, formText } from './ui';

	// Manage's last classroom tile, for admins. It turns over to a field for the new classroom's name in its
	// own place, and turns back once the classroom is added or the form is cancelled.
	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app);
	const task = new Task();
	let turned = $state(false);
	let front = $state<HTMLButtonElement>();
	let input = $state<HTMLInputElement>();

	/** Turns the tile, and focus with it: the side facing away is inert. */
	async function turn(over: boolean) {
		turned = over;
		task.error = undefined;
		await tick();
		(over ? input : front)?.focus();
	}

	function submit(event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }) {
		event.preventDefault();
		const name = formText(new FormData(event.currentTarget), 'name');
		task.run(async () => {
			await app.addClassroom(name);
			await turn(false);
		});
	}

	/** Keeps the form on the back of the tile for as long as the tile takes to turn away. */
	function hold(_node: Element) {
		return { duration: 500 };
	}
</script>

<li class="perspective-distant">
	<div
		class="grid h-full transition-transform duration-500 transform-3d motion-reduce:transition-none {turned
			? 'rotate-y-180'
			: ''}"
	>
		<button
			bind:this={front}
			class="col-start-1 row-start-1 flex min-h-36 w-full flex-col rounded-3xl border-2 border-dashed border-ink/15 p-5 text-left transition backface-hidden hover:border-accent/50 hover:bg-white/40"
			type="button"
			inert={turned}
			onclick={() => turn(true)}
		>
			<span
				class="grid size-11 place-items-center rounded-2xl bg-white/80 text-accent ring-1 ring-ink/10"
			>
				<Icon name="plus" />
			</span>
			<span class="mt-auto pt-4 text-lg leading-snug font-bold">{t.manage.addClassroom}</span>
		</button>
		<div
			class="col-start-1 row-start-1 rotate-y-180 rounded-3xl glass p-4 backface-hidden"
			inert={!turned}
		>
			{#if turned}
				<form class="flex h-full flex-col gap-2" onsubmit={submit} out:hold>
					<label>
						<span class="sr-only">{t.manage.classroomName}</span>
						<input
							bind:this={input}
							class={field.input}
							name="name"
							placeholder={t.manage.classroomName}
							required
							maxlength="80"
							autocomplete="off"
						/>
					</label>
					{#if task.error}<p class={alert} role="alert">{errorMessage(locale, task.error)}</p>{/if}
					<!-- Narrow tiles squeeze the button: its word stays whole. -->
					<div class="mt-auto flex gap-2">
						<button
							class="{button.primary} min-w-0 grow whitespace-nowrap"
							type="submit"
							disabled={task.busy}
						>
							{t.actions.add}
						</button>
						<button
							class={button.icon}
							type="button"
							aria-label={t.actions.cancel}
							onclick={() => turn(false)}
						>
							<Icon name="x" />
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>
</li>
