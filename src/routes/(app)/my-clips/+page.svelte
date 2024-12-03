<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { format, formatRelative } from 'date-fns';
	import type { PageData } from './$types';
	import { blur } from 'svelte/transition';

	type Props = {
		data: PageData;
	};
	let { data }: Props = $props();
</script>

<div class="h-full w-full flex justify-start">
	<div class="w-full h-fit grid grid-template gap-4">
		{#if !data.clips}
			<p>Loading...</p>
		{:else}
			{#each data.clips as clip}
				<Button
					variant="outline"
					href="/clip/{clip.id}"
					class="bg-slate-800 p-3 rounded-md flex flex-col gap-2 h-auto items-start"
				>
					<img
						alt={clip.title}
						src="/api/thumb/{clip.id}"
						class="bg-slate-600 rounded-md w-full aspect-video"
					/>
					<div>
						<h2 class="font-semibold text-pretty">{clip.title}</h2>
						<p class="text-sm text-pretty">{clip.sourceTitle}</p>
					</div>
					<div class="flex-1 flex flex-col justify-end">
						<p class="text-xs text-muted-foreground">
							{formatRelative(clip.createdAt, new Date())}
						</p>
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
