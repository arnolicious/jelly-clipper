<script lang="ts">
	import { page } from '$app/stores';
	import type { PageData } from './$types';
	import VideoClipper from './video-clipper.svelte';
	import { browser } from '$app/environment';
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import { getDisplayTitleFromItem } from '$lib/utils';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();

	type SourceInfo = {
		sourceId: string;
		apiKey: string;
	};

	let source = $page.params.source;

	// let sourceInfo: SourceInfo = $derived.by(() => {
	// 	const decoded = decodeURIComponent(source);

	// 	if (decoded.includes('/')) {
	// 		// Should be of format: https://jellyfin.domain.test/Items/:id/Download?api_key=:key
	// 		const url = new URL(decodeURIComponent(source));
	// 		const pathname = url.pathname;
	// 		const params = url.searchParams;

	// 		const sourceId = pathname.split('Items/')[1].split('/')[0];
	// 		const apiKey = params.get('api_key');
	// 		return {
	// 			sourceId,
	// 			apiKey
	// 		};
	// 	}

	// 	return {
	// 		sourceId: decoded
	// 	};
	// });

	const asyncData = Promise.all([data.sourceInfo, data.fileInfo]).then(([sourceInfo, fileInfo]) => {
		return {
			sourceInfo,
			fileInfo
		};
	});
</script>

<div class="flex flex-col">
	{#await asyncData}
		Loading...
	{:then { sourceInfo, fileInfo }}
		{console.log(sourceInfo)}
		<h1>{getDisplayTitleFromItem(sourceInfo)}</h1>
		<VideoClipper sourceId={fileInfo.name} />
	{/await}
</div>

<!-- <div class="flex flex-col">
	<h1>{source}</h1>
	<h1>{JSON.stringify(sourceInfo, null, 2)}</h1>
</div> -->

<!-- {#if browser && decodeURIComponent(source).includes('/') && data.serverAddress && data.user}
	<VideoClipper
		sourceUrl={decodeURIComponent(source)}
		serverAddress={data.serverAddress}
		user={data.user}
		sourceId={sourceInfo.sourceId}
	/>
{/if} -->
