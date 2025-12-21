<script lang="ts">
	import type { MediaPlayerElement } from 'vidstack/elements';
	import type { Clip, User } from '$lib/types';
	import 'vidstack/bundle';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import Button from '$lib/components/ui/button/button.svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import DeleteConfirmation from '$lib/components/delete-confirmation/delete-confirmation.svelte';

	type Props = {
		clip: Clip;
		creator: User;
		jellyfinAddress: string;
		currentUser: User;
	};
	let player: MediaPlayerElement | null = $state(null);
	let hiddenAudioDownloadLink: HTMLAnchorElement | null = $state(null);

	let { clip, creator, jellyfinAddress, currentUser }: Props = $props();

	let deleteConfirmation = $state<null | ReturnType<typeof DeleteConfirmation>>(null);

	function onStartVideoDownload() {
		toast.info(`Clip video download started`);
	}

	function onStartAudioDownload() {
		const createAudioClipPromise = fetch(`/api/clips/${clip.id}/createAudio`).then((response) => {
			if (response.ok) {
				// Trigger the download
				hiddenAudioDownloadLink?.click();
				toast.info('Audio download started');
			}
			throw new Error('Failed to create audio clip');
		});

		toast.promise(createAudioClipPromise, {
			loading: 'Creating audio clip...',
			success: 'Audio clip created',
			error: 'Failed to create audio clip'
		});
	}

	function onCopyUrl() {
		navigator.clipboard.writeText(window.location.href);
		toast.info('URL copied to clipboard', {
			description: `Link: ${window.location.href}`
		});
	}

	const onDeleteClip = async () => {
		let toastId = toast.loading('Deleting clip...');
		try {
			const response = await fetch(`/api/clips/${clip.id}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				toast.success('Clip deleted successfully', {
					id: toastId
				});
				goto('/my-clips');
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
</script>

<Card.Root>
	<Card.Header class="flex flex-row gap-2 items-center">
		<Avatar.Root>
			<Avatar.Image src="{jellyfinAddress}UserImage?UserId={creator.jellyfinUserId}" alt={creator.jellyfinUserName} />
			<Avatar.Fallback>{creator.jellyfinUserName.slice(0, 2)}</Avatar.Fallback>
		</Avatar.Root>
		<div class="flex flex-col">
			<Card.Title>
				{clip.title}
			</Card.Title>
			<Card.Description>
				{creator.jellyfinUserName} -
				{clip.sourceTitle}
			</Card.Description>
		</div>
	</Card.Header>
	<Card.Content>
		<div class="flex flex-col w-full h-full max-h-[540px] max-w-[960px]">
			<media-player
				poster="/api/thumb/{clip.id}"
				posterLoad="eager"
				bind:this={player}
				title={clip?.title}
				streamType="on-demand"
				load="eager"
				autoPlay
				loop
			>
				<media-poster class="vds-poster" src="/api/thumb/{clip.id}"></media-poster>
				<media-provider>
					<source src="/videos/clips/{clip.id}.mp4" type="video/mp4" />
				</media-provider>
				<media-video-layout></media-video-layout>
			</media-player>
		</div>
	</Card.Content>
	<Card.Footer>
		<div class="w-full flex justify-between">
			{#if clip.userId !== currentUser.jellyfinUserId}
				<Button variant="destructive" onclick={() => deleteConfirmation?.withConfirmation(() => onDeleteClip())}>
					<i class="text-xl ph ph-trash"></i>
					Delete Clip
				</Button>
			{:else}
				<div></div>
			{/if}
			<div class="flex gap-2">
				<Button variant="outline" onclick={onCopyUrl}>
					<i class="text-xl ph ph-copy-simple"></i>
					Copy Link
				</Button>
				<Button
					variant="default"
					onclick={onStartVideoDownload}
					href="/videos/clips/{clip.id}.mp4"
					download="{clip.title}.mp4"
				>
					<i class="text-xl ph ph-download"></i>
					Download Video
					<i class="text-xl ph ph-video"></i>
				</Button>
				<Button variant="default" onclick={onStartAudioDownload}>
					<i class="text-xl ph ph-download"></i>
					Download Audio
					<i class="text-xl ph ph-music-notes"></i>
				</Button>
				<a
					bind:this={hiddenAudioDownloadLink}
					hidden
					aria-hidden="true"
					href="/videos/clips/{clip.id}.mp3"
					download="{clip.title}.mp3"
				>
				</a>
			</div>
		</div>
	</Card.Footer>
</Card.Root>

<DeleteConfirmation
	bind:this={deleteConfirmation}
	confirmText="Yes, delete clip!"
	description="This action cannot be undone. This will permanently delete this clip."
/>
