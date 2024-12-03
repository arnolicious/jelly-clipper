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
	import type { z } from 'zod';
	import type { createClipBodySchema } from '../../../api/create-clip/[sourceId]/schema';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import TimelineClipper from './timeline-clipper.svelte';

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

	let clipTitle = $state('');

	let clipStartTimeSeconds = $state(0);
	let clipEndTimeSeconds = $state(30);

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

	let isLoading = $state(false);

	const onCreateClip = async () => {
		if (!clipEndTimeSeconds) {
			toast.error('Please set an end time for the clip');
			return;
		}

		const sourceType =
			sourceInfo.Type === 'Movie' ? 'movie' : sourceInfo.Type === 'Episode' ? 'show' : null;

		if (!sourceType) {
			toast.error('Unsupported source type');
			return;
		}

		const body: z.infer<typeof createClipBodySchema> = {
			start: clipStartTimeSeconds,
			end: clipEndTimeSeconds,
			title: clipTitle,
			sourceInfo: {
				sourceTitle: getDisplayTitleFromItem(sourceInfo) ?? 'Unknown',
				sourceType
			}
		};

		isLoading = true;
		const createClipPromise = fetch(`/api/create-clip/${sourceId}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		})
			.then((res) => res.json().then((data) => goto(`/clip/${data.clipId}`)))
			.finally(() => {
				isLoading = false;
			});

		toast.promise(createClipPromise, {
			loading: 'Creating clip...',
			success: 'Clip created!',
			error: 'Failed to create clip'
		});
	};

	$effect(() => {
		if (!player) return;
		player.subscribe((e) => {
			if (e.paused !== isPaused) {
				isPaused = e.paused;
			}
			if (e.currentTime !== currentTime) {
				currentTime = e.currentTime;
			}
		});
	});

	let currentTime = $state<number>(0);
	let isPaused = $state(true);
</script>

<!-- svelte-ignore a11y_media_has_caption -->
<!-- svelte-ignore event_directive_deprecated -->
<div class="w-full h-full flex flex-col justify-start items-center max-w-[900px]">
	<div class="aspect-video">
		<media-player
			bind:this={player}
			title={getDisplayTitleFromItem(sourceInfo) ?? 'Unknown'}
			streamType="on-demand"
			muted={false}
			load="visible"
			playsInline
			class=""
			duration={videoRuntime}
			on:time-change={onTimeChange}
		>
			<div bind:this={triggerEl} style="visibility: none;"></div>
			<media-provider>
				<source src="/videos/originals/{sourceId}.mp4" type="video/mp4" />
			</media-provider>
			<media-video-layout></media-video-layout>
		</media-player>
	</div>
	<div class="flex gap-4 flex-col w-full items-center">
		<TimelineClipper
			fullDurationSecs={videoRuntime}
			bind:clipStartSecs={clipStartTimeSeconds}
			bind:clipEndSecs={clipEndTimeSeconds}
			currentCursorPositionSecs={currentTime}
			{isPaused}
		/>
		<Input class="w-full" required placeholder="Clip Title" bind:value={clipTitle} />
		<Button onclick={onCreateClip} class="" disabled={isLoading || clipTitle === ''}>
			{#if isLoading}
				Loading...
			{:else}
				🎬 Create Clip!
			{/if}
		</Button>
	</div>
</div>
