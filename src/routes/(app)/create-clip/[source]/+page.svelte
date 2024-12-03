<script lang="ts">
	import type { PageData } from './$types';
	import VideoClipper from './video-clipper.svelte';
	import { getDisplayTitleFromItem, getItemSize } from '$lib/utils';
	import JugglingCubeSpinner from '$lib/components/ui/spinner/juggling-cube-spinner.svelte';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
</script>

{#await data.sourceInfo}
	<div class="flex flex-col gap-8 justify-center items-center">
		<JugglingCubeSpinner ballColor="#af63d2" cubeColor="#17adec" />
		<span class="text-slate-400 italic">
			Downloading media from jellyfin, please be patient...
		</span>
	</div>
{:then sourceInfo}
	{#await data.fileInfo}
		{@const size = getItemSize(sourceInfo)}
		<div class="flex flex-col gap-8 justify-center items-center">
			<JugglingCubeSpinner ballColor="#af63d2" cubeColor="#17adec" />
			<span class="text-slate-400 italic">
				Downloading: {getDisplayTitleFromItem(sourceInfo)}
				{size ? `(${size})` : ''}, please be patient...
			</span>
		</div>
	{:then fileInfo}
		<VideoClipper sourceId={fileInfo.name} {sourceInfo} />
	{:catch error}
		<div class="flex flex-col gap-8 justify-center items-center">
			<span class="text-slate-400 italic">
				Failed to download media from jellyfin, please try again later.
				{error}
			</span>
		</div>
	{/await}
{/await}
