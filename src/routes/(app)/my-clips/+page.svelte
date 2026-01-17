<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { formatDistanceToNow } from 'date-fns';
	import type { PageData } from './$types';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card';
	import type { Clip } from '$lib/types';
	import DeleteConfirmation from '$lib/components/delete-confirmation/delete-confirmation.svelte';
	import { invalidateAll } from '$app/navigation';

	type Props = {
		data: PageData;
	};
	let { data }: Props = $props();

	let deleteConfirmation = $state<null | ReturnType<typeof DeleteConfirmation>>(null);

	function onStartDownload() {
		toast.info('Download started');
	}

	const onDeleteClip = async (clip: Clip) => {
		let toastId = toast.loading('Deleting clip...');
		try {
			const response = await fetch(`/api/clips/${clip.id}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				await invalidateAll();
				toast.success('Clip deleted successfully', {
					id: toastId
				});
			} else {
				toast.error('Failed to delete clip', {
					description: 'Please try again later.',
					id: toastId
				});
			}
		} catch (error) {
			toast.error('Failed to delete clip', {
				description: (error as Error).message,
				id: toastId
			});
		}
	};

	const sanitizeTitle = (title: string) => {
		return title.replace(/[^a-zA-Z0-9]/g, '_');
	};
</script>

<div class="h-full w-full flex justify-start">
	<div class="w-full h-fit grid grid-template gap-4">
		{#if !data.clips}
			<p>Loading...</p>
		{:else if data.clips.length === 0}
			<p class="text-muted-foreground">No clips found</p>
		{:else}
			{#each data.clips as clip (clip.id)}
				<Card.Root>
					<Card.Header class="p-4 pb-0">
						<Card.Title>
							<Button variant="link" href="/clip/{clip.id}" class="font-bold text-wrap p-0">
								{clip.title}
							</Button>
							<!-- <h2 class="font-bold text-wrap">{clip.title}</h2> -->
						</Card.Title>
						<Card.Description>
							{formatDistanceToNow(clip.createdAt, { addSuffix: true })}
						</Card.Description>
					</Card.Header>
					<Card.Content class="p-4">
						<a href="/clip/{clip.id}">
							<img alt={clip.title} src="/api/thumb/{clip.id}" class="bg-slate-600 rounded-md w-full aspect-video" />
							<p class="text-sm text-wrap">{clip.sourceTitle}</p>
						</a>
					</Card.Content>
					<Card.Footer class="p-4">
						<div class="flex w-full flex-row justify-between items-end">
							<Button
								variant="ghost"
								onclick={() => deleteConfirmation?.withConfirmation(() => onDeleteClip(clip))}
								title="Delete clip"
							>
								<i class="text-lg ph ph-trash"></i>
							</Button>
							<Button
								variant="secondary"
								title="Download clip"
								onclick={onStartDownload}
								href="/videos/clips/{clip.id}.mp4"
								download="{sanitizeTitle(clip.title)}.mp4"
							>
								<i class="text-xl ph ph-download"></i>
							</Button>
						</div>
					</Card.Footer>
				</Card.Root>
			{/each}
		{/if}
	</div>
</div>

<DeleteConfirmation
	bind:this={deleteConfirmation}
	confirmText="Yes, delete clip!"
	description="This action cannot be undone. This will permanently delete this clip."
/>

<style>
	.grid-template {
		/* grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); */
		grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
	}
</style>
