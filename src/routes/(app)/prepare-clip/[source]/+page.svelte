<script module lang="ts">
	import type { PageData } from './$types';

	type Props = {
		data: PageData;
	};

	type Item = {
		value: string;
		label: string;
	};
</script>

<script lang="ts">
	import * as Select from '$lib/components/ui/select';
	import Button from '$lib/components/ui/button/button.svelte';
	import { navigating, page } from '$app/state';
	import Label from '$lib/components/ui/label/label.svelte';

	let { data }: Props = $props();

	const audioTrackItems =
		data.audioStreams?.map((audioTrack) => ({
			value: audioTrack.Index!.toString(),
			label: audioTrack.DisplayTitle!
		})) ?? [];

	const subtitleTrackItems = [
		{ value: 'none', label: 'No Subtitles' },
		...(data.subTitleStreams?.map((subtitleTrack) => ({
			value: subtitleTrack.Index!.toString(),
			label: subtitleTrack.DisplayTitle!
		})) ?? [])
	];

	let selectedAudioTrack = $state<Item | null>(audioTrackItems?.[0] ?? null);
	let selectedSubtitleTrack = $state<Item | null>(subtitleTrackItems?.[0] ?? null);

	let createClipUrl = $derived.by(() => {
		let url = `/create-clip/${encodeURIComponent(page.params.source)}`;

		// No need to use the `?` operator here, as we will always have the `apiKey` param from the jellyfin url
		if (selectedAudioTrack) {
			url += `&audioStreamIndex=${selectedAudioTrack.value}`;
		}
		if (selectedSubtitleTrack) {
			url += `&subtitleStreamIndex=${selectedSubtitleTrack.value}`;
		}

		return url;
	});
	let isNavigating = $derived(!!navigating.to);
</script>

<main class="flex flex-col h-full w-1/2 items-center justify-evenly gap-4">
	<h3 class="text-lg text-center">Please select which audio and subtitle tracks you want to use</h3>
	<div class="flex flex-row gap-4">
		<div class="flex flex-col gap-2">
			<Label>Audio track</Label>
			<Select.Root
				bind:value={
					() => selectedAudioTrack?.value,
					(newValue) =>
						(selectedAudioTrack = audioTrackItems?.find((item) => item.value === newValue) ?? null)
				}
				items={audioTrackItems}
				type="single"
			>
				<Select.Trigger class="w-[400px]">
					{selectedAudioTrack?.label ?? 'Select Audio Track'}
				</Select.Trigger>
				<Select.Content>
					{#each audioTrackItems as item (item.value)}
						<Select.Item value={item.value} class="w-full">
							{item.label}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<div class="flex flex-col gap-2">
			<Label>Subtitles</Label>
			<Select.Root
				bind:value={
					() => selectedSubtitleTrack?.value,
					(newValue) =>
						(selectedSubtitleTrack =
							subtitleTrackItems?.find((item) => item.value === newValue) ?? null)
				}
				items={subtitleTrackItems}
				type="single"
			>
				<Select.Trigger class="w-[400px]">
					{selectedSubtitleTrack?.label ?? 'Select Subtitle Track'}
				</Select.Trigger>
				<Select.Content>
					{#each subtitleTrackItems as item (item.value)}
						<Select.Item value={item.value} class="w-full">
							{item.label}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</div>

	<Button
		class="w-1/2"
		data-sveltekit-preload-data="off"
		disabled={isNavigating}
		href={createClipUrl}
	>
		{#if isNavigating}
			Loading...
		{:else}
			Confirm track selection
		{/if}
		<i class="text-xl ph ph-paper-plane-right"></i>
	</Button>
</main>
