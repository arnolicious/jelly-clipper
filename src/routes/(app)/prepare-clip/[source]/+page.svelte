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
	import { page } from '$app/state';

	let { data }: Props = $props();

	console.log(data.info);

	const audioTrackItems =
		data.audioStreams?.map((audioTrack) => ({
			value: audioTrack.Index!.toString(),
			label: audioTrack.DisplayTitle!
		})) ?? [];

	const subtitleTrackItems =
		data.subTitleStreams?.map((subtitleTrack) => ({
			value: subtitleTrack.Index!.toString(),
			label: subtitleTrack.DisplayTitle!
		})) ?? [];

	let selectedAudioTrack = $state<Item | null>(audioTrackItems?.[0] ?? null);
	let selectedSubtitleTrack = $state<Item | null>(subtitleTrackItems?.[0] ?? null);
</script>

<div class="flex flex-row gap-4">
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

<Button data-sveltekit-preload-data="off" href="/create-clip/{page.params.source}">
	Confirm track selection
</Button>
