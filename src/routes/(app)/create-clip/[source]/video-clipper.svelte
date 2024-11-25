<script lang="ts">
	import { getDisplayTitleFromItem, ticksToSeconds } from '$lib/utils';
	import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
	import 'vidstack/bundle';

	type Props = {
		sourceId: string;
		sourceInfo: BaseItemDto;
	};

	let { sourceId, sourceInfo }: Props = $props();

	const videoRuntime = $derived(
		sourceInfo.RunTimeTicks ? ticksToSeconds(sourceInfo.RunTimeTicks) : -1
	);

	let clipStartTimeSeconds = $derived(5 * 60);
	let clipEndTimeSeconds = $derived(10 * 60);

	$effect(() => {
		console.log('sourceInfo', sourceInfo);
	});
</script>

<!-- svelte-ignore a11y_media_has_caption -->
<div class="flex w-full h-full max-h-[540px] max-w-[960px]">
	<media-player
		title={getDisplayTitleFromItem(sourceInfo) ?? 'Unknown'}
		streamType="on-demand"
		load="visible"
		duration={videoRuntime}
		clipEndTime={clipEndTimeSeconds}
		clipStartTime={clipStartTimeSeconds}
	>
		<media-provider>
			<source src="/videos/originals/{sourceId}.mp4" type="video/mp4" />
		</media-provider>
		<media-video-layout></media-video-layout>
	</media-player>
</div>
