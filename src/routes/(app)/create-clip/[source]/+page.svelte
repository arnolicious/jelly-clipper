<script lang="ts">
	import type { PageData } from './$types';
	import VideoClipper from './video-clipper.svelte';
	import { getDisplayTitleFromItem } from '$lib/utils';
	import JugglingCubeSpinner from '$lib/components/ui/spinner/juggling-cube-spinner.svelte';
	import { source } from 'sveltekit-sse';
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { type DownloadProgressEvent } from '$lib/shared/DownloadProgressEvent';
	import type { Readable } from 'svelte/store';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();

	// svelte-ignore state_referenced_locally
	const progressData: Readable<DownloadProgressEvent | null | undefined> = source(
		`/api/download-progress/${data.itemInfo.Id}`
	)
		.select('data')
		.json(function or() {
			return null; // This will be the new value of the store
		});

	let progressString = $derived.by(() => {
		return formatProgress($progressData);
	});

	function formatProgress(progress: DownloadProgressEvent | null | undefined) {
		if (!progress) return '0% (0/0 MB)';

		return `${progress.progressPercentage}% (${(progress.downloadedBytes / 1000000).toFixed(2)}/${(
			progress.totalSizeBytes / 1000000
		).toFixed(2)} MB)`;
	}

	const cancelDownload = async () => {
		const response = await fetch(`/api/cancel-download/${data.itemInfo.Id}`);
		if (response.ok) {
			toast.success('Download cancelled');
			goto('/');
		} else {
			toast.error('Failed to cancel download');
		}
	};
</script>

{#await data.download}
	{#if $progressData && 'errorMessage' in $progressData}
		<div class="flex flex-col gap-8 justify-center items-center">
			<span class="text-slate-400 italic">
				Failed to download media from jellyfin, please try again later.
				{$progressData.errorMessage}
			</span>
		</div>
	{:else}
		<div class="flex flex-col gap-8 justify-center items-center">
			<JugglingCubeSpinner ballColor="#af63d2" cubeColor="#17adec" />
			<span class="text-slate-400 italic">
				Downloading: {getDisplayTitleFromItem(data.itemInfo)}, please be patient...
			</span>
			<Progress value={$progressData?.progressPercentage} />
			<span class="text-slate-400 italic">
				{progressString}
			</span>
			<Button variant="destructive" onclick={cancelDownload}>Cancel Download</Button>
		</div>
	{/if}
{:then resultExit}
	{#if 'fileInfo' in resultExit}
		{@const { fileInfo, subtitleTracks } = resultExit}

		<VideoClipper sourceId={fileInfo.name} sourceInfo={data.itemInfo} {subtitleTracks} />
	{:else}
		<div class="flex flex-col gap-8 justify-center items-center">
			<span class="text-slate-400 italic">
				Failed to download media from jellyfin, please try again later.
				<pre>
					{resultExit.errorMessage}
				</pre>
			</span>
		</div>
	{/if}
{/await}
