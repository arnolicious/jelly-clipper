<script lang="ts">
	import type { PageData } from './$types';
	import VideoClipper from './video-clipper.svelte';
	import { getDisplayTitleFromItem } from '$lib/utils';
	import JugglingCubeSpinner from '$lib/components/ui/spinner/juggling-cube-spinner.svelte';
	import { source } from 'sveltekit-sse';
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import type { Readable } from 'svelte/store';
	import type { DownloadProgressDataType } from './progress-event';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();

	const downloadProgress: Readable<DownloadProgressDataType | null | undefined> = source(
		'/api/download-progress'
	)
		.select('data')
		.json(function or() {
			return null; // This will be the new value of the store
		});

	let progressString = $derived.by(() => {
		return formatProgress($downloadProgress);
	});

	function formatProgress(progress: DownloadProgressDataType | null | undefined) {
		if (progress && 'errorMessage' in progress) {
			return `Error: ${progress.errorMessage}`;
		}

		if (!progress || !('totalSizeBytes' in progress)) return '0% (0/0 MB)';

		if (!('percentage' in progress)) return `0% (0/${progress.totalSizeBytes / 1000000} MB)`;

		return `${progress.percentage}% (${(progress.downloadedBytes / 1000000).toFixed(2)}/${(
			progress.totalSizeBytes / 1000000
		).toFixed(2)} MB)`;
	}

	let promises = $derived(Promise.all([data.fileInfo, data.subtitleTracks] as const));
</script>

{#await data.sourceInfo}
	<div class="flex flex-col gap-8 justify-center items-center">
		<JugglingCubeSpinner ballColor="#af63d2" cubeColor="#17adec" />
		<span class="text-slate-400 italic">
			Downloading media from jellyfin, please be patient...
		</span>
	</div>
{:then sourceInfo}
	{#await promises}
		{#if $downloadProgress && 'errorMessage' in $downloadProgress}
			<div class="flex flex-col gap-8 justify-center items-center">
				<span class="text-slate-400 italic">
					Failed to download media from jellyfin, please try again later.
					{$downloadProgress.errorMessage}
				</span>
			</div>
		{:else}
			<div class="flex flex-col gap-8 justify-center items-center">
				<JugglingCubeSpinner ballColor="#af63d2" cubeColor="#17adec" />
				<span class="text-slate-400 italic">
					Downloading: {getDisplayTitleFromItem(sourceInfo)}, please be patient...
				</span>
				<Progress
					value={$downloadProgress && 'percentage' in $downloadProgress
						? $downloadProgress.percentage
						: null}
				/>
				<span class="text-slate-400 italic">
					{progressString}
				</span>
			</div>
		{/if}
	{:then [fileInfo, subtitleTracks]}
		<VideoClipper sourceId={fileInfo.name} {sourceInfo} {subtitleTracks} />
	{:catch error}
		<div class="flex flex-col gap-8 justify-center items-center">
			<span class="text-slate-400 italic">
				Failed to download media from jellyfin, please try again later.
				{error}
			</span>
		</div>
	{/await}
{/await}
