<script lang="ts" module>
	import { MediaRemoteControl } from 'vidstack';
</script>

<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { getDisplayTitleFromItem, sleep, ticksToSeconds } from '$lib/utils';
	import type { BaseItemDto as OriginalBaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
	import { type MediaTimeChangeEvent, TextTrack } from 'vidstack';
	import 'vidstack/bundle';
	import type { MediaPlayerElement } from 'vidstack/elements';
	import type { z } from 'zod';
	import type { createClipBodySchema } from '../../../api/create-clip/[sourceId]/schema';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import TimelineClipper from './timeline-clipper.svelte';
	import type { Track as OldTrack } from './+page.server';
	import type { SelectItem } from '$lib/types';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import type { BaseItemDto } from '$lib/server/schemas/BaseItemDto';
	import type { Track } from '$lib/server/services/JellyfinService';

	type Props = {
		sourceId: string;
		sourceInfo: BaseItemDto | OriginalBaseItemDto;
		subtitleTracks?: ReadonlyArray<Track> | OldTrack[];
	};

	let { sourceId, sourceInfo, subtitleTracks }: Props = $props();

	let player: MediaPlayerElement | null = $state(null);
	const remoteControl = new MediaRemoteControl();

	let triggerEl: HTMLDivElement | null = $state(null);

	$effect(() => {
		if (!triggerEl) return;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		remoteControl.setPlayer(player as any);
		remoteControl.setTarget(triggerEl);
	});

	const videoRuntime = $derived(sourceInfo.RunTimeTicks ? ticksToSeconds(sourceInfo.RunTimeTicks) : -1);

	let clipTitle = $state('');

	let clipStartTimeSeconds = $state(0);
	let clipEndTimeSeconds = $state(30);

	const setPlayerTime = (timeInSeconds: number) => {
		if (!player) return;
		player.currentTime = timeInSeconds;
	};

	const onTimeChange = (e: MediaTimeChangeEvent) => {
		const currentTimeInSeconds = e.detail;

		// If the current time is outside the clip range (with 0.05s tolerance), set it back to the start
		if (
			currentTimeInSeconds < clipStartTimeSeconds - 0.05 ||
			(clipEndTimeSeconds && currentTimeInSeconds > clipEndTimeSeconds + 0.05)
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

		const sourceType = sourceInfo.Type === 'Movie' ? 'movie' : sourceInfo.Type === 'Episode' ? 'show' : null;

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
			},
			subtitleTrack: selectedSubtitleTrack
				? {
						fileContent: selectedSubtitleTrack.subtitleFile,
						language: selectedSubtitleTrack.language,
						title: selectedSubtitleTrack.title
					}
				: undefined
		};

		isLoading = true;
		const createClipPromise = fetch(`/api/create-clip/${sourceId}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		})
			.then(async (res) => {
				if (!res.ok) {
					throw new Error(`Failed to create clip: ${res.status} ${res.statusText} - ${(await res.json()).message}`);
				}
				const data = await res.json();
				await sleep(200);
				goto(`/clip/${data.clipId}`);
			})
			.finally(() => {
				isLoading = false;
			});

		toast.promise(createClipPromise, {
			loading: 'Creating clip...',
			success: 'Clip created!',
			error: (e) => (e as Error).message
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

	const subtitleItems: Array<SelectItem> = $derived([
		{ value: 'none', label: 'No Subtitles' },
		...(subtitleTracks?.map((subtitleTrack) => ({
			value: subtitleTrack.index.toString(),
			label: subtitleTrack.title
		})) ?? [])
	]);
	let selectedSubtitleTrackItem = $derived<SelectItem | null>(subtitleItems?.[0] ?? null);
	let selectedSubtitleTrack = $derived(
		subtitleTracks?.find((subtitleTrack) => subtitleTrack.index.toString() === selectedSubtitleTrackItem?.value)
	);

	$effect(() => {
		if (!player) {
			return;
		}

		if (!selectedSubtitleTrack || selectedSubtitleTrackItem?.value === 'none') {
			player.textTracks.toArray().forEach((track) => {
				player?.textTracks.remove(track);
			});
		} else {
			// Remove existing subtitle tracks
			player.textTracks.clear();

			// Add the selected subtitle track
			const newTrack = new TextTrack({
				kind: 'subtitles',
				label: selectedSubtitleTrack.title,
				language: selectedSubtitleTrack.language,
				default: true,
				type: 'srt',
				id: selectedSubtitleTrack.index.toString(),
				src: URL.createObjectURL(new Blob([selectedSubtitleTrack.subtitleFile]))
			});
			player.textTracks.add(newTrack);
			player.textTracks.getById(selectedSubtitleTrack.index.toString())!.mode = 'showing';
		}
	});
</script>

<div class="flex flex-col gap-2 mb-4">
	<Label>Subtitles</Label>
	<Select.Root
		bind:value={
			() => selectedSubtitleTrackItem?.value,
			(newValue) => (selectedSubtitleTrackItem = subtitleItems?.find((item) => item.value === newValue) ?? null)
		}
		items={subtitleItems}
		type="single"
	>
		<Select.Trigger class="w-[400px]">
			{selectedSubtitleTrackItem?.label ?? 'Select Subtitle Track'}
		</Select.Trigger>
		<Select.Content>
			{#each subtitleItems as item (item.value)}
				<Select.Item value={item.value} class="w-full">
					{item.label}
				</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>
</div>
<!-- svelte-ignore event_directive_deprecated -->
<div class="w-full h-full flex flex-col justify-start items-center max-w-[900px]">
	<div class="aspect-video w-[inherit]">
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
