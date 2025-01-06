<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { format, formatDistanceToNow, formatRelative } from 'date-fns';
	import type { PageData } from './$types';
	import { blur } from 'svelte/transition';
	import { toast } from 'svelte-sonner';

	type Props = {
		data: PageData;
	};
	let { data }: Props = $props();

	function onStartDownload() {
		toast.info('Download started');
	}
</script>

<div class="h-full w-full flex justify-start">
	<div class="w-full h-fit grid grid-template gap-4">
		{#if !data.clips}
			<p>Loading...</p>
		{:else if data.clips.length === 0}
			<p class="text-muted-foreground">No clips found</p>
		{:else}
			{#each data.clips as clip}
				<Button
					variant="outline"
					href="/clip/{clip.id}"
					class="bg-slate-800 p-3 rounded-md flex flex-col gap-2 h-auto items-start"
				>
					<h2 class="font-bold text-wrap">{clip.title}</h2>
					<img
						alt={clip.title}
						src="/api/thumb/{clip.id}"
						class="bg-slate-600 rounded-md w-full aspect-video"
					/>
					<p class="text-sm text-wrap">{clip.sourceTitle}</p>
					<div class="flex-1 flex w-full flex-col justify-end">
						<div class="flex w-full flex-row justify-between items-end">
							<p class="text-xs text-muted-foreground">
								{formatDistanceToNow(clip.createdAt, { addSuffix: true })}
							</p>
							<Button
								variant="secondary"
								onclick={onStartDownload}
								href="/videos/clips/{clip.id}.mp4"
								download
							>
								<i class="text-xl ph ph-download"></i>
							</Button>
						</div>
					</div>
				</Button>
			{/each}
		{/if}
	</div>
</div>

<style>
	.grid-template {
		/* grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); */
		grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
	}
</style>
