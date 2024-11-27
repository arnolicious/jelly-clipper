<script lang="ts" module>
	import { MediaRemoteControl } from 'vidstack';
</script>

<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { getDisplayTitleFromItem, ticksToSeconds } from '$lib/utils';
	import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
	import { type MediaTimeChangeEvent } from 'vidstack';
	import 'vidstack/bundle';
	import type { MediaPlayerElement } from 'vidstack/elements';

	type Props = {
		sourceId: string;
		sourceInfo: BaseItemDto;
	};

	let { sourceId, sourceInfo }: Props = $props();

	let player: MediaPlayerElement | null = $state(null);
	const remoteControl = new MediaRemoteControl();

	let triggerEl: HTMLDivElement | null = $state(null);

	$effect(() => {
		if (!triggerEl) return;
		remoteControl.setPlayer(player as any);
		remoteControl.setTarget(triggerEl);
	});

	const videoRuntime = $derived(
		sourceInfo.RunTimeTicks ? ticksToSeconds(sourceInfo.RunTimeTicks) : -1
	);

	let clipStartMin = $state<number>(0);
	let clipEndMin = $state<number | null>(
		sourceInfo.RunTimeTicks ? ticksToSeconds(sourceInfo.RunTimeTicks) / 60 : null
	);

	let clipStartTimeSeconds = $derived(clipStartMin * 60);
	let clipEndTimeSeconds = $derived(clipEndMin ? clipEndMin * 60 : null);

	const setPlayerTime = (timeInSeconds: number) => {
		if (!player) return;
		player.currentTime = timeInSeconds;
	};

	const onTimeChange = (e: MediaTimeChangeEvent) => {
		const currentTimeInSeconds = e.detail;

		// If the current time is outside the clip range, set it back to the start
		if (
			currentTimeInSeconds < clipStartTimeSeconds ||
			(clipEndTimeSeconds && currentTimeInSeconds > clipEndTimeSeconds)
		) {
			setPlayerTime(clipStartTimeSeconds);
		}
	};
</script>

<!-- svelte-ignore a11y_media_has_caption -->
<div class="flex flex-col w-full h-full max-h-[540px] max-w-[960px]">
	<media-player
		bind:this={player}
		title={getDisplayTitleFromItem(sourceInfo) ?? 'Unknown'}
		streamType="on-demand"
		load="visible"
		duration={videoRuntime}
		on:time-change={onTimeChange}
	>
		<div bind:this={triggerEl} style="visibility: none;"></div>
		<!-- <media-poster src={sourceInfo.Image}></media-poster> -->
		<media-provider>
			<source src="/videos/originals/{sourceId}.mp4" type="video/mp4" />
		</media-provider>
		<media-video-layout></media-video-layout>
	</media-player>
</div>
<div class="flex gap-2 mt-4 items-center">
	<Input type="number" bind:value={clipStartMin} />
	-
	<Input type="number" bind:value={clipEndMin} />
</div>
