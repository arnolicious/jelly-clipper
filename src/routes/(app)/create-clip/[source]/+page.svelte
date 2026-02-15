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
	import { isFormatCompatible } from '$lib/client/codec-support';
	import { onMount } from 'svelte';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();

	let needsDownload = $state(true);
	let isCheckingCompatibility = $state(true);
	let compatibilityMessage = $state('Checking format compatibility...');

	onMount(() => {
		// Check if we have format info and if browser supports it
		const formatInfo = data.formatInfo;
		if (formatInfo && 'isLocalFileAvailable' in formatInfo && formatInfo.isLocalFileAvailable) {
			const codec = formatInfo.codec;
			const container = formatInfo.container;
			const audioCodec = formatInfo.audioCodec;

			const compatible = isFormatCompatible(codec, container, audioCodec);

			needsDownload = !compatible;
			isCheckingCompatibility = false;

			if (compatible) {
				compatibilityMessage = `Using local file (${codec}/${container})`;
			} else {
				compatibilityMessage = `Format not compatible (${codec}/${container}). Downloading transcoded version...`;
			}
		} else {
			// No format info or file not available locally, need to download
			needsDownload = true;
			isCheckingCompatibility = false;
			compatibilityMessage = 'Local file not available. Downloading...';
		}
	});

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

{#if isCheckingCompatibility}
	<div class="flex flex-col gap-8 justify-center items-center">
		<div class="h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent text-blue-500"></div>
		<span class="text-slate-400 italic">{compatibilityMessage}</span>
	</div>
{:else if !needsDownload}
	<!-- Format is compatible, use local file directly -->
	<div class="flex flex-col gap-4 items-center w-full">
		<div class="flex items-center gap-2 text-sm text-green-600 mb-2">
			<i class="ph-bold ph-check-circle"></i>
			<span>{compatibilityMessage}</span>
		</div>
		{#await data.download then resultExit}
			{#if 'fileInfo' in resultExit}
				{@const { fileInfo, subtitleTracks } = resultExit}
				<VideoClipper sourceId={fileInfo.name} sourceInfo={data.itemInfo} {subtitleTracks} />
			{:else}
				<VideoClipper sourceId={data.itemInfo.Id} sourceInfo={data.itemInfo} />
			{/if}
		{/await}
	</div>
{:else}
	{#await data.download}
		<!-- Format is not compatible or local file not available, show download progress -->
		<div class="flex items-center gap-2 text-sm text-yellow-600 mb-4">
			<i class="ph-bold ph-warning"></i>
			<span>{compatibilityMessage}</span>
		</div>
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
{/if}
